/**
 * Branch (legacy conditional/switch) panel config. branchType gets a custom
 * control for its type-dependent help text; branches gets the array editor
 * with a localized case factory. Trimming on type change and outputPorts
 * sync live in core's deriveBranchUpdate.
 */

import {
  deriveBranchUpdate,
  generateBranchId,
  NODE_PROPERTY_SCHEMAS,
  NodeType,
} from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { ObjectArrayControl } from '../controls/ObjectArrayControl';
import { SelectControl } from '../controls/SelectControl';
import { helpTextStyle } from '../field-styles';
import type { ControlProps, NodePanelConfig } from '../types';

const BranchTypeControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <div>
      <SelectControl {...props} />
      <div style={helpTextStyle}>
        {props.value === 'conditional'
          ? t('property.branchType.conditional.help')
          : t('property.branchType.switch.help')}
      </div>
    </div>
  );
};

const BranchesControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <ObjectArrayControl
      {...props}
      newItem={(existing) => {
        const branchNumber = existing.length + 1;
        return {
          id: generateBranchId(),
          label: `Case ${branchNumber}`,
          condition: `${t('default.conditionPrefix')}${branchNumber}${t('default.conditionSuffix')}`,
        };
      }}
      canAdd={(data) =>
        data.branchType === 'switch' ||
        (Array.isArray(data.branches) ? data.branches.length : 0) < 2
      }
    />
  );
};

export const branchPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.Branch]!,
  derive: deriveBranchUpdate,
  mode: 'edit',
  i18nNamespace: 'branch',
  customControls: {
    branchType: BranchTypeControl,
    branches: BranchesControl,
  },
};
