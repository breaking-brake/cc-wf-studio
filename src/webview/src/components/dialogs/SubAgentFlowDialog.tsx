/**
 * SubAgentFlowDialog Component
 *
 * Fullscreen dialog for editing Sub-Agent Flows
 * Provides a clear visual distinction from the main workflow canvas
 */

import { Check, X } from 'lucide-react';
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
import { useWorkflowStore } from '../../stores/workflow-store';
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
  const { t } = useTranslation();
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
  } = useWorkflowStore();

  // Get active sub-agent flow info
  const activeSubAgentFlow = useMemo(
    () => subAgentFlows.find((sf) => sf.id === activeSubAgentFlowId),
    [subAgentFlows, activeSubAgentFlowId]
  );

  // Sub-Agent Flow name validation state
  const [nameError, setNameError] = useState<string | null>(null);

  // Sub-Agent Flow name pattern validation
  const SUBAGENTFLOW_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

  // Handle name change with validation and immediate save
  const handleNameChange = useCallback(
    (value: string) => {
      if (value.length === 0) {
        setNameError(t('error.subAgentFlow.nameRequired'));
      } else if (value.length > 50) {
        setNameError(t('error.subAgentFlow.nameTooLong'));
      } else if (!SUBAGENTFLOW_NAME_PATTERN.test(value)) {
        setNameError(t('error.subAgentFlow.invalidName'));
      } else {
        setNameError(null);
        // Save immediately when valid
        if (activeSubAgentFlowId) {
          updateSubAgentFlow(activeSubAgentFlowId, { name: value });
        }
      }
    },
    [t, activeSubAgentFlowId, updateSubAgentFlow]
  );

  // Handle Submit: Save sub-agent flow and close dialog
  const handleSubmit = useCallback(() => {
    // onClose will save the sub-agent flow via setActiveSubAgentFlowId(null)
    onClose();
  }, [onClose]);

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
        onKeyDown={(e) => e.stopPropagation()}
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
            {/* Always-visible input field (Toolbar style) */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, maxWidth: '300px' }}>
              <input
                type="text"
                value={activeSubAgentFlow.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: nameError
                    ? '1px solid var(--vscode-inputValidation-errorBorder)'
                    : '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
                placeholder={t('subAgentFlow.namePlaceholder')}
              />
              {nameError && (
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--vscode-inputValidation-errorForeground)',
                    marginTop: '4px',
                  }}
                >
                  {nameError}
                </span>
              )}
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
            </ReactFlow>
          </div>

          {/* Right: Property Panel (conditional) */}
          {selectedNodeId && isPropertyPanelOpen && <PropertyPanel />}
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
