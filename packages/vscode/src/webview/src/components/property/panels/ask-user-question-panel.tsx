/**
 * AskUserQuestion panel config: schema-driven fields with custom controls
 * for the state-dependent checkbox help texts and the options array editor
 * (which needs a localized new-item factory). Port-count side effects live
 * in core's deriveAskUserQuestionUpdate.
 */

import {
  deriveAskUserQuestionUpdate,
  generateOptionId,
  NODE_PROPERTY_SCHEMAS,
  NodeType,
} from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { CheckboxControl } from '../controls/CheckboxControl';
import { ObjectArrayControl } from '../controls/ObjectArrayControl';
import { helpTextStyle } from '../field-styles';
import type { ControlProps, NodePanelConfig } from '../types';

/** Checkbox + help text that switches with the checked state. */
const MultiSelectControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <div>
      <CheckboxControl {...props} />
      <div style={{ ...helpTextStyle, marginLeft: '24px' }}>
        {props.value ? t('property.multiSelect.enabled') : t('property.multiSelect.disabled')}
      </div>
    </div>
  );
};

const AiSuggestionsControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <div>
      <CheckboxControl {...props} />
      <div style={{ ...helpTextStyle, marginLeft: '24px' }}>
        {props.value ? t('property.aiSuggestions.enabled') : t('property.aiSuggestions.disabled')}
      </div>
    </div>
  );
};

const OptionsControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <ObjectArrayControl
      {...props}
      newItem={(existing) => ({
        id: generateOptionId(),
        label: `${t('default.option')} ${existing.length + 1}`,
        description: t('default.newOption'),
      })}
    />
  );
};

export const askUserQuestionPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.AskUserQuestion]!,
  derive: deriveAskUserQuestionUpdate,
  mode: 'edit',
  i18nNamespace: 'askUserQuestion',
  customControls: {
    multiSelect: MultiSelectControl,
    useAiSuggestions: AiSuggestionsControl,
    options: OptionsControl,
  },
};
