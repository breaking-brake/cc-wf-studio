/**
 * Claude Code Workflow Studio - Workflow Editor Component
 *
 * Main React Flow canvas for visual workflow editing
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import { PanelLeftOpen } from 'lucide-react';
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
} from 'reactflow';
import { CURRENT_ANNOUNCEMENT, cleanupDismissedAnnouncements } from '../constants/announcements';
import { useAutoFocusNode } from '../hooks/useAutoFocusNode';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { CanvasToolbar } from './CanvasToolbar';
import { FeatureAnnouncementBanner } from './common/FeatureAnnouncementBanner';
import { DescriptionPanel } from './DescriptionPanel';
// Custom edge with delete button
import { DeletableEdge } from './edges/DeletableEdge';
import { MinimapContainer } from './MinimapContainer';
import { AskUserQuestionNodeComponent } from './nodes/AskUserQuestionNode';
import { BranchNodeComponent } from './nodes/BranchNode';
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

      // Undo/Redo shortcuts — skip when focus is in editable elements
      const mod = event.metaKey || event.ctrlKey;
      if (mod) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        const key = event.key.toLowerCase();
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
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        setIsModifierKeyPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Minimap auto-show on scroll/pan/zoom (only for 'auto' mode)
  const minimapHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMoveStart = useCallback(() => {
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
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={animatedEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={handleNodeClick}
          onEdgeClick={() => syncSelectedNodeId(null)}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          isValidConnection={isValidConnection}
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
        {onOpenSample && onDismissEmptyState && onLoadWorkflow && (
          <StartMenu
            isOpen={showEmptyState}
            onOpenSample={onOpenSample}
            onStartFromScratch={onDismissEmptyState}
            onLoadWorkflow={onLoadWorkflow}
          />
        )}
      </div>
    </div>
  );
};
