/**
 * Settings Dropdown Component
 *
 * Consolidates AI refinement settings into a single dropdown menu:
 * - Use Skills toggle
 * - Codebase Reference toggle
 * - Timeout selector
 * - Clear History action
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { ClaudeModel } from '@shared/types/messages';
// Edit3 is commented out with Iteration Counter - uncomment when re-enabling
import { Check, ChevronLeft, Clock, Cpu, Database, Trash2, UserCog } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { useRefinementStore } from '../../stores/refinement-store';
import { CodebaseSettingsDialog } from '../dialogs/CodebaseSettingsDialog';

const TIMEOUT_PRESETS = [
  { seconds: 0, label: 'Unlimited' },
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '60s' },
  { seconds: 90, label: '90s' },
  { seconds: 120, label: '2min' },
  { seconds: 180, label: '3min' },
  { seconds: 240, label: '4min' },
  { seconds: 300, label: '5min' },
];

const MODEL_PRESETS: { value: ClaudeModel; label: string }[] = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
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
    timeoutSeconds,
    setTimeoutSeconds,
    isProcessing,
    useCodebaseSearch,
    selectedModel,
    setSelectedModel,
    // conversationHistory, // Uncomment when re-enabling Iteration Counter
  } = useRefinementStore();

  const [isCodebaseDialogOpen, setIsCodebaseDialogOpen] = useState(false);

  const currentTimeoutLabel =
    TIMEOUT_PRESETS.find((p) => p.seconds === timeoutSeconds)?.label || `${timeoutSeconds}s`;

  const currentModelLabel = MODEL_PRESETS.find((p) => p.value === selectedModel)?.label || 'Sonnet';

  return (
    <>
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

            {/* Codebase Reference Item - Opens settings dialog */}
            <DropdownMenu.Item
              disabled={isProcessing}
              onSelect={() => setIsCodebaseDialogOpen(true)}
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
                {useCodebaseSearch && <Check size={14} />}
              </div>
              <Database size={14} />
              <span>{t('codebaseIndex.button')}</span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator
              style={{
                height: '1px',
                backgroundColor: 'var(--vscode-panel-border)',
                margin: '4px 0',
              }}
            />

            {/* Model Sub-menu */}
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
                    {currentModelLabel}
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
                    minWidth: '100px',
                    padding: '4px',
                  }}
                >
                  <DropdownMenu.RadioGroup
                    value={selectedModel}
                    onValueChange={(value) => setSelectedModel(value as ClaudeModel)}
                  >
                    {MODEL_PRESETS.map((preset) => (
                      <DropdownMenu.RadioItem
                        key={preset.value}
                        value={preset.value}
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

            {/* Timeout Sub-menu */}
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
                    {currentTimeoutLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} />
                  <span>{t('refinement.timeout.label')}</span>
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
                    minWidth: '100px',
                    padding: '4px',
                  }}
                >
                  <DropdownMenu.RadioGroup
                    value={String(timeoutSeconds)}
                    onValueChange={(value) => setTimeoutSeconds(Number(value))}
                  >
                    {TIMEOUT_PRESETS.map((preset) => (
                      <DropdownMenu.RadioItem
                        key={preset.seconds}
                        value={String(preset.seconds)}
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

      {/* Codebase Settings Dialog */}
      <CodebaseSettingsDialog
        isOpen={isCodebaseDialogOpen}
        onClose={() => setIsCodebaseDialogOpen(false)}
      />
    </>
  );
}
