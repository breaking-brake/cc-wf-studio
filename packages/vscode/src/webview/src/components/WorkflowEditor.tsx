/**
 * Claude Code Workflow Studio - Workflow Editor Component
 *
 * Main React Flow canvas for visual workflow editing
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Bot,
  ClipboardPaste,
  Copy,
  CopyPlus,
  GitBranch,
  GitBranchPlus,
  GitFork,
  Group,
  MessageSquare,
  PanelLeftOpen,
  Plug,
  Scissors,
  ShieldQuestion,
  Square,
  SquareDashedMousePointer,
  Terminal,
  Trash2,
  Ungroup,
  Zap,
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
  type OnConnectStartParams,
  Panel,
  PanOnScrollMode,
  type ReactFlowInstance,
} from 'reactflow';
import { CURRENT_ANNOUNCEMENT, cleanupDismissedAnnouncements } from '../constants/announcements';
import { useAutoFocusNode } from '../hooks/useAutoFocusNode';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import { useRefinementStore } from '../stores/refinement-store';
import {
  type AlignMode,
  type DistributeAxis,
  parseSelectionClipboardPayload,
  type SelectionClipboardPayload,
  useWorkflowStore,
} from '../stores/workflow-store';
import { jumpToNode } from '../utils/canvas-navigation';
import { createDefaultNode, type SimpleNodeType } from '../utils/node-defaults';
import { collectWorkflowIssues } from '../utils/workflow-issues';
import { CanvasContextMenu, type CanvasContextMenuEntry } from './CanvasContextMenu';
import { CanvasToolbar } from './CanvasToolbar';
import { FeatureAnnouncementBanner } from './common/FeatureAnnouncementBanner';
import { DescriptionPanel } from './DescriptionPanel';
import { KeyboardShortcutsDialog } from './dialogs/KeyboardShortcutsDialog';
// Custom edge with delete button
import { DeletableEdge } from './edges/DeletableEdge';
import { MinimapContainer } from './MinimapContainer';
import { NodeSearchPanel } from './NodeSearchPanel';
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
import { WorkflowProblemsPanel } from './WorkflowProblemsPanel';

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

/** Arrow-key nudge: direction per key. Step = the 15px canvas grid (the
 *  same velocity React Flow's built-in focused-node arrow moves use with
 *  snapToGrid), ×4 with Shift (React Flow's own factor). */
