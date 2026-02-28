/**
 * MCP Node Edit Dialog Component (Wizard Format)
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Edit MCP nodes with step-by-step wizard UI matching the creation dialog
 *
 * Opens at the final step based on existing node mode, allowing users to
 * navigate back to change mode or tool selection.
 *
 * Steps (server is read-only, not a step):
 * 1. Mode selection
 * 2. Tool or Task config
 * 3. Final config (only for aiParameterConfig / manualParameterConfig)
 */

import * as Dialog from '@radix-ui/react-dialog';
import type { McpNodeData } from '@shared/types/mcp-node';
import { useEffect, useState } from 'react';
import { EditWizardStep, useMcpEditWizard } from '../../hooks/useMcpEditWizard';
import { useTranslation } from '../../i18n/i18n-context';
import { useWorkflowStore } from '../../stores/workflow-store';
import { WizardStepIndicator } from '../common/WizardStepIndicator';
import { McpToolList } from '../mcp/McpToolList';
import { McpToolSearch } from '../mcp/McpToolSearch';
import { AiParameterConfigInput } from '../mode-selection/AiParameterConfigInput';
import { AiToolSelectionInput } from '../mode-selection/AiToolSelectionInput';
import { McpModeSelectionStep } from '../mode-selection/McpModeSelectionStep';
import { ParameterDetailedConfigStep } from '../mode-selection/ParameterDetailedConfigStep';

interface McpNodeEditDialogProps {
  isOpen: boolean;
  nodeId: string;
  onClose: () => void;
}

export function McpNodeEditDialog({ isOpen, nodeId, onClose }: McpNodeEditDialogProps) {
  const { t } = useTranslation();
  const { nodes, updateNodeData } = useWorkflowStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const wizard = useMcpEditWizard();

  // Find the node being edited
  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as McpNodeData | undefined;

  /**
   * Initialize wizard from node data when dialog opens
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: initializeFromNodeData is stable (useCallback with [])
  useEffect(() => {
    if (isOpen && nodeData) {
      wizard.initializeFromNodeData(nodeData);
      setSearchQuery('');
      setError(null);
      setShowValidation(false);
    }
  }, [isOpen, nodeData]);

  /**
   * Reset validation state when wizard step changes
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: Need to reset validation when step changes
  useEffect(() => {
    setShowValidation(false);
    setError(null);
  }, [wizard.state.currentStep]);

  /**
   * Handle save
   */
  const handleSave = () => {
    if (!node || !nodeData) {
      return;
    }

    setShowValidation(true);

    switch (wizard.state.selectedMode) {
      case 'manualParameterConfig': {
        if (!wizard.state.selectedTool) {
          setError(t('mcp.dialog.error.noToolSelected'));
          return;
        }

        // ParameterDetailedConfigStep handles its own schema loading,
        // so we validate using the wizard's manualParameterValues.
        // For required parameter validation, we rely on ParameterDetailedConfigStep's
        // internal validation display (showValidation prop).

        updateNodeData(nodeId, {
          ...nodeData,
          mode: wizard.state.selectedMode,
          toolName: wizard.state.selectedTool.name,
          toolDescription: wizard.state.selectedTool.description || '',
          parameterValues: wizard.state.manualParameterValues,
        });
        break;
      }

      case 'aiParameterConfig': {
        if (!wizard.state.selectedTool) {
          setError(t('mcp.dialog.error.noToolSelected'));
          return;
        }

        if (
          !wizard.state.aiParameterConfigDescription ||
          wizard.state.aiParameterConfigDescription.trim().length === 0
        ) {
          setShowValidation(true);
          return;
        }

        updateNodeData(nodeId, {
          ...nodeData,
          mode: wizard.state.selectedMode,
          toolName: wizard.state.selectedTool.name,
          toolDescription: wizard.state.selectedTool.description || '',
          aiParameterConfig: {
            description: wizard.state.aiParameterConfigDescription,
            timestamp: new Date().toISOString(),
          },
        });
        break;
      }

      case 'aiToolSelection': {
        if (
          !wizard.state.naturalLanguageTaskDescription ||
          wizard.state.naturalLanguageTaskDescription.trim().length === 0
        ) {
          setShowValidation(true);
          return;
        }

        updateNodeData(nodeId, {
          ...nodeData,
          mode: wizard.state.selectedMode,
          toolName: '',
          toolDescription: '',
          aiToolSelectionConfig: {
            taskDescription: wizard.state.naturalLanguageTaskDescription,
            timestamp: new Date().toISOString(),
          },
        });
        break;
      }

      default:
        return;
    }

    handleClose();
  };

  const handleClose = () => {
    wizard.reset();
    setSearchQuery('');
    setShowValidation(false);
    setError(null);
    onClose();
  };

  /**
   * Render step content based on current wizard step
   */
  const renderStepContent = () => {
    switch (wizard.state.currentStep) {
      case EditWizardStep.ModeSelection:
        return (
          <McpModeSelectionStep
            selectedMode={wizard.state.selectedMode}
            onModeChange={(mode) => {
              wizard.setSelectedMode(mode);
              setError(null);
            }}
          />
        );

      case EditWizardStep.ToolOrTaskConfig:
        if (wizard.state.selectedMode === 'aiToolSelection') {
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
        }
        // aiParameterConfig / manualParameterConfig → Tool selection
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
                serverId={nodeData?.serverId || ''}
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

      case EditWizardStep.FinalConfig:
        if (wizard.state.selectedMode === 'aiParameterConfig') {
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
        }
        // manualParameterConfig
        return (
          <ParameterDetailedConfigStep
            serverId={nodeData?.serverId || ''}
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
      return t('mcp.editDialog.saveButton');
    }
    return t('mcp.dialog.nextButton');
  };

  /**
   * Handle action button click (Next or Save)
   */
  const handleActionButton = () => {
    setShowValidation(true);

    if (wizard.isComplete) {
      handleSave();
    } else {
      if (wizard.canProceed) {
        wizard.nextStep();
      } else {
        setError(t('mcp.dialog.error.cannotProceed'));
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
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
          >
            {/* Dialog Header */}
            <Dialog.Title
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('mcp.editDialog.title')}
            </Dialog.Title>

            {/* Server Info (read-only) */}
            {nodeData && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--vscode-list-inactiveSelectionBackground)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: 'var(--vscode-disabledForeground)',
                }}
              >
                <strong>{t('property.mcp.serverId')}:</strong> {nodeData.serverId}
              </div>
            )}

            {/* Step Indicator */}
            <WizardStepIndicator
              currentStep={wizard.state.currentStep}
              totalSteps={wizard.totalSteps}
            />

            {/* Visually Hidden Accessibility Description */}
            <Dialog.Description
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
              }}
            >
              Step {wizard.state.currentStep} of {wizard.totalSteps}
            </Dialog.Description>

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
                {t('mcp.editDialog.cancelButton')}
              </button>

              {/* Back Button */}
              {wizard.state.currentStep !== EditWizardStep.ModeSelection && (
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
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
