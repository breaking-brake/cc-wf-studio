/**
 * Mode Indicator Badge Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Display current MCP node mode as a read-only badge
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T016
 */

import type { McpNodeMode } from '@shared/types/mcp-node';
import { useTranslation } from '../../i18n/i18n-context';

interface ModeIndicatorBadgeProps {
  mode: McpNodeMode;
}

interface ModeInfo {
  titleKey:
    | 'mcp.modeSelection.manualParameterConfig.title'
    | 'mcp.modeSelection.aiParameterConfig.title'
    | 'mcp.modeSelection.aiToolSelection.title';
}

const MODE_INFO: Record<McpNodeMode, ModeInfo> = {
  manualParameterConfig: {
    titleKey: 'mcp.modeSelection.manualParameterConfig.title',
  },
  aiParameterConfig: {
    titleKey: 'mcp.modeSelection.aiParameterConfig.title',
  },
  aiToolSelection: {
    titleKey: 'mcp.modeSelection.aiToolSelection.title',
  },
};

/**
 * Mode Indicator Badge Component
 *
 * Displays a read-only badge showing the current MCP node mode.
 * Used in canvas nodes and edit dialogs to indicate the configuration mode.
 *
 * @param props - Component props
 * @param props.mode - Current MCP node mode
 */
export function ModeIndicatorBadge({ mode }: ModeIndicatorBadgeProps) {
  const { t } = useTranslation();
  const info = MODE_INFO[mode];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: 'bold',
      }}
    >
      {/* Mode Name */}
      <span>{t(info.titleKey)}</span>
    </div>
  );
}
