/**
 * Claude Code Workflow Studio - Workflow Editor Component
 *
 * Main React Flow canvas for visual workflow editing
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import { Activity, Lightbulb, LightbulbOff, PanelLeftOpen } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FeatureAnnouncementBanner } from './common/FeatureAnnouncementBanner';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';
import { DescriptionPanel } from './DescriptionPanel';
// Custom edge with delete button
import { DeletableEdge } from './edges/DeletableEdge';
import { InteractionModeToggle } from './InteractionModeToggle';
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
import { ScrollModeToggle } from './ScrollModeToggle';

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
}

/**
 * WorkflowEditor Component
 */
export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  isNodePaletteCollapsed = false,
  onExpandNodePalette,
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
    isHighlightEnabled,
    toggleHighlightEnabled,
    highlightedGroupNodeId,
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
    if (!hasHighlight && !hasSelection) return edges;

    return edges.map((edge) => {
      const isHighlightAnimated =
        hasHighlight &&
        (edge.source === highlightedGroupNodeId ||
          edge.target === highlightedGroupNodeId ||
          (highlightChildIds != null &&
            (highlightChildIds.has(edge.source) || highlightChildIds.has(edge.target))));

      const isSelectionAnimated =
        hasSelection &&
        (edge.selected ||
          edge.source === selectedNodeId ||
          edge.target === selectedNodeId ||
          (selectionChildIds != null &&
            (selectionChildIds.has(edge.source) || selectionChildIds.has(edge.target))));

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

  // Handle node drag stop (group containment logic)
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeDragStop(node);
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

  // Keyboard event handlers for modifier key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        setIsModifierKeyPressed(true);
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
          fitView
          attributionPosition="bottom-left"
        >
          {/* Background grid */}
          <Background color="var(--vscode-panel-border)" gap={15} size={1} />

          {/* Controls (zoom, fit view, etc.) */}
          <Controls />

          {/* Mini map with container */}
          <Panel position="bottom-right">
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
          </Panel>

          {/* Interaction Mode Toggle & Edge Animation Toggle */}
          <Panel position="top-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ScrollModeToggle />
              <InteractionModeToggle />
              <StyledTooltipProvider>
                <StyledTooltipItem
                  content={
                    isEdgeAnimationEnabled
                      ? t('toolbar.edgeAnimation.disable')
                      : t('toolbar.edgeAnimation.enable')
                  }
                >
                  <button
                    type="button"
                    onClick={() => setIsEdgeAnimationEnabled((prev) => !prev)}
                    aria-label={
                      isEdgeAnimationEnabled
                        ? t('toolbar.edgeAnimation.disable')
                        : t('toolbar.edgeAnimation.enable')
                    }
                    style={{
                      all: 'unset',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--vscode-editor-background)',
                      border: '1px solid var(--vscode-panel-border)',
                      cursor: 'pointer',
                      opacity: 0.85,
                      color: isEdgeAnimationEnabled
                        ? 'var(--vscode-foreground)'
                        : 'var(--vscode-disabledForeground)',
                    }}
                  >
                    <Activity size={14} />
                  </button>
                </StyledTooltipItem>
                <StyledTooltipItem
                  content={
                    isHighlightEnabled
                      ? t('toolbar.highlight.disable')
                      : t('toolbar.highlight.enable')
                  }
                >
                  <button
                    type="button"
                    onClick={toggleHighlightEnabled}
                    aria-label={
                      isHighlightEnabled
                        ? t('toolbar.highlight.disable')
                        : t('toolbar.highlight.enable')
                    }
                    style={{
                      all: 'unset',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--vscode-editor-background)',
                      border: highlightedGroupNodeId
                        ? '1px solid rgba(79, 195, 247, 0.6)'
                        : '1px solid var(--vscode-panel-border)',
                      cursor: 'pointer',
                      opacity: 0.85,
                      color: isHighlightEnabled
                        ? 'var(--vscode-foreground)'
                        : 'var(--vscode-disabledForeground)',
                      boxShadow: highlightedGroupNodeId
                        ? '0 0 8px rgba(79, 195, 247, 0.4)'
                        : 'none',
                      animation:
                        highlightedGroupNodeId &&
                        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                          ? 'highlight-btn-pulse 1.5s ease-in-out infinite'
                          : 'none',
                    }}
                  >
                    {isHighlightEnabled ? <Lightbulb size={14} /> : <LightbulbOff size={14} />}
                  </button>
                </StyledTooltipItem>
              </StyledTooltipProvider>
            </div>
          </Panel>

          {/* Description Panel for workflow description */}
          <Panel position="top-right">
            <DescriptionPanel />
          </Panel>

          {/* Expand Node Palette Button (when collapsed) */}
          {isNodePaletteCollapsed && onExpandNodePalette && (
            <Panel position="top-left" style={{ marginTop: '48px' }}>
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
      </div>
    </div>
  );
};
