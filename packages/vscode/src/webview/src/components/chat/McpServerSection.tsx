/**
 * MCP Server Section Component
 *
 * Collapsible section in the RefinementChatPanel for managing
 * the built-in MCP server that external AI agents can connect to.
 *
 * Features:
 * - One-click AI agent launch (auto start server + config + skill)
 * - Agent buttons always visible
 * - Stop Server link (visible only when running)
 * - Collapse state controlled by parent (radio-button exclusivity with Legacy section)
 */

import type { AiEditingProvider, McpServerStatusPayload } from '@shared/types/messages';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileInput,
  GraduationCap,
  type LucideIcon,
  Pencil,
  Plug,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useEnabledAiProviders } from '../../hooks/useEnabledAiProviders';
import { useTranslation } from '../../i18n/i18n-context';
import { vscode } from '../../main';
import {
  generateTour,
  importSkill,
  launchAiAgent,
  openExternalUrl,
} from '../../services/vscode-bridge';

/** Agent actions that can be run with the selected provider */
type AgentAction = 'edit' | 'import' | 'tour';

interface AgentActionDef {
  action: AgentAction;
  label: string;
  runningLabel: string;
  title: string;
  icon: LucideIcon;
}

const AGENT_ACTIONS: AgentActionDef[] = [
  {
    action: 'edit',
    label: 'AI Edit',
    runningLabel: 'Launching…',
    title: 'Create or edit this workflow with the selected AI agent',
    icon: Pencil,
  },
  {
    action: 'import',
    label: 'Import Skill → Workflow',
    runningLabel: 'Importing…',
    title: 'Import a published Agent Skill (SKILL.md) as a workflow on the canvas',
    icon: FileInput,
  },
  {
    action: 'tour',
    label: 'Generate Workflow Tour',
    runningLabel: 'Generating…',
    title: 'Generate a guided tour for the current workflow',
    icon: GraduationCap,
  },
];

interface McpServerSectionProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function McpServerSection({ isCollapsed, onToggleCollapse }: McpServerSectionProps) {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [port, setPort] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AiEditingProvider>('claude-code');
  const [runningAction, setRunningAction] = useState<AgentAction | null>(null);
  const [reviewBeforeApply, setReviewBeforeApply] = useState(true);
  const visibleButtons = useEnabledAiProviders();

  // Listen for MCP server status updates
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'MCP_SERVER_STATUS') {
        const payload = message.payload as McpServerStatusPayload;
        setIsRunning(payload.running);
        setPort(payload.port);
        setReviewBeforeApply(payload.reviewBeforeApply);
      }
    };

    window.addEventListener('message', handler);

    // Query current MCP server status on mount
    vscode.postMessage({ type: 'GET_MCP_SERVER_STATUS' });

    return () => window.removeEventListener('message', handler);
  }, []);

  // Keep the selected provider valid when the visible set changes (e.g. a
  // provider is toggled off). Falls back to the always-available Claude Code.
  useEffect(() => {
    if (!visibleButtons.some((b) => b.provider === selectedProvider)) {
      setSelectedProvider('claude-code');
    }
  }, [visibleButtons, selectedProvider]);

  const runAction = useCallback(
    async (action: AgentAction) => {
      if (runningAction) return;
      setRunningAction(action);
      try {
        if (action === 'edit') {
          await launchAiAgent(selectedProvider);
        } else if (action === 'import') {
          await importSkill(selectedProvider);
        } else {
          await generateTour(selectedProvider);
        }
      } catch {
        // Error is handled by the extension host
      } finally {
        setRunningAction(null);
      }
    },
    [runningAction, selectedProvider]
  );

  const handleStop = useCallback(() => {
    vscode.postMessage({ type: 'STOP_MCP_SERVER' });
  }, []);

  const handleReviewBeforeApplyChange = useCallback((checked: boolean) => {
    setReviewBeforeApply(checked);
    vscode.postMessage({ type: 'SET_REVIEW_BEFORE_APPLY', payload: { value: checked } });
  }, []);

  const ChevronIcon = isCollapsed ? ChevronRight : ChevronDown;

  return (
    <div
      style={{
        flex: isCollapsed ? undefined : 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggleCollapse}
        style={{
          width: '100%',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--vscode-foreground)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          opacity: 0.8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
      >
        <ChevronIcon size={12} />
        <Plug size={12} />
        <span>AI Edit: Native with MCP Server</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            openExternalUrl('https://github.com/breaking-brake/cc-wf-studio#edit-with-ai');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              openExternalUrl('https://github.com/breaking-brake/cc-wf-studio#edit-with-ai');
            }
          }}
          style={{
            display: 'inline-flex',
            cursor: 'pointer',
            color: 'var(--vscode-textLink-foreground)',
            opacity: 1,
          }}
          title="Open documentation"
        >
          <ExternalLink size={11} />
        </span>
        {isRunning && (
          <span
            style={{
              marginLeft: 'auto',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
              flexShrink: 0,
            }}
          />
        )}
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div style={{ flex: 1, padding: '4px 16px 12px' }}>
          {/* Description */}
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '11px',
              lineHeight: '1.5',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            {t('mcpSection.description.line1')}
            <br />
            {t('mcpSection.description.line2')}
          </p>

          {/* Review Before Apply Toggle */}
          <button
            type="button"
            onClick={() => handleReviewBeforeApplyChange(!reviewBeforeApply)}
            style={{
              width: '100%',
              padding: '8px 12px',
              marginBottom: '8px',
              fontSize: '11px',
              color: reviewBeforeApply
                ? 'var(--vscode-foreground)'
                : 'var(--vscode-disabledForeground)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              outline: 'none',
              borderRadius: '2px',
              backgroundColor: 'transparent',
              border: 'none',
            }}
          >
            <div
              style={{
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {reviewBeforeApply && <Check size={14} />}
            </div>
            <span>{t('mcpSection.reviewBeforeApply')}</span>
          </button>

          {/* Provider selector: pick one agent, then run an action below */}
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '10px',
                opacity: 0.7,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Agent
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {visibleButtons.map((button) => {
                const isSelected = selectedProvider === button.provider;
                return (
                  <button
                    key={button.provider}
                    type="button"
                    onClick={() => setSelectedProvider(button.provider)}
                    disabled={runningAction !== null}
                    aria-pressed={isSelected}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '12px',
                      cursor: runningAction !== null ? 'default' : 'pointer',
                      border: isSelected
                        ? '1px solid var(--vscode-focusBorder)'
                        : '1px solid var(--vscode-panel-border)',
                      backgroundColor: isSelected
                        ? 'var(--vscode-button-background)'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--vscode-button-foreground)'
                        : 'var(--vscode-foreground)',
                      opacity: runningAction !== null ? 0.6 : 1,
                    }}
                  >
                    {button.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons: run with the selected provider */}
          <div
            style={{
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {AGENT_ACTIONS.map((a) => {
              const Icon = a.icon;
              const isRunning = runningAction === a.action;
              return (
                <button
                  key={a.action}
                  type="button"
                  onClick={() => runAction(a.action)}
                  disabled={runningAction !== null}
                  title={a.title}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 8px',
                    fontSize: '11px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: runningAction !== null ? 'wait' : 'pointer',
                    opacity: runningAction !== null && !isRunning ? 0.6 : 1,
                  }}
                >
                  <Icon size={11} />
                  {isRunning ? a.runningLabel : a.label}
                </button>
              );
            })}
          </div>

          {/* Stop Server button (visible only when running) */}
          {isRunning && port && (
            <button
              type="button"
              onClick={handleStop}
              style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              <Square size={10} />
              {`Stop MCP Server (Port ${port})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
