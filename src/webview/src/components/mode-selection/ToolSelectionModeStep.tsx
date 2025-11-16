/**
 * Tool Selection Mode Step Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Let user choose how to select MCP tool (manual vs AI-assisted)
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T012
 */

import { useTranslation } from '../../i18n/i18n-context';

export type ToolSelectionMode = 'manual' | 'auto';

interface ToolSelectionModeStepProps {
  selectedMode: ToolSelectionMode;
  onModeChange: (mode: ToolSelectionMode) => void;
}

interface ModeOption {
  mode: ToolSelectionMode;
  icon: string;
  titleKey: 'mcp.toolSelectionMode.manual.title' | 'mcp.toolSelectionMode.auto.title';
  descriptionKey:
    | 'mcp.toolSelectionMode.manual.description'
    | 'mcp.toolSelectionMode.auto.description';
}

export function ToolSelectionModeStep({ selectedMode, onModeChange }: ToolSelectionModeStepProps) {
  const { t } = useTranslation();

  const modeOptions: ModeOption[] = [
    {
      mode: 'manual',
      icon: '🔍',
      titleKey: 'mcp.toolSelectionMode.manual.title',
      descriptionKey: 'mcp.toolSelectionMode.manual.description',
    },
    {
      mode: 'auto',
      icon: '🤖',
      titleKey: 'mcp.toolSelectionMode.auto.title',
      descriptionKey: 'mcp.toolSelectionMode.auto.description',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            margin: 0,
            marginBottom: '8px',
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('mcp.toolSelectionMode.title')}
        </h2>
        <p
          style={{
            fontSize: '13px',
            margin: 0,
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('mcp.toolSelectionMode.subtitle')}
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div role="radiogroup" aria-label={t('mcp.toolSelectionMode.title')}>
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
                alignItems: 'flex-start',
                gap: '16px',
                width: '100%',
                padding: '16px',
                marginBottom: '12px',
                backgroundColor: isSelected
                  ? 'var(--vscode-list-activeSelectionBackground)'
                  : 'var(--vscode-editor-background)',
                border: `2px solid ${
                  isSelected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'
                }`,
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                  e.currentTarget.style.borderColor = 'var(--vscode-focusBorder)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-editor-background)';
                  e.currentTarget.style.borderColor = 'var(--vscode-panel-border)';
                }
              }}
            >
              {/* Icon */}
              <div style={{ fontSize: '32px', lineHeight: 1 }}>{option.icon}</div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  {t(option.titleKey)}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  {t(option.descriptionKey)}
                </div>
              </div>

              {/* Selection indicator */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${
                    isSelected ? 'var(--vscode-focusBorder)' : 'var(--vscode-descriptionForeground)'
                  }`,
                  backgroundColor: isSelected ? 'var(--vscode-focusBorder)' : 'transparent',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--vscode-editor-background)',
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
