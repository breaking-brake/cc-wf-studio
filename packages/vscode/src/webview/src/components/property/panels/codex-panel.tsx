/**
 * Codex panel config: schema-driven fields plus the behaviors the schema
 * deliberately does not model, injected as custom controls:
 * - label: falls back to the node id and clears to `undefined` on empty blur
 * - promptMode: radio + conditional guidance help for 'ai-generated'
 * - skipGitRepoCheck: monospace flag label + red warning text
 * - sandbox: enable-checkbox + mode-select composite ('advanced' section,
 *   which starts open only when a sandbox mode is set)
 */

import { CODEX_SANDBOX_MODES, NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { RadioControl } from '../controls/RadioControl';
import { helpTextStyle, inputStyle, selectStyle } from '../field-styles';
import type { ControlProps, NodePanelConfig } from '../types';

const CodexLabelControl: React.FC<ControlProps> = ({ nodeId, value, readonly, onChange }) => {
  const { t } = useTranslation();
  return (
    <input
      id={`schema-field-${nodeId}-label`}
      type="text"
      className="nodrag"
      value={typeof value === 'string' ? value : nodeId}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        if (!e.target.value.trim()) {
          onChange(undefined);
        }
      }}
      disabled={readonly}
      placeholder={t('property.nodeName.placeholder')}
      style={inputStyle}
    />
  );
};

const CodexPromptModeControl: React.FC<ControlProps> = (props) => {
  const { t } = useTranslation();
  return (
    <div>
      <RadioControl {...props} />
      {props.value === 'ai-generated' && (
        <div style={{ ...helpTextStyle, marginTop: '8px' }}>
          {t('codex.promptMode.aiGeneratedHelp')}
        </div>
      )}
    </div>
  );
};

const CodexSkipGitControl: React.FC<ControlProps> = ({ nodeId, value, readonly, onChange }) => {
  const { t } = useTranslation();
  return (
    <label
      htmlFor={`schema-field-${nodeId}-skipGitRepoCheck`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        cursor: readonly ? 'not-allowed' : 'pointer',
      }}
    >
      <input
        id={`schema-field-${nodeId}-skipGitRepoCheck`}
        type="checkbox"
        className="nodrag"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        disabled={readonly}
        style={{ marginTop: '2px', cursor: readonly ? 'not-allowed' : 'pointer' }}
      />
      <div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            fontFamily: 'monospace',
          }}
        >
          --skip-git-repo-check
        </span>
        <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--vscode-errorForeground)' }}>
          {t('codex.skipGitRepoCheckWarning')}
        </div>
      </div>
    </label>
  );
};

const CodexSandboxControl: React.FC<ControlProps> = ({ nodeId, value, readonly, onChange }) => {
  const { t } = useTranslation();
  const sandbox = typeof value === 'string' ? value : undefined;

  const modeLabels: Record<string, string> = {
    'read-only': t('codex.sandbox.readOnly'),
    'workspace-write': t('codex.sandbox.workspaceWrite'),
    'danger-full-access': t('codex.sandbox.dangerFullAccess'),
  };

  return (
    <div>
      <label
        htmlFor={`schema-field-${nodeId}-sandbox-enabled`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          cursor: readonly ? 'not-allowed' : 'pointer',
        }}
      >
        <input
          id={`schema-field-${nodeId}-sandbox-enabled`}
          type="checkbox"
          className="nodrag"
          checked={!!sandbox}
          onChange={(e) => onChange(e.target.checked ? 'read-only' : undefined)}
          disabled={readonly}
          style={{ cursor: readonly ? 'not-allowed' : 'pointer' }}
        />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>
          {t('codex.sandboxLabel')}
        </span>
      </label>
      {sandbox ? (
        <>
          <select
            id={`schema-field-${nodeId}-sandbox`}
            className="nodrag"
            value={sandbox}
            onChange={(e) => onChange(e.target.value)}
            disabled={readonly}
            style={selectStyle}
          >
            {CODEX_SANDBOX_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {modeLabels[mode]}
              </option>
            ))}
          </select>
          <div style={helpTextStyle}>{t('codex.sandboxHelp')}</div>
        </>
      ) : (
        <div style={helpTextStyle}>{t('codex.sandboxDefaultHelp')}</div>
      )}
    </div>
  );
};

export const codexPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.Codex]!,
  mode: 'edit',
  i18nNamespace: 'codex',
  customControls: {
    label: CodexLabelControl,
    promptMode: CodexPromptModeControl,
    skipGitRepoCheck: CodexSkipGitControl,
    sandbox: CodexSandboxControl,
  },
  sectionDefaultOpen: {
    advanced: (data) => !!data.sandbox,
  },
};
