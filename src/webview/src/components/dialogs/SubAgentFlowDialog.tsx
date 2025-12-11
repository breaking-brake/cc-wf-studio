/**
 * SubAgentFlowDialog Component
 *
 * Fullscreen dialog for editing Sub-Agent Flows
 * Provides a clear visual distinction from the main workflow canvas
 */

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
import { useIsCompactMode } from '../../hooks/useWindowWidth';
import { useTranslation } from '../../i18n/i18n-context';
import { generateWorkflowName } from '../../services/ai-generation-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { useWorkflowStore } from '../../stores/workflow-store';
import { EditableNameField } from '../common/EditableNameField';
import { StyledTooltip } from '../common/StyledTooltip';
import { InteractionModeToggle } from '../InteractionModeToggle';
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
import { PropertyPanel } from '../PropertyPanel';
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
 * Edge types
 */
const edgeTypes: EdgeTypes = {};

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

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    interactionMode,
    activeSubAgentFlowId,
    subAgentFlows,
    updateSubAgentFlow,
    selectedNodeId,
    isPropertyPanelOpen,
    cancelSubAgentFlowEditing,
    mainWorkflowSnapshot,
    updateActiveWorkflowMetadata,
  } = useWorkflowStore();

  const { loadConversationHistory, initConversation } = useRefinementStore();

  // Get active sub-agent flow info
  const activeSubAgentFlow = useMemo(
    () => subAgentFlows.find((sf) => sf.id === activeSubAgentFlowId),
    [subAgentFlows, activeSubAgentFlowId]
  );

  // Sub-Agent Flow name validation state
  const [nameError, setNameError] = useState<string | null>(null);

  // Local name state (not saved to store until submit)
  const [localName, setLocalName] = useState<string>('');

  // AI Edit mode state
  const [isAiEditMode, setIsAiEditMode] = useState(false);

  // Handle toggling AI edit mode with proper workflow context setup
  const handleToggleAiEditMode = useCallback(() => {
    if (!isAiEditMode) {
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

        // Initialize conversation history for the SubAgentFlow
        const subAgentFlow = updatedSubAgentFlows.find((sf) => sf.id === activeSubAgentFlowId);
        if (subAgentFlow?.conversationHistory) {
          loadConversationHistory(subAgentFlow.conversationHistory);
        } else {
          initConversation();
        }
      }
    }
    setIsAiEditMode(!isAiEditMode);
  }, [
    isAiEditMode,
    mainWorkflowSnapshot,
    activeSubAgentFlowId,
    nodes,
    edges,
    subAgentFlows,
    updateActiveWorkflowMetadata,
    loadConversationHistory,
    initConversation,
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

  // AI name generation state
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const generationNameRequestIdRef = useRef<string | null>(null);

  // Sub-Agent Flow name pattern validation
  const SUBAGENTFLOW_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

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

      // Generate name with AI
      const generatedName = await generateWorkflowName(subAgentFlowJson, targetLanguage);

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

  // Snap grid
  const snapGrid = useMemo<[number, number]>(() => [15, 15], []);

  // Track modifier key state
  const [isModifierKeyPressed, setIsModifierKeyPressed] = useState(false);

  // Keyboard event handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Escape when not focused on input
      if (event.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') {
        handleCancel();
        return;
      }
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
  }, [isOpen, handleCancel]);

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

  if (!isOpen || !activeSubAgentFlow) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="presentation"
      onClick={handleCancel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
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
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Only stop propagation for Escape to prevent closing parent dialogs
          // Allow other keys (like Ctrl+C/V) to work normally
          if (e.key === 'Escape') {
            e.stopPropagation();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subagentflow-dialog-title"
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
              id="subagentflow-dialog-title"
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
                  backgroundColor: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  width: isCompact ? 120 : 200,
                  height: isCompact ? 80 : 150,
                }}
              />
              <Panel position="top-left">
                <InteractionModeToggle />
              </Panel>

              {/* AI Refinement Button */}
              <Panel position="top-right">
                <StyledTooltip content={t('subAgentFlow.aiEdit.toggleButton')} side="left">
                  <button
                    type="button"
                    onClick={handleToggleAiEditMode}
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
                    {!isCompact && t('subAgentFlow.aiEdit.title')}
                  </button>
                </StyledTooltip>
              </Panel>
            </ReactFlow>
          </div>

          {/* Right: Property Panel or AI Edit Panel (conditional) */}
          {/* Priority: PropertyPanel > RefinementChatPanel (matches main workflow behavior) */}
          {selectedNodeId && isPropertyPanelOpen ? (
            <PropertyPanel />
          ) : isAiEditMode && activeSubAgentFlowId ? (
            <RefinementChatPanel
              mode="subAgentFlow"
              subAgentFlowId={activeSubAgentFlowId}
              onClose={() => setIsAiEditMode(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
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
