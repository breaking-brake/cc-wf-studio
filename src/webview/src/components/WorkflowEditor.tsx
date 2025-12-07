/**
 * Claude Code Workflow Studio - Workflow Editor Component
 *
 * Main React Flow canvas for visual workflow editing
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import { Sparkles } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  type Connection,
  Controls,
  type DefaultEdgeOptions,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
} from 'reactflow';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import { serializeWorkflow } from '../services/workflow-service';
import { useRefinementStore } from '../stores/refinement-store';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltip } from './common/StyledTooltip';
import { InteractionModeToggle } from './InteractionModeToggle';
import { AskUserQuestionNodeComponent } from './nodes/AskUserQuestionNode';
import { BranchNodeComponent } from './nodes/BranchNode';
import { EndNode } from './nodes/EndNode';
import { IfElseNodeComponent } from './nodes/IfElseNode';
// 新規ノードタイプのインポート
import { McpNodeComponent } from './nodes/McpNode/McpNode';
import { PromptNode } from './nodes/PromptNode';
import { SkillNodeComponent } from './nodes/SkillNode';
import { StartNode } from './nodes/StartNode';
import { SubAgentFlowNodeComponent } from './nodes/SubAgentFlowNode';
import { SubAgentNodeComponent } from './nodes/SubAgentNode';
import { SwitchNodeComponent } from './nodes/SwitchNode';

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
};

/**
 * Default edge options (memoized)
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
  style: { stroke: 'var(--vscode-foreground)', strokeWidth: 2 },
};

/**
 * Edge types (can be customized later)
 */
const edgeTypes: EdgeTypes = {};

/**
 * WorkflowEditor Component
 */
export const WorkflowEditor: React.FC = () => {
  const { t } = useTranslation();
  const isCompact = useIsCompactMode();

  // Get state and handlers from Zustand store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    interactionMode,
    activeWorkflow,
    setActiveWorkflow,
    workflowName,
  } = useWorkflowStore();

  const { openChat, initConversation, loadConversationHistory } = useRefinementStore();

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

      // すべての検証を通過
      return true;
    },
    [nodes]
  );

  // Memoize callbacks for performance (research.md section 3.1)
  const handleNodesChange = useCallback(onNodesChange, []);
  const handleEdgesChange = useCallback(onEdgesChange, []);
  const handleConnect = useCallback(onConnect, []);

  // Handle node selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

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

  // Handle opening AI refinement chat
  const handleOpenRefinementChat = useCallback(() => {
    // Serialize current workflow state to set as active workflow
    const currentWorkflow = serializeWorkflow(
      nodes,
      edges,
      workflowName || 'Untitled',
      'Created with Workflow Studio',
      activeWorkflow?.conversationHistory
    );
    setActiveWorkflow(currentWorkflow);

    // Load or initialize conversation history
    if (activeWorkflow?.conversationHistory) {
      loadConversationHistory(activeWorkflow.conversationHistory);
    } else {
      initConversation();
    }

    // Deselect node and open chat
    setSelectedNodeId(null);
    openChat();
  }, [
    nodes,
    edges,
    workflowName,
    activeWorkflow?.conversationHistory,
    setActiveWorkflow,
    loadConversationHistory,
    initConversation,
    setSelectedNodeId,
    openChat,
  ]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={isValidConnection}
        snapToGrid={true}
        snapGrid={snapGrid}
        panOnDrag={panOnDrag}
        selectionOnDrag={selectionOnDrag}
        fitView
        attributionPosition="bottom-left"
      >
        {/* Background grid */}
        <Background color="var(--vscode-panel-border)" gap={15} size={1} />

        {/* Controls (zoom, fit view, etc.) */}
        <Controls />

        {/* Mini map */}
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
              default:
                return 'var(--vscode-foreground)';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
          style={{
            backgroundColor: 'var(--vscode-editor-background)',
            border: '1px solid var(--vscode-panel-border)',
            width: isCompact ? 120 : 200,
            height: isCompact ? 80 : 150,
          }}
        />

        {/* Interaction Mode Toggle */}
        <Panel position="top-left">
          <InteractionModeToggle />
        </Panel>

        {/* AI Refinement Button */}
        <Panel position="top-right">
          <StyledTooltip content={t('toolbar.refineWithAI')} side="left">
            <button
              type="button"
              onClick={handleOpenRefinementChat}
              data-tour="ai-refine-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isCompact ? '0' : '6px',
                padding: isCompact ? '6px' : '6px 10px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                opacity: 0.9,
              }}
            >
              <Sparkles size={14} />
              {!isCompact && t('toolbar.refineWithAI')}
            </button>
          </StyledTooltip>
        </Panel>
      </ReactFlow>
    </div>
  );
};
