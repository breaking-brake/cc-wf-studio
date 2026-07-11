/**
 * Switch panel config: multi-way branch with a read-only default row. New
 * cases are appended by the array editor; core's deriveSwitchUpdate keeps the
 * default branch last and syncs outputPorts.
 */

import {
  deriveSwitchUpdate,
  generateBranchId,
  NODE_PROPERTY_SCHEMAS,
  NodeType,
} from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { ObjectArrayControl } from '../controls/ObjectArrayControl';
import type { ControlProps, NodePanelConfig, PanelSlotProps } from '../types';

const MultiWayNotice: React.FC<PanelSlotProps> = () => {
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
      {t('property.branchType.switch.help')}
    </div>
  );
};

const SwitchBranchesControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <ObjectArrayControl
      {...props}
      newItem={(existing) => {
        const caseNumber = existing.filter((b) => !b.isDefault).length + 1;
        return {
          id: generateBranchId(),
          label: `Case ${caseNumber}`,
          condition: `${t('default.conditionPrefix')}${caseNumber}${t('default.conditionSuffix')}`,
          isDefault: false,
        };
      }}
    />
  );
};

export const switchPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.Switch]!,
  derive: deriveSwitchUpdate,
  mode: 'edit',
  i18nNamespace: 'switch',
  Header: MultiWayNotice,
  customControls: {
    branches: SwitchBranchesControl,
  },
};
