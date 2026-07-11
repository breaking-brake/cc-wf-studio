/**
 * Sub-Agent Flow panel config: editable Claude Code settings from the schema
 * (model/memory/tools/color); the linked-flow description and the navigate-
 * to-edit button live in the Header slot. `memory` gets a custom control to
 * append the external reference link.
 */

import { NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { openExternalUrl } from '../../../services/vscode-bridge';
import { useWorkflowStore } from '../../../stores/workflow-store';
import { SelectControl } from '../controls/SelectControl';
import { fieldLabelStyle, valueStyle } from '../field-styles';
import type { ControlProps, NodePanelConfig, PanelSlotProps } from '../types';

/** Linked flow description + navigate-to-edit button. */
const SubAgentFlowHeader: React.FC<PanelSlotProps> = ({ node }) => {
  const { t } = useTranslation();
  const { subAgentFlows, setActiveSubAgentFlowId } = useWorkflowStore();
  const subAgentFlowId =
    typeof node.data.subAgentFlowId === 'string' ? node.data.subAgentFlowId : undefined;
  const linkedSubAgentFlow = subAgentFlows.find((sf) => sf.id === subAgentFlowId);

  if (!linkedSubAgentFlow) {
    return null;
  }

  return (
    <>
      {linkedSubAgentFlow.description && (
        <div>
          <div style={fieldLabelStyle}>{t('subAgentFlow.field.description')}</div>
          <div style={valueStyle}>{linkedSubAgentFlow.description}</div>
        </div>
      )}
      <button
        type="button"
        className="nodrag"
        onClick={() => subAgentFlowId && setActiveSubAgentFlowId(subAgentFlowId)}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        {t('subAgentFlow.edit')}
      </button>
    </>
  );
};

/** Memory select + external "Persistent Memory Reference" link. */
const MemoryControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <div>
      <SelectControl {...props} />
      <div style={{ fontSize: '11px', marginTop: '4px', textAlign: 'right' }}>
        <span
          role="button"
          tabIndex={0}
          onClick={() => openExternalUrl(t('property.memory.referenceUrl'))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              openExternalUrl(t('property.memory.referenceUrl'));
            }
          }}
          style={{
            color: 'var(--vscode-textLink-foreground)',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          Persistent Memory Reference
        </span>
      </div>
    </div>
  );
};

export const subAgentFlowPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.SubAgentFlow]!,
  mode: 'edit',
  i18nNamespace: 'subAgentFlow',
  Header: SubAgentFlowHeader,
  customControls: {
    memory: MemoryControl,
  },
};
