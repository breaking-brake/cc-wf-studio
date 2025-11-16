/**
 * MCP Node Creation Dialog Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Step-by-step wizard for creating MCP nodes with mode selection
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T017, T048
 */

import type { McpToolReference } from '@shared/types/mcp-node';
import { NodeType } from '@shared/types/workflow-definition';
import { useEffect, useState } from 'react';
import { useMcpCreationWizard, WizardStep } from '../../hooks/useMcpCreationWizard';
import { useTranslation } from '../../i18n/i18n-context';
import { useWorkflowStore } from '../../stores/workflow-store';
import { McpServerList } from '../mcp/McpServerList';
import { McpToolList } from '../mcp/McpToolList';
import { McpToolSearch } from '../mcp/McpToolSearch';
import { AiParameterConfigInput } from '../mode-selection/AiParameterConfigInput';
import { AiToolSelectionInput } from '../mode-selection/AiToolSelectionInput';
import { ParameterConfigModeStep } from '../mode-selection/ParameterConfigModeStep';
import { ParameterDetailedConfigStep } from '../mode-selection/ParameterDetailedConfigStep';
import { ToolSelectionModeStep } from '../mode-selection/ToolSelectionModeStep';

interface McpNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function McpNodeDialog({ isOpen, onClose }: McpNodeDialogProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const wizard = useMcpCreationWizard();
  const { addNode, nodes } = useWorkflowStore();

  /**
   * Reset validation state when wizard step changes
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to reset validation when step changes
  useEffect(() => {
    setShowValidation(false);
    setError(null);
  }, [wizard.state.currentStep]);

  /**
   * Calculate non-overlapping position for new node
   */
  const calculateNonOverlappingPosition = (
    defaultX: number,
    defaultY: number
  ): { x: number; y: number } => {
    const OFFSET_X = 30;
    const OFFSET_Y = 30;
    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 100;

    let newX = defaultX;
    let newY = defaultY;

    for (let i = 0; i < 100; i++) {
      const hasOverlap = nodes.some((node) => {
        const xOverlap =
          Math.abs(node.position.x - newX) < NODE_WIDTH &&
          Math.abs(node.position.y - newY) < NODE_HEIGHT;
        return xOverlap;
      });

      if (!hasOverlap) {
        return { x: newX, y: newY };
      }

      newX += OFFSET_X;
      newY += OFFSET_Y;
    }

    return { x: newX, y: newY };
  };

  if (!isOpen) {
    return null;
  }

  const handleSaveNode = () => {
    if (!wizard.isComplete) {
      setError(t('mcp.dialog.error.incompleteWizard'));
      return;
    }

    if (!wizard.state.selectedServer) {
      setError(t('mcp.dialog.error.noServerSelected'));
      return;
    }

    const position = calculateNonOverlappingPosition(300, 250);
    const nodeId = `mcp-${Date.now()}`;

    // Build node data based on mode
    switch (wizard.finalMode) {
      case 'manualParameterConfig': {
        if (!wizard.state.selectedTool) {
          setError(t('mcp.dialog.error.noToolSelected'));
          return;
        }

        addNode({
          id: nodeId,
          type: NodeType.Mcp,
          position,
          data: {
            mode: 'manualParameterConfig',
            serverId: wizard.state.selectedServer.id,
            toolName: wizard.state.selectedTool.name,
            toolDescription: wizard.state.selectedTool.description || '',
            parameters: wizard.state.selectedTool.parameters || [],
            parameterValues: wizard.state.manualParameterValues,
            validationStatus: 'valid',
            outputPorts: 1,
          },
        });
        break;
      }

      case 'aiParameterConfig': {
        if (!wizard.state.selectedTool) {
          setError(t('mcp.dialog.error.noToolSelected'));
          return;
        }

        // Validate parameter description (T036)
        if (
          !wizard.state.aiParameterConfigDescription ||
          wizard.state.aiParameterConfigDescription.trim().length === 0
        ) {
          setError(t('mcp.error.paramDescRequired'));
          return;
        }

        addNode({
          id: nodeId,
          type: NodeType.Mcp,
          position,
          data: {
            mode: 'aiParameterConfig',
            serverId: wizard.state.selectedServer.id,
            toolName: wizard.state.selectedTool.name,
            toolDescription: wizard.state.selectedTool.description || '',
            parameters: wizard.state.selectedTool.parameters || [],
            aiParameterConfig: {
              description: wizard.state.aiParameterConfigDescription,
              timestamp: new Date().toISOString(),
            },
            validationStatus: 'valid',
            outputPorts: 1,
          },
        });
        break;
      }

      case 'aiToolSelection': {
        // Validate task description (T048)
        if (
          !wizard.state.naturalLanguageTaskDescription ||
          wizard.state.naturalLanguageTaskDescription.trim().length === 0
        ) {
          setError(t('mcp.error.taskDescRequired'));
          return;
        }

        // TODO: T045-T046 - Get available tools from MCP server
        // For now, using empty array as placeholder until T045-T046 are implemented
        const availableTools: McpToolReference[] = [];

        addNode({
          id: nodeId,
          type: NodeType.Mcp,
          position,
          data: {
            mode: 'aiToolSelection',
            serverId: wizard.state.selectedServer.id,
            aiToolSelectionConfig: {
              taskDescription: wizard.state.naturalLanguageTaskDescription,
              availableTools,
              timestamp: new Date().toISOString(),
            },
            validationStatus: 'valid',
            outputPorts: 1,
          },
        });
        break;
      }

      default:
        setError(t('mcp.dialog.error.invalidMode'));
        return;
    }

    handleClose();
  };

  const handleClose = () => {
    wizard.reset();
    setSearchQuery('');
    setError(null);
    onClose();
  };

  /**
   * Render step content based on current wizard step
   */
  const renderStepContent = () => {
    switch (wizard.state.currentStep) {
      case WizardStep.ServerSelection:
        return (
          <div>
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('mcp.dialog.selectServer')}
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <McpServerList
                onServerSelect={(server) => {
                  wizard.setServer(server);
                  setError(null);
                }}
                selectedServerId={wizard.state.selectedServer?.id}
              />
            </div>
          </div>
        );

      case WizardStep.ToolSelectionMethod:
        return (
          <ToolSelectionModeStep
            selectedMode={wizard.state.toolSelectionMode}
            onModeChange={(mode) => {
              wizard.setToolSelectionMode(mode);
              setError(null);
            }}
          />
        );

      case WizardStep.ToolSelection:
        return (
          <div>
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('mcp.dialog.selectTool')}
            </h3>
            <McpToolSearch value={searchQuery} onChange={setSearchQuery} disabled={false} />
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <McpToolList
                serverId={wizard.state.selectedServer?.id || ''}
                onToolSelect={(tool) => {
                  wizard.setTool(tool);
                  setError(null);
                }}
                selectedToolName={wizard.state.selectedTool?.name}
                searchQuery={searchQuery}
              />
            </div>
          </div>
        );

      case WizardStep.ParameterConfigMethod:
        return (
          <ParameterConfigModeStep
            selectedMode={wizard.state.parameterConfigMode}
            onModeChange={(mode) => {
              wizard.setParameterConfigMode(mode);
              setError(null);
            }}
          />
        );

      case WizardStep.NaturalLanguageTask:
        return (
          <AiToolSelectionInput
            value={wizard.state.naturalLanguageTaskDescription}
            onChange={(value) => {
              wizard.setNaturalLanguageTaskDescription(value);
              setError(null);
            }}
            showValidation={showValidation}
          />
        );

      case WizardStep.NaturalLanguageParam:
        return (
          <AiParameterConfigInput
            value={wizard.state.aiParameterConfigDescription}
            onChange={(value) => {
              wizard.setAiParameterConfigDescription(value);
              setError(null);
            }}
            showValidation={showValidation}
          />
        );

      case WizardStep.ParameterDetailedConfig:
        return (
          <ParameterDetailedConfigStep
            serverId={wizard.state.selectedServer?.id || ''}
            toolName={wizard.state.selectedTool?.name || ''}
            parameterValues={wizard.state.manualParameterValues}
            onChange={(values) => {
              wizard.setManualParameterValues(values);
              setError(null);
            }}
            showValidation={showValidation}
          />
        );

      default:
        return null;
    }
  };

  /**
   * Determine button label based on wizard state
   */
  const getActionButtonLabel = (): string => {
    if (wizard.isComplete) {
      return t('mcp.dialog.saveButton');
    }
    return t('mcp.dialog.nextButton');
  };

  /**
   * Handle action button click (Next or Save)
   */
  const handleActionButton = () => {
    // Enable validation display
    setShowValidation(true);

    if (wizard.isComplete) {
      handleSaveNode();
    } else {
      if (wizard.canProceed) {
        wizard.nextStep();
      } else {
        setError(t('mcp.dialog.error.cannotProceed'));
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '6px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Dialog Header */}
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('mcp.dialog.title')}
        </h2>

        {/* Step Indicator */}
        <div
          style={{
            marginBottom: '20px',
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('mcp.dialog.wizardStep', {
            current: wizard.state.currentStep.toString(),
            total: '7',
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
              border: '1px solid var(--vscode-inputValidation-errorBorder)',
              borderRadius: '4px',
              color: 'var(--vscode-errorForeground)',
            }}
          >
            {error}
          </div>
        )}

        {/* Step Content */}
        <div style={{ marginBottom: '20px', minHeight: '300px' }}>{renderStepContent()}</div>

        {/* Dialog Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '20px',
            borderTop: '1px solid var(--vscode-panel-border)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {t('mcp.dialog.cancelButton')}
          </button>

          {/* Back Button */}
          {wizard.state.currentStep !== WizardStep.ServerSelection && (
            <button
              type="button"
              onClick={wizard.prevStep}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {t('mcp.dialog.backButton')}
            </button>
          )}

          {/* Next/Save Button */}
          <button
            type="button"
            onClick={handleActionButton}
            disabled={!wizard.canProceed}
            style={{
              padding: '8px 16px',
              backgroundColor: wizard.canProceed
                ? 'var(--vscode-button-background)'
                : 'var(--vscode-button-secondaryBackground)',
              color: wizard.canProceed
                ? 'var(--vscode-button-foreground)'
                : 'var(--vscode-descriptionForeground)',
              border: 'none',
              borderRadius: '4px',
              cursor: wizard.canProceed ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              opacity: wizard.canProceed ? 1 : 0.6,
            }}
          >
            {getActionButtonLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
