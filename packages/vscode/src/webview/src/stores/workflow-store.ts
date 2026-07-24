/**
 * Claude Code Workflow Studio - Workflow State Store
 *
 * Zustand store for managing workflow state (nodes and edges)
 * Based on: /specs/001-cc-wf-studio/research.md section 3.4
 */

import type {
  HookEntry,
  HookType,
  SlashCommandContext,
  SlashCommandModel,
  SlashCommandOptions,
  SubAgentFlow,
  WorkflowHooks,
  WorkflowNode,
} from '@cc-wf-studio/core';
import { NodeType } from '@cc-wf-studio/core';
import type { McpNodeData } from '@cc-wf-studio/core/mcp';
import { normalizeMcpNodeData } from '@cc-wf-studio/core/mcp';
import type { Workflow } from '@shared/types/messages';
import type { Connection, Edge, Node, OnConnect, OnEdgesChange, OnNodesChange } from 'reactflow';
import { addEdge, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import { temporal } from 'zundo';
import { create } from 'zustand';
import {
  absoluteNodePosition,
  computeAutoLayout,
  GROUP_PADDING,
  nodeBoxSize,
} from '../utils/auto-layout';

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
 * Canvas scroll mode
 * - classic: Scroll wheel zooms (default ReactFlow behavior)
 * - freehand: Scroll wheel pans canvas (Miro/Figma-style), Ctrl+scroll to zoom
 */
export type ScrollMode = 'classic' | 'freehand';

// ============================================================================
// Selection Clipboard (Ctrl/Cmd+C / Ctrl/Cmd+V)
// ============================================================================

/** Marker distinguishing a cc-wf-studio selection payload from ordinary text */
export const SELECTION_CLIPBOARD_TYPE = 'cc-wf-studio/selection';

/** A node serialized for the clipboard — self-contained (a child copied
 *  without its group carries its absolute position and no parentId). */
export interface SelectionClipboardNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  parentId?: string;
  style?: Record<string, unknown>;
}

/** An edge serialized for the clipboard (both endpoints are payload nodes) */
export interface SelectionClipboardEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

/** Versioned clipboard payload written as plain text — the system clipboard
 *  carries it across canvas windows, so paste works between workflows. */
export interface SelectionClipboardPayload {
  type: typeof SELECTION_CLIPBOARD_TYPE;
  version: 1;
  nodes: SelectionClipboardNode[];
  edges: SelectionClipboardEdge[];
}

/**
 * Parse clipboard text into a selection payload, or null if it is anything
 * else (ordinary text pastes must never be hijacked). Shape-checks every
 * node and edge so a malformed payload cannot corrupt the canvas.
 */
export function parseSelectionClipboardPayload(text: string): SelectionClipboardPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const payload = parsed as Record<string, unknown>;
  if (payload.type !== SELECTION_CLIPBOARD_TYPE || payload.version !== 1) return null;
  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) return null;

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const isValidNode = (value: unknown): boolean => {
    if (!isRecord(value)) return false;
    const position = value.position;
    return (
      typeof value.id === 'string' &&
      typeof value.type === 'string' &&
      value.type.length > 0 &&
      isRecord(position) &&
      typeof position.x === 'number' &&
      Number.isFinite(position.x) &&
      typeof position.y === 'number' &&
      Number.isFinite(position.y) &&
      isRecord(value.data) &&
      (value.parentId === undefined || typeof value.parentId === 'string')
    );
  };
  const isValidEdge = (value: unknown): boolean =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string';

  if (!payload.nodes.every(isValidNode) || !payload.edges.every(isValidEdge)) return null;
  return parsed as SelectionClipboardPayload;
}

// ============================================================================
// Selection Alignment (context menu: align / distribute)
// ============================================================================

/** Edge or center line the selection is aligned to */
export type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'middle' | 'bottom';

