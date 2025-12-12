/**
 * ColorPicker Component
 *
 * Reusable color picker using Radix UI Select with color preview.
 * Used by SubAgent and SubAgentFlow nodes.
 */

import * as Select from '@radix-ui/react-select';
import { SUB_AGENT_COLORS } from '@shared/types/workflow-definition';
import type React from 'react';
import { useTranslation } from '../../i18n/i18n-context';

export type SubAgentColor = keyof typeof SUB_AGENT_COLORS;

export interface ColorPickerProps {
  value: SubAgentColor | undefined;
  onChange: (color: SubAgentColor | undefined) => void;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, disabled = false }) => {
  const { t } = useTranslation();

  return (
    <div>
      <label
        htmlFor="color-select"
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--vscode-foreground)',
          marginBottom: '6px',
        }}
      >
        {t('properties.subAgent.color')}
      </label>
      <Select.Root
        value={value || 'none'}
        onValueChange={(val) => onChange(val === 'none' ? undefined : (val as SubAgentColor))}
        disabled={disabled}
      >
        <Select.Trigger
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Select.Value placeholder={t('properties.subAgent.colorPlaceholder')}>
            {value && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    backgroundColor: SUB_AGENT_COLORS[value],
                    borderRadius: '2px',
                  }}
                />
                <span style={{ textTransform: 'capitalize' }}>{value}</span>
              </div>
            )}
          </Select.Value>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            style={{
              backgroundColor: 'var(--vscode-dropdown-background)',
              border: '1px solid var(--vscode-dropdown-border)',
              borderRadius: '2px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 9999,
              minWidth: '200px',
            }}
          >
            <Select.Viewport style={{ padding: '4px' }}>
              <Select.Item
                value="none"
                style={{
                  padding: '6px 8px',
                  fontSize: '13px',
                  color: 'var(--vscode-foreground)',
                  cursor: 'pointer',
                  outline: 'none',
                  borderRadius: '2px',
                }}
              >
                <Select.ItemText>{t('properties.subAgent.colorNone')}</Select.ItemText>
              </Select.Item>
              {(Object.keys(SUB_AGENT_COLORS) as SubAgentColor[]).map((colorKey) => (
                <Select.Item
                  key={colorKey}
                  value={colorKey}
                  style={{
                    padding: '6px 8px',
                    fontSize: '13px',
                    color: 'var(--vscode-foreground)',
                    cursor: 'pointer',
                    outline: 'none',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: SUB_AGENT_COLORS[colorKey],
                      borderRadius: '2px',
                    }}
                  />
                  <Select.ItemText>
                    <span style={{ textTransform: 'capitalize' }}>{colorKey}</span>
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <div
        style={{
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          marginTop: '4px',
        }}
      >
        {t('properties.subAgent.colorHelp')}
      </div>
    </div>
  );
};
