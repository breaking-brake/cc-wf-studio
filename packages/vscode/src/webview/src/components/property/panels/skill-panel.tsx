/**
 * Skill panel config: schema-driven read-only summary with badge/icon custom
 * controls for scope/validationStatus/executionMode; the edit dialog, its
 * button, and the "loaded from SKILL.md" note live in the Footer slot.
 */

import { NODE_PROPERTY_SCHEMAS, NodeType } from '@cc-wf-studio/core';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { SkillNodeEditDialog } from '../../dialogs/SkillNodeEditDialog';
import { ValidationStatusValue } from '../controls/ValidationStatusValue';
import type { ControlProps, NodePanelConfig, PanelSlotProps } from '../types';

const SkillScopeValue: React.FC<ControlProps> = ({ value }) => {
  const { t } = useTranslation();
  const scope = value === 'user' || value === 'local' ? value : 'project';
  return (
    <div
      style={{
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        backgroundColor:
          scope === 'user'
            ? 'var(--vscode-badge-background)'
            : scope === 'local'
              ? 'var(--vscode-terminal-ansiBlue)'
              : 'var(--vscode-button-secondaryBackground)',
        padding: '4px 8px',
        borderRadius: '3px',
        display: 'inline-block',
        textTransform: 'uppercase',
        fontWeight: 600,
        letterSpacing: '0.3px',
      }}
    >
      {scope === 'user'
        ? t('property.scope.user')
        : scope === 'local'
          ? t('property.scope.local')
          : t('property.scope.project')}
    </div>
  );
};

const SkillExecutionModeValue: React.FC<ControlProps> = ({ value }) => {
  const { t } = useTranslation();
  const executionMode = value === 'load' ? 'load' : 'execute';
  return (
    <div
      style={{
        fontSize: '12px',
        color: 'var(--vscode-descriptionForeground)',
        backgroundColor:
          executionMode === 'load'
            ? 'var(--vscode-terminal-ansiYellow)'
            : 'var(--vscode-badge-background)',
        padding: '4px 8px',
        borderRadius: '3px',
        display: 'inline-block',
        fontWeight: 600,
      }}
    >
      {executionMode === 'load'
        ? t('property.skill.executionMode.load')
        : t('property.skill.executionMode.execute')}
    </div>
  );
};

/** Edit button + read-only note + SkillNodeEditDialog. */
const SkillFooter: React.FC<PanelSlotProps> = ({ node }) => {
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
        {t('skill.editDialog.title')}
      </button>

      <div
        style={{
          padding: '12px',
          backgroundColor: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-textBlockQuote-border)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          lineHeight: '1.5',
        }}
      >
        💡 Skill properties are read-only and loaded from SKILL.md file. To modify, edit the source
        file directly.
      </div>

      <SkillNodeEditDialog
        isOpen={isEditDialogOpen}
        nodeId={node.id}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </>
  );
};

export const skillPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.Skill]!,
  mode: 'readonly',
  i18nNamespace: 'skill',
  Footer: SkillFooter,
  customControls: {
    scope: SkillScopeValue,
    validationStatus: ValidationStatusValue,
    executionMode: SkillExecutionModeValue,
  },
};
