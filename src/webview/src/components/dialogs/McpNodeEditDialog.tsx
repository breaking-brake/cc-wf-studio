/**
 * MCP Node Edit Dialog Component
 *
 * Feature: 001-mcp-node
 * Purpose: Configure parameters for existing MCP nodes
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T038
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
  const [parameterValues, setParameterValues] = useState<Record<string, unknown>>({});
  const [parameters, setParameters] = useState<ToolParameter[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Find the node being edited
  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as McpNodeData | undefined;

  /**
   * Load tool schema from Extension Host
   */
  useEffect(() => {
    const loadToolSchema = async () => {
      if (!isOpen || !nodeData) {
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
  }, [isOpen, nodeData, t]);

  if (!isOpen || !node || !nodeData) {
    return null;
  }

  /**
   * Handle save button click
   */
  const handleSave = () => {
    // Enable validation display
    setShowValidation(true);

    // Validate all parameters
    const errors = validateAllParameters(parameterValues, parameters as ExtendedToolParameter[]);

    // If validation fails, don't save
    if (Object.keys(errors).length > 0) {
      return;
    }

    // Update node with new parameter values
    updateNodeData(nodeId, {
      ...nodeData,
      parameterValues,
    });

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
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('mcp.editDialog.title')}
        </div>

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
          <div style={{ fontSize: '13px', color: 'var(--vscode-foreground)', marginTop: '4px' }}>
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
