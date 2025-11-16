/**
 * MCP Node Edit Dialog Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Edit MCP nodes with mode-specific UI
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T022-T023
 */

import type { McpNodeData, ToolParameter } from '@shared/types/mcp-node';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { getMcpToolSchema } from '../../services/mcp-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import type { ExtendedToolParameter } from '../../utils/parameter-validator';
import { validateAllParameters } from '../../utils/parameter-validator';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';
import { ParameterFormGenerator } from '../mcp/ParameterFormGenerator';
import { AiParameterConfigInput } from '../mode-selection/AiParameterConfigInput';
import { AiToolSelectionInput } from '../mode-selection/AiToolSelectionInput';
import { ModeIndicatorBadge } from '../mode-selection/ModeIndicatorBadge';

interface McpNodeEditDialogProps {
  isOpen: boolean;
  nodeId: string;
  onClose: () => void;
}

export function McpNodeEditDialog({ isOpen, nodeId, onClose }: McpNodeEditDialogProps) {
  const { t } = useTranslation();
  const { nodes, updateNodeData } = useWorkflowStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detailed Mode state
  const [parameterValues, setParameterValues] = useState<Record<string, unknown>>({});
  const [parameters, setParameters] = useState<ToolParameter[]>([]);

  // AI Mode state
  const [naturalLanguageTaskDescription, setNaturalLanguageTaskDescription] = useState('');
  const [aiParameterConfigDescription, setAiParameterConfigDescription] = useState('');

  const [showValidation, setShowValidation] = useState(false);

  // Find the node being edited
  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as McpNodeData | undefined;

  // Get current mode (default to 'manualParameterConfig' for backward compatibility)
  const currentMode = nodeData?.mode || 'manualParameterConfig';

  /**
   * Load tool schema and initialize state based on mode
   */
  useEffect(() => {
    const initializeDialog = async () => {
      if (!isOpen || !nodeData) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Initialize mode-specific state
        if (currentMode === 'aiToolSelection') {
          // AI Tool Selection Mode: Initialize task description only (no schema loading needed)
          setNaturalLanguageTaskDescription(nodeData.aiToolSelectionConfig?.taskDescription || '');
        } else if (currentMode === 'aiParameterConfig') {
          // AI Parameter Config Mode: Initialize param description only (no schema loading needed)
          setAiParameterConfigDescription(nodeData.aiParameterConfig?.description || '');
        } else {
          // Manual Parameter Config Mode: Load schema and initialize parameter values
          const result = await getMcpToolSchema({
            serverId: nodeData.serverId,
            toolName: nodeData.toolName || '',
          });

          if (!result.success || !result.schema) {
            setError(result.error?.message || t('mcp.editDialog.error.schemaLoadFailed'));
            setParameters([]);
            return;
          }

          setParameters(result.schema.parameters || []);
          setParameterValues(nodeData.parameterValues || {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('mcp.editDialog.error.schemaLoadFailed'));
        setParameters([]);
      } finally {
        setLoading(false);
      }
    };

    initializeDialog();
  }, [isOpen, nodeData, currentMode, t]);

  if (!isOpen || !node || !nodeData) {
    return null;
  }

  /**
   * Handle save button click
   */
  const handleSave = () => {
    // Enable validation display
    setShowValidation(true);

    // Mode-specific validation and save
    switch (currentMode) {
      case 'manualParameterConfig': {
        // Validate all parameters
        const errors = validateAllParameters(
          parameterValues,
          parameters as ExtendedToolParameter[]
        );

        // If validation fails, don't save
        if (Object.keys(errors).length > 0) {
          return;
        }

        // Update node with new parameter values
        updateNodeData(nodeId, {
          ...nodeData,
          parameterValues,
        });
        break;
      }

      case 'aiParameterConfig': {
        // Validate required field (T037)
        if (!aiParameterConfigDescription || aiParameterConfigDescription.trim().length === 0) {
          setShowValidation(true);
          return;
        }

        // Update node with new natural language description
        updateNodeData(nodeId, {
          ...nodeData,
          aiParameterConfig: {
            description: aiParameterConfigDescription,
            timestamp: new Date().toISOString(),
          },
        });
        break;
      }

      case 'aiToolSelection': {
        // Validate required field (T049)
        if (!naturalLanguageTaskDescription || naturalLanguageTaskDescription.trim().length === 0) {
          setShowValidation(true);
          return;
        }

        // Update node with new task description
        updateNodeData(nodeId, {
          ...nodeData,
          aiToolSelectionConfig: {
            taskDescription: naturalLanguageTaskDescription,
            availableTools: nodeData.aiToolSelectionConfig?.availableTools || [],
            timestamp: new Date().toISOString(),
          },
        });
        break;
      }

      default:
        return;
    }

    // Close dialog
    handleClose();
  };

  /**
   * Handle cancel/close
   */
  const handleClose = () => {
    setShowValidation(false);
    setError(null);
    onClose();
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'var(--vscode-foreground)',
            }}
          >
            {t('mcp.editDialog.title')}
          </div>
          {/* Mode Badge */}
          <ModeIndicatorBadge mode={currentMode} />
        </div>

        {/* Tool Information */}
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: 'var(--vscode-list-inactiveSelectionBackground)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--vscode-disabledForeground)' }}>
            <strong>{t('property.mcp.serverId')}:</strong> {nodeData.serverId}
          </div>
          {(currentMode === 'manualParameterConfig' || currentMode === 'aiParameterConfig') && (
            <div
              style={{
                fontSize: '13px',
                color: 'var(--vscode-disabledForeground)',
                marginTop: '4px',
              }}
            >
              <strong>{t('property.mcp.toolName')}:</strong> {nodeData.toolName}
            </div>
          )}
          {nodeData.toolDescription && currentMode === 'manualParameterConfig' && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--vscode-disabledForeground)',
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

        {/* Mode-specific Edit UI */}
        {!loading && !error && (
          <>
            {currentMode === 'manualParameterConfig' && (
              <ParameterFormGenerator
                parameters={parameters}
                parameterValues={parameterValues}
                onChange={setParameterValues}
                showValidation={showValidation}
              />
            )}

            {currentMode === 'aiParameterConfig' && (
              <AiParameterConfigInput
                value={aiParameterConfigDescription}
                onChange={setAiParameterConfigDescription}
                showValidation={showValidation}
              />
            )}

            {currentMode === 'aiToolSelection' && (
              <AiToolSelectionInput
                value={naturalLanguageTaskDescription}
                onChange={setNaturalLanguageTaskDescription}
                showValidation={showValidation}
              />
            )}
          </>
        )}

        {/* Dialog Actions */}
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
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
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !!error}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor:
                loading || error
                  ? 'var(--vscode-button-secondaryBackground)'
                  : 'var(--vscode-button-background)',
              color:
                loading || error
                  ? 'var(--vscode-button-secondaryForeground)'
                  : 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '2px',
              cursor: loading || error ? 'not-allowed' : 'pointer',
            }}
          >
            {t('mcp.editDialog.saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
