/**
 * Claude Code Workflow Studio - Workflow State Store
 *
 * Zustand store for managing workflow state (nodes and edges)
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import type { Workflow } from '@shared/types/messages';
import type { Edge, Node, OnConnect, OnEdgesChange, OnNodesChange } from 'reactflow';
import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { create } from 'zustand';

// ============================================================================
// Store State Interface
// ============================================================================

interface WorkflowStore {
  // State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  pendingDeleteNodeIds: string[];

  // React Flow Change Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Setters
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;

  // Custom Actions
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  requestDeleteNode: (nodeId: string) => void;
  confirmDeleteNodes: () => void;
  cancelDeleteNodes: () => void;
  clearWorkflow: () => void;
  addGeneratedWorkflow: (workflow: Workflow) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * デフォルトのStartノード
 * ワークフローは常にStartノードから始まる
 */
const DEFAULT_START_NODE: Node = {
  id: 'start-node-default',
  type: 'start',
  position: { x: 100, y: 200 },
  data: { label: 'Start' },
};

/**
 * デフォルトのEndノード
 * ワークフローは常にEndノードで終わる
 */
const DEFAULT_END_NODE: Node = {
  id: 'end-node-default',
  type: 'end',
  position: { x: 600, y: 200 },
  data: { label: 'End' },
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Initial State - デフォルトでStartノードとEndノードを含む
  nodes: [DEFAULT_START_NODE, DEFAULT_END_NODE],
  edges: [],
  selectedNodeId: null,
  pendingDeleteNodeIds: [],

  // React Flow Change Handlers (integrates with React Flow's onChange events)
  onNodesChange: (changes) => {
    // Separate remove events from other changes
    const removeChanges = changes.filter((change) => change.type === 'remove');
    const otherChanges = changes.filter((change) => change.type !== 'remove');

    // Check if there are nodes to delete (excluding Start nodes)
    if (removeChanges.length > 0) {
      const nodeIdsToDelete = removeChanges
        .map((change) => {
          if (change.type === 'remove') {
            const nodeToRemove = get().nodes.find((node) => node.id === change.id);
            // Start nodeは削除不可
            if (nodeToRemove?.type === 'start') {
              console.warn('Cannot remove Start node: Start node is required for workflow');
              return null;
            }
            return change.id;
          }
          return null;
        })
        .filter((id): id is string => id !== null);

      // If there are nodes to delete, show confirmation dialog
      if (nodeIdsToDelete.length > 0) {
        set({ pendingDeleteNodeIds: nodeIdsToDelete });
        // Don't apply remove changes yet - wait for confirmation
      }
    }

    // Apply all non-remove changes immediately
    if (otherChanges.length > 0) {
      set({
        nodes: applyNodeChanges(otherChanges, get().nodes),
      });
    }
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  // Setters
  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),

  // Custom Actions
  updateNodeData: (nodeId: string, data: Partial<unknown>) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  addNode: (node: Node) => {
    set({
      nodes: [...get().nodes, node],
    });
  },

  removeNode: (nodeId: string) => {
    // Startノードの削除のみ防止
    // Endノードは自由に削除可能（Export時にバリデーション）
    const nodeToRemove = get().nodes.find((node) => node.id === nodeId);
    if (nodeToRemove?.type === 'start') {
      console.warn('Cannot remove Start node: Start node is required for workflow');
      return;
    }

    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    });
  },

  requestDeleteNode: (nodeId: string) => {
    // ×ボタンからの削除要求
    // Start nodeは削除不可
    const nodeToRemove = get().nodes.find((node) => node.id === nodeId);
    if (nodeToRemove?.type === 'start') {
      console.warn('Cannot remove Start node: Start node is required for workflow');
      return;
    }

    // 確認ダイアログを表示するために pendingDeleteNodeIds にセット
    set({ pendingDeleteNodeIds: [nodeId] });
  },

  confirmDeleteNodes: () => {
    const nodeIds = get().pendingDeleteNodeIds;
    if (nodeIds.length === 0) return;

    // Delete all pending nodes
    set({
      nodes: get().nodes.filter((node) => !nodeIds.includes(node.id)),
      edges: get().edges.filter(
        (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
      ),
      pendingDeleteNodeIds: [],
    });
  },

  cancelDeleteNodes: () => {
    set({ pendingDeleteNodeIds: [] });
  },

  clearWorkflow: () => {
    // StartノードとEndノードは保持し、他のノードとすべてのエッジをクリア
    set({
      nodes: [DEFAULT_START_NODE, DEFAULT_END_NODE],
      edges: [],
      selectedNodeId: null,
    });
  },

  addGeneratedWorkflow: (workflow: Workflow) => {
    // Convert workflow nodes to ReactFlow nodes
    const newNodes: Node[] = workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: {
        x: node.position.x,
        y: node.position.y,
      },
      data: node.data,
    }));

    // Convert workflow connections to ReactFlow edges
    const newEdges: Edge[] = workflow.connections.map((conn) => ({
      id: conn.id,
      source: conn.from,
      target: conn.to,
      sourceHandle: conn.fromPort,
      targetHandle: conn.toPort,
    }));

    // Find the first non-start/end node to select
    const firstSelectableNode = newNodes.find(
      (node) => node.type !== 'start' && node.type !== 'end'
    );

    // Completely replace existing workflow with generated workflow
    set({
      nodes: newNodes,
      edges: newEdges,
      selectedNodeId: firstSelectableNode?.id || null,
    });
  },
}));
