/**
 * MCP Mode Selection Step Component
 *
 * Purpose: Let user directly choose one of 3 MCP node modes
 * (aiToolSelection / aiParameterConfig / manualParameterConfig)
 *
 * Replaces the previous two-step ToolSelectionModeStep + ParameterConfigModeStep flow.
 */

import type { McpNodeMode } from '@shared/types/mcp-node';
import { useTranslation } from '../../i18n/i18n-context';

interface McpModeSelectionStepProps {
  selectedMode: McpNodeMode;
  onModeChange: (mode: McpNodeMode) => void;
}

interface ModeOption {
  mode: McpNodeMode;
  titleKey:
    | 'mcp.modeSelection.aiToolSelection.title'
    | 'mcp.modeSelection.aiParameterConfig.title'
    | 'mcp.modeSelection.manualParameterConfig.title';
  descriptionKey:
    | 'mcp.modeSelection.aiToolSelection.description'
    | 'mcp.modeSelection.aiParameterConfig.description'
    | 'mcp.modeSelection.manualParameterConfig.description';
}

export function McpModeSelectionStep({ selectedMode, onModeChange }: McpModeSelectionStepProps) {
  const { t } = useTranslation();

  const modeOptions: ModeOption[] = [
    {
      mode: 'aiToolSelection',
      titleKey: 'mcp.modeSelection.aiToolSelection.title',
      descriptionKey: 'mcp.modeSelection.aiToolSelection.description',
    },
    {
      mode: 'aiParameterConfig',
      titleKey: 'mcp.modeSelection.aiParameterConfig.title',
      descriptionKey: 'mcp.modeSelection.aiParameterConfig.description',
    },
    {
      mode: 'manualParameterConfig',
      titleKey: 'mcp.modeSelection.manualParameterConfig.title',
      descriptionKey: 'mcp.modeSelection.manualParameterConfig.description',
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
      <div role="radiogroup" aria-label={t('mcp.modeSelection.title')}>
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
