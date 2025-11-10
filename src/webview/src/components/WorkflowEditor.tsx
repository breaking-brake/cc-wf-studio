/**
 * Claude Code Workflow Studio - Workflow Editor Component
 *
 * Main React Flow canvas for visual workflow editing
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import type React from 'react';
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  type Connection,
  Controls,
  type DefaultEdgeOptions,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeTypes,
} from 'reactflow';
import { useWorkflowStore } from '../stores/workflow-store';
import { AskUserQuestionNodeComponent } from './nodes/AskUserQuestionNode';
import { BranchNodeComponent } from './nodes/BranchNode';
import { EndNode } from './nodes/EndNode';
import { IfElseNodeComponent } from './nodes/IfElseNode';
import { PromptNode } from './nodes/PromptNode';
// 新規ノードタイプのインポート
import { SkillNodeComponent } from './nodes/SkillNode';
import { StartNode } from './nodes/StartNode';
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
  // Get state and handlers from Zustand store
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setSelectedNodeId } =
    useWorkflowStore();

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

  return (
    <div style={{ width: '100%', height: '100%' }}>
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
              default:
                return 'var(--vscode-foreground)';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.5)"
          style={{
            backgroundColor: 'var(--vscode-editor-background)',
            border: '1px solid var(--vscode-panel-border)',
          }}
        />
      </ReactFlow>
    </div>
  );
};
