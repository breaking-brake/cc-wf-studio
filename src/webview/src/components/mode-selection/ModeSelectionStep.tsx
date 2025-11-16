/**
 * Mode Selection Step Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Allow users to select MCP node configuration mode
 *
 * Based on: specs/001-mcp-natural-language-mode/extension-points.md Section 2.2
 * Task: T012
 */

import type { McpNodeMode } from '@shared/types/mcp-node';
import { useTranslation } from '../../i18n/i18n-context';

interface ModeSelectionStepProps {
  selectedMode: McpNodeMode;
  onModeChange: (mode: McpNodeMode) => void;
}

interface ModeOption {
  mode: McpNodeMode;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

export function ModeSelectionStep({ selectedMode, onModeChange }: ModeSelectionStepProps) {
  const { t } = useTranslation();

  const modeOptions: ModeOption[] = [
    {
      mode: 'detailed',
      icon: '⚙️',
      titleKey: 'mcp.modeSelection.detailed.title',
      descriptionKey: 'mcp.modeSelection.detailed.description',
    },
    {
      mode: 'naturalLanguageParam',
      icon: '◐',
      titleKey: 'mcp.modeSelection.naturalLanguageParam.title',
      descriptionKey: 'mcp.modeSelection.naturalLanguageParam.description',
    },
    {
      mode: 'fullNaturalLanguage',
      icon: '●',
      titleKey: 'mcp.modeSelection.fullNaturalLanguage.title',
      descriptionKey: 'mcp.modeSelection.fullNaturalLanguage.description',
    },
  ];

  return (
    <div>
      {/* Title and Subtitle */}
      <div
        style={{
          marginBottom: '24px',
        }}
      >
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            margin: 0,
            marginBottom: '8px',
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('mcp.modeSelection.title')}
        </h2>
        <p
          style={{
            fontSize: '13px',
            margin: 0,
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('mcp.modeSelection.subtitle')}
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div
        role="radiogroup"
        aria-label={t('mcp.modeSelection.title')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {modeOptions.map((option) => {
          const isSelected = selectedMode === option.mode;

          return (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onModeChange(option.mode)}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                backgroundColor: isSelected
                  ? 'var(--vscode-list-activeSelectionBackground)'
                  : 'var(--vscode-editor-inactiveSelectionBackground)',
                border: isSelected
                  ? '2px solid var(--vscode-focusBorder)'
                  : '1px solid var(--vscode-panel-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor =
                    'var(--vscode-list-hoverBackground)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor =
                    'var(--vscode-editor-inactiveSelectionBackground)';
                }
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--vscode-focusBorder)';
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              {/* Icon */}
              <div
                style={{
                  fontSize: '32px',
                  lineHeight: '32px',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {option.icon}
              </div>

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: isSelected
                      ? 'var(--vscode-list-activeSelectionForeground)'
                      : 'var(--vscode-foreground)',
                  }}
                >
                  {t(option.titleKey)}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: isSelected
                      ? 'var(--vscode-list-activeSelectionForeground)'
                      : 'var(--vscode-descriptionForeground)',
                  }}
                >
                  {t(option.descriptionKey)}
                </div>
              </div>

              {/* Selection Indicator */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: isSelected
                    ? 'var(--vscode-focusBorder)'
                    : 'var(--vscode-panel-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  alignSelf: 'center',
                }}
                aria-hidden="true"
              >
                {isSelected && (
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--vscode-focusBorder)',
                    }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
