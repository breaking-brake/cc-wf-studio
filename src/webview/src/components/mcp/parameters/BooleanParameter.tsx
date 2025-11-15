/**
 * Boolean Parameter Input Component
 *
 * Feature: 001-mcp-node
 * Purpose: Input component for boolean-type MCP tool parameters
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T034
 */

import type { ToolParameter } from '@shared/types/mcp-node';
import { useTranslation } from '../../../i18n/i18n-context';

interface BooleanParameterProps {
  parameter: ToolParameter & {
    default?: unknown;
  };
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}

export function BooleanParameter({ parameter, value, onChange, error }: BooleanParameterProps) {
  const { t } = useTranslation();

  return (
    <div style={{ marginBottom: '12px' }}>
      <label
        htmlFor={`param-${parameter.name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '13px',
          color: 'var(--vscode-foreground)',
          cursor: 'pointer',
        }}
      >
        <input
          id={`param-${parameter.name}`}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            marginRight: '8px',
            cursor: 'pointer',
          }}
        />
        {parameter.name}
        {parameter.required && (
          <span style={{ color: 'var(--vscode-errorForeground)', marginLeft: '4px' }}>*</span>
        )}
      </label>

      {parameter.description && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
            marginLeft: '24px',
          }}
        >
          {parameter.description}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: '4px',
            marginLeft: '24px',
            fontSize: '12px',
            color: 'var(--vscode-errorForeground)',
          }}
        >
          {error}
        </div>
      )}

      {parameter.default !== undefined && (
        <div
          style={{
            marginTop: '4px',
            marginLeft: '24px',
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('mcp.parameter.default')}: {String(parameter.default)}
        </div>
      )}
    </div>
  );
}
