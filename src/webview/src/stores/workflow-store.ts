/**
 * Claude Code Workflow Studio - Workflow State Store
 *
 * Zustand store for managing workflow state (nodes and edges)
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import type { McpNodeData } from '@shared/types/mcp-node';
import { normalizeMcpNodeData } from '@shared/types/mcp-node';
import type { Workflow } from '@shared/types/messages';
import type { SubAgentFlow, WorkflowNode } from '@shared/types/workflow-definition';
import { NodeType } from '@shared/types/workflow-definition';
import type { Edge, Node, OnConnect, OnEdgesChange, OnNodesChange } from 'reactflow';
import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { create } from 'zustand';

// ============================================================================
// Store State Interface
// ============================================================================

/**
 * Canvas interaction mode
 * - pan: Hand tool mode (drag to pan canvas, Ctrl+drag to select)
 * - selection: Selection mode (drag to select, Ctrl+drag to pan)
 */
export type InteractionMode = 'pan' | 'selection';

/**
 * Snapshot of main workflow state for restoration after Sub-Agent Flow editing
 */
interface MainWorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  /** True if this is a new Sub-Agent Flow creation (not editing existing) */
  isNewSubAgentFlow: boolean;
}

interface WorkflowStore {
  // State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  pendingDeleteNodeIds: string[];
  activeWorkflow: Workflow | null;
  interactionMode: InteractionMode;
  workflowName: string;
  workflowDescription: string;
  isPropertyOverlayOpen: boolean;
  isMinimapVisible: boolean;
  isDescriptionPanelVisible: boolean;
  isFocusMode: boolean;
  /** If true, exports Slash Command with context: fork for isolated execution */
  contextFork: boolean;
  lastAddedNodeId: string | null;

  // Sub-Agent Flow State (Feature: 089-subworkflow)
  subAgentFlows: SubAgentFlow[];
  activeSubAgentFlowId: string | null;
  mainWorkflowSnapshot: MainWorkflowSnapshot | null;

  // React Flow Change Handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Setters
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  toggleInteractionMode: () => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;
  openPropertyOverlay: () => void;
  closePropertyOverlay: () => void;
  toggleMinimapVisibility: () => void;
  toggleDescriptionPanelVisibility: () => void;
  toggleFocusMode: () => void;
  setContextFork: (value: boolean) => void;

  // Custom Actions
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
  addNode: (node: Node) => void;
  clearLastAddedNodeId: () => void;
  removeNode: (nodeId: string) => void;
  requestDeleteNode: (nodeId: string) => void;
  confirmDeleteNodes: () => void;
  cancelDeleteNodes: () => void;
  clearWorkflow: () => void;
  addGeneratedWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflow: Workflow) => void;
  setActiveWorkflow: (workflow: Workflow) => void; // Phase 3.12
  updateActiveWorkflowMetadata: (updates: Partial<Workflow>) => void; // Update activeWorkflow without changing canvas
  ensureActiveWorkflow: () => void; // Ensure activeWorkflow exists (create from canvas if null)

  // Sub-Agent Flow Actions (Feature: 089-subworkflow)
  addSubAgentFlow: (subAgentFlow: SubAgentFlow) => void;
  removeSubAgentFlow: (id: string) => void;
  updateSubAgentFlow: (id: string, updates: Partial<SubAgentFlow>) => void;
  setActiveSubAgentFlowId: (id: string | null) => void;
  setSubAgentFlows: (subAgentFlows: SubAgentFlow[]) => void;
  cancelSubAgentFlowEditing: () => void;
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

/**
 * Phase 3.12: 空のワークフローを生成するヘルパー関数
 * StartノードとEndノードのみを持つ最小限のワークフローを作成
 */
export function createEmptyWorkflow(): Workflow {
  const now = new Date();

  return {
    id: `workflow-${Date.now()}-${Math.random()}`,
    name: 'Untitled Workflow',
    description: 'Created with AI refinement',
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    nodes: [
      {
        id: 'start-node-default',
        name: 'Start',
        type: NodeType.Start,
        position: { x: 100, y: 200 },
        data: { label: 'Start' },
      },
      {
        id: 'end-node-default',
        name: 'End',
        type: NodeType.End,
        position: { x: 600, y: 200 },
        data: { label: 'End' },
      },
    ],
    connections: [],
    conversationHistory: undefined,
  };
}