const NUDGE_ARROW_DIFFS: Partial<Record<string, { x: number; y: number }>> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};
const NUDGE_STEP = 15;
const NUDGE_SHIFT_FACTOR = 4;
/** Arrow keys idle this long → the nudge burst's undo entry is sealed. */
const NUDGE_UNDO_IDLE_MS = 500;

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

  // Arrow-key nudge bursts pause undo tracking like drags do; the timer
  // seals the burst into a single undo entry once the keys go idle
  const nudgeBurstRef = useRef<{ timer: number | null; active: boolean }>({
    timer: null,
    active: false,
  });

  // Pause undo/redo tracking during node drag to record only the final position
  const handleNodeDragStart = useCallback(() => {
    // A pending nudge-burst resume must not fire mid-drag and re-enable
    // tracking — the drag-stop handler resumes for both
    if (nudgeBurstRef.current.timer !== null) {
      window.clearTimeout(nudgeBurstRef.current.timer);
      nudgeBurstRef.current.timer = null;
      nudgeBurstRef.current.active = false;
    }
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

  const groupSelectionFromMenu = useCallback(() => {
    const { nodes: currentNodes, groupSelection } = useWorkflowStore.getState();
    const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length > 0) groupSelection(selectedIds);
  }, []);

  const ungroupSelectionFromMenu = useCallback(() => {
    const { nodes: currentNodes, ungroupSelection } = useWorkflowStore.getState();
    const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length > 0) ungroupSelection(selectedIds);
  }, []);

  const alignSelectionFromMenu = useCallback((mode: AlignMode) => {
    const { nodes: currentNodes, alignSelection } = useWorkflowStore.getState();
    const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length > 0) alignSelection(selectedIds, mode);
  }, []);

  const distributeSelectionFromMenu = useCallback((axis: DistributeAxis) => {
    const { nodes: currentNodes, distributeSelection } = useWorkflowStore.getState();
    const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length > 0) distributeSelection(selectedIds, axis);
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

  // ---------------------------------------------------------------------
  // Edge-drop create: drag a connection from a source handle, release on
  // empty canvas → a picker menu creates the chosen node pre-wired there
  // ---------------------------------------------------------------------
  const connectStartRef = useRef<OnConnectStartParams | null>(null);
  const [edgeDropMenu, setEdgeDropMenu] = useState<{
    x: number;
    y: number;
    flowPosition: { x: number; y: number };
    source: { nodeId: string; handleId: string | null };
  } | null>(null);

  const handleConnectStart = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, params: OnConnectStartParams) => {
      connectStartRef.current = params;
    },
    []
  );

  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    // Forward drags only — from a source handle; a valid drop on a node
    // fires onConnect instead and the drop target is then not the pane
    if (!start?.nodeId || start.handleType !== 'source') return;
    const dropTarget = event.target as Element | null;
    if (!dropTarget?.classList?.contains('react-flow__pane')) return;
    const container = canvasContainerRef.current;
    if (!container) return;
    const point = 'changedTouches' in event ? event.changedTouches[0] : event;
    if (!point) return;
    const bounds = container.getBoundingClientRect();
    const x = point.clientX - bounds.left;
    const y = point.clientY - bounds.top;
    const projected = reactFlowInstanceRef.current?.project({ x, y });
    if (!projected) return;
    // Land on the canvas grid, matching snapToGrid drag behavior
    const flowPosition = {
      x: Math.round(projected.x / 15) * 15,
      y: Math.round(projected.y / 15) * 15,
    };
    setEdgeDropMenu({
      x,
      y,
      flowPosition,
      source: { nodeId: start.nodeId, handleId: start.handleId ?? null },
    });
  }, []);

  const closeEdgeDropMenu = useCallback(() => setEdgeDropMenu(null), []);

  // Memoize snap grid
  const snapGrid = useMemo<[number, number]>(() => [15, 15], []);

  // Track Ctrl/Cmd key state for temporary mode switching
  const [isModifierKeyPressed, setIsModifierKeyPressed] = useState(false);

  // Keyboard shortcut cheat sheet (`?` key or toolbar button)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Node search panel (Ctrl/Cmd+F). The nonce re-focuses the input when
  // the shortcut fires while the panel is already open.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFocusNonce, setSearchFocusNonce] = useState(0);
  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    setSearchFocusNonce((nonce) => nonce + 1);
  }, []);

  // Live mirror of transient-UI state for the global Esc handler — the
  // keydown effect's deps are stable, so it cannot close over this state
  const escTargetsRef = useRef({ isSearchOpen: false, isMenuOpen: false });
  escTargetsRef.current = {
    isSearchOpen,
    isMenuOpen: contextMenu !== null || edgeDropMenu !== null,
  };

  // Auto layout — tidy the whole canvas, then re-fit the view so the
  // freshly arranged graph is fully visible
  const autoLayoutCanvas = useCallback(() => {
    useWorkflowStore.getState().autoLayout();
    requestAnimationFrame(() => {
      reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 300 });
    });
  }, []);

  // Workflow problems panel — opened here or automatically on a
  // VALIDATION_ERROR from save/export (see App.handleError). Hidden while
  // a sub-agent flow is being edited: the canvas then holds the sub-flow's
  // nodes, which are not the workflow the validator would report on.
  const isProblemsPanelOpen = useWorkflowStore((state) => state.isProblemsPanelOpen);
  const activeSubAgentFlowId = useWorkflowStore((state) => state.activeSubAgentFlowId);
  const openProblemsPanel = useCallback(() => {
    useWorkflowStore.getState().openProblemsPanel();
  }, []);
  const closeProblemsPanel = useCallback(() => {
    useWorkflowStore.getState().closeProblemsPanel();
  }, []);
  const isProblemsPanelVisible = isProblemsPanelOpen && activeSubAgentFlowId === null;

  // Picker entries for the edge-drop menu: dialog-free node types are
  // created directly; dialog-based types (Sub-Agent, Skill, MCP, Codex)
  // stash the pending connection in the store and ask NodePalette to open
  // the matching creation dialog — the created node then lands at the drop
  // point pre-wired (addNode consumes the pending connection). Gating
  // mirrors the palette: interactive/session and Sub-Agent types are hidden
  // while editing a sub-agent flow, Codex requires the beta toggle.
  const isCodexEnabled = useRefinementStore((state) => state.isCodexEnabled);
  const edgeDropEntries = useMemo<CanvasContextMenuEntry[]>(() => {
    if (!edgeDropMenu) return [];
    const pick = (type: SimpleNodeType) => () => {
      const node = createDefaultNode(type, edgeDropMenu.flowPosition, t);
      useWorkflowStore.getState().addNodeWithConnection(node, {
        source: edgeDropMenu.source.nodeId,
        sourceHandle: edgeDropMenu.source.handleId,
        target: node.id,
        targetHandle: null,
      });
    };
    const pickDialog = (dialog: 'subAgent' | 'skill' | 'mcp' | 'codex') => () => {
      const store = useWorkflowStore.getState();
      store.setPendingConnection({
        source: edgeDropMenu.source.nodeId,
        sourceHandle: edgeDropMenu.source.handleId,
        position: edgeDropMenu.flowPosition,
      });
      store.setPaletteDialogRequest(dialog);
    };
    return [
      {
        key: 'prompt',
        label: t('node.prompt.title'),
        icon: <MessageSquare size={14} />,
        onSelect: pick('prompt'),
      },
      ...(activeSubAgentFlowId === null
        ? ([
            {
              key: 'subAgent',
              label: t('node.subAgent.title'),
              icon: <Bot size={14} />,
              onSelect: pickDialog('subAgent'),
            },
          ] satisfies CanvasContextMenuEntry[])
        : []),
      {
        key: 'skill',
        label: t('node.skill.title'),
        icon: <Zap size={14} />,
        onSelect: pickDialog('skill'),
      },
      {
        key: 'mcp',
        label: t('node.mcp.title'),
        icon: <Plug size={14} />,
        onSelect: pickDialog('mcp'),
      },
      ...(isCodexEnabled
        ? ([
            {
              key: 'codex',
              label: t('node.codex.title'),
              icon: <Terminal size={14} />,
              onSelect: pickDialog('codex'),
            },
          ] satisfies CanvasContextMenuEntry[])
        : []),
      'separator',
      {
        key: 'ifElse',
        label: t('node.ifElse.title'),
        icon: <GitBranch size={14} />,
        onSelect: pick('ifElse'),
      },
      {
        key: 'switch',
        label: t('node.switch.title'),
        icon: <GitFork size={14} />,
        onSelect: pick('switch'),
      },
      ...(activeSubAgentFlowId === null
        ? ([
            {
              key: 'askUserQuestion',
              label: t('node.askUserQuestion.title'),
              icon: <ShieldQuestion size={14} />,
              onSelect: pick('askUserQuestion'),
            },
            {
              key: 'branchSession',
              label: t('node.branchSession.title'),
              icon: <GitBranchPlus size={14} />,
              onSelect: pick('branchSession'),
            },
          ] satisfies CanvasContextMenuEntry[])
        : []),
      'separator',
      {
        key: 'end',
        label: t('node.end.title'),
        icon: <Square size={14} />,
        onSelect: pick('end'),
      },
    ];
  }, [edgeDropMenu, t, activeSubAgentFlowId, isCodexEnabled]);

  // Validation issues for the problems panel and the on-canvas node markers.
  // Computed here (not in the panel) so a single validation pass feeds both;
  // skipped entirely while the panel is closed.
  const workflowName = useWorkflowStore((state) => state.workflowName);
  const workflowDescription = useWorkflowStore((state) => state.workflowDescription);
  const subAgentFlows = useWorkflowStore((state) => state.subAgentFlows);
  const slashCommandOptions = useWorkflowStore((state) => state.slashCommandOptions);
  const workflowIssues = useMemo(
    () =>
      isProblemsPanelVisible
        ? collectWorkflowIssues(
            nodes,
            edges,
            workflowName,
            workflowDescription || undefined,
            subAgentFlows.length > 0 ? subAgentFlows : undefined,
            slashCommandOptions
          )
        : [],
    [
      isProblemsPanelVisible,
      nodes,
      edges,
      workflowName,
      workflowDescription,
      subAgentFlows,
      slashCommandOptions,
    ]
  );

  // Problems-count badge on the toolbar button. While the panel is open the
  // live workflowIssues result is reused (same single validation pass);
  // while it is closed the count is recomputed in a debounced effect so
  // rapid edits/drags trigger at most one validation pass per pause.
  // An empty canvas shows no badge — a brand-new workflow isn't nagged.
  const [idleIssueCount, setIdleIssueCount] = useState(0);
  useEffect(() => {
    if (isProblemsPanelVisible) {
      return undefined;
    }
    if (nodes.length === 0) {
      setIdleIssueCount(0);
      return undefined;
    }
    const timer = setTimeout(() => {
      setIdleIssueCount(
        collectWorkflowIssues(
          nodes,
          edges,
          workflowName,
          workflowDescription || undefined,
          subAgentFlows.length > 0 ? subAgentFlows : undefined,
          slashCommandOptions
        ).length
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [
    isProblemsPanelVisible,
    nodes,
    edges,
    workflowName,
    workflowDescription,
    subAgentFlows,
    slashCommandOptions,
  ]);
  const problemCount = isProblemsPanelVisible
    ? workflowIssues.length
    : nodes.length === 0
      ? 0
      : idleIssueCount;

  // Mark every node the problems panel points at with a red ring + badge
  // (styles/nodes.css `.wf-problem-node`), so the user can see all offending
  // nodes at a glance while the panel is open.
  const displayNodes = useMemo(() => {
    const problemNodeIds = new Set(
      workflowIssues.flatMap((issue) => (issue.nodeId !== null ? [issue.nodeId] : []))
    );
    if (problemNodeIds.size === 0) {
      return nodes;
    }
    return nodes.map((node) =>
      problemNodeIds.has(node.id)
        ? {
            ...node,
            className: node.className ? `${node.className} wf-problem-node` : 'wf-problem-node',
          }
        : node
    );
  }, [nodes, workflowIssues]);

  // Keyboard event handlers for modifier key and undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        setIsModifierKeyPressed(true);
      }

      const mod = event.metaKey || event.ctrlKey;

      // Any non-arrow key seals an active nudge burst right away so a
      // follow-up edit (or undo) inside the idle window is tracked normally.
      // Modifier keydowns (Shift for the ×4 step, bare Ctrl/Cmd) don't seal.
      if (
        nudgeBurstRef.current.active &&
        NUDGE_ARROW_DIFFS[event.key] === undefined &&
        event.key !== 'Shift' &&
        event.key !== 'Control' &&
        event.key !== 'Meta' &&
        event.key !== 'Alt'
      ) {
        const burst = nudgeBurstRef.current;
        if (burst.timer !== null) window.clearTimeout(burst.timer);
        burst.timer = null;
        burst.active = false;
        useWorkflowStore.temporal.getState().resume();
      }

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

      // `?` opens the shortcut cheat sheet (typed as Shift+/ on most
      // layouts, so only the plain-modifier state is checked)
      if (event.key === '?' && !mod && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        event.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // F8 / Shift+F8 — jump to the next / previous node with a validation
      // problem (VSCode's "go to next problem" convention). Opens the
      // problems panel so the list and node markers explain the jump.
      if (event.key === 'F8' && !mod && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        const state = useWorkflowStore.getState();
        // The panel and its issues describe the main workflow, not the
        // sub-agent flow currently on the canvas
        if (state.activeSubAgentFlowId !== null) return;
        event.preventDefault();
        if (!state.isProblemsPanelOpen) state.openProblemsPanel();
        const issues = collectWorkflowIssues(
          state.nodes,
          state.edges,
          state.workflowName,
          state.workflowDescription || undefined,
          state.subAgentFlows.length > 0 ? state.subAgentFlows : undefined,
          state.slashCommandOptions
        );
        const problemNodeIds = [
          ...new Set(issues.flatMap((issue) => (issue.nodeId !== null ? [issue.nodeId] : []))),
        ].filter((id) => state.nodes.some((n) => n.id === id));
        const instance = reactFlowInstanceRef.current;
        if (problemNodeIds.length === 0 || !instance) return;
        const selectedId = state.nodes.find((n) => n.selected)?.id;
        const currentIndex = selectedId ? problemNodeIds.indexOf(selectedId) : -1;
        const nextIndex = event.shiftKey
          ? currentIndex <= 0
            ? problemNodeIds.length - 1
            : currentIndex - 1
          : currentIndex === -1 || currentIndex === problemNodeIds.length - 1
            ? 0
            : currentIndex + 1;
        jumpToNode(instance, problemNodeIds[nextIndex]);
        return;
      }

      // Esc — dismiss the search panel, then the problems panel (topmost
      // transient UI first, VSCode's layered Esc). Editable targets keep
      // their own Esc (search input, inline group rename); open dialogs
      // and context menus own their dismissal and are skipped here.
      if (event.key === 'Escape' && !mod && !event.altKey && !event.shiftKey) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        if (escTargetsRef.current.isMenuOpen) return;
        if (document.querySelector('[role="dialog"]')) return;
        if (escTargetsRef.current.isSearchOpen) {
          event.preventDefault();
          setIsSearchOpen(false);
          return;
        }
        const state = useWorkflowStore.getState();
        // Only when the panel is actually visible — while a sub-agent flow
        // is being edited the open flag may be set but the panel is hidden
        if (state.isProblemsPanelOpen && state.activeSubAgentFlowId === null) {
          event.preventDefault();
          state.closeProblemsPanel();
        }
        return;
      }

      // Arrow keys — nudge the selected node(s) one grid step (Shift: ×4).
      // While a node (or the multi-selection rect) has DOM focus, React
      // Flow's built-in a11y handler has already moved the selection by the
      // time the event bubbles here, so this branch only moves it for every
      // other focus target — making the nudge work from anywhere on the
      // canvas (e.g. right after an F8 / search jump). Either way the burst
      // is coalesced into ONE undo entry: the first press records the
      // pre-burst state, then tracking pauses until the keys go idle (the
      // drag handlers' pause/resume pattern).
      const nudgeDiff = NUDGE_ARROW_DIFFS[event.key];
      if (nudgeDiff !== undefined && !mod && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        // Menus and dialogs own their arrow-key navigation
        if (escTargetsRef.current.isMenuOpen) return;
        if (document.querySelector('[role="dialog"]')) return;
        // A mouse drag owns the temporal pause/resume cycle — don't interleave
        if (preDragNodesRef.current !== null) return;
        const state = useWorkflowStore.getState();
        if (!state.nodes.some((n) => n.selected)) return;
        event.preventDefault();
        const builtInHandled = Boolean(
          target?.closest?.('.react-flow__node, .react-flow__nodesselection-rect')
        );
        if (!builtInHandled) {
          const step = NUDGE_STEP * (event.shiftKey ? NUDGE_SHIFT_FACTOR : 1);
          state.nudgeSelection(nudgeDiff.x * step, nudgeDiff.y * step);
        }
        const burst = nudgeBurstRef.current;
        useWorkflowStore.temporal.getState().pause();
        burst.active = true;
        if (burst.timer !== null) window.clearTimeout(burst.timer);
        burst.timer = window.setTimeout(() => {
          burst.timer = null;
          burst.active = false;
          useWorkflowStore.temporal.getState().resume();
        }, NUDGE_UNDO_IDLE_MS);
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
        if (key === 'f' && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          openSearch();
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
        if (key === 'g' && !event.shiftKey && !event.altKey) {
          const { nodes: currentNodes, groupSelection } = useWorkflowStore.getState();
          const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
          if (selectedIds.length > 0) {
            // Eligibility (≥2 groupable nodes) is re-checked by the store
            event.preventDefault();
            groupSelection(selectedIds);
          }
        }
        if (key === 'g' && event.shiftKey && !event.altKey) {
          const { nodes: currentNodes, ungroupSelection } = useWorkflowStore.getState();
          const selectedIds = currentNodes.filter((n) => n.selected).map((n) => n.id);
          if (selectedIds.length > 0) {
            // Eligibility (selection contains a group) is re-checked by the store
            event.preventDefault();
            ungroupSelection(selectedIds);
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
      // Seal any open nudge burst — undo tracking must not stay paused
      // after this handler is gone
      if (nudgeBurstRef.current.timer !== null) {
        window.clearTimeout(nudgeBurstRef.current.timer);
        nudgeBurstRef.current.timer = null;
      }
      if (nudgeBurstRef.current.active) {
        nudgeBurstRef.current.active = false;
        useWorkflowStore.temporal.getState().resume();
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
    };
  }, [openSearch]);

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
    // Same ride-along policy as the store's alignSelection: children whose
    // group is also selected move with the group and don't count
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    const alignableCount = nodes.filter(
      (n) => n.selected && !(n.parentId && selectedIds.has(n.parentId))
    ).length;
    // Same eligibility as the store's groupSelection: groups never nest,
    // ride-along children stay with their selected group
    const groupableCount = nodes.filter(
      (n) => n.selected && n.type !== 'group' && !(n.parentId && selectedIds.has(n.parentId))
    ).length;
    const hasSelectedGroup = nodes.some((n) => n.selected && n.type === 'group');
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
      {
        key: 'groupSelection',
        label: t('contextMenu.groupSelection'),
        icon: <Group size={14} />,
        shortcut: `${mod}G`,
        disabled: groupableCount < 2,
        onSelect: groupSelectionFromMenu,
      },
      {
        key: 'ungroupSelection',
        label: t('contextMenu.ungroupSelection'),
        icon: <Ungroup size={14} />,
        shortcut: isMac ? '⌘⇧G' : 'Ctrl+Shift+G',
        disabled: !hasSelectedGroup,
        onSelect: ungroupSelectionFromMenu,
      },
      ...(alignableCount >= 2
        ? ([
            'separator',
            {
              kind: 'iconRow',
              key: 'align',
              items: [
                {
                  key: 'alignLeft',
                  label: t('contextMenu.alignLeft'),
                  icon: <AlignStartVertical size={14} />,
                  onSelect: () => alignSelectionFromMenu('left'),
                },
                {
                  key: 'alignCenterH',
                  label: t('contextMenu.alignCenterHorizontal'),
                  icon: <AlignCenterVertical size={14} />,
                  onSelect: () => alignSelectionFromMenu('centerH'),
                },
                {
                  key: 'alignRight',
                  label: t('contextMenu.alignRight'),
                  icon: <AlignEndVertical size={14} />,
                  onSelect: () => alignSelectionFromMenu('right'),
                },
                {
                  key: 'alignTop',
                  label: t('contextMenu.alignTop'),
                  icon: <AlignStartHorizontal size={14} />,
                  onSelect: () => alignSelectionFromMenu('top'),
                },
                {
                  key: 'alignMiddle',
                  label: t('contextMenu.alignMiddle'),
                  icon: <AlignCenterHorizontal size={14} />,
                  onSelect: () => alignSelectionFromMenu('middle'),
                },
                {
                  key: 'alignBottom',
                  label: t('contextMenu.alignBottom'),
                  icon: <AlignEndHorizontal size={14} />,
                  onSelect: () => alignSelectionFromMenu('bottom'),
                },
              ],
            },
            {
              kind: 'iconRow',
              key: 'distribute',
              items: [
                {
                  key: 'distributeH',
                  label: t('contextMenu.distributeHorizontal'),
                  icon: <AlignHorizontalDistributeCenter size={14} />,
                  disabled: alignableCount < 3,
                  onSelect: () => distributeSelectionFromMenu('horizontal'),
                },
                {
                  key: 'distributeV',
                  label: t('contextMenu.distributeVertical'),
                  icon: <AlignVerticalDistributeCenter size={14} />,
                  disabled: alignableCount < 3,
                  onSelect: () => distributeSelectionFromMenu('vertical'),
                },
              ],
            },
          ] satisfies CanvasContextMenuEntry[])
        : []),
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
    groupSelectionFromMenu,
    ungroupSelectionFromMenu,
    alignSelectionFromMenu,
    distributeSelectionFromMenu,
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
          nodes={displayNodes}
          edges={animatedEdges}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
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
              onOpenSearch={openSearch}
              onAutoLayout={autoLayoutCanvas}
              onOpenProblems={activeSubAgentFlowId === null ? openProblemsPanel : undefined}
              problemCount={problemCount}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
            />
          </Panel>

          {/* Node Search Panel (Ctrl/Cmd+F) */}
          {isSearchOpen && (
            <Panel position="top-center">
              <NodeSearchPanel
                focusNonce={searchFocusNonce}
                onClose={() => setIsSearchOpen(false)}
              />
            </Panel>
          )}

          {/* Workflow Problems Panel (all validation issues, click-to-jump) */}
          {isProblemsPanelVisible && (
            <Panel position="bottom-center">
              <WorkflowProblemsPanel issues={workflowIssues} onClose={closeProblemsPanel} />
            </Panel>
          )}

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
        {edgeDropMenu && (
          <CanvasContextMenu
            x={edgeDropMenu.x}
            y={edgeDropMenu.y}
            entries={edgeDropEntries}
            onClose={closeEdgeDropMenu}
          />
        )}
        <KeyboardShortcutsDialog
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
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
