/**
 * Array Parameter Input Component
 *
 * Feature: 001-mcp-node
 * Purpose: Input component for array-type MCP tool parameters
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T035
 */

import type { ToolParameter } from '@shared/types/mcp-node';
import { useState } from 'react';
import { useTranslation } from '../../../i18n/i18n-context';

interface ArrayParameterProps {
  parameter: ToolParameter & {
    items?: unknown;
    default?: unknown;
  };
  value: unknown[];
  onChange: (value: unknown[]) => void;
  error?: string;
}

export function ArrayParameter({ parameter, value, onChange, error }: ArrayParameterProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
      if (!touched) {
        setTouched(true);
      }
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    if (!touched) {
      setTouched(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const showError = touched && error;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div
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
      </div>

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

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('mcp.parameter.addItem')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '13px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: showError
              ? '1px solid var(--vscode-inputValidation-errorBorder)'
              : '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
        >
          {t('mcp.parameter.add')}
        </button>
      </div>

      {showError && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: 'var(--vscode-errorForeground)',
          }}
        >
          {error}
        </div>
      )}

      {value.length > 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: 'var(--vscode-editor-background)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '2px',
          }}
        >
          {value.map((item, index) => (
            <div
              key={`${String(item)}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                marginBottom: '4px',
                backgroundColor: 'var(--vscode-input-background)',
                borderRadius: '2px',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--vscode-foreground)' }}>
                {String(item)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                {t('mcp.parameter.remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        {t('mcp.parameter.arrayCount')}: {value.length}
      </div>
    </div>
  );
}