/**
 * Phase 3.13: キャンバスの実際の状態からワークフローを生成するヘルパー関数
 * React FlowのNode/EdgeをWorkflow型に変換する
 *
 * @param nodes - React Flowのノード配列
 * @param edges - React Flowのエッジ配列
 * @returns Workflow - 生成されたワークフローオブジェクト
 */
export function createWorkflowFromCanvas(nodes: Node[], edges: Edge[]): Workflow {
  const now = new Date();

  // ノードが全くない場合はデフォルトのStart/Endノードを含める
  let workflowNodes: WorkflowNode[];
  if (nodes.length === 0) {
    workflowNodes = [
      {
        id: 'start-node-default',
        name: 'Start',
        type: NodeType.Start,
        position: { x: 100, y: 200 },
        data: { label: 'Start' },
      },
      {
        id: 'end-node-default',
        name: 'End',
        type: NodeType.End,
        position: { x: 600, y: 200 },
        data: { label: 'End' },
      },
    ];
  } else {
    // React FlowのNodeをWorkflowNodeに変換
    workflowNodes = nodes.map((node) => ({
      id: node.id,
      name: node.data?.label || node.id,
      type: node.type as NodeType,
      position: node.position,
      data: node.data,
    })) as WorkflowNode[];
  }

  // React FlowのEdgeをConnectionに変換
  const connections = edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    fromPort: edge.sourceHandle || 'default',
    toPort: edge.targetHandle || 'default',
    condition: edge.data?.condition,
  }));

  return {
    id: `workflow-${Date.now()}-${Math.random()}`,
    name: 'Untitled Workflow',
    description: 'Created with AI refinement',
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
    nodes: workflowNodes,
    connections,
    conversationHistory: undefined,
  };
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Initial State - デフォルトでStartノードとEndノードを含む
  nodes: [DEFAULT_START_NODE, DEFAULT_END_NODE],
  edges: [],
  selectedNodeId: null,
  pendingDeleteNodeIds: [],
  activeWorkflow: null,
  interactionMode: 'pan', // Default: pan mode
  workflowName: 'my-workflow', // Default workflow name
  workflowDescription: '', // Default workflow description
  isPropertyOverlayOpen: true, // Property overlay is open by default
  isMinimapVisible: (() => {
    const saved = localStorage.getItem('cc-wf-studio.minimapVisible');
    return saved !== null ? saved === 'true' : true; // Default: visible
  })(),
  isDescriptionPanelVisible: (() => {
    const saved = localStorage.getItem('cc-wf-studio.descriptionPanelVisible');
    return saved !== null ? saved === 'true' : false; // Default: collapsed
  })(),
  isFocusMode: (() => {
    const saved = localStorage.getItem('cc-wf-studio.focusMode');
    return saved !== null ? saved === 'true' : false; // Default: off
  })(),
  contextFork: false,
  lastAddedNodeId: null,

  // Sub-Agent Flow Initial State (Feature: 089-subworkflow)
  subAgentFlows: [],
  activeSubAgentFlowId: null,
  mainWorkflowSnapshot: null,

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

  setSelectedNodeId: (selectedNodeId) => {
    // When a node is selected, auto-open the property overlay
    if (selectedNodeId !== null) {
      set({ selectedNodeId, isPropertyOverlayOpen: true });
    } else {
      set({ selectedNodeId });
    }
  },

  setInteractionMode: (interactionMode) => set({ interactionMode }),

  toggleInteractionMode: () => {
    const currentMode = get().interactionMode;
    set({ interactionMode: currentMode === 'pan' ? 'selection' : 'pan' });
  },

  setWorkflowName: (workflowName) => set({ workflowName }),

  setWorkflowDescription: (workflowDescription) => set({ workflowDescription }),

  openPropertyOverlay: () => set({ isPropertyOverlayOpen: true }),

  closePropertyOverlay: () => set({ isPropertyOverlayOpen: false }),

  toggleMinimapVisibility: () => {
    const newValue = !get().isMinimapVisible;
    localStorage.setItem('cc-wf-studio.minimapVisible', newValue.toString());
    set({ isMinimapVisible: newValue });
  },

  toggleDescriptionPanelVisibility: () => {
    const newValue = !get().isDescriptionPanelVisible;
    localStorage.setItem('cc-wf-studio.descriptionPanelVisible', newValue.toString());
    set({ isDescriptionPanelVisible: newValue });
  },

  toggleFocusMode: () => {
    const newValue = !get().isFocusMode;
    localStorage.setItem('cc-wf-studio.focusMode', newValue.toString());
    set({ isFocusMode: newValue });
  },

  setContextFork: (contextFork: boolean) => set({ contextFork }),

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
      lastAddedNodeId: node.id,
      selectedNodeId: node.id,
      isPropertyOverlayOpen: true,
    });
  },

  clearLastAddedNodeId: () => {
    set({ lastAddedNodeId: null });
  },

  removeNode: (nodeId: string) => {
    // Startノードの削除のみ防止
    // Endノードは自由に削除可能（Export時にバリデーション）
    const nodeToRemove = get().nodes.find((node) => node.id === nodeId);
    if (nodeToRemove?.type === 'start') {
      console.warn('Cannot remove Start node: Start node is required for workflow');
      return;
    }

    // Clear selection if the deleted node is currently selected
    const shouldClearSelection = get().selectedNodeId === nodeId;

    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      ...(shouldClearSelection && { selectedNodeId: null }),
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

    // Clear selection if the deleted node is currently selected
    const currentSelectedNodeId = get().selectedNodeId;
    const shouldClearSelection =
      currentSelectedNodeId !== null && nodeIds.includes(currentSelectedNodeId);

    // Delete all pending nodes
    set({
      nodes: get().nodes.filter((node) => !nodeIds.includes(node.id)),
      edges: get().edges.filter(
        (edge) => !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
      ),
      pendingDeleteNodeIds: [],
      ...(shouldClearSelection && { selectedNodeId: null }),
    });
  },

  cancelDeleteNodes: () => {
    set({ pendingDeleteNodeIds: [] });
  },

  clearWorkflow: () => {
    const { activeWorkflow } = get();

    // StartノードとEndノードは保持し、他のノードとすべてのエッジをクリア
    set({
      nodes: [DEFAULT_START_NODE, DEFAULT_END_NODE],
      edges: [],
      selectedNodeId: null,
      workflowDescription: '', // Reset description
      contextFork: false, // Reset context fork setting
      // Sub-Agent Flow関連の状態をクリア
      subAgentFlows: [],
      activeSubAgentFlowId: null,
      mainWorkflowSnapshot: null,
      // activeWorkflow の conversationHistory と subAgentFlows をクリア
      activeWorkflow: activeWorkflow
        ? {
            ...activeWorkflow,
            conversationHistory: undefined,
            subAgentFlows: undefined,
          }
        : null,
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
      // Normalize MCP node data for backwards compatibility
      data: node.type === 'mcp' ? normalizeMcpNodeData(node.data as McpNodeData) : node.data,
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
    // Also include subAgentFlows from the generated workflow
    set({
      nodes: newNodes,
      edges: newEdges,
      selectedNodeId: firstSelectableNode?.id || null,
      activeWorkflow: workflow,
      subAgentFlows: workflow.subAgentFlows || [],
    });
  },

  updateWorkflow: (workflow: Workflow) => {
    // Convert workflow nodes to ReactFlow nodes
    const newNodes: Node[] = workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: {
        x: node.position.x,
        y: node.position.y,
      },
      // Normalize MCP node data for backwards compatibility
      data: node.type === 'mcp' ? normalizeMcpNodeData(node.data as McpNodeData) : node.data,
    }));

    // Convert workflow connections to ReactFlow edges
    const newEdges: Edge[] = workflow.connections.map((conn) => ({
      id: conn.id,
      source: conn.from,
      target: conn.to,
      sourceHandle: conn.fromPort,
      targetHandle: conn.toPort,
    }));

    // Update workflow while preserving selection
    // Also include subAgentFlows from the refined workflow
    set({
      nodes: newNodes,
      edges: newEdges,
      activeWorkflow: workflow,
      subAgentFlows: workflow.subAgentFlows || [],
    });
  },

  // Phase 3.12: Set active workflow and update canvas
  setActiveWorkflow: (workflow: Workflow) => {
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

    // Set active workflow and update canvas
    // Also load subAgentFlows from the workflow if present
    set({
      nodes: newNodes,
      edges: newEdges,
      activeWorkflow: workflow,
      subAgentFlows: workflow.subAgentFlows || [],
    });
  },

  updateActiveWorkflowMetadata: (updates: Partial<Workflow>) => {
    const { activeWorkflow } = get();
    if (!activeWorkflow) return;

    // Update only activeWorkflow without changing canvas (nodes/edges)
    // This is used when editing SubAgentFlow to update parent workflow metadata
    // without overwriting the SubAgentFlow canvas
    set({
      activeWorkflow: {
        ...activeWorkflow,
        ...updates,
      },
      // Also sync subAgentFlows if it's being updated
      ...(updates.subAgentFlows !== undefined && {
        subAgentFlows: updates.subAgentFlows,
      }),
    });
  },

  ensureActiveWorkflow: () => {
    const { activeWorkflow, nodes, edges, workflowName, subAgentFlows } = get();

    // If activeWorkflow already exists, do nothing
    if (activeWorkflow) return;

    // Create activeWorkflow from current canvas state
    const now = new Date();
    const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
      id: node.id,
      name: node.data?.label || node.id,
      type: node.type as NodeType,
      position: node.position,
      data: node.data,
    })) as WorkflowNode[];

    const connections = edges.map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      fromPort: edge.sourceHandle || 'default',
      toPort: edge.targetHandle || 'default',
    }));

    const newWorkflow: Workflow = {
      id: `workflow-${now.getTime()}`,
      name: workflowName,
      version: '1.0.0',
      schemaVersion: '1.2.0',
      nodes: workflowNodes,
      connections,
      createdAt: now,
      updatedAt: now,
      subAgentFlows: subAgentFlows.length > 0 ? subAgentFlows : undefined,
    };

    set({ activeWorkflow: newWorkflow });
  },

  // ============================================================================
  // Sub-Agent Flow Actions (Feature: 089-subworkflow)
  // ============================================================================

  addSubAgentFlow: (subAgentFlow: SubAgentFlow) => {
    set({
      subAgentFlows: [...get().subAgentFlows, subAgentFlow],
    });
  },

  removeSubAgentFlow: (id: string) => {
    // If currently editing this sub-agent flow, return to main workflow first
    if (get().activeSubAgentFlowId === id) {
      const snapshot = get().mainWorkflowSnapshot;
      if (snapshot) {
        set({
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          selectedNodeId: snapshot.selectedNodeId,
          activeSubAgentFlowId: null,
          mainWorkflowSnapshot: null,
        });
      }
    }

    set({
      subAgentFlows: get().subAgentFlows.filter((sf) => sf.id !== id),
    });
  },

  updateSubAgentFlow: (id: string, updates: Partial<SubAgentFlow>) => {
    set({
      subAgentFlows: get().subAgentFlows.map((sf) => (sf.id === id ? { ...sf, ...updates } : sf)),
    });
  },

  setActiveSubAgentFlowId: (id: string | null) => {
    const currentActiveId = get().activeSubAgentFlowId;

    // If switching from main to sub-agent flow
    if (currentActiveId === null && id !== null) {
      // Determine if this is a new Sub-Agent Flow (no existing reference node)
      const isNewSubAgentFlow = !get().nodes.some(
        (n) => n.type === 'subAgentFlow' && n.data?.subAgentFlowId === id
      );

      // Save current main workflow state
      const snapshot: MainWorkflowSnapshot = {
        nodes: get().nodes,
        edges: get().edges,
        selectedNodeId: get().selectedNodeId,
        isNewSubAgentFlow,
      };

      // Find the sub-agent flow to edit
      const subAgentFlow = get().subAgentFlows.find((sf) => sf.id === id);
      if (!subAgentFlow) {
        console.warn(`SubAgentFlow with id ${id} not found`);
        return;
      }

      // Convert SubAgentFlow nodes to ReactFlow nodes
      const subNodes: Node[] = subAgentFlow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: { x: node.position.x, y: node.position.y },
        data: node.data,
      }));

      // Convert SubAgentFlow connections to ReactFlow edges
      const subEdges: Edge[] = subAgentFlow.connections.map((conn) => ({
        id: conn.id,
        source: conn.from,
        target: conn.to,
        sourceHandle: conn.fromPort,
        targetHandle: conn.toPort,
      }));

      set({
        mainWorkflowSnapshot: snapshot,
        nodes: subNodes,
        edges: subEdges,
        selectedNodeId: null,
        activeSubAgentFlowId: id,
      });
    }
    // If switching from sub-agent flow back to main
    else if (currentActiveId !== null && id === null) {
      // Save current sub-agent flow state before switching
      const currentSubAgentFlow = get().subAgentFlows.find((sf) => sf.id === currentActiveId);
      if (currentSubAgentFlow) {
        // Convert current canvas to SubAgentFlow format
        const updatedNodes: WorkflowNode[] = get().nodes.map((node) => ({
          id: node.id,
          name: node.data?.label || node.id,
          type: node.type as NodeType,
          position: node.position,
          data: node.data,
        })) as WorkflowNode[];

        const updatedConnections = get().edges.map((edge) => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          fromPort: edge.sourceHandle || 'default',
          toPort: edge.targetHandle || 'default',
        }));

        // Update the sub-agent flow with current canvas state
        set({
          subAgentFlows: get().subAgentFlows.map((sf) =>
            sf.id === currentActiveId
              ? { ...sf, nodes: updatedNodes, connections: updatedConnections }
              : sf
          ),
        });
      }

      // Restore main workflow state
      const snapshot = get().mainWorkflowSnapshot;
      if (snapshot) {
        // Check if SubAgentFlowNode already exists for this sub-agent flow
        const hasRef = snapshot.nodes.some(
          (n) => n.type === 'subAgentFlow' && n.data?.subAgentFlowId === currentActiveId
        );

        // Get the updated sub-agent flow (with latest name)
        const subAgentFlow = get().subAgentFlows.find((sf) => sf.id === currentActiveId);

        // Auto-add SubAgentFlowRefNode if it doesn't exist
        if (!hasRef && subAgentFlow) {
          // Calculate non-overlapping position
          const calculatePosition = (
            existingNodes: Node[],
            defaultX: number,
            defaultY: number
          ): { x: number; y: number } => {
            const OVERLAP_THRESHOLD = 50;
            const OFFSET_X = 100;
            const OFFSET_Y = 80;
            const MAX_ATTEMPTS = 20;

            let newX = defaultX;
            let newY = defaultY;

            for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
              const hasOverlap = existingNodes.some((node) => {
                const dx = Math.abs(node.position.x - newX);
                const dy = Math.abs(node.position.y - newY);
                return dx < OVERLAP_THRESHOLD && dy < OVERLAP_THRESHOLD;
              });

              if (!hasOverlap) {
                return { x: newX, y: newY };
              }

              newX += OFFSET_X;
              newY += OFFSET_Y;
            }

            return { x: newX, y: newY };
          };

          const position = calculatePosition(snapshot.nodes, 350, 200);
          const newRefNode: Node = {
            id: `subagentflow-${Date.now()}`,
            type: 'subAgentFlow',
            position,
            data: {
              subAgentFlowId: currentActiveId,
              label: subAgentFlow.name,
              description: subAgentFlow.description || '',
              outputPorts: 1,
            },
          };

          set({
            nodes: [...snapshot.nodes, newRefNode],
            edges: snapshot.edges,
            selectedNodeId: newRefNode.id,
            activeSubAgentFlowId: null,
            mainWorkflowSnapshot: null,
          });
        } else {
          // Update existing SubAgentFlowNode with latest name and description
          const updatedNodes = snapshot.nodes.map((node) => {
            if (
              node.type === 'subAgentFlow' &&
              node.data?.subAgentFlowId === currentActiveId &&
              subAgentFlow
            ) {
              return {
                ...node,
                data: {
                  ...node.data,
                  label: subAgentFlow.name,
                  description: subAgentFlow.description || '',
                },
              };
            }
            return node;
          });

          set({
            nodes: updatedNodes,
            edges: snapshot.edges,
            selectedNodeId: snapshot.selectedNodeId,
            activeSubAgentFlowId: null,
            mainWorkflowSnapshot: null,
          });
        }
      }
    }
    // If switching between sub-agent flows
    else if (currentActiveId !== null && id !== null && currentActiveId !== id) {
      // First save current sub-agent flow
      const currentSubAgentFlow = get().subAgentFlows.find((sf) => sf.id === currentActiveId);
      if (currentSubAgentFlow) {
        const updatedNodes: WorkflowNode[] = get().nodes.map((node) => ({
          id: node.id,
          name: node.data?.label || node.id,
          type: node.type as NodeType,
          position: node.position,
          data: node.data,
        })) as WorkflowNode[];

        const updatedConnections = get().edges.map((edge) => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          fromPort: edge.sourceHandle || 'default',
          toPort: edge.targetHandle || 'default',
        }));

        set({
          subAgentFlows: get().subAgentFlows.map((sf) =>
            sf.id === currentActiveId
              ? { ...sf, nodes: updatedNodes, connections: updatedConnections }
              : sf
          ),
        });
      }

      // Then load new sub-agent flow
      const newSubAgentFlow = get().subAgentFlows.find((sf) => sf.id === id);
      if (!newSubAgentFlow) {
        console.warn(`SubAgentFlow with id ${id} not found`);
        return;
      }

      const subNodes: Node[] = newSubAgentFlow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: { x: node.position.x, y: node.position.y },
        data: node.data,
      }));

      const subEdges: Edge[] = newSubAgentFlow.connections.map((conn) => ({
        id: conn.id,
        source: conn.from,
        target: conn.to,
        sourceHandle: conn.fromPort,
        targetHandle: conn.toPort,
      }));

      set({
        nodes: subNodes,
        edges: subEdges,
        selectedNodeId: null,
        activeSubAgentFlowId: id,
      });
    }
  },

  setSubAgentFlows: (subAgentFlows: SubAgentFlow[]) => {
    set({ subAgentFlows });
  },

  cancelSubAgentFlowEditing: () => {
    const currentActiveId = get().activeSubAgentFlowId;
    if (currentActiveId === null) {
      return; // Not in sub-agent flow editing mode
    }

    // Restore main workflow from snapshot (without saving sub-agent flow changes)
    const snapshot = get().mainWorkflowSnapshot;
    if (snapshot) {
      set({
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        selectedNodeId: snapshot.selectedNodeId,
        activeSubAgentFlowId: null,
        mainWorkflowSnapshot: null,
      });

      // Only remove the sub-agent flow if it was newly created (not editing existing)
      // For existing sub-agent flows, cancel just discards canvas changes (name is managed locally in dialog)
      if (snapshot.isNewSubAgentFlow) {
        set({
          subAgentFlows: get().subAgentFlows.filter((sf) => sf.id !== currentActiveId),
        });
      }
    }
  },
}));

