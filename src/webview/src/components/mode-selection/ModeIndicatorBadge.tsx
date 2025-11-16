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
}

const MODE_INFO: Record<McpNodeMode, ModeInfo> = {
  detailed: {
    titleKey: 'mcp.modeSelection.detailed.title',
  },
  naturalLanguageParam: {
    titleKey: 'mcp.modeSelection.naturalLanguageParam.title',
  },
  fullNaturalLanguage: {
    titleKey: 'mcp.modeSelection.fullNaturalLanguage.title',
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
