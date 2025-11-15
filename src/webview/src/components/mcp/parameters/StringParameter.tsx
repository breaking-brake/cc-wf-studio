/**
 * String Parameter Input Component
 *
 * Feature: 001-mcp-node
 * Purpose: Input component for string-type MCP tool parameters
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T032
 */

import type { ToolParameter } from '@shared/types/mcp-node';
import { useState } from 'react';
import { useTranslation } from '../../../i18n/i18n-context';

interface StringParameterProps {
  parameter: ToolParameter & {
    enum?: unknown[];
    default?: unknown;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function StringParameter({ parameter, value, onChange, error }: StringParameterProps) {
  const { t } = useTranslation();
  const [touched, setTouched] = useState(false);

  const handleChange = (newValue: string) => {
    if (!touched) {
      setTouched(true);
    }
    onChange(newValue);
  };

  const showError = touched && error;

  // If enum values are defined, render a select dropdown
  if (parameter.enum && Array.isArray(parameter.enum)) {
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

        <select
          id={`param-${parameter.name}`}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          style={{
            width: '100%',
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
        >
          <option value="">{t('mcp.parameter.selectOption')}</option>
          {parameter.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>

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
      </div>
    );
  }

  // Otherwise, render a text input
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

      <input
        id={`param-${parameter.name}`}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={
          parameter.default !== undefined
            ? String(parameter.default)
            : t('mcp.parameter.enterValue')
        }
        minLength={parameter.minLength}
        maxLength={parameter.maxLength}
        pattern={parameter.pattern}
        style={{
          width: '100%',
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

      {(parameter.minLength !== undefined ||
        parameter.maxLength !== undefined ||
        parameter.pattern) && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {parameter.minLength !== undefined &&
            `${t('mcp.parameter.minLength')}: ${parameter.minLength} `}
          {parameter.maxLength !== undefined &&
            `${t('mcp.parameter.maxLength')}: ${parameter.maxLength} `}
          {parameter.pattern && `${t('mcp.parameter.pattern')}: ${parameter.pattern}`}
        </div>
      )}
    </div>
  );
}
