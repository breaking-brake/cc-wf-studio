/**
 * Slash Command Options Dropdown Component
 *
 * Provides options for Slash Command export (Export/Run):
 * - model: Specify the model to use for execution (inherit/sonnet/opus/haiku)
 * - context: fork - Exports with `context: fork` for isolated sub-agent execution (Claude Code v2.1.0+)
 * - hooks: Configure execution hooks (PreToolUse, PostToolUse, Stop)
 * - allowedTools: Configure allowed tools for Slash Command execution
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type {
  HookEntry,
  HookType,
  SlashCommandContext,
  SlashCommandModel,
  WorkflowHooks,
} from '@shared/types/workflow-definition';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Cpu,
  ExternalLink,
  FileQuestion,
  GitFork,
  Plus,
  RotateCcw,
  Shield,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';
import { openExternalUrl } from '../../services/vscode-bridge';
import { AVAILABLE_TOOLS } from '../../stores/refinement-store';
import { ArgumentHintTagInput } from '../common/ArgumentHintTagInput';
import { ToolSelectTagInput } from '../common/ToolSelectTagInput';

// Fixed font sizes for dropdown menu (not responsive)
const FONT_SIZES = {
  small: 11,
} as const;

const CONTEXT_PRESETS: { value: SlashCommandContext; label: string }[] = [
  { value: 'default', label: 'default' },
  { value: 'fork', label: 'fork' },
];

const MODEL_PRESETS: { value: SlashCommandModel; label: string }[] = [
  { value: 'default', label: 'default' },
  { value: 'inherit', label: 'inherit' },
  { value: 'haiku', label: 'haiku' },
  { value: 'sonnet', label: 'sonnet' },
  { value: 'opus', label: 'opus' },
];

const HOOK_TYPES: {
  type: HookType;
  labelKey: keyof WebviewTranslationKeys;
  /** Whether to show matcher field (only applicable for tool-based hooks) */
  showMatcher: boolean;
}[] = [
  {
    type: 'PreToolUse',
    labelKey: 'hooks.preToolUse',
    showMatcher: true, // Tool-based hook - matcher applies
  },
  {
    type: 'PostToolUse',
    labelKey: 'hooks.postToolUse',
    showMatcher: true, // Tool-based hook - matcher applies
  },
  {
    type: 'Stop',
    labelKey: 'hooks.stop',
    showMatcher: false, // Lifecycle hook - matcher is ignored
  },
];

// Default allowed tools for Slash Command (empty = no allowed-tools output, uses Claude Code default)
const DEFAULT_ALLOWED_TOOLS = '';

// Helper functions for allowed tools conversion
const allowedToolsToArray = (tools: string): string[] =>
  tools
    ? tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

const arrayToAllowedTools = (tools: string[]): string => tools.join(',');

// Helper functions for matcher ↔ tags conversion
const matcherToTags = (matcher: string): string[] =>
  matcher ? matcher.split('|').filter(Boolean) : [];

const tagsToMatcher = (tags: string[]): string => tags.join('|');

/**
 * Stop arrow key propagation to prevent Radix UI submenu navigation
 * from interfering with text input cursor movement
 */
const stopArrowKeyPropagation = (e: React.KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.stopPropagation();
  }
};

interface SlashCommandOptionsDropdownProps {
  context: SlashCommandContext;
  onContextChange: (context: SlashCommandContext) => void;
  model: SlashCommandModel;
  onModelChange: (model: SlashCommandModel) => void;
  hooks: WorkflowHooks;
  onAddHookEntry: (hookType: HookType, matcher: string, command: string, once?: boolean) => void;
  onRemoveHookEntry: (hookType: HookType, entryIndex: number) => void;
  onUpdateHookEntry: (hookType: HookType, entryIndex: number, entry: Partial<HookEntry>) => void;
  allowedTools: string;
  onAllowedToolsChange: (tools: string) => void;
  disableModelInvocation: boolean;
  onDisableModelInvocationChange: (value: boolean) => void;
  argumentHint: string;
  onArgumentHintChange: (hint: string) => void;
}

interface NewEntryState {
  matcher: string;
  command: string;
  once: boolean;
}

