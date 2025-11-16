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
  icon: string;
  titleKey:
    | 'mcp.modeSelection.detailed.title'
    | 'mcp.modeSelection.naturalLanguageParam.title'
    | 'mcp.modeSelection.fullNaturalLanguage.title';
  color: string;
}

const MODE_INFO: Record<McpNodeMode, ModeInfo> = {
  detailed: {
    icon: '⚙️',
    titleKey: 'mcp.modeSelection.detailed.title',
    color: 'var(--vscode-charts-blue)',
  },
  naturalLanguageParam: {
    icon: '◐',
    titleKey: 'mcp.modeSelection.naturalLanguageParam.title',
    color: 'var(--vscode-charts-orange)',
  },
  fullNaturalLanguage: {
    icon: '●',
    titleKey: 'mcp.modeSelection.fullNaturalLanguage.title',
    color: 'var(--vscode-charts-green)',
  },
};

export function ModeIndicatorBadge({ mode }: ModeIndicatorBadgeProps) {
  const { t } = useTranslation();
  const info = MODE_INFO[mode];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: '16px',
          lineHeight: 1,
          color: info.color,
        }}
      >
        {info.icon}
      </span>

      {/* Mode Name */}
      <span>{t(info.titleKey)}</span>
    </div>
  );
}
