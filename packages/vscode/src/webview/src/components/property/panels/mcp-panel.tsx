/**
 * MCP panel config: schema-driven read-only summary. The dynamic/data-only
 * fields render through fully-custom controls in schema declaration order:
 * parameter count badge, the mode-labelled edit button + McpNodeEditDialog
 * (attached to the data-only `mode` field so it sits mid-panel, matching the
 * legacy layout), and the per-mode config value boxes.
 */

import { mcpModeOf, NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { McpNodeEditDialog } from '../../dialogs/McpNodeEditDialog';
import { ValidationStatusValue } from '../controls/ValidationStatusValue';
import { fieldLabelStyle } from '../field-styles';
import type { ControlProps, NodePanelConfig } from '../types';

const configBoxStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  backgroundColor: 'var(--vscode-input-background)',
  color: 'var(--vscode-descriptionForeground)',
  border: '1px solid var(--vscode-input-border)',
  borderRadius: '2px',
  fontSize: '12px',
  lineHeight: '1.5',
  maxHeight: '200px',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

/** Parameter count badge (fully custom: renders its own label). */
const ParameterCountValue: React.FC<ControlProps> = ({ value }) => {
  const { t } = useTranslation();
  const count = Array.isArray(value) ? value.length : 0;
  return (
    <div>
      <div style={fieldLabelStyle}>{t('property.mcp.parameterCount')}</div>
      <div
        style={{
          fontSize: '13px',
          color: 'var(--vscode-descriptionForeground)',
          backgroundColor: 'var(--vscode-badge-background)',
          padding: '4px 8px',
          borderRadius: '3px',
          display: 'inline-block',
        }}
      >
        {count}
      </div>
    </div>
  );
};

/** Mode-labelled edit button + dialog, attached to the data-only `mode` field. */
const McpEditButton: React.FC<ControlProps> = ({ nodeId, data }) => {
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const mode = mcpModeOf(data);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsEditDialogOpen(true)}
        className="nodrag"
        style={{
          width: '100%',
          padding: '10px 16px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {mode === 'manualParameterConfig'
          ? t('property.mcp.edit.manualParameterConfig')
          : mode === 'aiParameterConfig'
            ? t('property.mcp.edit.aiParameterConfig')
            : t('property.mcp.edit.aiToolSelection')}
      </button>
      <McpNodeEditDialog
        isOpen={isEditDialogOpen}
        nodeId={nodeId}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </>
  );
};

const TaskDescriptionValue: React.FC<ControlProps> = ({ value }) => {
  const { t } = useTranslation();
  const taskDescription = (value as { taskDescription?: string } | undefined)?.taskDescription;
  return (
    <div>
      <div style={fieldLabelStyle}>{t('property.mcp.taskDescription')}</div>
      <div style={configBoxStyle}>{taskDescription}</div>
    </div>
  );
};

const ParameterDescriptionValue: React.FC<ControlProps> = ({ value }) => {
  const { t } = useTranslation();
  const description = (value as { description?: string } | undefined)?.description;
  return (
    <div>
      <div style={fieldLabelStyle}>{t('property.mcp.parameterDescription')}</div>
      <div style={configBoxStyle}>{description}</div>
    </div>
  );
};

const ConfiguredValuesValue: React.FC<ControlProps> = ({ value }) => {
  const { t } = useTranslation();
  const entries = Object.entries((value as Record<string, unknown> | undefined) ?? {});
  return (
    <div>
      <div style={fieldLabelStyle}>{t('property.mcp.configuredValues')}</div>
      <div
        style={{ ...configBoxStyle, fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.6' }}
      >
        {entries.map(([key, entryValue]) => (
          <div key={key} style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 600, color: 'var(--vscode-foreground)' }}>{key}:</span>{' '}
            <span>
              {typeof entryValue === 'object' ? JSON.stringify(entryValue) : String(entryValue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const mcpPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.Mcp]!,
  mode: 'readonly',
  i18nNamespace: 'mcp',
  customControls: {
    validationStatus: ValidationStatusValue,
    parameters: ParameterCountValue,
    mode: McpEditButton,
    aiToolSelectionConfig: TaskDescriptionValue,
    aiParameterConfig: ParameterDescriptionValue,
    parameterValues: ConfiguredValuesValue,
  },
};