export function SlashCommandOptionsDropdown({
  context,
  onContextChange,
  model,
  onModelChange,
  hooks,
  onAddHookEntry,
  onRemoveHookEntry,
  onUpdateHookEntry,
  allowedTools,
  onAllowedToolsChange,
  disableModelInvocation,
  onDisableModelInvocationChange,
  argumentHint,
  onArgumentHintChange,
}: SlashCommandOptionsDropdownProps) {
  const { t } = useTranslation();
  const [newEntry, setNewEntry] = useState<Record<HookType, NewEntryState>>({
    PreToolUse: { matcher: '', command: '', once: false },
    PostToolUse: { matcher: '', command: '', once: false },
    Stop: { matcher: '', command: '', once: false },
  });
  const [validationError, setValidationError] = useState<Record<HookType, string | null>>({
    PreToolUse: null,
    PostToolUse: null,
    Stop: null,
  });

  const currentContextLabel = CONTEXT_PRESETS.find((p) => p.value === context)?.label || 'default';
  const currentModelLabel = MODEL_PRESETS.find((p) => p.value === model)?.label || 'default';
  const totalHookEntries = Object.values(hooks).reduce(
    (sum, entries) => sum + (entries?.length || 0),
    0
  );
  const selectedTools = allowedToolsToArray(allowedTools);

  // Toggle a tool in the allowed tools list
  const handleToggleTool = useCallback(
    (tool: string) => {
      const currentTools = allowedToolsToArray(allowedTools);
      if (currentTools.includes(tool)) {
        onAllowedToolsChange(arrayToAllowedTools(currentTools.filter((t) => t !== tool)));
      } else {
        onAllowedToolsChange(arrayToAllowedTools([...currentTools, tool]));
      }
    },
    [allowedTools, onAllowedToolsChange]
  );

  // Reset to default allowed tools
  const handleResetAllowedTools = useCallback(() => {
    onAllowedToolsChange(DEFAULT_ALLOWED_TOOLS);
  }, [onAllowedToolsChange]);

  const handleAddEntry = useCallback(
    (hookType: HookType) => {
      const entry = newEntry[hookType];
      const command = entry.command.trim();
      const matcher = entry.matcher.trim();

      if (!command) {
        setValidationError((prev) => ({
          ...prev,
          [hookType]: t('hooks.validation.commandRequired'),
        }));
        return;
      }

      // Clear error and add entry
      setValidationError((prev) => ({ ...prev, [hookType]: null }));
      onAddHookEntry(hookType, matcher, command, entry.once || undefined);
      setNewEntry((prev) => ({
        ...prev,
        [hookType]: { matcher: '', command: '', once: false },
      }));
    },
    [newEntry, onAddHookEntry, t]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, hookType: HookType) => {
      // Skip if IME is composing (e.g., Japanese/Chinese/Korean input)
      if (e.nativeEvent.isComposing) {
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAddEntry(hookType);
      }
    },
    [handleAddEntry]
  );

  // Stable callback for new entry changes to prevent focus loss
  const handleNewEntryChange = useCallback(
    (hookType: HookType, updates: Partial<NewEntryState>) => {
      setNewEntry((prev) => ({
        ...prev,
        [hookType]: { ...prev[hookType], ...updates },
      }));
      // Clear validation error when user starts typing command
      if (updates.command !== undefined) {
        setValidationError((prev) => ({ ...prev, [hookType]: null }));
      }
    },
    []
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          style={{
            padding: '4px 6px',
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronDown size={14} />
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
            minWidth: '200px',
            padding: '4px',
          }}
        >
          {/* Allowed Tools Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} />
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  {selectedTools.length > 0 ? `${selectedTools.length} tools` : 'default'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={14} />
                <span>Allowed Tools</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                collisionPadding={{ right: 300 }}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '180px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '4px',
                }}
              >
                {/* Tool Checkboxes */}
                {AVAILABLE_TOOLS.map((tool) => (
                  <DropdownMenu.CheckboxItem
                    key={tool}
                    checked={selectedTools.includes(tool)}
                    onSelect={(event) => {
                      event.preventDefault();
                      handleToggleTool(tool);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: `${FONT_SIZES.small}px`,
                      color: 'var(--vscode-foreground)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      outline: 'none',
                      borderRadius: '2px',
                      position: 'relative',
                      paddingLeft: '28px',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '8px',
                        width: '12px',
                        height: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DropdownMenu.ItemIndicator>
                        <Check size={12} />
                      </DropdownMenu.ItemIndicator>
                    </div>
                    <span style={{ fontFamily: 'monospace' }}>{tool}</span>
                  </DropdownMenu.CheckboxItem>
                ))}

                <DropdownMenu.Separator
                  style={{
                    height: '1px',
                    backgroundColor: 'var(--vscode-dropdown-border)',
                    margin: '4px 0',
                  }}
                />

                {/* Reset to Default */}
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    handleResetAllowedTools();
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: `${FONT_SIZES.small}px`,
                    color: 'var(--vscode-foreground)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    outline: 'none',
                    borderRadius: '2px',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset to Default</span>
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-dropdown-border)',
              margin: '4px 0',
            }}
          />

          {/* Argument Hint Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                <ChevronLeft size={14} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    color: 'var(--vscode-descriptionForeground)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {argumentHint || 'none'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileQuestion size={14} />
                <span>Argument Hint</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                collisionPadding={{ right: 300 }}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '320px',
                  padding: '4px',
                }}
              >
                <ArgumentHintTagInput value={argumentHint} onChange={onArgumentHintChange} />
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-dropdown-border)',
              margin: '4px 0',
            }}
          />

          {/* Context Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} />
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  {currentContextLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitFork size={14} />
                <span>Context</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                collisionPadding={{ right: 300 }}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '180px',
                  padding: '4px',
                }}
              >
                <DropdownMenu.RadioGroup value={context}>
                  {CONTEXT_PRESETS.map((preset) => (
                    <DropdownMenu.RadioItem
                      key={preset.value}
                      value={preset.value}
                      onSelect={(event) => {
                        event.preventDefault();
                        onContextChange(preset.value);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: `${FONT_SIZES.small}px`,
                        color: 'var(--vscode-foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        outline: 'none',
                        borderRadius: '2px',
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <DropdownMenu.ItemIndicator>
                          <Check size={12} />
                        </DropdownMenu.ItemIndicator>
                      </div>
                      <span>{preset.label}</span>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-dropdown-border)',
              margin: '4px 0',
            }}
          />

          {/* Model Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} />
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  {currentModelLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={14} />
                <span>Model</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                collisionPadding={{ right: 300 }}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '180px',
                  padding: '4px',
                }}
              >
                <DropdownMenu.RadioGroup value={model}>
                  {MODEL_PRESETS.map((preset) => (
                    <DropdownMenu.RadioItem
                      key={preset.value}
                      value={preset.value}
                      onSelect={(event) => {
                        event.preventDefault();
                        onModelChange(preset.value);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: `${FONT_SIZES.small}px`,
                        color: 'var(--vscode-foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        outline: 'none',
                        borderRadius: '2px',
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <DropdownMenu.ItemIndicator>
                          <Check size={12} />
                        </DropdownMenu.ItemIndicator>
                      </div>
                      <span>{preset.label}</span>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-dropdown-border)',
              margin: '4px 0',
            }}
          />

          {/* Disable Model Invocation Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} />
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  {disableModelInvocation ? 'true' : 'default'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} />
                <span>Disable Model Invocation</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                collisionPadding={{ right: 300 }}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '180px',
                  padding: '4px',
                }}
              >
                <DropdownMenu.RadioGroup value={disableModelInvocation ? 'true' : 'default'}>
                  <DropdownMenu.RadioItem
                    value="default"
                    onSelect={(event) => {
                      event.preventDefault();
                      onDisableModelInvocationChange(false);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: `${FONT_SIZES.small}px`,
                      color: 'var(--vscode-foreground)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      outline: 'none',
                      borderRadius: '2px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DropdownMenu.ItemIndicator>
                        <Check size={12} />
                      </DropdownMenu.ItemIndicator>
                    </div>
                    <span>default</span>
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem
                    value="true"
                    onSelect={(event) => {
                      event.preventDefault();
                      onDisableModelInvocationChange(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: `${FONT_SIZES.small}px`,
                      color: 'var(--vscode-foreground)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      outline: 'none',
                      borderRadius: '2px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DropdownMenu.ItemIndicator>
                        <Check size={12} />
                      </DropdownMenu.ItemIndicator>
                    </div>
                    <span>true</span>
                  </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-dropdown-border)',
              margin: '4px 0',
            }}
          />

          {/* Hooks Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              style={{
                padding: '8px 12px',
                fontSize: `${FONT_SIZES.small}px`,
                color: 'var(--vscode-foreground)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                outline: 'none',
                borderRadius: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={14} />
                <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  {totalHookEntries > 0 ? `${totalHookEntries} hooks` : 'none'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} />
                <span>{t('hooks.title')}</span>
              </div>
            </DropdownMenu.SubTrigger>

            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                collisionPadding={{ right: 300 }}
                style={{
                  backgroundColor: 'var(--vscode-dropdown-background)',
                  border: '1px solid var(--vscode-dropdown-border)',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                  zIndex: 10000,
                  minWidth: '220px',
                  padding: '4px',
                }}
              >
                {/* Hook Types */}
                {HOOK_TYPES.map((hookConfig, index) => (
                  <div key={hookConfig.type}>
                    {index > 0 && (
                      <DropdownMenu.Separator
                        style={{
                          height: '1px',
                          backgroundColor: 'var(--vscode-dropdown-border)',
                          margin: '4px 0',
                        }}
                      />
                    )}
                    <HookTypeSubMenu
                      hookType={hookConfig.type}
                      labelKey={hookConfig.labelKey}
                      showMatcher={hookConfig.showMatcher}
                      entries={hooks[hookConfig.type] || []}
                      newEntry={newEntry[hookConfig.type]}
                      validationError={validationError[hookConfig.type]}
                      onNewEntryChange={(updates) => handleNewEntryChange(hookConfig.type, updates)}
                      onAddEntry={() => handleAddEntry(hookConfig.type)}
                      onRemoveEntry={(idx) => onRemoveHookEntry(hookConfig.type, idx)}
                      onUpdateEntry={(idx, entry) => onUpdateHookEntry(hookConfig.type, idx, entry)}
                      onKeyDown={(e) => handleKeyDown(e, hookConfig.type)}
                    />
                  </div>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-dropdown-border)',
              margin: '4px 0',
            }}
          />

          {/* Frontmatter Reference Link */}
          <DropdownMenu.Item
            onSelect={() => {
              openExternalUrl(t('toolbar.slashCommandOptions.frontmatterReferenceUrl'));
            }}
            style={{
              padding: '8px 12px',
              fontSize: `${FONT_SIZES.small}px`,
              color: 'var(--vscode-textLink-foreground)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              outline: 'none',
              borderRadius: '2px',
            }}
          >
            <ExternalLink size={14} />
            <span>Frontmatter Reference</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Hook Type Sub-menu Component
