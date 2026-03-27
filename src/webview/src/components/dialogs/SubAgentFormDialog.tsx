/**
 * Sub-Agent Form Dialog
 *
 * Nested child dialog (z-index: 10000) for creating a new Sub-Agent node
 * with user-specified fields. Based on SkillCreationDialog pattern.
 *
 * Supports two agent types:
 * - "claudeCode": Shows all fields including Claude Code-specific ones (Model, Tools, Memory)
 * - "other": Shows only common fields (Description, Prompt)
 */

import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import { BUILT_IN_SUB_AGENTS } from '@shared/constants/built-in-sub-agents';
import type { BuiltInSubAgentType } from '@shared/types/workflow-definition';
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { SubAgentColor } from '../common/ColorPicker';
import { ColorPicker } from '../common/ColorPicker';
import { EditInEditorButton } from '../common/EditInEditorButton';
import { ToolSelectTagInput } from '../common/ToolSelectTagInput';

const Z_INDEX = {
  DIALOG_NESTED: 10000,
} as const;

const SUBAGENT_AVAILABLE_TOOLS = [
  'Agent',
  'Bash',
  'Edit',
  'Glob',
  'Grep',
  'Read',
  'Write',
  'NotebookEdit',
  'WebFetch',
  'WebSearch',
  'AskUserQuestion',
  'Skill',
  'TodoWrite',
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskUpdate',
] as const;

type AgentType = 'claudeCode' | 'other';

export interface SubAgentFormData {
  description: string;
  agentDefinition: string;
  prompt: string;
  agentType: AgentType;
  model: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  tools?: string;
  memory?: 'user' | 'project' | 'local' | '';
  color?: SubAgentColor;
  builtInType?: BuiltInSubAgentType;
}

interface SubAgentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubAgentFormData) => void | Promise<void>;
  initialData?: SubAgentFormData;
}

interface FormErrors {
  description?: string;
  agentDefinition?: string;
  prompt?: string;
}

