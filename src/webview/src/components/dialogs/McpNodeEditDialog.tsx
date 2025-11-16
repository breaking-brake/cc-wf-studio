/**
 * MCP Node Edit Dialog Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Configure MCP nodes with mode selection wizard
 *
 * Based on: specs/001-mcp-natural-language-mode/extension-points.md Section 2
 * Tasks: T014, T016
 */

import type { McpNodeData, McpNodeMode, ToolParameter } from '@shared/types/mcp-node';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { getMcpToolSchema } from '../../services/mcp-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import type { ExtendedToolParameter } from '../../utils/parameter-validator';
import { validateAllParameters } from '../../utils/parameter-validator';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';
import { ParameterFormGenerator } from '../mcp/ParameterFormGenerator';
import { ModeSelectionStep } from '../mode-selection/ModeSelectionStep';

enum EditWizardStep {
  ModeSelection = 0,
  Configuration = 1,
}

interface McpNodeEditDialogProps {
  isOpen: boolean;
  nodeId: string;
  onClose: () => void;
}

export function McpNodeEditDialog({ isOpen, nodeId, onClose }: McpNodeEditDialogProps) {
  const { t } = useTranslation();
  const { nodes, updateNodeData } = useWorkflowStore();

  // Find the node being edited
  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as McpNodeData | undefined;

  // Wizard state
  const [currentStep, setCurrentStep] = useState<EditWizardStep>(EditWizardStep.ModeSelection);
  const [selectedMode, setSelectedMode] = useState<McpNodeMode>(nodeData?.mode || 'detailed');

  // Existing state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, unknown>>({});
  const [parameters, setParameters] = useState<ToolParameter[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  /**
   * Load tool schema from Extension Host (only for detailed mode)
   */
  useEffect(() => {
    const loadToolSchema = async () => {
      // Only load schema for detailed mode in configuration step
      if (
        !isOpen ||
        !nodeData ||
        selectedMode !== 'detailed' ||
        currentStep !== EditWizardStep.Configuration
      ) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getMcpToolSchema({
          serverId: nodeData.serverId,
          toolName: nodeData.toolName,
        });

        if (!result.success || !result.schema) {
          setError(result.error?.message || t('mcp.editDialog.error.schemaLoadFailed'));
          setParameters([]);
          return;
        }

        // Set parameters from schema
        setParameters(result.schema.parameters || []);

        // Initialize parameter values from node data
        setParameterValues(nodeData.parameterValues || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : t('mcp.editDialog.error.schemaLoadFailed'));
        setParameters([]);
      } finally {
        setLoading(false);
      }
    };

    loadToolSchema();
  }, [isOpen, nodeData, selectedMode, currentStep, t]);

  if (!isOpen || !node || !nodeData) {
    return null;
  }

  /**
   * Handle save button click
   */
  const handleSave = () => {
    // Validation depends on selected mode
    if (selectedMode === 'detailed') {
      // Enable validation display
      setShowValidation(true);

      // Validate all parameters
      const errors = validateAllParameters(
        parameterValues,
        parameters as ExtendedToolParameter[]
      );

      // If validation fails, don't save
      if (Object.keys(errors).length > 0) {
        return;
      }

      // Update node with mode and parameter values
      updateNodeData(nodeId, {
        ...nodeData,
        mode: selectedMode,
        parameterValues,
      });
    } else if (selectedMode === 'naturalLanguageParam') {
      // TODO: Implement natural language parameter mode save (User Story 2)
      // For now, just save the mode
      updateNodeData(nodeId, {
        ...nodeData,
        mode: selectedMode,
      });
    } else if (selectedMode === 'fullNaturalLanguage') {
      // TODO: Implement full natural language mode save (User Story 3)
      // For now, just save the mode
      updateNodeData(nodeId, {
        ...nodeData,
        mode: selectedMode,
      });
    }

    // Close dialog
    handleClose();
  };

  /**
   * Handle cancel/close
   */
  const handleClose = () => {
    // Reset wizard state
    setCurrentStep(EditWizardStep.ModeSelection);
    setSelectedMode(nodeData?.mode || 'detailed');
    setShowValidation(false);
    setError(null);
    onClose();
  };

  /**
   * Navigate to next step
   */
  const handleNext = () => {
    if (currentStep === EditWizardStep.ModeSelection) {
      setCurrentStep(EditWizardStep.Configuration);
    }
  };

  /**
   * Navigate to previous step
   */
  const handlePrevious = () => {
    if (currentStep === EditWizardStep.Configuration) {
      setCurrentStep(EditWizardStep.ModeSelection);
    }
  };

  /**
   * Check if user can proceed to next step
   */
  const canProceedToNext = (): boolean => {
    if (currentStep === EditWizardStep.ModeSelection) {
      return true; // Mode is always selected
    }
    return false; // Configuration is the last step
  };

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case EditWizardStep.ModeSelection:
        return (
          <ModeSelectionStep selectedMode={selectedMode} onModeChange={setSelectedMode} />
        );

      case EditWizardStep.Configuration:
        return renderConfigurationStep();

      default:
        return null;
    }
  };

  /**
   * Render configuration step based on selected mode
   */
  const renderConfigurationStep = () => {
    if (selectedMode === 'detailed') {
      return (
        <>
          {/* Tool Information */}
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
              borderRadius: '4px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--vscode-foreground)' }}>
              <strong>{t('property.mcp.serverId')}:</strong> {nodeData.serverId}
            </div>
            <div
              style={{ fontSize: '13px', color: 'var(--vscode-foreground)', marginTop: '4px' }}
            >
              <strong>{t('property.mcp.toolName')}:</strong> {nodeData.toolName}
            </div>
            {nodeData.toolDescription && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '8px',
                }}
              >
                {nodeData.toolDescription}
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && <IndeterminateProgressBar label={t('mcp.editDialog.loading')} />}

          {/* Error State */}
          {error && !loading && (
            <div
              style={{
                padding: '16px',
                marginBottom: '16px',
                color: 'var(--vscode-errorForeground)',
                backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                border: '1px solid var(--vscode-inputValidation-errorBorder)',
                borderRadius: '4px',
              }}
            >
              {error}
            </div>
          )}

          {/* Parameter Form */}
          {!loading && !error && (
            <ParameterFormGenerator
              parameters={parameters}
              parameterValues={parameterValues}
              onChange={setParameterValues}
              showValidation={showValidation}
            />
          )}
        </>
      );
    } else {
      // Placeholder for other modes (User Story 2 and 3)
      return (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
            borderRadius: '4px',
          }}
        >
          <div style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--vscode-foreground)' }}>
            {selectedMode === 'naturalLanguageParam'
              ? t('mcp.modeSelection.naturalLanguageParam.title')
              : t('mcp.modeSelection.fullNaturalLanguage.title')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
            Coming soon in User Story {selectedMode === 'naturalLanguageParam' ? '2' : '3'}
          </div>
        </div>
      );
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
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Dialog Header */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('mcp.editDialog.title')}
        </div>

        {/* Step Indicator */}
        <div
          style={{
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '24px',
          }}
        >
          Step {currentStep + 1} of 2
        </div>

        {/* Step Content */}
        <div style={{ marginBottom: '24px' }}>{renderStepContent()}</div>

        {/* Dialog Actions */}
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
          }}
        >
          {/* Left side: Back button */}
          <div>
            {currentStep === EditWizardStep.Configuration && (
              <button
                type="button"
                onClick={handlePrevious}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
          </div>

          {/* Right side: Cancel + Next/Save buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              {t('mcp.editDialog.cancelButton')}
            </button>

            {currentStep === EditWizardStep.ModeSelection ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedToNext()}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  backgroundColor: canProceedToNext()
                    ? 'var(--vscode-button-background)'
                    : 'var(--vscode-button-secondaryBackground)',
                  color: canProceedToNext()
                    ? 'var(--vscode-button-foreground)'
                    : 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: canProceedToNext() ? 'pointer' : 'not-allowed',
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  loading || !!error || (selectedMode === 'detailed' && !parameters.length)
                }
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  backgroundColor:
                    loading || error || (selectedMode === 'detailed' && !parameters.length)
                      ? 'var(--vscode-button-secondaryBackground)'
                      : 'var(--vscode-button-background)',
                  color:
                    loading || error || (selectedMode === 'detailed' && !parameters.length)
                      ? 'var(--vscode-button-secondaryForeground)'
                      : 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor:
                    loading || error || (selectedMode === 'detailed' && !parameters.length)
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {t('mcp.editDialog.saveButton')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