interface HookTypeSubMenuProps {
  hookType: HookType;
  labelKey: keyof WebviewTranslationKeys;
  /** Whether to show matcher field (only for tool-based hooks) */
  showMatcher: boolean;
  entries: HookEntry[];
  newEntry: NewEntryState;
  validationError: string | null;
  onNewEntryChange: (updates: Partial<NewEntryState>) => void;
  onAddEntry: () => void;
  onRemoveEntry: (index: number) => void;
  onUpdateEntry: (index: number, entry: Partial<HookEntry>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const HookTypeSubMenu = memo(function HookTypeSubMenu({
  hookType: _hookType,
  labelKey,
  showMatcher,
  entries,
  newEntry,
  validationError,
  onNewEntryChange,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntry,
  onKeyDown,
}: HookTypeSubMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger
        style={{
          padding: '8px 12px',
          fontSize: `${FONT_SIZES.small}px`,
          color: 'var(--vscode-foreground)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          outline: 'none',
          borderRadius: '2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ChevronLeft size={14} />
          <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
            {entries.length > 0 ? `${entries.length} hooks` : 'none'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} />
          <span>{t(labelKey)}</span>
        </div>
      </DropdownMenu.SubTrigger>

      <DropdownMenu.Portal>
        <DropdownMenu.SubContent
          sideOffset={4}
          collisionPadding={{ right: 300 }}
          style={{
            backgroundColor: 'var(--vscode-dropdown-background)',
            border: '1px solid var(--vscode-dropdown-border)',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 10001,
            minWidth: '350px',
            maxWidth: '450px',
            padding: '8px',
          }}
        >
          {/* Existing Entries */}
          {entries.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {entries.map((entry, index) => {
                // Use index as key since HookEntry doesn't have a unique ID field
                const stableKey = `hook-entry-${index}`;
                return (
                  <div
                    key={stableKey}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '8px',
                      padding: '6px',
                      paddingRight: '24px',
                      backgroundColor: 'var(--vscode-editor-background)',
                      borderRadius: '4px',
                      border: '1px solid var(--vscode-panel-border)',
                    }}
                  >
                    {/* Delete button (top-right) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveEntry(index);
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      title={t('hooks.removeEntry')}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        padding: '2px',
                        backgroundColor: 'transparent',
                        color: 'var(--vscode-descriptionForeground)',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.color = 'var(--vscode-errorForeground)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.color = 'var(--vscode-descriptionForeground)';
                      }}
                    >
                      <X size={14} />
                    </button>
                    {/* Matcher row (only for tool-based hooks) */}
                    {showMatcher && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--vscode-descriptionForeground)',
                            minWidth: '55px',
                          }}
                        >
                          matcher:
                        </span>
                        <div style={{ flex: 1 }}>
                          <ToolSelectTagInput
                            selectedTools={matcherToTags(entry.matcher || '')}
                            onChange={(tools) =>
                              onUpdateEntry(index, { ...entry, matcher: tagsToMatcher(tools) })
                            }
                          />
                        </div>
                      </div>
                    )}
                    {/* Command row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--vscode-descriptionForeground)',
                          minWidth: '55px',
                        }}
                      >
                        command<span style={{ color: 'var(--vscode-errorForeground)' }}>*</span>:
                      </span>
                      <input
                        type="text"
                        value={entry.hooks[0]?.command || ''}
                        onChange={(e) =>
                          onUpdateEntry(index, {
                            ...entry,
                            hooks: [{ ...entry.hooks[0], command: e.target.value }],
                          })
                        }
                        onKeyDown={stopArrowKeyPropagation}
                        style={{
                          flex: 1,
                          padding: '2px 6px',
                          fontSize: '11px',
                          backgroundColor: 'var(--vscode-input-background)',
                          color: 'var(--vscode-input-foreground)',
                          border: '1px solid var(--vscode-input-border)',
                          borderRadius: '2px',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                    {/* Once checkbox row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--vscode-descriptionForeground)',
                          minWidth: '50px',
                        }}
                      >
                        once:
                      </span>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          color: 'var(--vscode-descriptionForeground)',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={entry.hooks[0]?.once || false}
                          onChange={(e) =>
                            onUpdateEntry(index, {
                              ...entry,
                              hooks: [{ ...entry.hooks[0], once: e.target.checked || undefined }],
                            })
                          }
                          style={{ cursor: 'pointer' }}
                        />
                        {t('hooks.once.description')}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add New Entry */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '6px',
              backgroundColor: 'var(--vscode-editor-background)',
              borderRadius: '4px',
              border: '1px dashed var(--vscode-panel-border)',
            }}
          >
            {/* Matcher row (only for tool-based hooks) */}
            {showMatcher && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    minWidth: '55px',
                  }}
                >
                  matcher:
                </span>
                <div style={{ flex: 1 }}>
                  <ToolSelectTagInput
                    selectedTools={matcherToTags(newEntry.matcher)}
                    onChange={(tools) => onNewEntryChange({ matcher: tagsToMatcher(tools) })}
                  />
                </div>
              </div>
            )}
            {/* Command row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--vscode-descriptionForeground)',
                  minWidth: '55px',
                }}
              >
                command<span style={{ color: 'var(--vscode-errorForeground)' }}>*</span>:
              </span>
              <input
                type="text"
                value={newEntry.command}
                onChange={(e) => onNewEntryChange({ command: e.target.value })}
                onKeyDown={(e) => {
                  stopArrowKeyPropagation(e);
                  onKeyDown(e);
                }}
                placeholder="e.g., npm run lint"
                style={{
                  flex: 1,
                  padding: '2px 6px',
                  fontSize: '11px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            {/* Once checkbox row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--vscode-descriptionForeground)',
                  minWidth: '50px',
                }}
              >
                once:
              </span>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: 'var(--vscode-descriptionForeground)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={newEntry.once}
                  onChange={(e) => onNewEntryChange({ once: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                {t('hooks.once.description')}
              </label>
            </div>
            {/* Validation error */}
            {validationError && (
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--vscode-errorForeground)',
                  marginTop: '2px',
                }}
              >
                {validationError}
              </div>
            )}
            {/* Add button row */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddEntry();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '4px 8px',
                marginTop: '4px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '11px',
                width: '100%',
              }}
            >
              <Plus size={14} />
              {t('hooks.addEntry')}
            </button>
          </div>
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
});