/** Axis along which the selection is evenly spaced */
export type DistributeAxis = 'horizontal' | 'vertical';

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
  /** Explicitly selected edges deleted together with pendingDeleteNodeIds on confirm */
  pendingDeleteEdgeIds: string[];
  activeWorkflow: Workflow | null;
  interactionMode: InteractionMode;
  scrollMode: ScrollMode;
  workflowName: string;
  workflowDescription: string;
  isPropertyOverlayOpen: boolean;
  /** Workflow problems panel (all validation issues, click-to-jump).
   *  Opened by the canvas toolbar button and automatically on a
   *  VALIDATION_ERROR from save/export. Not tracked in undo history. */
  isProblemsPanelOpen: boolean;
  minimapDisplayMode: 'hidden' | 'auto' | 'always';
  isMinimapShown: boolean;
  isDescriptionPanelVisible: boolean;
  isFocusMode: boolean;
  /** Slash Command export options (context, model, hooks) */
  slashCommandOptions: SlashCommandOptions;
  lastAddedNodeId: string | null;
  /** When set, the Edit-mode canvas should pan to centre this node and clear the
   *  request. Used by the Overview mode "Edit on canvas" links. */
  requestedFocusNodeId: string | null;

  // Guided Tour player state (reads steps from activeWorkflow.tour)
  isTourActive: boolean;
  tourStepIndex: number;

  // Group Node Highlight State (for MCP execution tracking)
  highlightedGroupNodeId: string | null;
  isHighlightEnabled: boolean;

  // MCP Server Status
  mcpServerRunning: boolean;
  mcpServerPort: number | null;

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
  /** Set nodes and edges in a single state update (single undo/redo entry) */
  setCanvas: (nodes: Node[], edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  /** Update selectedNodeId without opening property overlay (for React Flow selection sync) */
  syncSelectedNodeId: (id: string | null) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  toggleInteractionMode: () => void;
  toggleScrollMode: () => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;
  openPropertyOverlay: () => void;
  closePropertyOverlay: () => void;
  openProblemsPanel: () => void;
  closeProblemsPanel: () => void;
  setMinimapDisplayMode: (mode: 'hidden' | 'auto' | 'always') => void;
  setMinimapShown: (shown: boolean) => void;
  toggleDescriptionPanelVisibility: () => void;
  toggleFocusMode: () => void;
  setSlashCommandOptions: (options: SlashCommandOptions) => void;
  setSlashCommandContext: (value: SlashCommandContext) => void;
  setSlashCommandModel: (value: SlashCommandModel) => void;
  setSlashCommandAllowedTools: (allowedTools: string) => void;
  setSlashCommandDisableModelInvocation: (disableModelInvocation: boolean) => void;
  setSlashCommandArgumentHint: (argumentHint: string) => void;
  setHooks: (hooks: WorkflowHooks) => void;
  addHookEntry: (hookType: HookType, matcher: string, command: string, once?: boolean) => void;
  removeHookEntry: (hookType: HookType, entryIndex: number) => void;
  updateHookEntry: (hookType: HookType, entryIndex: number, entry: Partial<HookEntry>) => void;

  // Group Node Highlight
  setHighlightedGroupNodeId: (id: string | null) => void;
  toggleHighlightEnabled: () => void;

  // MCP Server Status
  setMcpServerStatus: (running: boolean, port: number | null) => void;

  // Group Node Actions
  onNodeDragStop: (node: Node) => void;

  // Custom Actions
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
  addNode: (node: Node) => void;
  /** Add a node together with the edge that connects it (edge-drop create):
   *  one set() → one undo entry. The new node becomes the selection and the
   *  property overlay opens, same as addNode. */
  addNodeWithConnection: (node: Node, connection: Connection) => void;
  /** Duplicate a configured node (fresh id, +40/+40 offset, same parent group,
   *  deep-copied data; edges are not copied). Duplicating a group also copies
   *  its child nodes and the edges fully inside the group. Start/End excluded. */
  duplicateNode: (nodeId: string) => void;
  /** Duplicate every node in the selection at once (fresh ids, +40/+40 offset,
   *  deep-copied data). Selected groups bring their children along; edges with
   *  both endpoints in the duplicated set are copied too. Start/End excluded.
   *  The copies become the new selection. */
  duplicateSelection: (nodeIds: string[]) => void;
  /** Serialize a selection into a clipboard payload (Start/End excluded;
   *  selected groups bring their children; edges with both endpoints in the
   *  set ride along). Returns null when nothing serializable is selected. */
  serializeSelection: (nodeIds: string[]) => SelectionClipboardPayload | null;
  /** Insert a clipboard payload as new nodes/edges: fresh ids, +40/+40
   *  offset, deep-copied data, one undo entry. The pasted nodes become the
   *  new selection. Works with payloads copied from another workflow.
   *  When `position` is given (context-menu paste), the payload's top-left
   *  corner lands there instead of the +40/+40 offset. */
  pasteSelection: (payload: SelectionClipboardPayload, position?: { x: number; y: number }) => void;
  /** Cut a selection: serialize it (same policy as serializeSelection),
   *  then remove the serialized nodes plus every edge touching them in a
   *  single undo entry. No confirmation dialog — cut is undoable and the
   *  content lives on in the returned clipboard payload. Returns null (and
   *  removes nothing) when nothing serializable is selected. */
  cutSelection: (nodeIds: string[]) => SelectionClipboardPayload | null;
  /** Align the selection to an edge or center line of its bounding box.
   *  Children whose group is also selected ride along with the group and are
   *  skipped; geometry is compared in absolute coordinates (groups never
   *  nest). No-op with fewer than two alignable nodes. Single undo entry. */
  alignSelection: (nodeIds: string[], mode: AlignMode) => void;
  /** Space the selection evenly along one axis: the outermost nodes stay
   *  fixed and the gaps between node edges are equalized. Same ride-along
   *  policy as alignSelection. No-op with fewer than three alignable nodes.
   *  Single undo entry. */
  distributeSelection: (nodeIds: string[], axis: DistributeAxis) => void;
  /** Wrap the selection in a new group node sized to fit (auto-layout's
   *  GROUP_PADDING, extra top room for the header). Group nodes are skipped
   *  (groups never nest) and children whose group is also selected ride
   *  along with it instead of being pulled out; other members reparent with
   *  group-relative positions. The new group becomes the selection. No-op
   *  with fewer than two groupable nodes. Single undo entry. */
  groupSelection: (nodeIds: string[]) => void;
  /** Dissolve the selected group node(s) in place: children keep their
   *  absolute canvas positions (removeNode's conversion) and become the
   *  selection; only the group container disappears. Non-group nodes in the
   *  selection are ignored. No-op when the selection contains no group.
   *  Single undo entry. */
  ungroupSelection: (nodeIds: string[]) => void;

  /** Re-arrange the whole canvas into a tidy left-to-right layered layout
   *  (groups laid out internally and resized to fit). One undo entry. */
  autoLayout: () => void;
  clearLastAddedNodeId: () => void;
  /** Request the canvas to pan to a specific node (e.g. when jumping in from
   *  Overview mode). The canvas-side hook clears it after centring. */
  requestFocusNode: (nodeId: string) => void;
  clearRequestedFocusNodeId: () => void;

  // Guided Tour
  /** Start the tour from step 0 (no-op if the active workflow has no tour) */
  startTour: () => void;
  /** Stop the tour */
  endTour: () => void;
  /** Jump to a tour step (clamped to valid range) */
  setTourStepIndex: (index: number) => void;
  /** Advance to the next tour step (clamped) */
  nextTourStep: () => void;
  /** Go back to the previous tour step (clamped) */
  prevTourStep: () => void;
  removeNode: (nodeId: string) => void;
  requestDeleteNode: (nodeId: string) => void;
  /** Request deletion of a multi-selection (nodes via confirm dialog, edges deferred with them) */
  requestDeleteSelection: (nodeIds: string[], edgeIds: string[]) => void;
  confirmDeleteNodes: () => void;
  cancelDeleteNodes: () => void;
  clearWorkflow: () => void;
  addGeneratedWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflow: Workflow) => void;
  setActiveWorkflow: (workflow: Workflow, options?: { clearHistory?: boolean }) => void; // Phase 3.12
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
 * Sort nodes so that parent (group) nodes come before their children.
 * Required by React Flow for correct rendering of nested nodes.
 */
function sortNodesParentFirst(nodes: Node[]): Node[] {
  const parentIds = new Set(nodes.filter((n) => n.parentId).map((n) => n.parentId as string));
  const parents = nodes.filter((n) => parentIds.has(n.id));
  const others = nodes.filter((n) => !parentIds.has(n.id));
  return [...parents, ...others];
}

/**
 * Keep the palette's `<prefix>-<timestamp>` id convention: strip a trailing
 * timestamp from the original id, then append a fresh one. `usedIds` tracks
 * ids already taken so same-millisecond copies stay unique (the new id is
 * added to the set).
 */
