/**
 * Group panel config: schema-driven label editing plus the child-node
 * list/navigation and the layout-container note as a Footer slot.
 */

import { NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { getNodeTypeLabel } from '../../../constants/node-type-labels';
import { useTranslation } from '../../../i18n/i18n-context';
import { useWorkflowStore } from '../../../stores/workflow-store';
import type { NodePanelConfig, PanelSlotProps } from '../types';

const GroupChildList: React.FC<PanelSlotProps> = ({ node }) => {
  const { t } = useTranslation();
  const { nodes, setSelectedNodeId } = useWorkflowStore();
  const childNodes = nodes.filter((n) => n.parentId === node.id);

  return (
    <>
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.group.members')} ({childNodes.length})
        </div>
        {childNodes.length === 0 ? (
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
            {t('property.group.empty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {childNodes.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelectedNodeId(child.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  backgroundColor: 'var(--vscode-list-hoverBackground)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: 'var(--vscode-foreground)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--vscode-list-activeSelectionBackground)';
                  e.currentTarget.style.color = 'var(--vscode-list-activeSelectionForeground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                  e.currentTarget.style.color = 'var(--vscode-foreground)';
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--vscode-badge-foreground)',
                    backgroundColor: 'var(--vscode-badge-background)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    flexShrink: 0,
                  }}
                >
                  {getNodeTypeLabel(child.type)}
                </span>
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {child.data?.name || child.data?.label || child.id}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
        {t('node.group.description')}
      </div>
    </>
  );
};

export const groupPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.Group]!,
  mode: 'edit',
  i18nNamespace: 'group',
  Footer: GroupChildList,
};
