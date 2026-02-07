/**
 * More Actions Dropdown Component
 *
 * Consolidates additional toolbar actions into a single dropdown menu:
 * - Share to Slack
 * - Reset Workflow
 * - Help (Start Tour)
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Bot,
  Check,
  Focus,
  HelpCircle,
  MoreHorizontal,
  Share2,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useIsCompactMode } from '../../hooks/useWindowWidth';
import { useTranslation } from '../../i18n/i18n-context';
import { BetaBadge } from '../common/BetaBadge';

// Fixed font sizes for dropdown menu (not responsive)
const FONT_SIZES = {
  small: 11,
} as const;

interface MoreActionsDropdownProps {
  onShareToSlack: () => void;
  onResetWorkflow: () => void;
  onStartTour: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  isCopilotEnabled: boolean;
  onToggleCopilotBeta: () => void;
  isCodexEnabled: boolean;
  onToggleCodexBeta: () => void;
  isRooCodeEnabled: boolean;
  onToggleRooCodeBeta: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MoreActionsDropdown({
  onShareToSlack,
  onResetWorkflow,
  onStartTour,
  isFocusMode,
  onToggleFocusMode,
  isCopilotEnabled,
  onToggleCopilotBeta,
  isCodexEnabled,
  onToggleCodexBeta,
  isRooCodeEnabled,
  onToggleRooCodeBeta,
  open,
  onOpenChange,
}: MoreActionsDropdownProps) {
  const { t } = useTranslation();
  const isCompact = useIsCompactMode();

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          data-tour="more-actions-button"
          style={{
            padding: '4px 8px',
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <MoreHorizontal size={16} />
          {!isCompact && <span>{t('toolbar.moreActions')}</span>}
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
            minWidth: '160px',
            padding: '4px',
          }}
        >
          {/* Share to Slack */}
          <DropdownMenu.Item
            onSelect={onShareToSlack}
            data-tour="slack-share-button"
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
            <Share2 size={14} />
            <span>{t('slack.share.title')}</span>
          </DropdownMenu.Item>

          {/* Reset Workflow */}
          <DropdownMenu.Item
            onSelect={onResetWorkflow}
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
            <Trash2 size={14} />
            <span>{t('toolbar.resetWorkflow')}</span>
          </DropdownMenu.Item>

          {/* Focus Mode Toggle */}
          <DropdownMenu.Item
            onSelect={onToggleFocusMode}
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
            <Focus size={14} />
            <span style={{ flex: 1 }}>{t('toolbar.focusMode')}</span>
            {isFocusMode && <Check size={14} />}
          </DropdownMenu.Item>

          {/* Copilot Beta Toggle */}
          <DropdownMenu.Item
            onSelect={onToggleCopilotBeta}
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
            <Bot size={14} />
            <span style={{ flex: 1 }}>
              Copilot
              <BetaBadge style={{ marginLeft: '4px' }} />
            </span>
            {isCopilotEnabled && <Check size={14} />}
          </DropdownMenu.Item>

          {/* Codex Beta Toggle */}
          <DropdownMenu.Item
            onSelect={onToggleCodexBeta}
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
            <Terminal size={14} />
            <span style={{ flex: 1 }}>
              Codex
              <BetaBadge style={{ marginLeft: '4px' }} />
            </span>
            {isCodexEnabled && <Check size={14} />}
          </DropdownMenu.Item>

          {/* Roo Code Beta Toggle */}
          <DropdownMenu.Item
            onSelect={onToggleRooCodeBeta}
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
            <Bot size={14} />
            <span style={{ flex: 1 }}>
              Roo Code
              <BetaBadge style={{ marginLeft: '4px' }} />
            </span>
            {isRooCodeEnabled && <Check size={14} />}
          </DropdownMenu.Item>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-panel-border)',
              margin: '4px 0',
            }}
          />

          {/* Help / Start Tour */}
          <DropdownMenu.Item
            onSelect={onStartTour}
            data-tour="help-button"
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
            <HelpCircle size={14} />
            <span>{t('toolbar.help')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
