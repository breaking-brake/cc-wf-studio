/**
 * Codex Node Creation Dialog Component
 *
 * Feature: 518-codex-agent-node
 * Purpose: Dialog for creating and configuring Codex agent nodes
 *
 * Phase 1: UI/data model only (CLI execution is out of scope)
 */

import * as Dialog from '@radix-ui/react-dialog';
import { NodeType, VALIDATION_RULES } from '@shared/types/workflow-definition';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { openExternalUrl } from '../../services/vscode-bridge';
import { useWorkflowStore } from '../../stores/workflow-store';
import { EditInEditorButton } from '../common/EditInEditorButton';

// Codex CLI documentation URL
const CODEX_CLI_REFERENCE_URL = 'https://developers.openai.com/codex/cli/reference/#codex-exec';

interface CodexNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReasoningEffort = 'low' | 'medium' | 'high';
type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

// Predefined model options
const PREDEFINED_MODELS = [
  'gpt-5.2-codex',
  'gpt-5.2',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex-mini',
] as const;

type ModelSelectValue = (typeof PREDEFINED_MODELS)[number] | 'custom';

export function CodexNodeDialog({ isOpen, onClose }: CodexNodeDialogProps) {
  const { t } = useTranslation();
  const { addNode, nodes } = useWorkflowStore();

  // Form state
  const [name, setName] = useState('');
  const [promptMode, setPromptMode] = useState<'fixed' | 'ai-generated'>('fixed');
  const [prompt, setPrompt] = useState('');
  const [modelSelect, setModelSelect] = useState<ModelSelectValue>('gpt-5.2-codex');
  const [customModel, setCustomModel] = useState('');
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>('medium');
  const [useSandbox, setUseSandbox] = useState(false);
  const [sandbox, setSandbox] = useState<SandboxMode>('read-only');
  const [skipGitRepoCheck, setSkipGitRepoCheck] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  // Get effective model value
  const getEffectiveModel = (): string => {
    if (modelSelect === 'custom') {
      return customModel.trim();
    }
    return modelSelect;
  };

  /**
   * Calculate non-overlapping position for new node
   */
  const calculateNonOverlappingPosition = (
    defaultX: number,
    defaultY: number
  ): { x: number; y: number } => {
    const OFFSET_X = 30;
    const OFFSET_Y = 30;
    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 100;

    let newX = defaultX;
    let newY = defaultY;

    for (let i = 0; i < 100; i++) {
      const hasOverlap = nodes.some((node) => {
        const xOverlap =
          Math.abs(node.position.x - newX) < NODE_WIDTH &&
          Math.abs(node.position.y - newY) < NODE_HEIGHT;
        return xOverlap;
      });

      if (!hasOverlap) {
        return { x: newX, y: newY };
      }

      newX += OFFSET_X;
      newY += OFFSET_Y;
    }

    return { x: newX, y: newY };
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): string | null => {
    const trimmedName = name.trim();
    const trimmedPrompt = prompt.trim();

    if (trimmedName.length < VALIDATION_RULES.CODEX.NAME_MIN_LENGTH) {
      return t('codex.error.nameRequired');
    }

    if (trimmedName.length > VALIDATION_RULES.CODEX.NAME_MAX_LENGTH) {
      return t('codex.error.nameTooLong');
    }

    // Prompt is required only for 'fixed' mode
    if (promptMode === 'fixed') {
      if (trimmedPrompt.length < VALIDATION_RULES.CODEX.PROMPT_MIN_LENGTH) {
        return t('codex.error.promptRequired');
      }
    }

    if (trimmedPrompt.length > VALIDATION_RULES.CODEX.PROMPT_MAX_LENGTH) {
      return t('codex.error.promptTooLong');
    }

    // Validate custom model
    if (modelSelect === 'custom' && customModel.trim().length === 0) {
      return t('codex.error.modelRequired');
    }

    return null;
  };

  /**
   * Handle form submission
   */
  const handleCreate = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const position = calculateNonOverlappingPosition(300, 250);
    const nodeId = `codex-${Date.now()}`;

    addNode({
      id: nodeId,
      type: NodeType.Codex,
      position,
      data: {
        label: name.trim(),
        promptMode,
        prompt: prompt.trim(),
        model: getEffectiveModel(),
        reasoningEffort,
        sandbox: useSandbox ? sandbox : undefined,
        outputPorts: 1,
        skipGitRepoCheck,
      },
    });

    handleClose();
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    // Reset form state
    setName('');
    setPromptMode('fixed');
    setPrompt('');
    setModelSelect('gpt-5.2-codex');
    setCustomModel('');
    setReasoningEffort('medium');
    setUseSandbox(false);
    setSandbox('read-only');
    setSkipGitRepoCheck(true);
    setIsAdvancedOpen(false);
    setError(null);
    onClose();
  };

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
            zIndex: 9999,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            {/* Dialog Header */}
            <Dialog.Title
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('codex.title')}
            </Dialog.Title>

            <Dialog.Description
              style={{
                marginBottom: '20px',
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              {t('codex.description')}
            </Dialog.Description>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                  border: '1px solid var(--vscode-inputValidation-errorBorder)',
                  borderRadius: '4px',
                  color: 'var(--vscode-errorForeground)',
                }}
              >
                {error}
              </div>
            )}

            {/* Name Field */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="codex-name-input"
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                }}
              >
                {t('codex.nameLabel')} *
              </label>
              <input
                id="codex-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder={t('codex.namePlaceholder')}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {t('codex.nameHelp')}
              </div>
            </div>

            {/* Prompt Mode Selection */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                }}
              >
                {t('codex.promptModeLabel')}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  <input
                    type="radio"
                    name="promptMode"
                    value="fixed"
                    checked={promptMode === 'fixed'}
                    onChange={() => setPromptMode('fixed')}
                    style={{ cursor: 'pointer' }}
                  />
                  {t('codex.promptMode.fixed')}
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  <input
                    type="radio"
                    name="promptMode"
                    value="ai-generated"
                    checked={promptMode === 'ai-generated'}
                    onChange={() => setPromptMode('ai-generated')}
                    style={{ cursor: 'pointer' }}
                  />
                  {t('codex.promptMode.aiGenerated')}
                </label>
              </div>
              {promptMode === 'ai-generated' && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  {t('codex.promptMode.aiGeneratedHelp')}
                </div>
              )}
            </div>

            {/* Prompt Field */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <label
                  htmlFor="codex-prompt-input"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  {promptMode === 'fixed'
                    ? `${t('codex.promptLabel')} *`
                    : t('codex.promptGuidanceLabel')}
                </label>
                <EditInEditorButton
                  content={prompt}
                  onContentUpdated={(newContent) => {
                    setPrompt(newContent);
                    setError(null);
                  }}
                  label={
                    promptMode === 'fixed' ? t('codex.promptLabel') : t('codex.promptGuidanceLabel')
                  }
                  language="markdown"
                  onEditingStateChange={setIsEditingPrompt}
                />
              </div>
              <textarea
                id="codex-prompt-input"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setError(null);
                }}
                placeholder={
                  promptMode === 'fixed'
                    ? t('codex.promptPlaceholder')
                    : t('codex.promptGuidancePlaceholder')
                }
                rows={4}
                readOnly={isEditingPrompt}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  opacity: isEditingPrompt ? 0.5 : 1,
                }}
              />
            </div>

            {/* Model Field */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="codex-model-select"
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                }}
              >
                {t('codex.modelLabel')}
              </label>
              <select
                id="codex-model-select"
                value={modelSelect}
                onChange={(e) => setModelSelect(e.target.value as ModelSelectValue)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  color: 'var(--vscode-dropdown-foreground)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <option value="gpt-5.2-codex">gpt-5.2-codex</option>
                <option value="gpt-5.2">gpt-5.2</option>
                <option value="gpt-5.1-codex-max">gpt-5.1-codex-max</option>
                <option value="gpt-5.1-codex-mini">gpt-5.1-codex-mini</option>
                <option value="custom">{t('codex.model.custom')}</option>
              </select>
              {/* Custom Model Input */}
              {modelSelect === 'custom' && (
                <input
                  id="codex-custom-model-input"
                  type="text"
                  value={customModel}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    setError(null);
                  }}
                  placeholder={t('codex.customModelPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '8px',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </div>

            {/* Reasoning Effort Field */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="codex-reasoning-effort-select"
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                }}
              >
                {t('codex.reasoningEffortLabel')}
              </label>
              <select
                id="codex-reasoning-effort-select"
                value={reasoningEffort}
                onChange={(e) => setReasoningEffort(e.target.value as ReasoningEffort)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  color: 'var(--vscode-dropdown-foreground)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <option value="low">{t('codex.reasoningEffort.low')}</option>
                <option value="medium">{t('codex.reasoningEffort.medium')}</option>
                <option value="high">{t('codex.reasoningEffort.high')}</option>
              </select>
            </div>

            {/* Skip Git Repo Check Field - always visible */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="codex-skip-git-repo-check"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  id="codex-skip-git-repo-check"
                  type="checkbox"
                  checked={skipGitRepoCheck}
                  onChange={(e) => setSkipGitRepoCheck(e.target.checked)}
                  style={{
                    marginTop: '2px',
                    cursor: 'pointer',
                  }}
                />
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openExternalUrl(CODEX_CLI_REFERENCE_URL);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--vscode-textLink-foreground)',
                      }}
                      title="Open documentation"
                    >
                      <ExternalLink size={12} />
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '11px',
                      color: 'var(--vscode-errorForeground)',
                    }}
                  >
                    ⚠️ {t('codex.skipGitRepoCheckWarning')}
                  </div>
                </div>
              </label>
            </div>

            {/* Advanced Options - collapsible section */}
            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  width: '100%',
                }}
              >
                {isAdvancedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {t('codex.advancedOptions')}
              </button>

              {isAdvancedOpen && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingLeft: '20px',
                    borderLeft: '2px solid var(--vscode-panel-border)',
                  }}
                >
                  {/* Sandbox Field - checkbox + select */}
                  <div>
                    <label
                      htmlFor="codex-use-sandbox"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        id="codex-use-sandbox"
                        type="checkbox"
                        checked={useSandbox}
                        onChange={(e) => setUseSandbox(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('codex.sandboxLabel')}
                      </span>
                    </label>
                    {useSandbox && (
                      <>
                        <select
                          id="codex-sandbox-select"
                          value={sandbox}
                          onChange={(e) => setSandbox(e.target.value as SandboxMode)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: 'var(--vscode-dropdown-background)',
                            color: 'var(--vscode-dropdown-foreground)',
                            border: '1px solid var(--vscode-dropdown-border)',
                            borderRadius: '4px',
                            fontSize: '13px',
                          }}
                        >
                          <option value="read-only">{t('codex.sandbox.readOnly')}</option>
                          <option value="workspace-write">
                            {t('codex.sandbox.workspaceWrite')}
                          </option>
                          <option value="danger-full-access">
                            {t('codex.sandbox.dangerFullAccess')}
                          </option>
                        </select>
                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '11px',
                            color: 'var(--vscode-descriptionForeground)',
                          }}
                        >
                          {t('codex.sandboxHelp')}
                        </div>
                      </>
                    )}
                    {!useSandbox && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--vscode-descriptionForeground)',
                        }}
                      >
                        {t('codex.sandboxDefaultHelp')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid var(--vscode-panel-border)',
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {t('codex.cancelButton')}
              </button>

              <button
                type="button"
                onClick={handleCreate}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {t('codex.createButton')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
