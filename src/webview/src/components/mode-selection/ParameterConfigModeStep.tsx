/**
 * Parameter Config Mode Step Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Let user choose how to configure MCP tool parameters (manual vs AI-assisted)
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T013
 */

import type { ParameterConfigMode } from '@shared/types/mcp-node';
import { useTranslation } from '../../i18n/i18n-context';

interface ParameterConfigModeStepProps {
  selectedMode: ParameterConfigMode;
  onModeChange: (mode: ParameterConfigMode) => void;
}

interface ModeOption {
  mode: ParameterConfigMode;
  titleKey: 'mcp.parameterConfigMode.manual.title' | 'mcp.parameterConfigMode.auto.title';
  descriptionKey:
    | 'mcp.parameterConfigMode.manual.description'
    | 'mcp.parameterConfigMode.auto.description';
}

/**
 * Parameter Config Mode Step Component
 *
 * Displays two-choice card UI for selecting parameter configuration mode.
 * User can choose between manual parameter configuration or AI-assisted configuration.
 *
 * @param props - Component props
 * @param props.selectedMode - Currently selected parameter config mode
 * @param props.onModeChange - Callback when user selects a mode
 */
export function ParameterConfigModeStep({
  selectedMode,
  onModeChange,
}: ParameterConfigModeStepProps) {
  const { t } = useTranslation();

  const modeOptions: ModeOption[] = [
    {
      mode: 'auto',
      titleKey: 'mcp.parameterConfigMode.auto.title',
      descriptionKey: 'mcp.parameterConfigMode.auto.description',
    },
    {
      mode: 'manual',
      titleKey: 'mcp.parameterConfigMode.manual.title',
      descriptionKey: 'mcp.parameterConfigMode.manual.description',
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
          {t('mcp.parameterConfigMode.title')}
        </h2>
        <p
          style={{
            fontSize: '13px',
            margin: 0,
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('mcp.parameterConfigMode.subtitle')}
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div role="radiogroup" aria-label={t('mcp.parameterConfigMode.title')}>
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
