/**
 * MCP Server Section Component
 *
 * Collapsible section in the RefinementChatPanel for managing
 * the built-in MCP server that external AI agents can connect to.
 *
 * Features:
 * - Start/Stop toggle
 * - Port status display
 * - Config target checkboxes (Claude Code, Roo Code, Copilot, Codex)
 * - State persisted to localStorage
 */

import type { McpConfigTarget, McpServerStatusPayload } from '@shared/types/messages';
import { ChevronDown, ChevronRight, Plug } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { vscode } from '../../main';

const STORAGE_KEY = 'cc-wf-studio.mcpServer';

interface McpServerState {
  isCollapsed: boolean;
  configTargets: Record<McpConfigTarget, boolean>;
}

const DEFAULT_STATE: McpServerState = {
  isCollapsed: false,
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

  const toggleCollapse = useCallback(() => {
    setState((prev) => ({ ...prev, isCollapsed: !prev.isCollapsed }));
  }, []);

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

  const ChevronIcon = state.isCollapsed ? ChevronRight : ChevronDown;

  return (
    <div
      style={{
        borderBottom: '1px solid var(--vscode-panel-border)',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleCollapse}
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
        <span>MCP Server</span>
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
      {!state.isCollapsed && (
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
        </div>
      )}
    </div>
  );
}
