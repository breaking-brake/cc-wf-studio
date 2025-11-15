/**
 * Parameter Form Generator Component
 *
 * Feature: 001-mcp-node
 * Purpose: Dynamically generate parameter input forms based on tool schema
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T031
 */

import type { ToolParameter } from '@shared/types/mcp-node';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { ExtendedToolParameter } from '../../utils/parameter-validator';
import { validateAllParameters } from '../../utils/parameter-validator';
import { ArrayParameter } from './parameters/ArrayParameter';
import { BooleanParameter } from './parameters/BooleanParameter';
import { NumberParameter } from './parameters/NumberParameter';
import { ObjectParameter } from './parameters/ObjectParameter';
import { StringParameter } from './parameters/StringParameter';

interface ParameterFormGeneratorProps {
  parameters: ToolParameter[];
  parameterValues: Record<string, unknown>;
  onChange: (parameterValues: Record<string, unknown>) => void;
  showValidation?: boolean;
}

export function ParameterFormGenerator({
  parameters,
  parameterValues,
  onChange,
  showValidation = false,
}: ParameterFormGeneratorProps) {
  const { t } = useTranslation();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate all parameters when values change and validation is enabled
  useEffect(() => {
    if (showValidation) {
      const errors = validateAllParameters(parameterValues, parameters as ExtendedToolParameter[]);
      setValidationErrors(errors);
    } else {
      setValidationErrors({});
    }
  }, [parameterValues, parameters, showValidation]);

  /**
   * Handle parameter value change
   */
  const handleParameterChange = (paramName: string, value: unknown) => {
    onChange({
      ...parameterValues,
      [paramName]: value,
    });
  };

  /**
   * Initialize parameter value with default if available
   */
  const getParameterValue = (param: ToolParameter): unknown => {
    if (parameterValues[param.name] !== undefined) {
      return parameterValues[param.name];
    }

    if (param.default !== undefined) {
      return param.default;
    }

    // Return type-appropriate default values
    switch (param.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
        return '';
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return '';
    }
  };

  if (parameters.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          color: 'var(--vscode-descriptionForeground)',
          fontSize: '13px',
        }}
      >
        {t('mcp.parameter.noParameters')}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div
        style={{
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: 'var(--vscode-foreground)',
        }}
      >
        {t('mcp.parameter.formTitle')}
      </div>

      {parameters.map((param) => {
        const value = getParameterValue(param);
        const error = validationErrors[param.name];

        switch (param.type) {
          case 'string':
            return (
              <StringParameter
                key={param.name}
                parameter={param as ExtendedToolParameter}
                value={String(value)}
                onChange={(newValue) => handleParameterChange(param.name, newValue)}
                error={error}
              />
            );

          case 'number':
          case 'integer':
            return (
              <NumberParameter
                key={param.name}
                parameter={param as ExtendedToolParameter}
                value={value as number | string}
                onChange={(newValue) => handleParameterChange(param.name, newValue)}
                error={error}
              />
            );

          case 'boolean':
            return (
              <BooleanParameter
                key={param.name}
                parameter={param as ExtendedToolParameter}
                value={Boolean(value)}
                onChange={(newValue) => handleParameterChange(param.name, newValue)}
                error={error}
              />
            );

          case 'array':
            return (
              <ArrayParameter
                key={param.name}
                parameter={param as ExtendedToolParameter}
                value={Array.isArray(value) ? value : []}
                onChange={(newValue) => handleParameterChange(param.name, newValue)}
                error={error}
              />
            );

          case 'object':
            return (
              <ObjectParameter
                key={param.name}
                parameter={param as ExtendedToolParameter}
                value={
                  typeof value === 'object' && value !== null && !Array.isArray(value)
                    ? (value as Record<string, unknown>)
                    : {}
                }
                onChange={(newValue) => handleParameterChange(param.name, newValue)}
                error={error}
              />
            );

          default:
            return (
              <div
                key={param.name}
                style={{
                  padding: '8px',
                  marginBottom: '8px',
                  backgroundColor: 'var(--vscode-inputValidation-warningBackground)',
                  border: '1px solid var(--vscode-inputValidation-warningBorder)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                {t('mcp.parameter.unsupportedType', { name: param.name, type: param.type })}
              </div>
            );
        }
      })}

      {showValidation && Object.keys(validationErrors).length > 0 && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
            border: '1px solid var(--vscode-inputValidation-errorBorder)',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: 'var(--vscode-errorForeground)',
              marginBottom: '8px',
            }}
          >
            {t('mcp.parameter.validationErrors')}
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
            {Object.entries(validationErrors).map(([paramName, errorMsg]) => (
              <li key={paramName} style={{ color: 'var(--vscode-errorForeground)' }}>
                <strong>{paramName}:</strong> {errorMsg}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
