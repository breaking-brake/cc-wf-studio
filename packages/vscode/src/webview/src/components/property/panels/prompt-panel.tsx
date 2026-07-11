/**
 * Prompt panel config: schema-driven label/prompt editing plus the
 * detected-variables display (derived from the prompt text) as a Footer slot.
 */

import { NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { extractVariables } from '../../../utils/template-utils';
import { helpTextStyle } from '../field-styles';
import type { NodePanelConfig, PanelSlotProps } from '../types';

const DetectedVariables: React.FC<PanelSlotProps> = ({ node }) => {
  const { t } = useTranslation();
  const prompt = typeof node.data.prompt === 'string' ? node.data.prompt : '';
  const variables = extractVariables(prompt);

  if (variables.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--vscode-foreground)',
          marginBottom: '6px',
        }}
      >
        {t('property.detectedVariables', { count: variables.length })}
      </div>
      <div
        style={{
          padding: '8px',
          backgroundColor: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-textBlockQuote-border)',
          borderRadius: '4px',
        }}
      >
        {variables.map((varName) => (
          <div
            key={varName}
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              color: 'var(--vscode-foreground)',
              marginBottom: '4px',
            }}
          >
            • {`{{${varName}}}`}
          </div>
        ))}
      </div>
      <div style={helpTextStyle}>{t('property.variablesSubstituted')}</div>
    </div>
  );
};

export const promptPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.Prompt]!,
  mode: 'edit',
  i18nNamespace: 'prompt',
  Footer: DetectedVariables,
};
