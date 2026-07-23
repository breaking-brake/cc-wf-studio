/**
 * Claude Code Workflow Studio - Workflow Editor Component
 *
 * Main React Flow canvas for visual workflow editing
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  PanelLeftOpen,
  Scissors,
  SquareDashedMousePointer,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  applyNodeChanges,
  Background,
  type Connection,
  Controls,
  type DefaultEdgeOptions,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
  PanOnScrollMode,
  type ReactFlowInstance,
} from 'reactflow';
import { CURRENT_ANNOUNCEMENT, cleanupDismissedAnnouncements } from '../constants/announcements';
import { useAutoFocusNode } from '../hooks/useAutoFocusNode';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import {
  parseSelectionClipboardPayload,
  type SelectionClipboardPayload,
  useWorkflowStore,
} from '../stores/workflow-store';
import { CanvasContextMenu, type CanvasContextMenuEntry } from './CanvasContextMenu';
import { CanvasToolbar } from './CanvasToolbar';
import { FeatureAnnouncementBanner } from './common/FeatureAnnouncementBanner';
import { DescriptionPanel } from './DescriptionPanel';
// Custom edge with delete button
import { DeletableEdge } from './edges/DeletableEdge';
import { MinimapContainer } from './MinimapContainer';
import { AskUserQuestionNodeComponent } from './nodes/AskUserQuestionNode';
import { BranchNodeComponent } from './nodes/BranchNode';
import { BranchSessionNode } from './nodes/BranchSessionNode';
// 新規ノードタイプのインポート
import { CodexNodeComponent } from './nodes/CodexNode';
import { EndNode } from './nodes/EndNode';
import { GroupNodeComponent } from './nodes/GroupNode';
import { IfElseNodeComponent } from './nodes/IfElseNode';
import { McpNodeComponent } from './nodes/McpNode/McpNode';
import { PromptNode } from './nodes/PromptNode';
import { SkillNodeComponent } from './nodes/SkillNode';
import { StartNode } from './nodes/StartNode';
import { SubAgentFlowNodeComponent } from './nodes/SubAgentFlowNode';
import { SubAgentNodeComponent } from './nodes/SubAgentNode';
import { SwitchNodeComponent } from './nodes/SwitchNode';
import { StartMenu } from './StartMenu';

/**
 * Node types registration (memoized outside component for performance)
 * Based on: /specs/001-cc-wf-studio/research.md section 3.1
 *
 * 新規ノードタイプ (Start, End, Prompt, Branch) は実装後にコメント解除
 */
const nodeTypes: NodeTypes = {
  subAgent: SubAgentNodeComponent,
  askUserQuestion: AskUserQuestionNodeComponent,
  branch: BranchNodeComponent, // Legacy: 後方互換性のため維持
  ifElse: IfElseNodeComponent,
  switch: SwitchNodeComponent,
  // 新規ノードタイプ
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  skill: SkillNodeComponent,
  mcp: McpNodeComponent, // Feature: 001-mcp-node
  subAgentFlow: SubAgentFlowNodeComponent, // Feature: 089-subworkflow
  codex: CodexNodeComponent, // Feature: 518-codex-agent-node
  branchSession: BranchSessionNode, // Feature: branch-session-node (Claude Code only)
  group: GroupNodeComponent, // Feature: group-node
};

/**
 * Default edge options (memoized)
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
  style: { stroke: 'var(--vscode-foreground)', strokeWidth: 2 },
};

/**
 * Edge types - custom edge with delete button
 */
const edgeTypes: EdgeTypes = {
  default: DeletableEdge,
};

/** In-window mirror of the last copied/cut selection. The context menu's
 *  Paste falls back to it when the webview denies clipboard read (the DOM
 *  paste event path is unaffected — Ctrl/Cmd+V still reads the system
 *  clipboard). */
let selectionClipboardMirror: SelectionClipboardPayload | null = null;

/** Mirror the payload and best-effort write it to the system clipboard
 *  (context-menu clicks are user gestures, but webviews may still deny). */
const writeSelectionToClipboard = (payload: SelectionClipboardPayload) => {
  selectionClipboardMirror = payload;
  navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
};

/** Select every node and edge. Selection state is excluded from undo
 *  history and canvas-revision tracking, so this never dirties the
 *  workflow or pollutes undo. */
