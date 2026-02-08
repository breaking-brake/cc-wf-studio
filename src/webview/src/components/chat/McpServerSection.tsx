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
import { ChevronDown, ChevronRight, ExternalLink, Play, Plug, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { vscode } from '../../main';
import { launchAiAgent, openExternalUrl } from '../../services/vscode-bridge';
import { useRefinementStore } from '../../stores/refinement-store';

interface AiEditButton {
  provider: AiEditingProvider;
  label: string;
}

const AI_EDIT_BUTTONS: AiEditButton[] = [
  { provider: 'claude-code', label: 'Claude Code' },
  { provider: 'copilot-cli', label: 'Copilot CLI' },
  { provider: 'copilot-vscode', label: 'VSCode Copilot' },
  { provider: 'codex', label: 'Codex CLI' },
  { provider: 'roo-code', label: 'Roo Code' },
];

interface McpServerSectionProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function McpServerSection({ isCollapsed, onToggleCollapse }: McpServerSectionProps) {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [port, setPort] = useState<number | null>(null);
  const [launchingProvider, setLaunchingProvider] = useState<AiEditingProvider | null>(null);

  const { isCopilotEnabled, isCodexEnabled, isRooCodeEnabled } = useRefinementStore();

  const visibleButtons = useMemo(() => {
    return AI_EDIT_BUTTONS.filter((button) => {
      switch (button.provider) {
        case 'claude-code':
          return true;
        case 'copilot-cli':
        case 'copilot-vscode':
          return isCopilotEnabled;
        case 'codex':
          return isCodexEnabled;
        case 'roo-code':
          return isRooCodeEnabled;
        default:
          return false;
      }
    });
  }, [isCopilotEnabled, isCodexEnabled, isRooCodeEnabled]);

  // Listen for MCP server status updates
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'MCP_SERVER_STATUS') {
        const payload = message.payload as McpServerStatusPayload;
        setIsRunning(payload.running);
        setPort(payload.port);
      }
    };

    window.addEventListener('message', handler);

    // Query current MCP server status on mount
    vscode.postMessage({ type: 'GET_MCP_SERVER_STATUS' });

    return () => window.removeEventListener('message', handler);
  }, []);

  const handleLaunch = useCallback(
    async (provider: AiEditingProvider) => {
      if (launchingProvider) return;
      setLaunchingProvider(provider);
      try {
        await launchAiAgent(provider);
      } catch {
        // Error is handled by the extension host
      } finally {
        setLaunchingProvider(null);
      }
    },
    [launchingProvider]
  );

  const handleStop = useCallback(() => {
    vscode.postMessage({ type: 'STOP_MCP_SERVER' });
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

          {/* AI Agent Buttons */}
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
            {visibleButtons.map((button) => (
              <button
                key={button.provider}
                type="button"
                onClick={() => handleLaunch(button.provider)}
                disabled={launchingProvider !== null}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 8px',
                  fontSize: '11px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: launchingProvider !== null ? 'wait' : 'pointer',
                  opacity: launchingProvider !== null ? 0.6 : 1,
                }}
              >
                <Play size={10} />
                {launchingProvider === button.provider ? 'Launching...' : button.label}
              </button>
            ))}
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
