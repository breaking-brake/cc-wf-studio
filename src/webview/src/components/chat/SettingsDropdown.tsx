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
import type { ClaudeModel } from '@shared/types/messages';
// Edit3 is commented out with Iteration Counter - uncomment when re-enabling
import { Check, ChevronLeft, Cpu, RotateCcw, Trash2, UserCog, Wrench } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n-context';
import { AVAILABLE_TOOLS, useRefinementStore } from '../../stores/refinement-store';

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
    isProcessing,
    selectedModel,
    setSelectedModel,
    allowedTools,
    toggleAllowedTool,
    resetAllowedTools,
    // conversationHistory, // Uncomment when re-enabling Iteration Counter
  } = useRefinementStore();

  const currentModelLabel = MODEL_PRESETS.find((p) => p.value === selectedModel)?.label || 'Sonnet';

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
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          {/* Allowed Tools Sub-menu */}
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
