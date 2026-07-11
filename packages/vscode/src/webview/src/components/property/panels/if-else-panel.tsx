/**
 * IfElse panel config: fixed 2-way branch. The `.length(2)` bound hides
 * add/remove in the array editor; the info box renders as a Header slot.
 */

import { deriveIfElseUpdate, NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import type { NodePanelConfig, PanelSlotProps } from '../types';

const FixedBranchesNotice: React.FC<PanelSlotProps> = () => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: 'var(--vscode-textBlockQuote-background)',
        border: '1px solid var(--vscode-textBlockQuote-border)',
        borderRadius: '4px',
        fontSize: '11px',
        color: 'var(--vscode-descriptionForeground)',
      }}
    >
      {t('property.branchType.conditional.help')}
    </div>
  );
};

export const ifElsePanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.IfElse]!,
  derive: deriveIfElseUpdate,
  mode: 'edit',
  i18nNamespace: 'ifElse',
  Header: FixedBranchesNotice,
};
