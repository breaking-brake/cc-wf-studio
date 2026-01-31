/**
 * Settings Dropdown Component
 *
 * Consolidates AI refinement settings into a single dropdown menu:
 * - Use Skills toggle
 * - Model selector
 * - Allowed Tools selector
 * - Clear History action
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { AiCliProvider, ClaudeModel } from '@shared/types/messages';
// Edit3 is commented out with Iteration Counter - uncomment when re-enabling
import {
  Bot,
  Check,
  ChevronLeft,
  Cpu,
  ExternalLink,
  Loader2,
  RotateCcw,
  Trash2,
  UserCog,
  Wrench,
} from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { openExternalUrl } from '../../services/vscode-bridge';
import {
  AVAILABLE_TOOLS,
  CODEX_REASONING_EFFORT_OPTIONS,
  useRefinementStore,
} from '../../stores/refinement-store';

const MODEL_PRESETS: { value: ClaudeModel; label: string }[] = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
];

const PROVIDER_PRESETS: { value: AiCliProvider; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'copilot', label: 'Copilot' },
  { value: 'codex', label: 'Codex' },
];

// Fixed font sizes for dropdown menu (not responsive)
const FONT_SIZES = {
  small: 11,
  button: 12,
} as const;

interface SettingsDropdownProps {
  onClearHistoryClick: () => void;
  hasMessages: boolean;
}

export function SettingsDropdown({ onClearHistoryClick, hasMessages }: SettingsDropdownProps) {
  const { t } = useTranslation();
  const {
    useSkills,
    toggleUseSkills,
    useCodexNodes,
    toggleUseCodexNodes,
    isProcessing,
    selectedModel,
    setSelectedModel,
    selectedCopilotModel,
    setSelectedCopilotModel,
    selectedCodexModel,
    setSelectedCodexModel,
    selectedCodexReasoningEffort,
    setSelectedCodexReasoningEffort,
    allowedTools,
    toggleAllowedTool,
    resetAllowedTools,
    selectedProvider,
    setSelectedProvider,
    isCopilotEnabled,
    isCodexEnabled,
    availableCopilotModels,
    isFetchingCopilotModels,
    copilotModelsError,
    fetchCopilotModels,
    // conversationHistory, // Uncomment when re-enabling Iteration Counter
  } = useRefinementStore();

  // Fetch Copilot models when provider is set to copilot and models are not loaded
  useEffect(() => {
    if (
      selectedProvider === 'copilot' &&
      availableCopilotModels.length === 0 &&
      !isFetchingCopilotModels &&
      !copilotModelsError
    ) {
      fetchCopilotModels();
    }
  }, [
    selectedProvider,
    availableCopilotModels.length,
    isFetchingCopilotModels,
    copilotModelsError,
    fetchCopilotModels,
  ]);

  const currentModelLabel = MODEL_PRESETS.find((p) => p.value === selectedModel)?.label || 'Sonnet';
  const currentCopilotModelLabel =
    availableCopilotModels.find((m) => m.family === selectedCopilotModel)?.name ||
    selectedCopilotModel ||
    'Loading...';
  const currentProviderLabel =
    PROVIDER_PRESETS.find((p) => p.value === selectedProvider)?.label || 'Claude Code';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={isProcessing}
          style={{
            padding: '4px 8px',
            backgroundColor: 'transparent',
            color: 'var(--vscode-foreground)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontSize: `${FONT_SIZES.small}px`,
            opacity: isProcessing ? 0.5 : 1,
          }}
        >
          {t('refinement.settings.title')}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={4}
          align="end"
          style={{
            backgroundColor: 'var(--vscode-dropdown-background)',
            border: '1px solid var(--vscode-dropdown-border)',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            minWidth: '200px',
            padding: '4px',
          }}
        >
          {/* Iteration Counter - Hidden until user request
            {conversationHistory && (
              <>
                <div
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div style={{ width: '14px' }} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--vscode-badge-background)',
                      color: 'var(--vscode-badge-foreground)',
                      fontSize: `${FONT_SIZES.button}px`,
                    }}
                    title={t('refinement.iterationCounter.tooltip')}
                  >
                    <Edit3 size={12} />
                    <span>
                      {t('refinement.iterationCounter', {
                        current: conversationHistory.currentIteration,
                      })}
                    </span>
                  </div>
                </div>
                <DropdownMenu.Separator
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '4px 0',
                  }}
                />
              </>
            )}
            */}

          {/* Use Skills Toggle Item */}
          <DropdownMenu.CheckboxItem
            checked={useSkills}
            onCheckedChange={toggleUseSkills}
            disabled={isProcessing}
            style={{
              padding: '8px 12px',
              fontSize: `${FONT_SIZES.small}px`,
              color: 'var(--vscode-foreground)',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none',
              borderRadius: '2px',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DropdownMenu.ItemIndicator>
                <Check size={14} />
              </DropdownMenu.ItemIndicator>
            </div>
            <UserCog size={14} />
            <span>{t('refinement.chat.useSkillsCheckbox')}</span>
          </DropdownMenu.CheckboxItem>

          {/* Use Codex Nodes Toggle Item - Only shown when Codex Beta is enabled */}
          {isCodexEnabled && (
            <DropdownMenu.CheckboxItem
              checked={useCodexNodes}
              onCheckedChange={toggleUseCodexNodes}
              disabled={isProcessing}
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
                opacity: isProcessing ? 0.5 : 1,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DropdownMenu.ItemIndicator>
                  <Check size={14} />
                </DropdownMenu.ItemIndicator>
              </div>
              <Bot size={14} />
              <span>{t('refinement.chat.useCodexNodesCheckbox')}</span>
            </DropdownMenu.CheckboxItem>
          )}

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-panel-border)',
              margin: '4px 0',
            }}
          />

          {/* Provider Sub-menu - Only shown when Copilot or Codex is enabled via More Actions */}
          {(isCopilotEnabled || isCodexEnabled) && (
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger
                disabled={isProcessing}
                style={{
                  padding: '8px 12px',
                  fontSize: `${FONT_SIZES.small}px`,
                  color: 'var(--vscode-foreground)',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  outline: 'none',
                  borderRadius: '2px',
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ChevronLeft size={14} />
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    {currentProviderLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={14} />
                  <span>{t('refinement.provider.label')}</span>
                </div>
              </DropdownMenu.SubTrigger>

              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  sideOffset={4}
                  style={{
                    backgroundColor: 'var(--vscode-dropdown-background)',
                    border: '1px solid var(--vscode-dropdown-border)',
                    borderRadius: '4px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                    zIndex: 10000,
                    minWidth: '120px',
                    padding: '4px',
                  }}
                >
                  <DropdownMenu.RadioGroup value={selectedProvider}>
                    {PROVIDER_PRESETS.filter(
                      (preset) =>
                        preset.value === 'claude-code' ||
                        (preset.value === 'copilot' && isCopilotEnabled) ||
                        (preset.value === 'codex' && isCodexEnabled)
                    ).map((preset) => (
                      <DropdownMenu.RadioItem
                        key={preset.value}
                        value={preset.value}
                        onSelect={(event) => {
                          event.preventDefault();
                          setSelectedProvider(preset.value);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: `${FONT_SIZES.small}px`,
                          color: 'var(--vscode-foreground)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          outline: 'none',
                          borderRadius: '2px',
                        }}
                      >
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <DropdownMenu.ItemIndicator>
                            <Check size={12} />
                          </DropdownMenu.ItemIndicator>
                        </div>
                        <span>{preset.label}</span>
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          )}

          {/* Model Sub-menu - Shows different models based on selected provider */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              disabled={isProcessing}
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
                opacity: isProcessing ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} />
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  {selectedProvider === 'claude-code'
                    ? currentModelLabel
                    : selectedProvider === 'codex'
                      ? selectedCodexModel
                      : currentCopilotModelLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={14} />
                <span>{t('refinement.model.label')}</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '140px',
                  padding: '4px',
                }}
              >
                {selectedProvider === 'claude-code' ? (
                  <DropdownMenu.RadioGroup value={selectedModel}>
                    {MODEL_PRESETS.map((preset) => (
                      <DropdownMenu.RadioItem
                        key={preset.value}
                        value={preset.value}
                        onSelect={(event) => {
                          event.preventDefault();
                          setSelectedModel(preset.value);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: `${FONT_SIZES.small}px`,
                          color: 'var(--vscode-foreground)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          outline: 'none',
                          borderRadius: '2px',
                        }}
                      >
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <DropdownMenu.ItemIndicator>
                            <Check size={12} />
                          </DropdownMenu.ItemIndicator>
                        </div>
                        <span>{preset.label}</span>
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                ) : selectedProvider === 'codex' ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: `${FONT_SIZES.small}px`,
                          color: 'var(--vscode-descriptionForeground)',
                        }}
                      >
                        Model
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openExternalUrl('https://developers.openai.com/codex/models/');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          fontSize: '10px',
                          color: 'var(--vscode-textLink-foreground)',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <ExternalLink size={10} />
                        <span>Model list</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={selectedCodexModel}
                      onChange={(e) => setSelectedCodexModel(e.target.value)}
                      placeholder="gpt-5.1-codex-mini"
                      style={{
                        padding: '4px 8px',
                        fontSize: `${FONT_SIZES.small}px`,
                        backgroundColor: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '4px',
                        outline: 'none',
                        width: '140px',
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        // Prevent arrow keys from being captured by menu navigation
                        if (
                          [
                            'ArrowLeft',
                            'ArrowRight',
                            'ArrowUp',
                            'ArrowDown',
                            'Home',
                            'End',
                          ].includes(e.key)
                        ) {
                          e.stopPropagation();
                        }
                      }}
                    />
                    {/* Reasoning Effort Selector */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: `${FONT_SIZES.small}px`,
                          color: 'var(--vscode-descriptionForeground)',
                        }}
                      >
                        Reasoning
                      </span>
                      <select
                        value={selectedCodexReasoningEffort}
                        onChange={(e) =>
                          setSelectedCodexReasoningEffort(
                            e.target.value as typeof selectedCodexReasoningEffort
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '4px 8px',
                          fontSize: `${FONT_SIZES.small}px`,
                          backgroundColor: 'var(--vscode-input-background)',
                          color: 'var(--vscode-input-foreground)',
                          border: '1px solid var(--vscode-input-border)',
                          borderRadius: '4px',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {CODEX_REASONING_EFFORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : isFetchingCopilotModels ? (
                  <div
                    style={{
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: 'var(--vscode-descriptionForeground)',
                      fontSize: `${FONT_SIZES.small}px`,
                    }}
                  >
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Loading models...</span>
                  </div>
                ) : copilotModelsError ? (
                  <div
                    style={{
                      padding: '12px',
                      color: 'var(--vscode-errorForeground)',
                      fontSize: `${FONT_SIZES.small}px`,
                    }}
                  >
                    {copilotModelsError}
                  </div>
                ) : availableCopilotModels.length === 0 ? (
                  <div
                    style={{
                      padding: '12px',
                      color: 'var(--vscode-descriptionForeground)',
                      fontSize: `${FONT_SIZES.small}px`,
                    }}
                  >
                    No models available
                  </div>
                ) : (
                  <>
                    {/* Premium Request multiplier link */}
                    <DropdownMenu.Item
                      onSelect={() => {
                        openExternalUrl(
                          'https://docs.github.com/en/copilot/concepts/billing/copilot-requests#model-multipliers'
                        );
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        fontSize: '10px',
                        color: 'var(--vscode-textLink-foreground)',
                        cursor: 'pointer',
                        outline: 'none',
                        borderRadius: '2px',
                      }}
                    >
                      <ExternalLink size={10} />
                      <span>Premium Request multiplier</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator
                      style={{
                        height: '1px',
                        backgroundColor: 'var(--vscode-panel-border)',
                        margin: '4px 0',
                      }}
                    />
                    <DropdownMenu.RadioGroup value={selectedCopilotModel}>
                      {availableCopilotModels.map((model) => (
                        <DropdownMenu.RadioItem
                          key={model.id}
                          value={model.family}
                          onSelect={(event) => {
                            event.preventDefault();
                            setSelectedCopilotModel(model.family);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: `${FONT_SIZES.small}px`,
                            color: 'var(--vscode-foreground)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            outline: 'none',
                            borderRadius: '2px',
                          }}
                        >
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <DropdownMenu.ItemIndicator>
                              <Check size={12} />
                            </DropdownMenu.ItemIndicator>
                          </div>
                          <span>{model.name}</span>
                        </DropdownMenu.RadioItem>
                      ))}
                    </DropdownMenu.RadioGroup>
                  </>
                )}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          {/* Allowed Tools Sub-menu - Only show for Claude Code (Copilot doesn't support tools) */}
          {selectedProvider === 'claude-code' && (
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger
                disabled={isProcessing}
                style={{
                  padding: '8px 12px',
                  fontSize: `${FONT_SIZES.small}px`,
                  color: 'var(--vscode-foreground)',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  outline: 'none',
                  borderRadius: '2px',
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ChevronLeft size={14} />
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    {allowedTools.length} tools
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={14} />
                  <span>Allowed Tools</span>
                </div>
              </DropdownMenu.SubTrigger>

              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  sideOffset={4}
                  style={{
                    backgroundColor: 'var(--vscode-dropdown-background)',
                    border: '1px solid var(--vscode-dropdown-border)',
                    borderRadius: '4px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                    zIndex: 10000,
                    minWidth: '150px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}
                >
                  {AVAILABLE_TOOLS.map((tool) => (
                    <DropdownMenu.CheckboxItem
                      key={tool}
                      checked={allowedTools.includes(tool)}
                      onSelect={(event) => {
                        event.preventDefault(); // Prevent menu from closing
                        toggleAllowedTool(tool);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: `${FONT_SIZES.small}px`,
                        color: 'var(--vscode-foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        outline: 'none',
                        borderRadius: '2px',
                        position: 'relative',
                        paddingLeft: '28px',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: '8px',
                          width: '12px',
                          height: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <DropdownMenu.ItemIndicator>
                          <Check size={12} />
                        </DropdownMenu.ItemIndicator>
                      </div>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: tool === 'AskUserQuestion' ? 0.7 : 1,
                        }}
                      >
                        {tool}
                        {tool === 'AskUserQuestion' && (
                          <span
                            style={{
                              fontSize: '10px',
                              color: 'var(--vscode-editorWarning-foreground)',
                            }}
                          >
                            ⚠️ Not recommended
                          </span>
                        )}
                      </span>
                    </DropdownMenu.CheckboxItem>
                  ))}

                  <DropdownMenu.Separator
                    style={{
                      height: '1px',
                      backgroundColor: 'var(--vscode-panel-border)',
                      margin: '4px 0',
                    }}
                  />

                  <DropdownMenu.Item
                    onSelect={(event) => {
                      event.preventDefault();
                      resetAllowedTools();
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: `${FONT_SIZES.small}px`,
                      color: 'var(--vscode-foreground)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      outline: 'none',
                      borderRadius: '2px',
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Reset to Default</span>
                  </DropdownMenu.Item>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          )}

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-panel-border)',
              margin: '4px 0',
            }}
          />

          {/* Clear History Item */}
          <DropdownMenu.Item
            disabled={!hasMessages || isProcessing}
            onSelect={onClearHistoryClick}
            style={{
              padding: '8px 12px',
              fontSize: `${FONT_SIZES.small}px`,
              color:
                !hasMessages || isProcessing
                  ? 'var(--vscode-disabledForeground)'
                  : 'var(--vscode-errorForeground)',
              cursor: !hasMessages || isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none',
              borderRadius: '2px',
              opacity: !hasMessages || isProcessing ? 0.5 : 1,
            }}
          >
            <div style={{ width: '14px' }} />
            <Trash2 size={14} />
            <span>{t('refinement.chat.clearButton')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
