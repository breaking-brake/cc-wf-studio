/**
 * Copilot Execution Mode Dropdown Component
 *
 * Provides submenu for selecting execution mode:
 * - Copilot CLI (default): Uses terminal with copilot command
 * - VSCode Copilot: Opens Copilot Chat panel
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { CopilotExecutionMode } from '@shared/types/messages';
import { Check, ChevronDown, ChevronLeft, MessageSquare, Terminal } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';

// Re-export CopilotExecutionMode for use by other components
export type { CopilotExecutionMode } from '@shared/types/messages';

// Fixed font sizes for dropdown menu (not responsive)
const FONT_SIZES = {
  small: 11,
} as const;

const EXECUTION_MODE_OPTIONS: {
  value: CopilotExecutionMode;
  labelKey: keyof WebviewTranslationKeys;
  icon: React.ReactNode;
}[] = [
  {
    value: 'cli',
    labelKey: 'copilot.mode.cli',
    icon: <Terminal size={14} />,
  },
  {
    value: 'vscode',
    labelKey: 'copilot.mode.vscode',
    icon: <MessageSquare size={14} />,
  },
];

interface CopilotExecutionModeDropdownProps {
  mode: CopilotExecutionMode;
  onModeChange: (mode: CopilotExecutionMode) => void;
}

export function CopilotExecutionModeDropdown({
  mode,
  onModeChange,
}: CopilotExecutionModeDropdownProps) {
  const { t } = useTranslation();

  const currentModeOption = EXECUTION_MODE_OPTIONS.find((opt) => opt.value === mode);
  const currentModeLabel = t(currentModeOption?.labelKey || 'copilot.mode.cli');
  const currentModeIcon = currentModeOption?.icon || <Terminal size={14} />;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          style={{
            padding: '4px 6px',
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={t('copilot.mode.tooltip')}
        >
          <ChevronDown size={14} />
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
          {/* Run Mode Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} />
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  {currentModeLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentModeIcon}
                <span>Mode</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                collisionPadding={{ right: 300 }}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '160px',
                  padding: '4px',
                }}
              >
                <DropdownMenu.RadioGroup
                  value={mode}
                  onValueChange={(value) => onModeChange(value as CopilotExecutionMode)}
                >
                  {EXECUTION_MODE_OPTIONS.map((option) => (
                    <DropdownMenu.RadioItem
                      key={option.value}
                      value={option.value}
                      onSelect={(event) => event.preventDefault()}
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
                      {option.icon}
                      <span>{t(option.labelKey)}</span>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