const selectAllOnCanvas = () => {
  const {
    nodes: currentNodes,
    edges: currentEdges,
    setNodes,
    setEdges,
    syncSelectedNodeId,
  } = useWorkflowStore.getState();
  if (currentNodes.length === 0 && currentEdges.length === 0) return;
  setNodes(currentNodes.map((n) => (n.selected ? n : { ...n, selected: true })));
  setEdges(currentEdges.map((e) => (e.selected ? e : { ...e, selected: true })));
  // Same rule as handleNodesChange: exactly one selected node syncs its id
  syncSelectedNodeId(currentNodes.length === 1 ? currentNodes[0].id : null);
};

/**
 * WorkflowEditor Component Props
 */
interface WorkflowEditorProps {
  isNodePaletteCollapsed?: boolean;
  onExpandNodePalette?: () => void;
  showEmptyState?: boolean;
  onOpenSample?: () => void;
  onDismissEmptyState?: () => void;
  onLoadWorkflow?: () => void;
  extensionVersion?: string;
  recentWorkflows?: Array<{ id: string; name: string }>;
  onLoadRecent?: (id: string) => void;
  onVersionClick?: () => void;
}

/**
 * WorkflowEditor Component
 */
export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  isNodePaletteCollapsed = false,
  onExpandNodePalette,
  showEmptyState = false,
  onOpenSample,
  onDismissEmptyState,
  onLoadWorkflow,
  extensionVersion,
  recentWorkflows,
  onLoadRecent,
  onVersionClick,
}) => {
  const { t } = useTranslation();
  const isCompact = useIsCompactMode();

  // Auto-focus on newly added nodes
  useAutoFocusNode();

  // Cleanup dismissed announcements on mount
  useEffect(() => {
    cleanupDismissedAnnouncements();
  }, []);

  // Get state and handlers from Zustand store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    syncSelectedNodeId,
    selectedNodeId,
    interactionMode,
    scrollMode,
    onNodeDragStop,
    highlightedGroupNodeId,
    minimapDisplayMode,
    isMinimapShown,
    setMinimapShown,
  } = useWorkflowStore();

  // Edge animation toggle (respects prefers-reduced-motion by default)
  const [isEdgeAnimationEnabled, setIsEdgeAnimationEnabled] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Animate edges: selected edge itself, or edges connected to selected node
  // For group nodes: also animate edges connected to any child node
  // Highlight-driven animation is always active (runtime status indicator)
  const animatedEdges = useMemo(() => {
    // Highlight-driven animation: always active (runtime status indicator)
    let highlightChildIds: Set<string> | null = null;
    if (highlightedGroupNodeId != null) {
      highlightChildIds = new Set(
        nodes.filter((n) => n.parentId === highlightedGroupNodeId).map((n) => n.id)
      );
    }

    // Selection-driven animation: respects user toggle
    let selectionChildIds: Set<string> | null = null;
    if (isEdgeAnimationEnabled && selectedNodeId != null) {
      const selectedNode = nodes.find((n) => n.id === selectedNodeId);
      if (selectedNode?.type === 'group') {
        selectionChildIds = new Set(
          nodes.filter((n) => n.parentId === selectedNodeId).map((n) => n.id)
        );
      }
    }

    const hasHighlight = highlightedGroupNodeId != null;
    const hasSelection = isEdgeAnimationEnabled && selectedNodeId != null;
    const hasSelectedEdge = isEdgeAnimationEnabled && edges.some((e) => e.selected);
    if (!hasHighlight && !hasSelection && !hasSelectedEdge) return edges;

    return edges.map((edge) => {
      const isHighlightAnimated =
        hasHighlight &&
        (edge.source === highlightedGroupNodeId ||
          edge.target === highlightedGroupNodeId ||
          (highlightChildIds != null &&
            (highlightChildIds.has(edge.source) || highlightChildIds.has(edge.target))));

      const isSelectionAnimated =
        (isEdgeAnimationEnabled && edge.selected) ||
        (hasSelection &&
          (edge.source === selectedNodeId ||
            edge.target === selectedNodeId ||
            (selectionChildIds != null &&
              (selectionChildIds.has(edge.source) || selectionChildIds.has(edge.target)))));

      return { ...edge, animated: isHighlightAnimated || isSelectionAnimated };
    });
  }, [edges, nodes, selectedNodeId, highlightedGroupNodeId, isEdgeAnimationEnabled]);

  /**
   * 接続制約の検証
   *
   * Based on: /specs/001-node-types-extension/research.md section 3
   *
   * @param connection - 検証対象の接続
   * @returns 接続が有効な場合true
   */
  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      // Startノードは入力接続を持てない
      if (targetNode?.type === 'start') {
        console.warn('Cannot connect to Start node: Start nodes cannot have input connections');
        return false;
      }

      // Endノードは出力接続を持てない
      if (sourceNode?.type === 'end') {
        console.warn('Cannot connect from End node: End nodes cannot have output connections');
        return false;
      }

      // Groupノードは接続を持てない
      if (sourceNode?.type === 'group' || targetNode?.type === 'group') {
        console.warn('Cannot connect to/from Group node: Group nodes are layout-only');
        return false;
      }

      // すべての検証を通過
      return true;
    },
    [nodes]
  );

  // Sync selectedNodeId from post-change node state (side-effect-free)
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      const hasSelectionChanges = changes.some((c) => c.type === 'select');
      onNodesChange(changes);

      if (hasSelectionChanges) {
        // Determine selection from full post-change state, not from delta
        const updatedNodes = applyNodeChanges(changes, nodes);
        const selectedNodes = updatedNodes.filter((n) => n.selected);

        if (selectedNodes.length === 1) {
          syncSelectedNodeId(selectedNodes[0].id);
        } else {
          // Multi-select or no selection: clear selectedNodeId
          syncSelectedNodeId(null);
        }
      }
    },
    [onNodesChange, syncSelectedNodeId, nodes]
  );

  const handleEdgesChange = useCallback(onEdgesChange, [onEdgesChange]);
  const handleConnect = useCallback(onConnect, [onConnect]);

  // Handle explicit node click (opens property overlay)
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Save pre-drag snapshot for undo/redo (ref to avoid re-renders)
  const preDragNodesRef = useRef<Node[] | null>(null);

  // Pause undo/redo tracking during node drag to record only the final position
  const handleNodeDragStart = useCallback(() => {
    preDragNodesRef.current = useWorkflowStore.getState().nodes;
    useWorkflowStore.temporal.getState().pause();
  }, []);

  // Handle node drag stop (group containment logic + record single undo entry)
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeDragStop(node);
      const preDragNodes = preDragNodesRef.current;
      if (preDragNodes) {
        const currentNodes = useWorkflowStore.getState().nodes;
        // Temporarily revert to pre-drag state, then resume tracking and apply final state
        // This makes zundo record a single undo entry: pre-drag → post-drag
        useWorkflowStore.setState({ nodes: preDragNodes });
        useWorkflowStore.temporal.getState().resume();
        useWorkflowStore.setState({ nodes: currentNodes });
        preDragNodesRef.current = null;
      } else {
        useWorkflowStore.temporal.getState().resume();
      }
    },
    [onNodeDragStop]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    syncSelectedNodeId(null);
  }, [syncSelectedNodeId]);

  // ---------------------------------------------------------------------
  // Canvas context menu (right-click): Copy/Cut/Paste/Duplicate/Delete
  // ---------------------------------------------------------------------
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPosition: { x: number; y: number } | null;
    target: 'node' | 'pane';
  } | null>(null);

  const openContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent, target: 'node' | 'pane') => {
      // Suppress the webview's native context menu
      event.preventDefault();
      const container = canvasContainerRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      // Flow coordinates of the click, so Paste can land the nodes there
      const flowPosition = reactFlowInstanceRef.current?.project({ x, y }) ?? null;
      setContextMenu({ x, y, flowPosition, target });
    },
    []
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const {
        nodes: currentNodes,
        edges: currentEdges,
        setNodes,
        setEdges,
        syncSelectedNodeId: syncId,
      } = useWorkflowStore.getState();
      // Right-clicking an unselected node selects it exclusively (standard
      // editor behavior); a right-click inside a multi-selection keeps it
      const clicked = currentNodes.find((n) => n.id === node.id);
      if (clicked && !clicked.selected) {
        setNodes(
          currentNodes.map((n) =>
            n.id === node.id ? { ...n, selected: true } : n.selected ? { ...n, selected: false } : n
          )
        );
        if (currentEdges.some((e) => e.selected)) {
          setEdges(currentEdges.map((e) => (e.selected ? { ...e, selected: false } : e)));
        }
        syncId(node.id);
      }
      openContextMenu(event, 'node');
    },
    [openContextMenu]
  );

  const handleSelectionContextMenu = useCallback(
    (event: React.MouseEvent) => openContextMenu(event, 'node'),
    [openContextMenu]
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => openContextMenu(event, 'pane'),
    [openContextMenu]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const copySelectionFromMenu = useCallback(() => {
    const { nodes: currentNodes, serializeSelection } = useWorkflowStore.getState();
    const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length === 0) return;
    const payload = serializeSelection(selectedIds);
    if (payload) writeSelectionToClipboard(payload);
  }, []);

  const cutSelectionFromMenu = useCallback(() => {
    const { nodes: currentNodes, pendingDeleteNodeIds, cutSelection } = useWorkflowStore.getState();
    // Don't race the delete-confirmation dialog over the same selection
    if (pendingDeleteNodeIds.length > 0) return;
    const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length === 0) return;
    const payload = cutSelection(selectedIds);
    if (payload) writeSelectionToClipboard(payload);
  }, []);

  const pasteFromMenu = useCallback(async (position: { x: number; y: number } | null) => {
    let payload: SelectionClipboardPayload | null = null;
    try {
      const text = await navigator.clipboard.readText();
      payload = parseSelectionClipboardPayload(text);
    } catch {
      // Webview denied clipboard read — fall back to the in-window mirror
      payload = selectionClipboardMirror;
    }
    if (payload) useWorkflowStore.getState().pasteSelection(payload, position ?? undefined);
  }, []);

  const duplicateSelectionFromMenu = useCallback(() => {
    const { nodes: currentNodes, duplicateSelection } = useWorkflowStore.getState();
    const selectedIds = currentNodes
      .filter((n) => n.selected && n.type !== 'start' && n.type !== 'end')
      .map((n) => n.id);
    if (selectedIds.length > 0) duplicateSelection(selectedIds);
  }, []);

  const deleteSelectionFromMenu = useCallback(() => {
    const {
      nodes: currentNodes,
      edges: currentEdges,
      pendingDeleteNodeIds,
      requestDeleteSelection,
      setEdges,
    } = useWorkflowStore.getState();
    if (pendingDeleteNodeIds.length > 0) return;
    const selectedNodeIds = currentNodes
      .filter((n) => n.selected && n.type !== 'start')
      .map((n) => n.id);
    const selectedEdgeIds = currentEdges.filter((e) => e.selected).map((e) => e.id);
    if (selectedNodeIds.length > 0) {
      // Same confirm flow as the Delete key
      requestDeleteSelection(selectedNodeIds, selectedEdgeIds);
    } else if (selectedEdgeIds.length > 0) {
      // Edge-only selection: delete immediately (parity with the edge ✕ button)
      setEdges(currentEdges.filter((e) => !e.selected));
    }
  }, []);

  // Memoize snap grid
  const snapGrid = useMemo<[number, number]>(() => [15, 15], []);

  // Track Ctrl/Cmd key state for temporary mode switching
  const [isModifierKeyPressed, setIsModifierKeyPressed] = useState(false);

  // Keyboard event handlers for modifier key and undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        setIsModifierKeyPressed(true);
      }

      const mod = event.metaKey || event.ctrlKey;

      // Delete/Backspace — deletion is routed through the store so node
      // removal waits for the confirmation dialog. React Flow's built-in
      // handler is disabled (deleteKeyCode={null}): it removes connected
      // edges immediately, before the dialog can be answered.
      if ((event.key === 'Delete' || event.key === 'Backspace') && !mod && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        const {
          nodes: currentNodes,
          edges: currentEdges,
          pendingDeleteNodeIds,
          requestDeleteSelection,
          setEdges,
        } = useWorkflowStore.getState();
        // Ignore repeats while the confirmation dialog is open
        if (pendingDeleteNodeIds.length > 0) return;

        const selectedNodeIds = currentNodes
          .filter((n) => n.selected && n.type !== 'start')
          .map((n) => n.id);
        const selectedEdgeIds = currentEdges.filter((e) => e.selected).map((e) => e.id);

        if (selectedNodeIds.length > 0) {
          event.preventDefault();
          requestDeleteSelection(selectedNodeIds, selectedEdgeIds);
        } else if (selectedEdgeIds.length > 0) {
          // Edge-only selection: delete immediately (parity with the edge ✕ button)
          event.preventDefault();
          setEdges(currentEdges.filter((e) => !e.selected));
        }
        return;
      }

      // Undo/Redo/Duplicate shortcuts — skip when focus is in editable elements
      if (mod) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        const key = event.key.toLowerCase();
        if (key === 'a' && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          selectAllOnCanvas();
        }
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault();
          const { undo, pastStates } = useWorkflowStore.temporal.getState();
          if (pastStates.length > 0) undo();
        }
        if ((key === 'z' && event.shiftKey) || key === 'y') {
          event.preventDefault();
          const { redo, futureStates } = useWorkflowStore.temporal.getState();
          if (futureStates.length > 0) redo();
        }
        if (key === 'd' && !event.shiftKey) {
          const { nodes: currentNodes, duplicateSelection } = useWorkflowStore.getState();
          // Duplicate the whole selection (Start/End are structural and skipped)
          const selectedIds = currentNodes
            .filter((n) => n.selected && n.type !== 'start' && n.type !== 'end')
            .map((n) => n.id);
          if (selectedIds.length > 0) {
            event.preventDefault();
            duplicateSelection(selectedIds);
          }
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        setIsModifierKeyPressed(false);
      }
    };

    const isEditableTarget = (target: EventTarget | null): boolean => {
      const element = target as HTMLElement | null;
      return Boolean(
        element &&
          (element.tagName === 'INPUT' ||
            element.tagName === 'TEXTAREA' ||
            element.isContentEditable)
      );
    };

    // Copy/cut/paste the canvas selection via the DOM clipboard events —
    // permission-free in VSCode webviews (navigator.clipboard.readText is
    // not), and the system clipboard carries the payload across canvas
    // windows, so paste works into a different workflow too.
    const handleCopy = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      // A real text selection (e.g. inside a panel) keeps the native copy
      const textSelection = window.getSelection();
      if (textSelection && !textSelection.isCollapsed) return;
      const { nodes: currentNodes, serializeSelection } = useWorkflowStore.getState();
      const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
      if (selectedIds.length === 0) return;
      const payload = serializeSelection(selectedIds);
      if (!payload || !event.clipboardData) return;
      selectionClipboardMirror = payload;
      event.preventDefault();
      event.clipboardData.setData('text/plain', JSON.stringify(payload, null, 2));
    };

    const handleCut = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      // A real text selection (e.g. inside a panel) keeps the native cut
      const textSelection = window.getSelection();
      if (textSelection && !textSelection.isCollapsed) return;
      // Nowhere to put the payload → don't remove anything
      if (!event.clipboardData) return;
      const {
        nodes: currentNodes,
        pendingDeleteNodeIds,
        cutSelection,
      } = useWorkflowStore.getState();
      // Don't race the delete-confirmation dialog over the same selection
      if (pendingDeleteNodeIds.length > 0) return;
      const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
      if (selectedIds.length === 0) return;
      // No confirmation dialog: cut is undoable (Ctrl+Z) and the content
      // lives on in the clipboard payload — standard editor semantics
      const payload = cutSelection(selectedIds);
      if (!payload) return;
      selectionClipboardMirror = payload;
      event.preventDefault();
      event.clipboardData.setData('text/plain', JSON.stringify(payload, null, 2));
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;
      const payload = parseSelectionClipboardPayload(text);
      // Anything that isn't a cc-wf-studio selection keeps the native paste
      if (!payload) return;
      event.preventDefault();
      useWorkflowStore.getState().pasteSelection(payload);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Minimap auto-show on scroll/pan/zoom (only for 'auto' mode)
  const minimapHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMoveStart = useCallback(() => {
    // Pan/zoom invalidates the menu's position — dismiss it
    setContextMenu(null);
    if (minimapDisplayMode !== 'auto') return;
    if (minimapHideTimerRef.current) {
      clearTimeout(minimapHideTimerRef.current);
      minimapHideTimerRef.current = null;
    }
    setMinimapShown(true);
  }, [minimapDisplayMode, setMinimapShown]);

  const handleMoveEnd = useCallback(() => {
    if (minimapDisplayMode !== 'auto') return;
    minimapHideTimerRef.current = setTimeout(() => {
      setMinimapShown(false);
      minimapHideTimerRef.current = null;
    }, 800);
  }, [minimapDisplayMode, setMinimapShown]);

  useEffect(() => {
    return () => {
      if (minimapHideTimerRef.current) {
        clearTimeout(minimapHideTimerRef.current);
      }
    };
  }, []);

  // Calculate effective interaction mode based on base mode and modifier key
  const effectiveMode = useMemo(() => {
    if (isModifierKeyPressed) {
      // Modifier key inverts the mode
      return interactionMode === 'pan' ? 'selection' : 'pan';
    }
    return interactionMode;
  }, [interactionMode, isModifierKeyPressed]);

  // ReactFlow interaction props based on effective mode
  const panOnDrag = effectiveMode === 'pan';
  const selectionOnDrag = effectiveMode === 'selection';

  // Context-menu entries (built at render so disabled states track the
  // live selection; Start/End follow the store's exclusion policies)
  const contextMenuEntries = useMemo<CanvasContextMenuEntry[]>(() => {
    if (!contextMenu) return [];
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const mod = isMac ? '⌘' : 'Ctrl+';
    const pasteEntry: CanvasContextMenuEntry = {
      key: 'paste',
      label: t('contextMenu.paste'),
      icon: <ClipboardPaste size={14} />,
      shortcut: `${mod}V`,
      onSelect: () => void pasteFromMenu(contextMenu.flowPosition),
    };
    if (contextMenu.target === 'pane') {
      return [
        pasteEntry,
        'separator',
        {
          key: 'selectAll',
          label: t('contextMenu.selectAll'),
          icon: <SquareDashedMousePointer size={14} />,
          shortcut: `${mod}A`,
          disabled: nodes.length === 0 && edges.length === 0,
          onSelect: selectAllOnCanvas,
        },
      ];
    }
    const hasCopyableSelection = nodes.some(
      (n) => n.selected && n.type !== 'start' && n.type !== 'end'
    );
    const hasDeletableSelection =
      nodes.some((n) => n.selected && n.type !== 'start') || edges.some((e) => e.selected);
    return [
      {
        key: 'copy',
        label: t('contextMenu.copy'),
        icon: <Copy size={14} />,
        shortcut: `${mod}C`,
        disabled: !hasCopyableSelection,
        onSelect: copySelectionFromMenu,
      },
      {
        key: 'cut',
        label: t('contextMenu.cut'),
        icon: <Scissors size={14} />,
        shortcut: `${mod}X`,
        disabled: !hasCopyableSelection,
        onSelect: cutSelectionFromMenu,
      },
      pasteEntry,
      {
        key: 'duplicate',
        label: t('contextMenu.duplicate'),
        icon: <CopyPlus size={14} />,
        shortcut: `${mod}D`,
        disabled: !hasCopyableSelection,
        onSelect: duplicateSelectionFromMenu,
      },
      'separator',
      {
        key: 'delete',
        label: t('contextMenu.delete'),
        icon: <Trash2 size={14} />,
        shortcut: 'Del',
        disabled: !hasDeletableSelection,
        onSelect: deleteSelectionFromMenu,
      },
    ];
  }, [
    contextMenu,
    nodes,
    edges,
    t,
    pasteFromMenu,
    copySelectionFromMenu,
    cutSelectionFromMenu,
    duplicateSelectionFromMenu,
    deleteSelectionFromMenu,
  ]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Feature Announcement Banner - displayed when CURRENT_ANNOUNCEMENT is set */}
      {CURRENT_ANNOUNCEMENT && (
        <FeatureAnnouncementBanner
          featureId={CURRENT_ANNOUNCEMENT.featureId}
          title={t(CURRENT_ANNOUNCEMENT.titleKey)}
          description={
            CURRENT_ANNOUNCEMENT.descriptionKey ? t(CURRENT_ANNOUNCEMENT.descriptionKey) : undefined
          }
        />
      )}

      {/* Canvas area */}
      <div ref={canvasContainerRef} style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={animatedEdges}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={handleNodeClick}
          onEdgeClick={() => syncSelectedNodeId(null)}
          onPaneClick={handlePaneClick}
          onNodeContextMenu={handleNodeContextMenu}
          onSelectionContextMenu={handleSelectionContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          isValidConnection={isValidConnection}
          deleteKeyCode={null}
          snapToGrid={true}
          snapGrid={snapGrid}
          panOnDrag={panOnDrag}
          selectionOnDrag={selectionOnDrag}
          panOnScroll={scrollMode === 'freehand'}
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={scrollMode === 'classic'}
          zoomOnPinch={true}
          onMoveStart={handleMoveStart}
          onMoveEnd={handleMoveEnd}
          fitView
          attributionPosition="bottom-left"
        >
          {/* Background grid */}
          <Background color="var(--vscode-panel-border)" gap={15} size={1} />

          {/* Controls (zoom, fit view, etc.) */}
          <Controls />

          {/* Mini map with container */}
          {minimapDisplayMode !== 'hidden' && (
            <Panel position="bottom-right">
              <div
                style={{
                  opacity: minimapDisplayMode === 'always' || isMinimapShown ? 1 : 0,
                  transition: 'opacity 300ms ease',
                  pointerEvents:
                    minimapDisplayMode === 'always' || isMinimapShown ? 'auto' : 'none',
                }}
              >
                <MinimapContainer>
                  <MiniMap
                    nodeColor={(node) => {
                      switch (node.type) {
                        case 'subAgent':
                          return 'var(--vscode-charts-blue)';
                        case 'askUserQuestion':
                          return 'var(--vscode-charts-orange)';
                        case 'branch': // Legacy
                          return 'var(--vscode-charts-yellow)';
                        case 'ifElse':
                          return 'var(--vscode-charts-yellow)';
                        case 'switch':
                          return 'var(--vscode-charts-yellow)';
                        case 'start':
                          return 'var(--vscode-charts-green)';
                        case 'end':
                          return 'var(--vscode-charts-red)';
                        case 'prompt':
                          return 'var(--vscode-charts-purple)';
                        case 'skill':
                          return 'var(--vscode-charts-cyan)';
                        case 'subAgentFlow':
                          return 'var(--vscode-charts-purple)';
                        case 'codex':
                          return 'var(--vscode-charts-orange)';
                        case 'branchSession':
                          return 'var(--vscode-charts-cyan)';
                        case 'group':
                          return 'var(--vscode-panel-border)';
                        default:
                          return 'var(--vscode-foreground)';
                      }
                    }}
                    maskColor="rgba(0, 0, 0, 0.5)"
                    style={{
                      position: 'relative',
                      backgroundColor: 'var(--vscode-editor-background)',
                      width: isCompact ? 120 : 200,
                      height: isCompact ? 80 : 150,
                      margin: '4px 16px',
                    }}
                  />
                </MinimapContainer>
              </div>
            </Panel>
          )}

          {/* Canvas Toolbar */}
          <Panel position="top-left">
            <CanvasToolbar
              isEdgeAnimationEnabled={isEdgeAnimationEnabled}
              onToggleEdgeAnimation={() => setIsEdgeAnimationEnabled((prev) => !prev)}
            />
          </Panel>

          {/* Description Panel for workflow description */}
          <Panel position="top-right">
            <DescriptionPanel />
          </Panel>

          {/* Expand Node Palette Button (when collapsed) */}
          {isNodePaletteCollapsed && onExpandNodePalette && (
            <Panel position="top-left" style={{ marginTop: '56px' }}>
              <button
                type="button"
                onClick={onExpandNodePalette}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--vscode-foreground)',
                  opacity: 0.85,
                }}
              >
                <PanelLeftOpen size={16} aria-hidden="true" />
              </button>
            </Panel>
          )}
        </ReactFlow>
        {contextMenu && (
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            entries={contextMenuEntries}
            onClose={closeContextMenu}
          />
        )}
        {onOpenSample && onDismissEmptyState && onLoadWorkflow && (
          <StartMenu
            isOpen={showEmptyState}
            onOpenSample={onOpenSample}
            onStartFromScratch={onDismissEmptyState}
            onLoadWorkflow={onLoadWorkflow}
            extensionVersion={extensionVersion}
            recentWorkflows={recentWorkflows}
            onLoadRecent={onLoadRecent}
            onVersionClick={onVersionClick}
          />
        )}
      </div>
    </div>
  );
};