export function SubAgentFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: SubAgentFormDialogProps) {
  const { t } = useTranslation();
  const descriptionId = useId();
  const agentDefinitionId = useId();
  const promptId = useId();
  const modelId = useId();
  const memoryId = useId();

  const [agentType, setAgentType] = useState<AgentType>('claudeCode');
  const [formData, setFormData] = useState<SubAgentFormData>({
    description: '',
    agentDefinition: '',
    prompt: '',
    agentType: 'claudeCode',
    model: 'inherit',
    tools: '',
    memory: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isEditingAgentDefinition, setIsEditingAgentDefinition] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  const isEditMode = !!initialData;

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAgentType(initialData.agentType);
        setFormData({ ...initialData });
      } else {
        setAgentType('claudeCode');
        setFormData({
          description: '',
          agentDefinition: '',
          prompt: '',
          agentType: 'claudeCode',
          model: 'inherit',
          tools: '',
          memory: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleAgentTypeChange = (type: AgentType) => {
    setAgentType(type);
    setFormData((prev) => ({
      ...prev,
      agentType: type,
      // Reset Claude Code-specific fields when switching to "other"
      ...(type === 'other'
        ? { model: 'inherit' as const, tools: '', memory: '' as const, color: undefined }
        : {}),
    }));
  };

  const handleSubmit = useCallback(() => {
    const validationErrors: FormErrors = {};

    if (!formData.description.trim()) {
      validationErrors.description = t('subAgent.form.error.descriptionRequired');
    }
    if (!formData.agentDefinition.trim()) {
      validationErrors.agentDefinition = t('subAgent.form.error.agentDefinitionRequired');
    }
    if (!formData.prompt.trim()) {
      validationErrors.prompt = t('subAgent.form.error.promptRequired');
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    onSubmit({ ...formData, agentType });
  }, [formData, agentType, onSubmit, t]);

  const handleFieldChange = (field: keyof SubAgentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const isClaudeCode = agentType === 'claudeCode';
  const isBuiltIn = !!formData.builtInType;
  const builtInPreset = isBuiltIn
    ? BUILT_IN_SUB_AGENTS.find((p) => p.type === formData.builtInType)
    : undefined;

  const radioLabelStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: isActive ? 600 : 400,
    color: 'var(--vscode-foreground)',
    cursor: 'pointer',
    borderRadius: '4px',
    border: `1px solid ${isActive ? 'var(--vscode-focusBorder)' : 'var(--vscode-input-border)'}`,
    backgroundColor: isActive
      ? 'var(--vscode-list-activeSelectionBackground)'
      : 'var(--vscode-input-background)',
    flex: 1,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: Z_INDEX.DIALOG_NESTED,
          }}
        >
          <Dialog.Content
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            {/* Header */}
            <Dialog.Title
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {isEditMode ? t('subAgent.form.editTitle') : t('subAgent.form.title')}
            </Dialog.Title>
            <Dialog.Description
              style={{
                margin: '0 0 20px 0',
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                lineHeight: '1.5',
              }}
            >
              {t('subAgent.form.description')}
            </Dialog.Description>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Built-in badge */}
              {isBuiltIn && builtInPreset && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--vscode-textBlockQuote-background)',
                    borderLeft: '3px solid var(--vscode-terminal-ansiGreen)',
                    borderRadius: '0 4px 4px 0',
                    fontSize: '13px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: 'var(--vscode-terminal-ansiGreen)',
                      color: '#ffffff',
                      fontWeight: 500,
                    }}
                  >
                    Built-in
                  </span>
                  <span style={{ fontWeight: 600 }}>{builtInPreset.displayName}</span>
                </div>
              )}

              {/* Agent Type Selector (hidden for built-in) */}
              {!isBuiltIn && (
                <div>
                  <div
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--vscode-foreground)',
                    }}
                  >
                    {t('subAgent.form.agentTypeLabel')}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={radioLabelStyle(isClaudeCode)}>
                      <input
                        type="radio"
                        name="agentType"
                        value="claudeCode"
                        checked={isClaudeCode}
                        onChange={() => handleAgentTypeChange('claudeCode')}
                        style={{ cursor: 'pointer' }}
                      />
                      {t('subAgent.form.agentType.claudeCode')}
                    </label>
                    <label style={radioLabelStyle(!isClaudeCode)}>
                      <input
                        type="radio"
                        name="agentType"
                        value="other"
                        checked={!isClaudeCode}
                        onChange={() => handleAgentTypeChange('other')}
                        style={{ cursor: 'pointer' }}
                      />
                      {t('subAgent.form.agentType.other')}
                    </label>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <div
                  style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  {t('subAgent.form.descriptionLabel')} {!isBuiltIn && '*'}
                </div>
                {isBuiltIn ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      backgroundColor: 'var(--vscode-input-background)',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      color: 'var(--vscode-descriptionForeground)',
                      opacity: 0.7,
                    }}
                  >
                    {formData.description}
                  </div>
                ) : (
                  <>
                    <input
                      id={descriptionId}
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder={t('subAgent.form.descriptionPlaceholder')}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '13px',
                        backgroundColor: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: `1px solid ${errors.description ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'}`,
                        borderRadius: '4px',
                        outline: 'none',
                      }}
                    />
                    {errors.description && (
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '12px',
                          color: 'var(--vscode-inputValidation-errorForeground)',
                        }}
                      >
                        {errors.description}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Agent Definition */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    htmlFor={agentDefinitionId}
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--vscode-foreground)',
                    }}
                  >
                    {t('subAgent.form.agentDefinitionLabel')} *
                  </label>
                  {!isBuiltIn && (
                    <EditInEditorButton
                      content={formData.agentDefinition}
                      onContentUpdated={(newContent) =>
                        handleFieldChange('agentDefinition', newContent)
                      }
                      label={t('subAgent.form.agentDefinitionLabel')}
                      language="markdown"
                      onEditingStateChange={setIsEditingAgentDefinition}
                    />
                  )}
                </div>
                {isBuiltIn ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      backgroundColor: 'var(--vscode-input-background)',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      color: 'var(--vscode-descriptionForeground)',
                      opacity: 0.7,
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5',
                    }}
                  >
                    {formData.agentDefinition}
                  </div>
                ) : (
                  <>
                    <textarea
                      id={agentDefinitionId}
                      value={formData.agentDefinition}
                      onChange={(e) => handleFieldChange('agentDefinition', e.target.value)}
                      placeholder={t('subAgent.form.agentDefinitionPlaceholder')}
                      readOnly={isEditingAgentDefinition}
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '13px',
                        backgroundColor: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: `1px solid ${errors.agentDefinition ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'}`,
                        borderRadius: '4px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'var(--vscode-editor-font-family)',
                        opacity: isEditingAgentDefinition ? 0.5 : 1,
                        cursor: isEditingAgentDefinition ? 'not-allowed' : 'text',
                      }}
                    />
                    {errors.agentDefinition && (
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '12px',
                          color: 'var(--vscode-inputValidation-errorForeground)',
                        }}
                      >
                        {errors.agentDefinition}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Prompt (task instructions) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    htmlFor={promptId}
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--vscode-foreground)',
                    }}
                  >
                    {t('subAgent.form.promptLabel')} *
                  </label>
                  <EditInEditorButton
                    content={formData.prompt}
                    onContentUpdated={(newContent) => handleFieldChange('prompt', newContent)}
                    label={t('subAgent.form.promptLabel')}
                    language="markdown"
                    onEditingStateChange={setIsEditingPrompt}
                  />
                </div>
                <textarea
                  id={promptId}
                  value={formData.prompt}
                  onChange={(e) => handleFieldChange('prompt', e.target.value)}
                  placeholder={t('subAgent.form.promptPlaceholder')}
                  readOnly={isEditingPrompt}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: `1px solid ${errors.prompt ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'}`,
                    borderRadius: '4px',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'var(--vscode-editor-font-family)',
                    opacity: isEditingPrompt ? 0.5 : 1,
                    cursor: isEditingPrompt ? 'not-allowed' : 'text',
                  }}
                />
                {errors.prompt && (
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: 'var(--vscode-inputValidation-errorForeground)',
                    }}
                  >
                    {errors.prompt}
                  </p>
                )}
              </div>

              {/* Claude Code-specific fields */}
              {isClaudeCode && (
                <>
                  {/* Model — read-only for built-in */}
                  {isBuiltIn && builtInPreset ? (
                    <div>
                      <div
                        style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('subAgent.form.modelLabel')}
                      </div>
                      <div
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          backgroundColor: 'var(--vscode-input-background)',
                          border: '1px solid var(--vscode-input-border)',
                          borderRadius: '4px',
                          color: 'var(--vscode-descriptionForeground)',
                          opacity: 0.7,
                        }}
                      >
                        {builtInPreset.modelDescription} —{' '}
                        {t('subAgent.builtIn.controlledByPreset')}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor={modelId}
                        style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('subAgent.form.modelLabel')}
                      </label>
                      <Select.Root
                        value={formData.model}
                        onValueChange={(val) =>
                          handleFieldChange('model', val as 'sonnet' | 'opus' | 'haiku' | 'inherit')
                        }
                      >
                        <Select.Trigger
                          id={modelId}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)',
                            border: '1px solid var(--vscode-input-border)',
                            borderRadius: '2px',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            position="popper"
                            sideOffset={4}
                            style={{
                              backgroundColor: 'var(--vscode-dropdown-background)',
                              border: '1px solid var(--vscode-dropdown-border)',
                              borderRadius: '2px',
                              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                              zIndex: 10001,
                              minWidth: '200px',
                            }}
                          >
                            <Select.Viewport style={{ padding: '4px' }}>
                              {[
                                { value: 'sonnet', label: 'Sonnet' },
                                { value: 'opus', label: 'Opus' },
                                { value: 'haiku', label: 'Haiku' },
                                { value: 'inherit', label: 'Inherit' },
                              ].map((item) => (
                                <Select.Item
                                  key={item.value}
                                  value={item.value}
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: '13px',
                                    color: 'var(--vscode-foreground)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    borderRadius: '2px',
                                  }}
                                >
                                  <Select.ItemText>{item.label}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </div>
                  )}

                  {/* Tools — read-only for built-in */}
                  {isBuiltIn && builtInPreset ? (
                    <div>
                      <div
                        style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('subAgent.form.toolsLabel')}
                      </div>
                      <div
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          backgroundColor: 'var(--vscode-input-background)',
                          border: '1px solid var(--vscode-input-border)',
                          borderRadius: '4px',
                          color: 'var(--vscode-descriptionForeground)',
                          opacity: 0.7,
                        }}
                      >
                        {builtInPreset.toolsDescription} —{' '}
                        {t('subAgent.builtIn.controlledByPreset')}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('subAgent.form.toolsLabel')}
                      </div>
                      <ToolSelectTagInput
                        size="md"
                        selectedTools={
                          formData.tools
                            ?.split(',')
                            .map((s) => s.trim())
                            .filter(Boolean) ?? []
                        }
                        onChange={(tools) => handleFieldChange('tools', tools.join(', '))}
                        availableTools={[...SUBAGENT_AVAILABLE_TOOLS]}
                      />
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: '11px',
                          color: 'var(--vscode-descriptionForeground)',
                        }}
                      >
                        {t('subAgent.form.toolsHint')}
                      </p>
                    </div>
                  )}

                  {/* Memory Scope (hidden for built-in) */}
                  {!isBuiltIn && (
                    <div>
                      <label
                        htmlFor={memoryId}
                        style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('subAgent.form.memoryLabel')}
                      </label>
                      <Select.Root
                        value={formData.memory || 'none'}
                        onValueChange={(val) =>
                          handleFieldChange('memory', val === 'none' ? '' : val)
                        }
                      >
                        <Select.Trigger
                          id={memoryId}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)',
                            border: '1px solid var(--vscode-input-border)',
                            borderRadius: '2px',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Content
                            position="popper"
                            sideOffset={4}
                            style={{
                              backgroundColor: 'var(--vscode-dropdown-background)',
                              border: '1px solid var(--vscode-dropdown-border)',
                              borderRadius: '2px',
                              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                              zIndex: 10001,
                              minWidth: '200px',
                            }}
                          >
                            <Select.Viewport style={{ padding: '4px' }}>
                              {[
                                { value: 'none', label: t('subAgent.form.memoryNone') },
                                { value: 'user', label: 'User' },
                                { value: 'project', label: 'Project' },
                                { value: 'local', label: 'Local' },
                              ].map((item) => (
                                <Select.Item
                                  key={item.value}
                                  value={item.value}
                                  style={{
                                    padding: '6px 8px',
                                    fontSize: '13px',
                                    color: 'var(--vscode-foreground)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    borderRadius: '2px',
                                  }}
                                >
                                  <Select.ItemText>{item.label}</Select.ItemText>
                                </Select.Item>
                              ))}
                            </Select.Viewport>
                          </Select.Content>
                        </Select.Portal>
                      </Select.Root>
                    </div>
                  )}

                  {/* Color (hidden for built-in) */}
                  {!isBuiltIn && (
                    <ColorPicker
                      value={formData.color}
                      onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
                    />
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '24px',
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: '1px solid var(--vscode-button-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  cursor: 'pointer',
                }}
              >
                {t('subAgent.form.cancelButton')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {isEditMode ? t('subAgent.form.saveButton') : t('subAgent.form.createButton')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