/**
 * Check if the current canvas has unsaved changes compared to activeWorkflow
 *
 * @returns true if there are unsaved changes
 */
export function hasUnsavedChanges(): boolean {
  const { nodes, edges, activeWorkflow, workflowName } = useWorkflowStore.getState();

  // If no activeWorkflow, check if canvas is in default state (only Start + End nodes)
  if (!activeWorkflow) {
    // Check if we have more than the default Start and End nodes
    if (nodes.length !== 2) return true;

    const hasStart = nodes.some((n) => n.type === 'start');
    const hasEnd = nodes.some((n) => n.type === 'end');
    if (!hasStart || !hasEnd) return true;

    // Check if there are any edges
    if (edges.length > 0) return true;

    // Check if workflow name is changed from default
    if (workflowName !== 'my-workflow') return true;

    return false;
  }

  // Compare node count
  if (nodes.length !== activeWorkflow.nodes.length) return true;

  // Compare edge count
  if (edges.length !== activeWorkflow.connections.length) return true;

  // Compare workflow name
  if (workflowName !== activeWorkflow.name) return true;

  // Compare node IDs and positions
  for (const node of nodes) {
    const savedNode = activeWorkflow.nodes.find((n) => n.id === node.id);
    if (!savedNode) return true;

    // Check position
    if (savedNode.position.x !== node.position.x || savedNode.position.y !== node.position.y) {
      return true;
    }

    // Check data (simple JSON comparison for non-function properties)
    const currentData = JSON.stringify(node.data || {});
    const savedData = JSON.stringify(savedNode.data || {});
    if (currentData !== savedData) return true;
  }

  // Compare edge connections
  for (const edge of edges) {
    const savedEdge = activeWorkflow.connections.find((c) => c.id === edge.id);
    if (!savedEdge) return true;

    if (
      savedEdge.from !== edge.source ||
      savedEdge.to !== edge.target ||
      savedEdge.fromPort !== (edge.sourceHandle || 'default') ||
      savedEdge.toPort !== (edge.targetHandle || 'default')
    ) {
      return true;
    }
  }

  return false;
}
