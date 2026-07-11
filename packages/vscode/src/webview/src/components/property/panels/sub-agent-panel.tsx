/**
 * SubAgent panel config: schema-driven readonly summary + the parts the
 * schema deliberately does not model (badges, edit dialog, empty "other
 * agents" section, built-in preset descriptions for model/tools).
 */

import {
  BUILT_IN_SUB_AGENTS,
  NODE_PROPERTY_SCHEMAS,
  NodeType,
  type SubAgentData,
} from '@cc-wf-studio/core';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { createSubAgent } from '../../../services/command-browser-service';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { SubAgentFormDialog } from '../../dialogs/SubAgentFormDialog';
import { fieldLabelStyle, valueStyle } from '../field-styles';
import type { ControlProps, NodePanelConfig, PanelSlotProps } from '../types';

/** Badges (built-in / linked command) + Edit button + its dialog. */
const SubAgentHeader: React.FC<PanelSlotProps> = ({ node, updateNodeData }) => {
  const { t } = useTranslation();
  const data = node.data as unknown as SubAgentData;
  const isBuiltIn = !!data.builtInType;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      {isBuiltIn &&
        (() => {
          const builtInPreset = BUILT_IN_SUB_AGENTS.find((p) => p.type === data.builtInType);
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: 'var(--vscode-textBlockQuote-background)',
                borderLeft: '3px solid var(--vscode-terminal-ansiGreen)',
                borderRadius: '0 4px 4px 0',
                fontSize: '12px',
              }}
            >
              <span
                style={{
                  padding: '1px 6px',
                  backgroundColor: 'var(--vscode-terminal-ansiGreen)',
                  color: '#ffffff',
                  borderRadius: '3px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
              >
                Built-in
              </span>
              <span style={{ fontWeight: 600 }}>
                {builtInPreset ? builtInPreset.displayName : data.builtInType}
              </span>
            </div>
          );
        })()}

      {!isBuiltIn && data.commandFilePath && (
        <div>
          <div style={fieldLabelStyle}>{t('subAgent.property.linkedCommand')}</div>
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'var(--vscode-editor-font-family)',
              color: 'var(--vscode-descriptionForeground)',
              wordBreak: 'break-all',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '1px 6px',
                backgroundColor: 'var(--vscode-badge-background)',
                color: 'var(--vscode-badge-foreground)',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 600,
                marginRight: '6px',
                textTransform: 'uppercase',
              }}
            >
              {data.commandScope || 'project'}
            </span>
            {data.commandFilePath}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsEditDialogOpen(true)}
        style={{
          width: '100%',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          cursor: 'pointer',
        }}
      >
        {t('subAgent.property.editButton')}
      </button>

      <SubAgentFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        initialData={{
          description: data.description,
          agentDefinition: data.agentDefinition,
          prompt: data.prompt,
          agentType: data.agentType || 'claudeCode',
          model: data.model || (data.builtInType ? 'inherit' : 'sonnet'),
          tools: data.tools || '',
          memory: data.memory || '',
          color: data.color,
          builtInType: data.builtInType,
        }}
        onSubmit={async (formData) => {
          updateNodeData(node.id, {
            description: formData.description,
            agentDefinition: formData.agentDefinition,
            prompt: formData.prompt,
            agentType: formData.agentType,
            // Claude Code settings are always persisted now (no longer gated by
            // an agentType toggle). They apply on Claude Code export and are
            // reported as ignored by other targets at export time.
            model: formData.model,
            tools: formData.tools || undefined,
            memory: formData.memory || undefined,
            color: formData.color,
          });

          if (data.commandFilePath) {
            await createSubAgent({
              ...formData,
              commandFilePath: data.commandFilePath,
            });
          }

          setIsEditDialogOpen(false);
        }}
      />
    </>
  );
};

/** Reserved slot for future target-specific settings (e.g. ADK model). */
const SubAgentFooter: React.FC<PanelSlotProps> = () => {
  const { t } = useTranslation();
  return (
    <CollapsibleSection title={t('subAgent.section.other')} defaultOpen={false}>
      <div style={{ ...valueStyle, color: 'var(--vscode-descriptionForeground)' }}>
        {t('subAgent.section.other.empty')}
      </div>
    </CollapsibleSection>
  );
};

/** Model summary: built-in nodes show the preset description instead of the value. */
const SubAgentModelValue: React.FC<ControlProps> = ({ data }) => {
  const { t } = useTranslation();
  const subAgent = data as unknown as SubAgentData;
  const model = subAgent.model || 'sonnet';
  return (
    <div style={valueStyle}>
      {subAgent.builtInType
        ? `${BUILT_IN_SUB_AGENTS.find((p) => p.type === subAgent.builtInType)?.modelDescription || '-'} (${t('subAgent.builtIn.controlledByPreset')})`
        : model.charAt(0).toUpperCase() + model.slice(1)}
    </div>
  );
};

/** Tools summary: built-in nodes show the preset description instead of the value. */
const SubAgentToolsValue: React.FC<ControlProps> = ({ data }) => {
  const { t } = useTranslation();
  const subAgent = data as unknown as SubAgentData;
  return (
    <div style={valueStyle}>
      {subAgent.builtInType
        ? `${BUILT_IN_SUB_AGENTS.find((p) => p.type === subAgent.builtInType)?.toolsDescription || '-'} (${t('subAgent.builtIn.controlledByPreset')})`
        : subAgent.tools || '-'}
    </div>
  );
};

export const subAgentPanelConfig: NodePanelConfig = {
  // biome-ignore lint/style/noNonNullAssertion: registered in core alongside this config
  schema: NODE_PROPERTY_SCHEMAS[NodeType.SubAgent]!,
  mode: 'readonly',
  i18nNamespace: 'subAgent',
  Header: SubAgentHeader,
  Footer: SubAgentFooter,
  customControls: {
    model: SubAgentModelValue,
    tools: SubAgentToolsValue,
  },
};
