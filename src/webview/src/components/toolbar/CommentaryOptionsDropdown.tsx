/**
 * Commentary Options Dropdown Component
 *
 * Provides commentary AI settings (provider, model, language) in a
 * compact dropdown, following the same pattern as SlashCommandOptionsDropdown.
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { CommentaryProvider, CopilotModel, CopilotModelInfo } from '@shared/types/messages';
import { Check, ChevronDown } from 'lucide-react';

const FONT_SIZES = {
  small: 11,
} as const;

const itemStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: `${FONT_SIZES.small}px`,
  color: 'var(--vscode-foreground)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  outline: 'none',
  borderRadius: '2px',
};

const labelStyle: React.CSSProperties = {
  padding: '6px 12px 2px',
  fontSize: '10px',
  color: 'var(--vscode-descriptionForeground)',
  fontWeight: 600,
};

const separatorStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: 'var(--vscode-panel-border)',
  margin: '4px 0',
};

interface CommentaryOptionsDropdownProps {
  provider: CommentaryProvider;
  onProviderChange: (provider: CommentaryProvider) => void;
  copilotModel: CopilotModel;
  onCopilotModelChange: (model: CopilotModel) => void;
  availableCopilotModels: CopilotModelInfo[];
  isFetchingModels: boolean;
  modelsError: string | null;
  onFetchModels: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
}

export function CommentaryOptionsDropdown({
  provider,
  onProviderChange,
  copilotModel,
  onCopilotModelChange,
  availableCopilotModels,
  isFetchingModels,
  modelsError,
  onFetchModels,
  language,
  onLanguageChange,
}: CommentaryOptionsDropdownProps) {
  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        if (
          open &&
          provider === 'copilot' &&
          availableCopilotModels.length === 0 &&
          !isFetchingModels
        ) {
          onFetchModels();
        }
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Commentary options"
          title="Commentary options"
          style={{
            padding: '3px 4px',
            backgroundColor: 'transparent',
            color: 'var(--vscode-descriptionForeground)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronDown size={12} />
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
            maxHeight: '300px',
            overflowY: 'auto',
            minWidth: '180px',
            padding: '4px',
          }}
        >
          {/* Provider Section */}
          <DropdownMenu.Label style={labelStyle}>Provider</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={provider}
            onValueChange={(value) => onProviderChange(value as CommentaryProvider)}
          >
            <DropdownMenu.RadioItem
              value="claude-code"
              style={itemStyle}
              onSelect={(e) => e.preventDefault()}
            >
              <span style={{ flex: 1 }}>Claude Code</span>
              {provider === 'claude-code' && <Check size={14} />}
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem
              value="copilot"
              style={itemStyle}
              onSelect={(e) => e.preventDefault()}
            >
              <span style={{ flex: 1 }}>Copilot</span>
              {provider === 'copilot' && <Check size={14} />}
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>

          {/* Language Section */}
          <DropdownMenu.Separator style={separatorStyle} />
          <DropdownMenu.Label style={labelStyle}>Language</DropdownMenu.Label>
          <div style={{ padding: '4px 12px 8px' }}>
            <input
              type="text"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              placeholder="English"
              style={{
                width: '100%',
                background: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '3px',
                fontSize: `${FONT_SIZES.small}px`,
                padding: '4px 8px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Copilot Model Section (only when copilot provider) */}
          {provider === 'copilot' && (
            <>
              <DropdownMenu.Separator style={separatorStyle} />
              <DropdownMenu.Label style={labelStyle}>Model</DropdownMenu.Label>
              {isFetchingModels ? (
                <div
                  style={{
                    ...itemStyle,
                    cursor: 'default',
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  Loading...
                </div>
              ) : modelsError ? (
                <div
                  style={{
                    ...itemStyle,
                    cursor: 'default',
                    color: 'var(--vscode-errorForeground)',
                  }}
                >
                  {modelsError}
                </div>
              ) : availableCopilotModels.length === 0 ? (
                <div
                  style={{
                    ...itemStyle,
                    cursor: 'default',
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  No models available
                </div>
              ) : (
                <DropdownMenu.RadioGroup
                  value={copilotModel}
                  onValueChange={(value) => onCopilotModelChange(value)}
                >
                  {availableCopilotModels.map((model) => (
                    <DropdownMenu.RadioItem
                      key={model.id}
                      value={model.family}
                      style={itemStyle}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span style={{ flex: 1 }}>{model.name}</span>
                      {copilotModel === model.family && <Check size={14} />}
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              )}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
