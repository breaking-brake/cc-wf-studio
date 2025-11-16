/**
 * Parameter Detailed Config Step Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Allow users to configure tool parameters in detail during node creation
 *
 * Displays parameter form for the selected tool using ParameterFormGenerator
 */

import type { ToolParameter } from '@shared/types/mcp-node';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { getMcpToolSchema } from '../../services/mcp-service';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';
import { ParameterFormGenerator } from '../mcp/ParameterFormGenerator';

interface ParameterDetailedConfigStepProps {
  serverId: string;
  toolName: string;
  parameterValues: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  showValidation?: boolean;
}

export function ParameterDetailedConfigStep({
  serverId,
  toolName,
  parameterValues,
  onChange,
  showValidation = false,
}: ParameterDetailedConfigStepProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<ToolParameter[]>([]);

  /**
   * Load tool schema on mount
   */
  useEffect(() => {
    const loadSchema = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getMcpToolSchema({
          serverId,
          toolName,
        });

        if (!result.success || !result.schema) {
          setError(result.error?.message || t('mcp.editDialog.error.schemaLoadFailed'));
          setParameters([]);
          return;
        }

        setParameters(result.schema.parameters || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('mcp.editDialog.error.schemaLoadFailed'));
        setParameters([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchema();
  }, [serverId, toolName, t]);

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
        {t('mcp.parameterDetailedConfig.title')}
      </h3>

      <div
        style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
          borderRadius: '4px',
          fontSize: '13px',
          color: 'var(--vscode-foreground)',
        }}
      >
        <div>
          <strong>{t('property.mcp.serverId')}:</strong> {serverId}
        </div>
        <div style={{ marginTop: '4px' }}>
          <strong>{t('property.mcp.toolName')}:</strong> {toolName}
        </div>
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
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <ParameterFormGenerator
            parameters={parameters}
            parameterValues={parameterValues}
            onChange={onChange}
            showValidation={showValidation}
          />
        </div>
      )}
    </div>
  );
}
