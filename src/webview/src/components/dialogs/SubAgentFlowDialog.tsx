/**
 * SubAgentFlowDialog Component
 *
 * Fullscreen dialog for editing Sub-Agent Flows
 * Provides a clear visual distinction from the main workflow canvas
 */

import * as Collapsible from '@radix-ui/react-collapsible';
import * as Dialog from '@radix-ui/react-dialog';
import type { ConversationHistory } from '@shared/types/workflow-definition';
import { Check, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ReactFlowProvider,
} from 'reactflow';
import { useAutoFocusNode } from '../../hooks/useAutoFocusNode';
import { useLocalRefinementChatState } from '../../hooks/useLocalRefinementChatState';
import { useIsCompactMode } from '../../hooks/useWindowWidth';
import { useTranslation } from '../../i18n/i18n-context';
import {
  cancelWorkflowNameGeneration,
  generateWorkflowName,
} from '../../services/ai-generation-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import { EditableNameField } from '../common/EditableNameField';
import { StyledTooltip } from '../common/StyledTooltip';
// Custom edge with delete button
import { DeletableEdge } from '../edges/DeletableEdge';
import { InteractionModeToggle } from '../InteractionModeToggle';
import { MinimapContainer } from '../MinimapContainer';
import { NodePalette } from '../NodePalette';
import { AskUserQuestionNodeComponent } from '../nodes/AskUserQuestionNode';
import { BranchNodeComponent } from '../nodes/BranchNode';
import { EndNode } from '../nodes/EndNode';
import { IfElseNodeComponent } from '../nodes/IfElseNode';
import { McpNodeComponent } from '../nodes/McpNode/McpNode';
import { PromptNode } from '../nodes/PromptNode';
import { SkillNodeComponent } from '../nodes/SkillNode';
import { StartNode } from '../nodes/StartNode';
import { SubAgentFlowNodeComponent } from '../nodes/SubAgentFlowNode';
import { SubAgentNodeComponent } from '../nodes/SubAgentNode';
import { SwitchNodeComponent } from '../nodes/SwitchNode';
import { PropertyOverlay } from '../PropertyOverlay';
import { RefinementChatPanel } from './RefinementChatPanel';

/**
 * Node types registration
 */
const nodeTypes: NodeTypes = {
  subAgent: SubAgentNodeComponent,
  askUserQuestion: AskUserQuestionNodeComponent,
  branch: BranchNodeComponent,
  ifElse: IfElseNodeComponent,
  switch: SwitchNodeComponent,
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  skill: SkillNodeComponent,
  mcp: McpNodeComponent,
  subAgentFlow: SubAgentFlowNodeComponent,
};

/**
 * Default edge options
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

interface SubAgentFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Inner component that uses ReactFlow hooks
 */
