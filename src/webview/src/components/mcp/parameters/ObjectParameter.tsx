/**
 * Object Parameter Input Component
 *
 * Feature: 001-mcp-node
 * Purpose: Input component for object-type MCP tool parameters
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T036
 */

import type { ToolParameter } from '@shared/types/mcp-node';
import { useState } from 'react';
import { useTranslation } from '../../../i18n/i18n-context';

interface ObjectParameterProps {
  parameter: ToolParameter & {
    properties?: Record<string, unknown>;
    default?: unknown;
  };
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  error?: string;
}

export function ObjectParameter({ parameter, value, onChange, error }: ObjectParameterProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleChange = (newValue: string) => {
    if (!touched) {
      setTouched(true);
    }

    try {
      const parsed = JSON.parse(newValue);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        onChange(parsed);
        setJsonError(null);
      } else {
        setJsonError(t('mcp.parameter.objectInvalid'));
      }
    } catch (_err) {
      setJsonError(t('mcp.parameter.jsonInvalid'));
    }
  };

  const showError = touched && (error || jsonError);
  const displayValue = JSON.stringify(value, null, 2);

  return (
    <div style={{ marginBottom: '12px' }}>
      <label
        htmlFor={`param-${parameter.name}`}
        style={{
          display: 'block',
          marginBottom: '4px',
          fontSize: '13px',
          color: 'var(--vscode-foreground)',
        }}
      >
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
            marginBottom: '4px',
          }}
        >
          {parameter.description}
        </div>
      )}

      <textarea
        id={`param-${parameter.name}`}
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={
          parameter.default !== undefined
            ? JSON.stringify(parameter.default, null, 2)
            : '{\n  "key": "value"\n}'
        }
        rows={6}
        style={{
          width: '100%',
          padding: '6px 8px',
          fontSize: '12px',
          fontFamily: 'var(--vscode-editor-font-family)',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: showError
            ? '1px solid var(--vscode-inputValidation-errorBorder)'
            : '1px solid var(--vscode-input-border)',
          borderRadius: '2px',
          outline: 'none',
          resize: 'vertical',
        }}
      />

      {showError && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: 'var(--vscode-errorForeground)',
          }}
        >
          {jsonError || error}
        </div>
      )}

      <div
        style={{
          marginTop: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        {t('mcp.parameter.jsonFormat')}
      </div>
    </div>
  );
}