function makeUniqueNodeId(usedIds: Set<string>, originalId: string): string {
  const baseId = originalId.replace(/[-_]\d+$/, '');
  let newId = `${baseId}-${Date.now()}`;
  while (usedIds.has(newId)) {
    newId = `${baseId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  usedIds.add(newId);
  return newId;
}

/** Same uniqueness contract as makeUniqueNodeId, for `edge-<src>-<tgt>` ids. */
function makeUniqueEdgeId(usedIds: Set<string>, source: string, target: string): string {
  let newEdgeId = `edge-${source}-${target}`;
  while (usedIds.has(newEdgeId)) {
    newEdgeId = `edge-${source}-${target}-${Math.random().toString(36).slice(2, 6)}`;
  }
  usedIds.add(newEdgeId);
  return newEdgeId;
}

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
  id: 'end_node_default',
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
        id: 'end_node_default',
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
        id: 'end_node_default',
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
      ...(node.parentId && { parentId: node.parentId }),
      ...(node.style &&
        (node.style.width || node.style.height) && {
          style: {
            ...(node.style.width && { width: node.style.width }),
            ...(node.style.height && { height: node.style.height }),
          },
        }),
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

// Type for undo/redo tracked state (nodes and edges only)
type TrackedState = {
  nodes: Node[];
  edges: Edge[];
};

export const useWorkflowStore = create<WorkflowStore>()(
  temporal(
    (set, get) => ({
      // Initial State - デフォルトでStartノードとEndノードを含む
      nodes: [DEFAULT_START_NODE, DEFAULT_END_NODE],
      edges: [],
      selectedNodeId: null,
      pendingDeleteNodeIds: [],
      pendingDeleteEdgeIds: [],
      activeWorkflow: null,
      interactionMode: 'pan', // Default: pan mode
      scrollMode: (() => {
        const saved = localStorage.getItem('cc-wf-studio.scrollMode');
        return saved === 'freehand' ? 'freehand' : 'classic'; // Default: classic
      })() as ScrollMode,
      workflowName: 'my-workflow', // Default workflow name
      workflowDescription: '', // Default workflow description
      isPropertyOverlayOpen: true, // Property overlay is open by default
      isProblemsPanelOpen: false,
      minimapDisplayMode: (() => {
        const saved = localStorage.getItem('cc-wf-studio.minimapDisplayMode');
        if (saved === 'hidden' || saved === 'auto' || saved === 'always') return saved;
        return 'auto'; // Default: auto (show on scroll)
      })() as 'hidden' | 'auto' | 'always',
      isMinimapShown: false, // Controlled by scroll events (for 'auto' mode)
      isDescriptionPanelVisible: (() => {
        const saved = localStorage.getItem('cc-wf-studio.descriptionPanelVisible');
        return saved !== null ? saved === 'true' : false; // Default: collapsed
      })(),
      isFocusMode: (() => {
        const saved = localStorage.getItem('cc-wf-studio.focusMode');
        return saved !== null ? saved === 'true' : false; // Default: off
      })(),
      slashCommandOptions: {
        context: 'default',
        model: 'default',
        hooks: undefined,
      },
      lastAddedNodeId: null,
      requestedFocusNodeId: null,
      isTourActive: false,
      tourStepIndex: 0,
      highlightedGroupNodeId: null,
      isHighlightEnabled: true,
      mcpServerRunning: false,
      mcpServerPort: null,

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
            set({ pendingDeleteNodeIds: nodeIdsToDelete, pendingDeleteEdgeIds: [] });
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
        const currentNodes = get().nodes.map((node) => ({ ...node, selected: false }));
        const currentEdges = get().edges.map((e) => ({ ...e, selected: false }));
        const newEdges = addEdge({ ...connection, selected: true }, currentEdges);
        set({
          nodes: currentNodes,
          edges: newEdges,
          selectedNodeId: null,
        });
      },

      // Setters
      setNodes: (nodes) => set({ nodes }),

      setEdges: (edges) => set({ edges }),

      setCanvas: (nodes, edges) => set({ nodes, edges }),

      setSelectedNodeId: (selectedNodeId) => {
        // When a node is selected, auto-open the property overlay
        if (selectedNodeId !== null) {
          set({ selectedNodeId, isPropertyOverlayOpen: true });
        } else {
          set({ selectedNodeId });
        }
      },

      syncSelectedNodeId: (selectedNodeId) => {
        set({ selectedNodeId });
      },

      setInteractionMode: (interactionMode) => set({ interactionMode }),

      toggleInteractionMode: () => {
        const currentMode = get().interactionMode;
        set({ interactionMode: currentMode === 'pan' ? 'selection' : 'pan' });
      },

      toggleScrollMode: () => {
        const newMode = get().scrollMode === 'classic' ? 'freehand' : 'classic';
        localStorage.setItem('cc-wf-studio.scrollMode', newMode);
        set({ scrollMode: newMode });
      },

      setWorkflowName: (workflowName) => set({ workflowName }),

      setWorkflowDescription: (workflowDescription) => set({ workflowDescription }),

      openPropertyOverlay: () => set({ isPropertyOverlayOpen: true }),

      closePropertyOverlay: () => set({ isPropertyOverlayOpen: false }),

      openProblemsPanel: () => set({ isProblemsPanelOpen: true }),

      closeProblemsPanel: () => set({ isProblemsPanelOpen: false }),

      setMinimapDisplayMode: (mode) => {
        localStorage.setItem('cc-wf-studio.minimapDisplayMode', mode);
        set({ minimapDisplayMode: mode, isMinimapShown: false });
      },

      setMinimapShown: (shown) => set({ isMinimapShown: shown }),

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

      setSlashCommandOptions: (options: SlashCommandOptions) =>
        set({ slashCommandOptions: options }),

      setSlashCommandContext: (context: SlashCommandContext) =>
        set((state) => ({
          slashCommandOptions: { ...state.slashCommandOptions, context },
        })),

      setSlashCommandModel: (model: SlashCommandModel) =>
        set((state) => ({
          slashCommandOptions: { ...state.slashCommandOptions, model },
        })),

      setSlashCommandAllowedTools: (allowedTools: string) =>
        set((state) => ({
          slashCommandOptions: { ...state.slashCommandOptions, allowedTools },
        })),

      setSlashCommandDisableModelInvocation: (disableModelInvocation: boolean) =>
        set((state) => ({
          slashCommandOptions: { ...state.slashCommandOptions, disableModelInvocation },
        })),

      setSlashCommandArgumentHint: (argumentHint: string) =>
        set((state) => ({
          slashCommandOptions: {
            ...state.slashCommandOptions,
            argumentHint: argumentHint || undefined,
          },
        })),

      setHooks: (hooks: WorkflowHooks) =>
        set((state) => ({
          slashCommandOptions: { ...state.slashCommandOptions, hooks },
        })),

      addHookEntry: (hookType: HookType, matcher: string, command: string, once?: boolean) => {
        const currentHooks = get().slashCommandOptions.hooks || {};
        const existing = currentHooks[hookType] || [];
        const newEntry: HookEntry = {
          matcher: matcher || undefined,
          hooks: [
            {
              type: 'command',
              command,
              once: once || undefined,
            },
          ],
        };
        set((state) => ({
          slashCommandOptions: {
            ...state.slashCommandOptions,
            hooks: {
              ...currentHooks,
              [hookType]: [...existing, newEntry],
            },
          },
        }));
      },

      removeHookEntry: (hookType: HookType, entryIndex: number) => {
        const currentHooks = get().slashCommandOptions.hooks || {};
        const existing = currentHooks[hookType] || [];
        const updated = existing.filter((_, i) => i !== entryIndex);
        if (updated.length === 0) {
          const { [hookType]: _, ...rest } = currentHooks;
          const newHooks = Object.keys(rest).length > 0 ? rest : undefined;
          set((state) => ({
            slashCommandOptions: { ...state.slashCommandOptions, hooks: newHooks },
          }));
        } else {
          set((state) => ({
            slashCommandOptions: {
              ...state.slashCommandOptions,
              hooks: { ...currentHooks, [hookType]: updated },
            },
          }));
        }
      },

      updateHookEntry: (hookType: HookType, entryIndex: number, entry: Partial<HookEntry>) => {
        const currentHooks = get().slashCommandOptions.hooks || {};
        const existing = currentHooks[hookType] || [];
        const updated = existing.map((h, i) => (i === entryIndex ? { ...h, ...entry } : h));
        set((state) => ({
          slashCommandOptions: {
            ...state.slashCommandOptions,
            hooks: { ...currentHooks, [hookType]: updated },
          },
        }));
      },

      // Group Node Actions
      onNodeDragStop: (draggedNode: Node) => {
        // Skip if the dragged node is a group node (no nesting)
        if (draggedNode.type === 'group') return;

        const currentNodes = get().nodes;

        // Find all group nodes
        const groupNodes = currentNodes.filter((n) => n.type === 'group');
        if (groupNodes.length === 0) return;

        // Calculate the absolute position of the dragged node
        const draggedAbsX = draggedNode.parentId
          ? (() => {
              const parent = currentNodes.find((n) => n.id === draggedNode.parentId);
              return parent ? draggedNode.position.x + parent.position.x : draggedNode.position.x;
            })()
          : draggedNode.position.x;
        const draggedAbsY = draggedNode.parentId
          ? (() => {
              const parent = currentNodes.find((n) => n.id === draggedNode.parentId);
              return parent ? draggedNode.position.y + parent.position.y : draggedNode.position.y;
            })()
          : draggedNode.position.y;

        // Check if the dragged node is within any group node's bounds
        let targetGroup: Node | null = null;
        for (const group of groupNodes) {
          const gw = group.style?.width ?? group.width ?? 400;
          const gh = group.style?.height ?? group.height ?? 300;
          const gx = group.position.x;
          const gy = group.position.y;

          if (
            draggedAbsX >= gx &&
            draggedAbsX <= gx + (gw as number) &&
            draggedAbsY >= gy &&
            draggedAbsY <= gy + (gh as number)
          ) {
            targetGroup = group;
            break;
          }
        }

        const currentParentId = draggedNode.parentId;

        if (targetGroup && targetGroup.id !== currentParentId) {
          // Moving into a new group: set parentId and convert to relative coordinates
          const updatedNodes = currentNodes.map((n) => {
            if (n.id === draggedNode.id) {
              return {
                ...n,
                parentId: targetGroup.id,
                position: {
                  x: draggedAbsX - targetGroup.position.x,
                  y: draggedAbsY - targetGroup.position.y,
                },
              };
            }
            return n;
          });
          // Sort so parents come before children
          set({ nodes: sortNodesParentFirst(updatedNodes) });
        } else if (!targetGroup && currentParentId) {
          // Moving out of a group: remove parentId and convert to absolute coordinates
          const updatedNodes = currentNodes.map((n) => {
            if (n.id === draggedNode.id) {
              return {
                ...n,
                parentId: undefined,
                position: {
                  x: draggedAbsX,
                  y: draggedAbsY,
                },
              };
            }
            return n;
          });
          set({ nodes: sortNodesParentFirst(updatedNodes) });
        }
      },

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

      addNodeWithConnection: (node: Node, connection: Connection) => {
        const currentNodes = get().nodes.map((n) => (n.selected ? { ...n, selected: false } : n));
        const currentEdges = get().edges.map((e) => (e.selected ? { ...e, selected: false } : e));
        set({
          nodes: [...currentNodes, node],
          edges: addEdge(connection, currentEdges),
          lastAddedNodeId: node.id,
          selectedNodeId: node.id,
          isPropertyOverlayOpen: true,
        });
      },

      clearLastAddedNodeId: () => {
        set({ lastAddedNodeId: null });
      },

      duplicateNode: (nodeId: string) => {
        const source = get().nodes.find((node) => node.id === nodeId);
        if (!source) return;
        // Start/End are structural and must stay unique
        if (source.type === 'start' || source.type === 'end') {
          console.warn(`Cannot duplicate node of type "${source.type}"`);
          return;
        }
        get().duplicateSelection([nodeId]);
      },

      duplicateSelection: (nodeIds: string[]) => {
        const allNodes = get().nodes;
        const requested = new Set(nodeIds);
        // Start/End are structural and must stay unique
        const sources = allNodes.filter(
          (node) => requested.has(node.id) && node.type !== 'start' && node.type !== 'end'
        );
        if (sources.length === 0) return;
        const sourceIds = new Set(sources.map((node) => node.id));

        // A group is duplicated together with its child nodes (groups never
        // nest — see onNodeDragStop — so direct children are all of them)
        const children = allNodes.filter(
          (node) => node.parentId && sourceIds.has(node.parentId) && !sourceIds.has(node.id)
        );

        const usedIds = new Set(allNodes.map((node) => node.id));
        const idMap = new Map<string, string>();
        for (const node of [...sources, ...children]) {
          idMap.set(node.id, makeUniqueNodeId(usedIds, node.id));
        }

        const copyNode = (node: Node): Node => ({
          ...node,
          id: idMap.get(node.id) as string,
          // Deep copy so later edits to the copy never mutate the original
          data: JSON.parse(JSON.stringify(node.data ?? {})),
          ...(node.style && { style: { ...node.style } }),
          // Children of a copied group keep their group-relative position;
          // every other copy shifts +40/+40 (a copied child whose group is
          // not part of the selection stays inside its original group)
          position:
            node.parentId && idMap.has(node.parentId)
              ? { ...node.position }
              : { x: node.position.x + 40, y: node.position.y + 40 },
          // Re-link copied children to the copied group
          ...(node.parentId && idMap.has(node.parentId)
            ? { parentId: idMap.get(node.parentId) as string }
            : {}),
          // The copies become the new selection; group children ride along
          // unselected unless they were explicitly selected themselves
          selected: sourceIds.has(node.id),
        });

        // Parent copies first so React Flow sees a group before its children
        const copies = sortNodesParentFirst([...sources, ...children].map(copyNode));

        // Copy edges fully inside the duplicated set (both endpoints copied);
        // edges crossing the selection boundary are not copied — same policy
        // as single-node duplication, which copies no edges
        const currentEdges = get().edges;
        const usedEdgeIds = new Set(currentEdges.map((edge) => edge.id));
        const edgeCopies = currentEdges
          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
          .map((edge) => {
            const newSource = idMap.get(edge.source) as string;
            const newTarget = idMap.get(edge.target) as string;
            return {
              ...edge,
              id: makeUniqueEdgeId(usedEdgeIds, newSource, newTarget),
              source: newSource,
              target: newTarget,
              selected: false,
            };
          });

        // Move React Flow's visual selection from the sources to the copies
        const deselected = allNodes.map((node) =>
          node.selected ? { ...node, selected: false } : node
        );
        const edgesDeselected = currentEdges.map((edge) =>
          edge.selected ? { ...edge, selected: false } : edge
        );
        const edgesChanged = edgeCopies.length > 0 || currentEdges.some((edge) => edge.selected);

        // Same rule as handleNodesChange: exactly one selected node syncs its
        // id (and gets the auto-focus pan); a multi-copy keeps the view still
        const newSelectedId = sources.length === 1 ? (idMap.get(sources[0].id) as string) : null;

        // Single set() call → single undo/redo history entry
        set({
          nodes: [...deselected, ...copies],
          ...(edgesChanged && { edges: [...edgesDeselected, ...edgeCopies] }),
          ...(newSelectedId && { lastAddedNodeId: newSelectedId }),
          selectedNodeId: newSelectedId,
        });
      },

      serializeSelection: (nodeIds: string[]) => {
        const allNodes = get().nodes;
        const requested = new Set(nodeIds);
        // Start/End are structural and must stay unique — never copied
        const sources = allNodes.filter(
          (node) => requested.has(node.id) && node.type !== 'start' && node.type !== 'end'
        );
        if (sources.length === 0) return null;
        const sourceIds = new Set(sources.map((node) => node.id));

        // Same policy as duplicateSelection: a group brings its children
        const children = allNodes.filter(
          (node) => node.parentId && sourceIds.has(node.parentId) && !sourceIds.has(node.id)
        );
        const included = [...sources, ...children];
        const includedIds = new Set(included.map((node) => node.id));

        const toClipboardNode = (node: Node): SelectionClipboardNode => {
          // A child copied without its group must be self-contained: drop the
          // parentId and convert its group-relative position to absolute
          // (groups never nest, so parent position + offset is enough)
          let position = { ...node.position };
          let parentId = node.parentId;
          if (parentId && !includedIds.has(parentId)) {
            const parent = allNodes.find((n) => n.id === parentId);
            if (parent) {
              position = {
                x: parent.position.x + node.position.x,
                y: parent.position.y + node.position.y,
              };
            }
            parentId = undefined;
          }
          return {
            id: node.id,
            type: node.type ?? 'default',
            position,
            data: JSON.parse(JSON.stringify(node.data ?? {})),
            ...(parentId ? { parentId } : {}),
            ...(node.style ? { style: { ...node.style } } : {}),
          };
        };

        const edges = get()
          .edges.filter((edge) => includedIds.has(edge.source) && includedIds.has(edge.target))
          .map((edge) => {
            const { selected: _selected, ...rest } = edge;
            return JSON.parse(JSON.stringify(rest)) as SelectionClipboardEdge;
          });

        return {
          type: SELECTION_CLIPBOARD_TYPE,
          version: 1,
          nodes: included.map(toClipboardNode),
          edges,
        };
      },

      pasteSelection: (payload: SelectionClipboardPayload, position?: { x: number; y: number }) => {
        const allNodes = get().nodes;
        // Defense in depth — serializeSelection never emits these, but the
        // clipboard is user-editable text
        const incoming = payload.nodes.filter(
          (node) => node.type !== 'start' && node.type !== 'end'
        );
        if (incoming.length === 0) return;

        const usedIds = new Set(allNodes.map((node) => node.id));
        const idMap = new Map<string, string>();
        for (const node of incoming) {
          idMap.set(node.id, makeUniqueNodeId(usedIds, node.id));
        }

        // Top-level payload nodes (children of a pasted group keep their
        // group-relative position and follow their parent instead)
        const isTopLevel = (node: SelectionClipboardNode) =>
          !(node.parentId && idMap.has(node.parentId));

        // Default: +40/+40 (same offset as duplication). With a target
        // position, translate so the payload's top-left corner lands there.
        let offset = { x: 40, y: 40 };
        if (position) {
          const topLevel = incoming.filter(isTopLevel);
          const minX = Math.min(...topLevel.map((node) => node.position.x));
          const minY = Math.min(...topLevel.map((node) => node.position.y));
          offset = { x: position.x - minX, y: position.y - minY };
        }

        const copies: Node[] = incoming.map((node) => ({
          id: idMap.get(node.id) as string,
          type: node.type,
          // Deep copy so pasting twice never shares data between the copies
          data: JSON.parse(JSON.stringify(node.data ?? {})),
          position: isTopLevel(node)
            ? { x: node.position.x + offset.x, y: node.position.y + offset.y }
            : { ...node.position },
          ...(node.parentId && idMap.has(node.parentId)
            ? { parentId: idMap.get(node.parentId) as string }
            : {}),
          ...(node.style ? { style: { ...node.style } } : {}),
          // The pasted content becomes the new selection
          selected: true,
        }));

        const currentEdges = get().edges;
        const usedEdgeIds = new Set(currentEdges.map((edge) => edge.id));
        const edgeCopies: Edge[] = payload.edges
          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
          .map((edge) => {
            const newSource = idMap.get(edge.source) as string;
            const newTarget = idMap.get(edge.target) as string;
            const {
              id: _id,
              source: _source,
              target: _target,
              selected: _selected,
              ...rest
            } = edge;
            return {
              ...(JSON.parse(JSON.stringify(rest)) as Record<string, unknown>),
              id: makeUniqueEdgeId(usedEdgeIds, newSource, newTarget),
              source: newSource,
              target: newTarget,
              selected: false,
            } as Edge;
          });

        // Move the visual selection from whatever was selected to the copies
        const deselectedNodes = allNodes.map((node) =>
          node.selected ? { ...node, selected: false } : node
        );
        const deselectedEdges = currentEdges.map((edge) =>
          edge.selected ? { ...edge, selected: false } : edge
        );

        // Same rule as handleNodesChange: exactly one selected node syncs its
        // id (and gets the auto-focus pan); a multi-paste keeps the view still
        const newSelectedId = copies.length === 1 ? copies[0].id : null;

        // Parent copies first so React Flow sees a group before its children.
        // Single set() call → single undo/redo history entry
        set({
          nodes: [...deselectedNodes, ...sortNodesParentFirst(copies)],
          edges: [...deselectedEdges, ...edgeCopies],
          ...(newSelectedId && { lastAddedNodeId: newSelectedId }),
          selectedNodeId: newSelectedId,
        });
      },

      cutSelection: (nodeIds: string[]) => {
        const payload = get().serializeSelection(nodeIds);
        if (!payload) return null;

        // Remove exactly the serialized set — Start/End are already
        // excluded, and a cut group takes its children with it (they are
        // part of the payload, so nothing the user keeps is lost)
        const removedIds = new Set(payload.nodes.map((node) => node.id));

        // Boundary-crossing edges are not in the payload, but leaving them
        // dangling would corrupt the canvas — drop every touching edge.
        // Selected edges between two surviving nodes are kept: cut only
        // removes what the clipboard now holds.
        const remainingNodes = get().nodes.filter((node) => !removedIds.has(node.id));
        const remainingEdges = get().edges.filter(
          (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)
        );

        const currentSelectedNodeId = get().selectedNodeId;

        // Single set() call → single undo/redo history entry
        set({
          nodes: remainingNodes,
          edges: remainingEdges,
          ...(currentSelectedNodeId && removedIds.has(currentSelectedNodeId)
            ? { selectedNodeId: null }
            : {}),
        });

        return payload;
      },

      alignSelection: (nodeIds: string[], mode: AlignMode) => {
        const allNodes = get().nodes;
        const requested = new Set(nodeIds);
        // Children whose group is also selected ride along with the group
        const targets = allNodes.filter(
          (node) => requested.has(node.id) && !(node.parentId && requested.has(node.parentId))
        );
        if (targets.length < 2) return;

        const boxes = targets.map((node) => {
          const { x, y } = absoluteNodePosition(node, allNodes);
          const { width, height } = nodeBoxSize(node);
          return { id: node.id, left: x, top: y, width, height };
        });
        const minLeft = Math.min(...boxes.map((box) => box.left));
        const maxRight = Math.max(...boxes.map((box) => box.left + box.width));
        const minTop = Math.min(...boxes.map((box) => box.top));
        const maxBottom = Math.max(...boxes.map((box) => box.top + box.height));

        // Deltas are identical in absolute and group-relative coordinates
        // (a target's parent never moves), so they apply to position directly
        const deltas = new Map<string, { dx: number; dy: number }>();
        for (const box of boxes) {
          let dx = 0;
          let dy = 0;
          switch (mode) {
            case 'left':
              dx = minLeft - box.left;
              break;
            case 'centerH':
              dx = (minLeft + maxRight) / 2 - (box.left + box.width / 2);
              break;
            case 'right':
              dx = maxRight - (box.left + box.width);
              break;
            case 'top':
              dy = minTop - box.top;
              break;
            case 'middle':
              dy = (minTop + maxBottom) / 2 - (box.top + box.height / 2);
              break;
            case 'bottom':
              dy = maxBottom - (box.top + box.height);
              break;
          }
          if (dx !== 0 || dy !== 0) deltas.set(box.id, { dx, dy });
        }
        if (deltas.size === 0) return;

        // Single set() call → single undo/redo history entry
        set({
          nodes: allNodes.map((node) => {
            const delta = deltas.get(node.id);
            return delta
              ? {
                  ...node,
                  position: { x: node.position.x + delta.dx, y: node.position.y + delta.dy },
                }
              : node;
          }),
        });
      },

      distributeSelection: (nodeIds: string[], axis: DistributeAxis) => {
        const allNodes = get().nodes;
        const requested = new Set(nodeIds);
        // Same ride-along policy as alignSelection
        const targets = allNodes.filter(
          (node) => requested.has(node.id) && !(node.parentId && requested.has(node.parentId))
        );
        if (targets.length < 3) return;

        const horizontal = axis === 'horizontal';
        const boxes = targets
          .map((node) => {
            const position = absoluteNodePosition(node, allNodes);
            const size = nodeBoxSize(node);
            return {
              id: node.id,
              start: horizontal ? position.x : position.y,
              extent: horizontal ? size.width : size.height,
            };
          })
          .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

        // The outermost nodes stay fixed; the gaps between node edges in
        // between are equalized (negative gaps mean overlapping nodes and
        // distribute evenly all the same)
        const first = boxes[0];
        const last = boxes[boxes.length - 1];
        const span = last.start + last.extent - first.start;
        const totalExtent = boxes.reduce((sum, box) => sum + box.extent, 0);
        const gap = (span - totalExtent) / (boxes.length - 1);

        const deltas = new Map<string, number>();
        let cursor = first.start;
        for (const box of boxes) {
          const delta = cursor - box.start;
          if (delta !== 0) deltas.set(box.id, delta);
          cursor += box.extent + gap;
        }
        if (deltas.size === 0) return;

        // Single set() call → single undo/redo history entry
        set({
          nodes: allNodes.map((node) => {
            const delta = deltas.get(node.id);
            return delta !== undefined
              ? {
                  ...node,
                  position: horizontal
                    ? { x: node.position.x + delta, y: node.position.y }
                    : { x: node.position.x, y: node.position.y + delta },
                }
              : node;
          }),
        });
      },

      groupSelection: (nodeIds: string[]) => {
        const allNodes = get().nodes;
        const requested = new Set(nodeIds);
        // Groups never nest, so selected group nodes are skipped; children
        // whose group is also selected ride along with it (alignSelection's
        // policy) instead of being pulled out of their group
        const members = allNodes.filter(
          (node) =>
            requested.has(node.id) &&
            node.type !== 'group' &&
            !(node.parentId && requested.has(node.parentId))
        );
        if (members.length < 2) return;

        // Frame the members' bounding box (absolute coordinates) with the
        // same padding auto-layout gives group children
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const node of members) {
          const { x, y } = absoluteNodePosition(node, allNodes);
          const { width, height } = nodeBoxSize(node);
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x + width > maxX) maxX = x + width;
          if (y + height > maxY) maxY = y + height;
        }
        const groupPosition = { x: minX - GROUP_PADDING.left, y: minY - GROUP_PADDING.top };
        const groupId = `group-${Date.now()}`;
        const groupNode: Node = {
          id: groupId,
          type: 'group',
          position: groupPosition,
          // Keep group below edge SVG layer so edges inside groups remain clickable (selected: -1001+1000=-1 < edge:0)
          zIndex: -1001,
          data: { label: 'Group' },
          style: {
            width: Math.ceil(maxX - minX + GROUP_PADDING.left + GROUP_PADDING.right),
            height: Math.ceil(maxY - minY + GROUP_PADDING.top + GROUP_PADDING.bottom),
          },
          selected: true,
        };

        const memberIds = new Set(members.map((node) => node.id));
        // The group is prepended so React Flow sees the parent before its
        // children; members reparent with group-relative positions and the
        // new group becomes the selection.
        // Single set() call → single undo/redo history entry
        set({
          nodes: [
            groupNode,
            ...allNodes.map((node) => {
              if (!memberIds.has(node.id)) {
                return node.selected ? { ...node, selected: false } : node;
              }
              const absolute = absoluteNodePosition(node, allNodes);
              return {
                ...node,
                parentId: groupId,
                position: {
                  x: absolute.x - groupPosition.x,
                  y: absolute.y - groupPosition.y,
                },
                selected: false,
              };
            }),
          ],
          selectedNodeId: groupId,
        });
      },

      ungroupSelection: (nodeIds: string[]) => {
        const allNodes = get().nodes;
        const requested = new Set(nodeIds);
        const groups = allNodes.filter((node) => requested.has(node.id) && node.type === 'group');
        if (groups.length === 0) return;

        const groupIds = new Set(groups.map((node) => node.id));
        const groupPositions = new Map(groups.map((node) => [node.id, node.position]));
        // No confirm dialog: unlike delete, dissolving keeps every child, and
        // the action is undoable (cut's rationale). Released children become
        // the selection so the group → ungroup round-trip is symmetric.
        // Single set() call → single undo/redo history entry
        set({
          nodes: allNodes
            .filter((node) => !groupIds.has(node.id))
            .map((node) => {
              const groupPos = node.parentId ? groupPositions.get(node.parentId) : undefined;
              if (groupPos) {
                return {
                  ...node,
                  parentId: undefined,
                  position: {
                    x: node.position.x + groupPos.x,
                    y: node.position.y + groupPos.y,
                  },
                  selected: true,
                };
              }
              return node.selected ? { ...node, selected: false } : node;
            }),
          // Groups have no edge handles, but stay consistent with removeNode
          edges: get().edges.filter(
            (edge) => !groupIds.has(edge.source) && !groupIds.has(edge.target)
          ),
          selectedNodeId: null,
        });
      },

      autoLayout: () => {
        const allNodes = get().nodes;
        const result = computeAutoLayout(allNodes, get().edges);
        if (!result) return;

        // Single set() call → single undo/redo history entry
        set({
          nodes: allNodes.map((node) => {
            const position = result.positions.get(node.id);
            const size = node.type === 'group' ? result.groupSizes.get(node.id) : undefined;
            if (!position && !size) return node;
            return {
              ...node,
              ...(position ? { position } : {}),
              ...(size ? { style: { ...node.style, ...size } } : {}),
            };
          }),
        });
      },

      requestFocusNode: (nodeId: string) => {
        set({ requestedFocusNodeId: nodeId });
      },

      clearRequestedFocusNodeId: () => {
        set({ requestedFocusNodeId: null });
      },

      startTour: () => {
        const tour = get().activeWorkflow?.tour;
        if (!tour || tour.length === 0) return;
        set({ isTourActive: true, tourStepIndex: 0 });
      },

      endTour: () => {
        set({ isTourActive: false });
      },

      setTourStepIndex: (index: number) => {
        const tour = get().activeWorkflow?.tour;
        if (!tour || tour.length === 0) return;
        const clamped = Math.max(0, Math.min(index, tour.length - 1));
        set({ tourStepIndex: clamped });
      },

      nextTourStep: () => {
        get().setTourStepIndex(get().tourStepIndex + 1);
      },

      prevTourStep: () => {
        get().setTourStepIndex(get().tourStepIndex - 1);
      },

      setHighlightedGroupNodeId: (id: string | null) => {
        set({ highlightedGroupNodeId: id });
      },

      toggleHighlightEnabled: () => {
        const current = get().isHighlightEnabled;
        if (current) {
          set({ isHighlightEnabled: false, highlightedGroupNodeId: null });
        } else {
          set({ isHighlightEnabled: true });
        }
      },

      setMcpServerStatus: (running, port) =>
        set({ mcpServerRunning: running, mcpServerPort: port }),

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

        // If removing a group node, release child nodes (convert to absolute coordinates)
        const isGroupNode = nodeToRemove?.type === 'group';
        let updatedNodes = get().nodes;
        if (isGroupNode) {
          const groupPos = nodeToRemove.position;
          updatedNodes = updatedNodes.map((node) => {
            if (node.parentId === nodeId) {
              return {
                ...node,
                parentId: undefined,
                position: {
                  x: node.position.x + groupPos.x,
                  y: node.position.y + groupPos.y,
                },
              };
            }
            return node;
          });
        }

        set({
          nodes: updatedNodes.filter((node) => node.id !== nodeId),
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
        set({ pendingDeleteNodeIds: [nodeId], pendingDeleteEdgeIds: [] });
      },

      requestDeleteSelection: (nodeIds: string[], edgeIds: string[]) => {
        // Delete/Backspaceキーからの削除要求（複数選択対応）
        // Start nodeは削除不可
        const deletableIds = nodeIds.filter((nodeId) => {
          const nodeToRemove = get().nodes.find((node) => node.id === nodeId);
          return nodeToRemove !== undefined && nodeToRemove.type !== 'start';
        });
        if (deletableIds.length === 0) return;

        // 確認ダイアログを表示。エッジも確認までは削除しない
        set({ pendingDeleteNodeIds: deletableIds, pendingDeleteEdgeIds: edgeIds });
      },

      confirmDeleteNodes: () => {
        const nodeIds = get().pendingDeleteNodeIds;
        const edgeIds = get().pendingDeleteEdgeIds;
        if (nodeIds.length === 0) return;

        // Clear selection if the deleted node is currently selected
        const currentSelectedNodeId = get().selectedNodeId;
        const shouldClearSelection =
          currentSelectedNodeId !== null && nodeIds.includes(currentSelectedNodeId);

        // Release child nodes from group nodes being deleted
        let updatedNodes = get().nodes;
        for (const nodeId of nodeIds) {
          const nodeToRemove = updatedNodes.find((n) => n.id === nodeId);
          if (nodeToRemove?.type === 'group') {
            const groupPos = nodeToRemove.position;
            updatedNodes = updatedNodes.map((node) => {
              if (node.parentId === nodeId) {
                return {
                  ...node,
                  parentId: undefined,
                  position: {
                    x: node.position.x + groupPos.x,
                    y: node.position.y + groupPos.y,
                  },
                };
              }
              return node;
            });
          }
        }

        // Delete all pending nodes (and any explicitly selected edges)
        set({
          nodes: updatedNodes.filter((node) => !nodeIds.includes(node.id)),
          edges: get().edges.filter(
            (edge) =>
              !nodeIds.includes(edge.source) &&
              !nodeIds.includes(edge.target) &&
              !edgeIds.includes(edge.id)
          ),
          pendingDeleteNodeIds: [],
          pendingDeleteEdgeIds: [],
          ...(shouldClearSelection && { selectedNodeId: null }),
        });
      },

      cancelDeleteNodes: () => {
        set({ pendingDeleteNodeIds: [], pendingDeleteEdgeIds: [] });
      },

      clearWorkflow: () => {
        const { activeWorkflow } = get();

        // StartノードとEndノードは保持し、他のノードとすべてのエッジをクリア
        set({
          nodes: [DEFAULT_START_NODE, DEFAULT_END_NODE],
          edges: [],
          selectedNodeId: null,
          highlightedGroupNodeId: null,
          workflowDescription: '', // Reset description
          slashCommandOptions: {
            context: 'default',
            model: 'default',
            hooks: undefined,
          },
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
        // Clear undo/redo history to prevent cross-workflow undo
        useWorkflowStore.temporal.getState().clear();
      },

      addGeneratedWorkflow: (workflow: Workflow) => {
        // Convert workflow nodes to ReactFlow nodes
        const newNodes: Node[] = sortNodesParentFirst(
          workflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: {
              x: node.position.x,
              y: node.position.y,
            },
            // Normalize MCP node data for backwards compatibility
            data: node.type === 'mcp' ? normalizeMcpNodeData(node.data as McpNodeData) : node.data,
            ...(node.parentId && { parentId: node.parentId }),
            ...(node.style && { style: node.style }),
            // Keep group below edge SVG layer so edges inside groups remain clickable (selected: -1001+1000=-1 < edge:0)
            ...(node.type === 'group' && { zIndex: -1001 }),
          }))
        );

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
          highlightedGroupNodeId: null,
          activeWorkflow: workflow,
          subAgentFlows: workflow.subAgentFlows || [],
          // Reset any running tour when a new workflow is loaded/applied
          isTourActive: false,
          tourStepIndex: 0,
        });
        // Clear undo/redo history to prevent cross-workflow undo
        useWorkflowStore.temporal.getState().clear();
      },

      updateWorkflow: (workflow: Workflow) => {
        // Convert workflow nodes to ReactFlow nodes
        const newNodes: Node[] = sortNodesParentFirst(
          workflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: {
              x: node.position.x,
              y: node.position.y,
            },
            // Normalize MCP node data for backwards compatibility
            data: node.type === 'mcp' ? normalizeMcpNodeData(node.data as McpNodeData) : node.data,
            ...(node.parentId && { parentId: node.parentId }),
            ...(node.style && { style: node.style }),
            // Keep group below edge SVG layer so edges inside groups remain clickable (selected: -1001+1000=-1 < edge:0)
            ...(node.type === 'group' && { zIndex: -1001 }),
          }))
        );

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
          highlightedGroupNodeId: null,
          activeWorkflow: workflow,
          subAgentFlows: workflow.subAgentFlows || [],
          // Reset any running tour when a new workflow is loaded/applied
          isTourActive: false,
          tourStepIndex: 0,
        });
      },

      // Phase 3.12: Set active workflow and update canvas
      setActiveWorkflow: (workflow: Workflow, options?: { clearHistory?: boolean }) => {
        // Convert workflow nodes to ReactFlow nodes
        const newNodes: Node[] = sortNodesParentFirst(
          workflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: {
              x: node.position.x,
              y: node.position.y,
            },
            data: node.data,
            ...(node.parentId && { parentId: node.parentId }),
            ...(node.style && { style: node.style }),
            // Keep group below edge SVG layer so edges inside groups remain clickable (selected: -1001+1000=-1 < edge:0)
            ...(node.type === 'group' && { zIndex: -1001 }),
          }))
        );

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
          highlightedGroupNodeId: null,
          activeWorkflow: workflow,
          subAgentFlows: workflow.subAgentFlows || [],
          // Reset any running tour when a new workflow is loaded/applied
          isTourActive: false,
          tourStepIndex: 0,
        });
        // Clear undo/redo history to prevent cross-workflow undo
        // Skip clearing when explicitly requested (e.g., MCP apply on same workflow)
        if (options?.clearHistory !== false) {
          useWorkflowStore.temporal.getState().clear();
        }
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
          ...(node.parentId && { parentId: node.parentId }),
          ...(node.style &&
            (node.style.width || node.style.height) && {
              style: {
                ...(node.style.width && { width: node.style.width }),
                ...(node.style.height && { height: node.style.height }),
              },
            }),
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
          subAgentFlows: get().subAgentFlows.map((sf) =>
            sf.id === id ? { ...sf, ...updates } : sf
          ),
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
        // Clear undo/redo history to prevent cross-canvas undo
        useWorkflowStore.temporal.getState().clear();
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
          // Clear undo/redo history to prevent cross-canvas undo
          useWorkflowStore.temporal.getState().clear();
        }
      },
    }),
    {
      // Only track nodes and edges for undo/redo
      // Exclude selected, width, height, measured (dimension changes from React Flow rendering)
      partialize: (state): TrackedState => ({
        nodes: state.nodes.map(({ selected, width, height, ...rest }) => rest as Node),
        edges: state.edges.map(({ selected, ...rest }) => rest as Edge),
      }),
      // Prevent duplicate history entries for identical states
      equality: (pastState, currentState) =>
        JSON.stringify(pastState) === JSON.stringify(currentState),
      // Limit history stack size
      limit: 50,
    }
  )
);

// ============================================================================
// Canvas Revision Tracking (Optimistic Concurrency Control)
// ============================================================================
// External counter to avoid unnecessary re-renders.
// Only increments on content-meaningful changes (excludes selection, dimensions).

let _canvasRevision = 0;
const _initialState = useWorkflowStore.getState();
let _prevNodesRef: Node[] = _initialState.nodes;
let _prevEdgesRef: Edge[] = _initialState.edges;

/**
 * Strip non-content fields for comparison (same logic as partialize for undo/redo).
 * Selection state and React Flow measurement data are NOT content changes.
 */
function contentFingerprint(nodes: Node[], edges: Edge[]): string {
  const n = nodes.map(({ selected, width, height, ...rest }) => rest);
  const e = edges.map(({ selected, ...rest }) => rest);
  return JSON.stringify({ n, e });
}

let _prevFingerprint = contentFingerprint(_initialState.nodes, _initialState.edges);

useWorkflowStore.subscribe((state) => {
  // Fast path: skip if references haven't changed
  if (state.nodes === _prevNodesRef && state.edges === _prevEdgesRef) return;
  _prevNodesRef = state.nodes;
  _prevEdgesRef = state.edges;

  // Slow path: deep content comparison (only when references differ)
  const fp = contentFingerprint(state.nodes, state.edges);
  if (fp !== _prevFingerprint) {
    _prevFingerprint = fp;
    _canvasRevision++;
  }
});

export function getCanvasRevision(): number {
  return _canvasRevision;
}

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
