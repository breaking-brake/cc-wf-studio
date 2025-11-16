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
    | 'mcp.modeSelection.detailed.title'
    | 'mcp.modeSelection.naturalLanguageParam.title'
    | 'mcp.modeSelection.fullNaturalLanguage.title';
  borderColor: string;
}

const MODE_INFO: Record<McpNodeMode, ModeInfo> = {
  detailed: {
    titleKey: 'mcp.modeSelection.detailed.title',
    borderColor: 'var(--vscode-charts-blue)',
  },
  naturalLanguageParam: {
    titleKey: 'mcp.modeSelection.naturalLanguageParam.title',
    borderColor: 'var(--vscode-charts-orange)',
  },
  fullNaturalLanguage: {
    titleKey: 'mcp.modeSelection.fullNaturalLanguage.title',
    borderColor: 'var(--vscode-charts-green)',
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
        padding: '6px 12px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        borderRadius: '3px',
        borderLeft: `3px solid ${info.borderColor}`,
        fontSize: '12px',
        fontWeight: 'bold',
      }}
    >
      {/* Mode Name */}
      <span>{t(info.titleKey)}</span>
    </div>
  );
}
