/**
 * Slash Command Options Dropdown Component
 *
 * Provides options for Slash Command export (Export/Run):
 * - model: Specify the model to use for execution (inherit/sonnet/opus/haiku)
 * - context: fork - Exports with `context: fork` for isolated sub-agent execution (Claude Code v2.1.0+)
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { SlashCommandContext, SlashCommandModel } from '@shared/types/workflow-definition';
import { Check, ChevronDown, ChevronLeft, Cpu, GitFork } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n-context';

// Fixed font sizes for dropdown menu (not responsive)
const FONT_SIZES = {
  small: 11,
} as const;

const CONTEXT_PRESETS: { value: SlashCommandContext; label: string }[] = [
  { value: 'default', label: 'default' },
  { value: 'fork', label: 'fork' },
];

const MODEL_PRESETS: { value: SlashCommandModel; label: string }[] = [
  { value: 'default', label: 'default' },
  { value: 'inherit', label: 'inherit' },
  { value: 'haiku', label: 'haiku' },
  { value: 'sonnet', label: 'sonnet' },
  { value: 'opus', label: 'opus' },
];

interface SlashCommandOptionsDropdownProps {
  context: SlashCommandContext;
  onContextChange: (context: SlashCommandContext) => void;
  model: SlashCommandModel;
  onModelChange: (model: SlashCommandModel) => void;
}

export function SlashCommandOptionsDropdown({
  context,
  onContextChange,
  model,
  onModelChange,
}: SlashCommandOptionsDropdownProps) {
  const { t } = useTranslation();

  const currentContextLabel = CONTEXT_PRESETS.find((p) => p.value === context)?.label || 'default';
  const currentModelLabel = MODEL_PRESETS.find((p) => p.value === model)?.label || 'default';

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
          {/* Model Sub-menu */}
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
                  {currentModelLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={14} />
                <span>Model</span>
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
                <DropdownMenu.RadioGroup value={model}>
                  {MODEL_PRESETS.map((preset) => (
                    <DropdownMenu.RadioItem
                      key={preset.value}
                      value={preset.value}
                      onSelect={(event) => {
                        event.preventDefault();
                        onModelChange(preset.value);
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

                {/* Model Description */}
                <div
                  style={{
                    padding: '6px 12px',
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    lineHeight: '1.4',
                    borderTop: '1px solid var(--vscode-dropdown-border)',
                    marginTop: '4px',
                  }}
                >
                  {t('toolbar.model.tooltip')}
                </div>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-dropdown-border)',
              margin: '4px 0',
            }}
          />

          {/* Context Sub-menu */}
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
                  {currentContextLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitFork size={14} />
                <span>Context</span>
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
                <DropdownMenu.RadioGroup value={context}>
                  {CONTEXT_PRESETS.map((preset) => (
                    <DropdownMenu.RadioItem
                      key={preset.value}
                      value={preset.value}
                      onSelect={(event) => {
                        event.preventDefault();
                        onContextChange(preset.value);
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

                {/* Context Description */}
                <div
                  style={{
                    padding: '6px 12px',
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    lineHeight: '1.4',
                    borderTop: '1px solid var(--vscode-dropdown-border)',
                    marginTop: '4px',
                  }}
                >
                  {t('toolbar.contextFork.tooltip')}
                </div>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
