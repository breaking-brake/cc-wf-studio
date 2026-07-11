/**
 * Branch Session panel config: schema-driven label/workDescription editing
 * plus the static "Claude Code only" notice as a Footer slot.
 */

import { NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import type { NodePanelConfig, PanelSlotProps } from '../types';

const ClaudeCodeOnlyNotice: React.FC<PanelSlotProps> = () => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: 'var(--vscode-textBlockQuote-background)',
        border: '1px solid var(--vscode-textBlockQuote-border)',
        borderRadius: '4px',
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
      }}
    >
      {t('property.branchSession.claudeCodeOnlyNotice')}
    </div>
  );
};

export const branchSessionPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.BranchSession]!,
  mode: 'edit',
  i18nNamespace: 'branchSession',
  Footer: ClaudeCodeOnlyNotice,
};
