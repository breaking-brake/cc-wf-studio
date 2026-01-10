/**
 * Slash Command Options Dropdown Component
 *
 * Provides options for Slash Command export (Export/Run):
 * - context: fork - Exports with `context: fork` for isolated sub-agent execution (Claude Code v2.1.0+)
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, GitFork } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n-context';

// Fixed font sizes for dropdown menu (not responsive)
const FONT_SIZES = {
  small: 11,
} as const;

interface SlashCommandOptionsDropdownProps {
  contextFork: boolean;
  onToggleContextFork: () => void;
}

export function SlashCommandOptionsDropdown({
  contextFork,
  onToggleContextFork,
}: SlashCommandOptionsDropdownProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          title={t('toolbar.slashCommandOptions')}
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
          {/* Fork Context Toggle */}
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault(); // Prevent menu from closing
              onToggleContextFork();
            }}
            style={{
              padding: '8px 12px',
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
            <GitFork size={14} />
            <span style={{ flex: 1 }}>context: fork</span>
            {contextFork && <Check size={14} />}
          </DropdownMenu.Item>

          {/* Description text */}
          <div
            style={{
              padding: '4px 12px 8px',
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              lineHeight: '1.4',
            }}
          >
            {t('toolbar.contextFork.tooltip')}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
