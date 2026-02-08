/**
 * MCP Server Section Component
 *
 * Always-visible section in the RefinementChatPanel for managing
 * the built-in MCP server that external AI agents can connect to.
 *
 * Features:
 * - Start/Stop toggle
 * - Port status display
 * - Config target checkboxes (Claude Code, Roo Code, Copilot, Codex)
 * - AI Edit buttons per provider (launch AI editing skill via MCP)
 * - State persisted to localStorage
 */

import type {
  AiEditingProvider,
  McpConfigTarget,
  McpServerStatusPayload,
} from '@shared/types/messages';
import { ExternalLink, Play, Plug } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { vscode } from '../../main';
import { openExternalUrl, runAiEditingSkill } from '../../services/vscode-bridge';

const STORAGE_KEY = 'cc-wf-studio.mcpServer';

interface McpServerState {
  configTargets: Record<McpConfigTarget, boolean>;
}

const DEFAULT_STATE: McpServerState = {
  configTargets: {
    'claude-code': true,
    'roo-code': true,
    copilot: true,
    codex: false,
  },
};

const CONFIG_LABELS: Record<McpConfigTarget, string> = {
  'claude-code': 'Claude Code (.mcp.json)',
  'roo-code': 'Roo Code (.roo/mcp.json)',
  copilot: 'Copilot (.vscode/mcp.json)',
  codex: 'Codex (~/.codex/config.toml)',
};

interface AiEditButton {
  provider: AiEditingProvider;
  label: string;
  /** Which configTarget controls visibility (null = always visible) */
  configKey: McpConfigTarget | null;
}

const AI_EDIT_BUTTONS: AiEditButton[] = [
  { provider: 'claude-code', label: 'Claude Code', configKey: null },
  { provider: 'copilot-cli', label: 'Copilot CLI', configKey: 'copilot' },
  { provider: 'copilot-vscode', label: 'VSCode Copilot', configKey: 'copilot' },
  { provider: 'codex', label: 'Codex CLI', configKey: 'codex' },
  { provider: 'roo-code', label: 'Roo Code', configKey: 'roo-code' },
];

function loadState(): McpServerState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_STATE, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore
  }
  return DEFAULT_STATE;
}

function saveState(state: McpServerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function McpServerSection() {
  const [state, setState] = useState<McpServerState>(loadState);
  const [isRunning, setIsRunning] = useState(false);
  const [port, setPort] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [launchingProvider, setLaunchingProvider] = useState<AiEditingProvider | null>(null);

  // Listen for MCP server status updates
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'MCP_SERVER_STATUS') {
        const payload = message.payload as McpServerStatusPayload;
        setIsRunning(payload.running);
        setPort(payload.port);
        setIsStarting(false);
      }
    };

    window.addEventListener('message', handler);

    // Query current MCP server status on mount
    vscode.postMessage({ type: 'GET_MCP_SERVER_STATUS' });

    return () => window.removeEventListener('message', handler);
  }, []);

  // Safety timeout: reset isStarting if no response within 15 seconds
  useEffect(() => {
    if (!isStarting) return;
    const timer = setTimeout(() => {
      setIsStarting(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isStarting]);

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  const toggleConfigTarget = useCallback((target: McpConfigTarget) => {
    setState((prev) => ({
      ...prev,
      configTargets: {
        ...prev.configTargets,
        [target]: !prev.configTargets[target],
      },
    }));
  }, []);

  const handleStartStop = useCallback(() => {
    if (isRunning) {
      vscode.postMessage({ type: 'STOP_MCP_SERVER' });
      setIsStarting(false);
    } else {
      const selectedTargets = (Object.entries(state.configTargets) as [McpConfigTarget, boolean][])
        .filter(([, enabled]) => enabled)
        .map(([target]) => target);

      setIsStarting(true);
      vscode.postMessage({
        type: 'START_MCP_SERVER',
        payload: { configTargets: selectedTargets },
      });
    }
  }, [isRunning, state.configTargets]);

  const handleAiEdit = useCallback(
    async (provider: AiEditingProvider) => {
      if (launchingProvider) return;
      setLaunchingProvider(provider);
      try {
        await runAiEditingSkill(provider);
      } catch {
        // Error is handled by the extension host
      } finally {
        setLaunchingProvider(null);
      }
    },
    [launchingProvider]
  );

  const isButtonVisible = useCallback(
    (button: AiEditButton): boolean => {
      if (button.configKey === null) return true;
      return state.configTargets[button.configKey] ?? false;
    },
    [state.configTargets]
  );

  const visibleButtons = AI_EDIT_BUTTONS.filter(isButtonVisible);

  return (
    <div
      style={{
        borderBottom: '1px solid var(--vscode-panel-border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--vscode-foreground)',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          opacity: 0.8,
        }}
      >
        <Plug size={12} />
        <span>MCP Server</span>
        <span
          role="button"
          tabIndex={0}
          onClick={() =>
            openExternalUrl('https://github.com/breaking-brake/cc-wf-studio#edit-with-ai')
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
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
      </div>

      {/* Content */}
      <div style={{ padding: '4px 16px 12px' }}>
        {/* Start/Stop Button + Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <button
            type="button"
            onClick={handleStartStop}
            disabled={isStarting}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              backgroundColor: isRunning
                ? 'var(--vscode-button-secondaryBackground)'
                : 'var(--vscode-button-background)',
              color: isRunning
                ? 'var(--vscode-button-secondaryForeground)'
                : 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '3px',
              cursor: isStarting ? 'wait' : 'pointer',
              opacity: isStarting ? 0.6 : 1,
            }}
          >
            {isStarting ? 'Starting...' : isRunning ? 'Stop' : 'Start'}
          </button>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            {isRunning && port ? `Port ${port}` : 'Stopped'}
          </span>
        </div>

        {/* Config targets */}
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '4px',
          }}
        >
          Config:
        </div>
        {(Object.keys(CONFIG_LABELS) as McpConfigTarget[]).map((target) => (
          <label
            key={target}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 0',
              fontSize: '11px',
              color: 'var(--vscode-foreground)',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={state.configTargets[target]}
              onChange={() => toggleConfigTarget(target)}
              disabled={isRunning}
              style={{ margin: 0 }}
            />
            {CONFIG_LABELS[target]}
          </label>
        ))}

        {/* AI Edit Buttons */}
        {isRunning && visibleButtons.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '4px',
              }}
            >
              AI Edit:
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
              }}
            >
              {visibleButtons.map((button) => (
                <button
                  key={button.provider}
                  type="button"
                  onClick={() => handleAiEdit(button.provider)}
                  disabled={launchingProvider !== null}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
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
          </div>
        )}
      </div>
    </div>
  );
}