const SubAgentFlowDialogContent: React.FC<SubAgentFlowDialogProps> = ({ isOpen, onClose }) => {
  const { t, locale } = useTranslation();
  const isCompact = useIsCompactMode();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-focus on newly added nodes
  useAutoFocusNode();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    interactionMode,
    activeSubAgentFlowId,
    subAgentFlows,
    updateSubAgentFlow,
    cancelSubAgentFlowEditing,
    mainWorkflowSnapshot,
    updateActiveWorkflowMetadata,
    ensureActiveWorkflow,
  } = useWorkflowStore();

  // Local state for panel display (independent from main canvas)
  const [localSelectedNodeId, setLocalSelectedNodeId] = useState<string | null>(null);
  const [isLocalPropertyOverlayOpen, setIsLocalPropertyOverlayOpen] = useState(false);
  const [isLocalRefinementPanelOpen, setIsLocalRefinementPanelOpen] = useState(false);

  // Local chat state hook (independent from main workflow's refinement store)
  const handleLocalRefinementSuccess = useCallback(
    (updatedHistory: ConversationHistory) => {
      if (activeSubAgentFlowId) {
        updateSubAgentFlow(activeSubAgentFlowId, {
          conversationHistory: updatedHistory,
        });
      }
    },
    [activeSubAgentFlowId, updateSubAgentFlow]
  );

  const { chatState: localChatState, initializeHistory: initializeLocalChatHistory } =
    useLocalRefinementChatState({
      onRefinementSuccess: handleLocalRefinementSuccess,
    });

  // Get active sub-agent flow info
  const activeSubAgentFlow = useMemo(
    () => subAgentFlows.find((sf) => sf.id === activeSubAgentFlowId),
    [subAgentFlows, activeSubAgentFlowId]
  );

  // Sub-Agent Flow name validation state
  const [nameError, setNameError] = useState<string | null>(null);

  // Local name state (not saved to store until submit)
  const [localName, setLocalName] = useState<string>('');

  // Handle toggling AI edit mode with proper workflow context setup
  const handleToggleAiEditMode = useCallback(() => {
    if (!isLocalRefinementPanelOpen) {
      // Ensure activeWorkflow exists before opening AI edit mode
      // This handles the case where workflow was created manually (not via AI generation or load)
      ensureActiveWorkflow();

      // Opening AI edit mode - need to set up activeWorkflow with main workflow context
      if (mainWorkflowSnapshot && activeSubAgentFlowId) {
        // Find the current SubAgentFlow being edited
        const currentSubAgentFlow = subAgentFlows.find((sf) => sf.id === activeSubAgentFlowId);
        if (!currentSubAgentFlow) return;

        // Get current SubAgentFlow state from canvas (with latest edits)
        // Use the same node structure as the original SubAgentFlow
        const currentSubAgentFlowNodes = nodes.map((node) => ({
          ...currentSubAgentFlow.nodes.find((n) => n.id === node.id),
          id: node.id,
          name: node.data?.label || node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        }));

        const currentSubAgentFlowConnections = edges.map((edge) => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          fromPort: edge.sourceHandle || 'default',
          toPort: edge.targetHandle || 'default',
        }));

        // Update subAgentFlows with current canvas state
        const updatedSubAgentFlows = subAgentFlows.map((sf) =>
          sf.id === activeSubAgentFlowId
            ? {
                ...sf,
                nodes: currentSubAgentFlowNodes as typeof sf.nodes,
                connections: currentSubAgentFlowConnections,
              }
            : sf
        );

        // Update only the subAgentFlows in activeWorkflow without changing the canvas
        // Using updateActiveWorkflowMetadata to avoid overwriting SubAgentFlow canvas with main workflow
        updateActiveWorkflowMetadata({ subAgentFlows: updatedSubAgentFlows });

        // Initialize local conversation history using hook (not global store)
        const subAgentFlow = updatedSubAgentFlows.find((sf) => sf.id === activeSubAgentFlowId);
        initializeLocalChatHistory(subAgentFlow?.conversationHistory ?? null);
      }
      setIsLocalRefinementPanelOpen(true);
    } else {
      setIsLocalRefinementPanelOpen(false);
    }
  }, [
    isLocalRefinementPanelOpen,
    mainWorkflowSnapshot,
    activeSubAgentFlowId,
    nodes,
    edges,
    subAgentFlows,
    updateActiveWorkflowMetadata,
    initializeLocalChatHistory,
    ensureActiveWorkflow,
  ]);

  // Initialize local name when dialog opens (activeSubAgentFlowId changes)
  useEffect(() => {
    if (activeSubAgentFlowId) {
      const flow = subAgentFlows.find((sf) => sf.id === activeSubAgentFlowId);
      if (flow) {
        setLocalName(flow.name);
        setNameError(null);
      }
    }
  }, [activeSubAgentFlowId, subAgentFlows]);

  // Reset local panel state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setLocalSelectedNodeId(null);
      setIsLocalPropertyOverlayOpen(false);
      setIsLocalRefinementPanelOpen(false);
    }
  }, [isOpen]);

  // AI name generation state
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const generationNameRequestIdRef = useRef<string | null>(null);

  // Sub-Agent Flow name pattern validation (lowercase only for cross-platform compatibility)
  const SUBAGENTFLOW_NAME_PATTERN = /^[a-z0-9_-]+$/;

  // Handle name change with validation (local state only, saved on submit)
  const handleNameChange = useCallback(
    (value: string) => {
      setLocalName(value);
      if (value.length === 0) {
        setNameError(t('error.subAgentFlow.nameRequired'));
      } else if (value.length > 50) {
        setNameError(t('error.subAgentFlow.nameTooLong'));
      } else if (!SUBAGENTFLOW_NAME_PATTERN.test(value)) {
        setNameError(t('error.subAgentFlow.invalidName'));
      } else {
        setNameError(null);
      }
    },
    [t]
  );

  // Handle AI name generation for Sub-Agent Flow
  const handleGenerateSubAgentFlowName = useCallback(async () => {
    if (!activeSubAgentFlow) return;

    const currentRequestId = `gen-subagentflow-name-${Date.now()}`;
    generationNameRequestIdRef.current = currentRequestId;
    setIsGeneratingName(true);

    try {
      // Serialize the sub-agent flow structure for AI analysis
      const subAgentFlowJson = JSON.stringify(
        {
          name: activeSubAgentFlow.name,
          description: activeSubAgentFlow.description,
          nodes: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            data: node.data,
          })),
          connections: edges.map((edge) => ({
            from: edge.source,
            to: edge.target,
          })),
        },
        null,
        2
      );

      // Determine target language from locale
      let targetLanguage = locale;
      if (locale.startsWith('zh-')) {
        targetLanguage = locale === 'zh-TW' || locale === 'zh-HK' ? 'zh-TW' : 'zh-CN';
      } else {
        targetLanguage = locale.split('-')[0];
      }

      // Generate name with AI (pass requestId for cancellation support)
      const generatedName = await generateWorkflowName(
        subAgentFlowJson,
        targetLanguage,
        30000,
        currentRequestId
      );

      // Only update if not cancelled
      if (generationNameRequestIdRef.current === currentRequestId) {
        // Validate and apply the generated name (remove invalid characters)
        const validatedName = generatedName.replace(/[^a-zA-Z0-9_-]/g, '-');
        const truncatedName = validatedName.slice(0, 50);

        if (truncatedName.length > 0) {
          setLocalName(truncatedName);
          setNameError(null);
        }
      }
    } catch (error) {
      // Only log error if not cancelled
      if (generationNameRequestIdRef.current === currentRequestId) {
        console.error('Failed to generate Sub-Agent Flow name:', error);
      }
    } finally {
      if (generationNameRequestIdRef.current === currentRequestId) {
        setIsGeneratingName(false);
        generationNameRequestIdRef.current = null;
      }
    }
  }, [activeSubAgentFlow, nodes, edges, locale]);

  // Handle cancel name generation
  const handleCancelNameGeneration = useCallback(() => {
    const requestId = generationNameRequestIdRef.current;
    if (requestId) {
      cancelWorkflowNameGeneration(requestId);
    }
    generationNameRequestIdRef.current = null;
    setIsGeneratingName(false);
  }, []);

  // Handle Submit: Save sub-agent flow name and close dialog
  const handleSubmit = useCallback(() => {
    // Save name to store only on submit (if valid)
    if (activeSubAgentFlowId && localName && !nameError) {
      updateSubAgentFlow(activeSubAgentFlowId, { name: localName });
    }
    // onClose will save the sub-agent flow canvas via setActiveSubAgentFlowId(null)
    onClose();
  }, [activeSubAgentFlowId, localName, nameError, updateSubAgentFlow, onClose]);

  // Handle Cancel: Discard sub-agent flow and close dialog
  const handleCancel = useCallback(() => {
    cancelSubAgentFlowEditing();
  }, [cancelSubAgentFlowEditing]);

  // Connection validation
  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (targetNode?.type === 'start') {
        return false;
      }
      if (sourceNode?.type === 'end') {
        return false;
      }
      return true;
    },
    [nodes]
  );

  // Handle node selection
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setLocalSelectedNodeId(node.id);
    setIsLocalPropertyOverlayOpen(true);
  }, []);

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    setLocalSelectedNodeId(null);
    setIsLocalPropertyOverlayOpen(false);
  }, []);

  // Snap grid
  const snapGrid = useMemo<[number, number]>(() => [15, 15], []);

  // Track modifier key state
  const [isModifierKeyPressed, setIsModifierKeyPressed] = useState(false);

  // Keyboard event handlers for modifier keys
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // Focus dialog on open
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // Calculate effective interaction mode
  const effectiveMode = useMemo(() => {
    if (isModifierKeyPressed) {
      return interactionMode === 'pan' ? 'selection' : 'pan';
    }
    return interactionMode;
  }, [interactionMode, isModifierKeyPressed]);

  const panOnDrag = effectiveMode === 'pan';
  const selectionOnDrag = effectiveMode === 'selection';

  if (!activeSubAgentFlow) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
            ref={dialogRef}
            aria-label="Sub-Agent Flow Editor"
            aria-describedby={undefined}
            onEscapeKeyDown={(e) => {
              // Only close when not focused on input
              if (document.activeElement?.tagName === 'INPUT') {
                e.preventDefault();
              }
            }}
            style={{
              position: 'relative',
              width: '95vw',
              height: '95vh',
              backgroundColor: 'var(--vscode-editor-background)',
              border: '2px solid var(--vscode-charts-purple)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              outline: 'none',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--vscode-editorWidget-background)',
                borderBottom: '2px solid var(--vscode-charts-purple)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--vscode-charts-purple)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flexShrink: 0,
                  }}
                >
                  Sub-Agent Flow
                </span>
                {/* Flow name display/input with AI Generate button inside */}
                <div style={{ flex: 1, maxWidth: '300px' }}>
                  <EditableNameField
                    value={localName}
                    onChange={handleNameChange}
                    placeholder={t('subAgentFlow.namePlaceholder')}
                    disabled={isGeneratingName}
                    error={nameError}
                    aiGeneration={{
                      isGenerating: isGeneratingName,
                      onGenerate: handleGenerateSubAgentFlowName,
                      onCancel: handleCancelNameGeneration,
                      generateTooltip: t('subAgentFlow.generateNameWithAI'),
                      cancelTooltip: t('cancel'),
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* AI Edit button */}
                <StyledTooltip content={t('subAgentFlow.aiEdit.toggleButton')} side="bottom">
                  <button
                    type="button"
                    onClick={handleToggleAiEditMode}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: isCompact ? '0' : '4px',
                      padding: isCompact ? '0 8px' : '0 12px',
                      height: '32px',
                      backgroundColor: 'var(--vscode-button-background)',
                      color: 'var(--vscode-button-foreground)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        'var(--vscode-button-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                    }}
                  >
                    <Sparkles size={14} />
                    {!isCompact && t('toolbar.refineWithAI')}
                  </button>
                </StyledTooltip>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  title={t('subAgentFlow.dialog.submit')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                  }}
                >
                  <Check size={18} />
                </button>
                {/* Cancel button */}
                <button
                  type="button"
                  onClick={handleCancel}
                  title={t('subAgentFlow.dialog.cancel')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'transparent',
                    color: 'var(--vscode-foreground)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Content: 3-column layout */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Left: Node Palette */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <NodePalette />
              </div>

              {/* Center: ReactFlow Canvas */}
              <div style={{ flex: 1, position: 'relative' }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
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
                  <Background color="rgba(136, 87, 229, 0.3)" gap={15} size={1} />
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
                            case 'branch':
                            case 'ifElse':
                            case 'switch':
                              return 'var(--vscode-charts-yellow)';
                            case 'start':
                              return 'var(--vscode-charts-green)';
                            case 'end':
                              return 'var(--vscode-charts-red)';
                            case 'prompt':
                            case 'subAgentFlowRef':
                              return 'var(--vscode-charts-purple)';
                            case 'skill':
                              return 'var(--vscode-charts-cyan)';
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
                        }}
                      />
                    </MinimapContainer>
                  </Panel>

                  {/* Interaction Mode Toggle */}
                  <Panel position="top-left">
                    <InteractionModeToggle />
                  </Panel>
                </ReactFlow>

                {/* Property Overlay - overlay on canvas right side */}
                {localSelectedNodeId && isLocalPropertyOverlayOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      bottom: 5,
                      zIndex: 10,
                    }}
                  >
                    <PropertyOverlay
                      overrideSelectedNodeId={localSelectedNodeId}
                      onClose={() => setIsLocalPropertyOverlayOpen(false)}
                    />
                  </div>
                )}
              </div>

              {/* Refinement Panel with Radix Collapsible for slide animation */}
              <Collapsible.Root open={isLocalRefinementPanelOpen}>
                <Collapsible.Content className="refinement-panel-collapsible">
                  <RefinementChatPanel
                    chatState={localChatState}
                    mode="subAgentFlow"
                    subAgentFlowId={activeSubAgentFlowId || undefined}
                    onClose={() => setIsLocalRefinementPanelOpen(false)}
                  />
                </Collapsible.Content>
              </Collapsible.Root>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/**
 * SubAgentFlowDialog with ReactFlowProvider wrapper
 */
export const SubAgentFlowDialog: React.FC<SubAgentFlowDialogProps> = (props) => {
  if (!props.isOpen) {
    return null;
  }

  return (
    <ReactFlowProvider>
      <SubAgentFlowDialogContent {...props} />
    </ReactFlowProvider>
  );
};

export default SubAgentFlowDialog;
