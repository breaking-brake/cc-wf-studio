/**
 * MCP Server List Component
 *
 * Feature: 001-mcp-node
 * Purpose: Display list of available MCP servers with selection capability
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.2
 * Task: T022
 */

import type { McpServerReference } from '@shared/types/messages';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { listMcpServers } from '../../services/mcp-service';

interface McpServerListProps {
  onServerSelect: (server: McpServerReference) => void;
  selectedServerId?: string;
  filterByScope?: ('user' | 'project' | 'enterprise')[];
}

export function McpServerList({
  onServerSelect,
  selectedServerId,
  filterByScope,
}: McpServerListProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<McpServerReference[]>([]);

  useEffect(() => {
    const loadServers = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await listMcpServers({
          options: filterByScope ? { filterByScope } : undefined,
        });

        if (!result.success) {
          setError(result.error?.message || t('mcp.error.serverLoadFailed'));
          setServers([]);
          return;
        }

        setServers(result.servers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('mcp.error.serverLoadFailed'));
        setServers([]);
      } finally {
        setLoading(false);
      }
    };

    loadServers();
  }, [filterByScope, t]);

  if (loading) {
    return (
      <div
        style={{
          padding: '16px',
        }}
      >
        {/* Loading label */}
        <div
          style={{
            marginBottom: '6px',
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            fontStyle: 'italic',
          }}
        >
          {t('mcp.loading.servers')}
        </div>

        {/* Indeterminate progress bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: 'var(--vscode-editor-background)',
            borderRadius: '2px',
            overflow: 'hidden',
            border: '1px solid var(--vscode-panel-border)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: '100%',
              width: '30%',
              backgroundColor: 'var(--vscode-progressBar-background)',
              animation: 'slide 1.5s ease-in-out infinite',
            }}
          />
        </div>

        <style>
          {`
            @keyframes slide {
              0% {
                left: -30%;
              }
              100% {
                left: 100%;
              }
            }
          `}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          color: 'var(--vscode-errorForeground)',
          backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
          border: '1px solid var(--vscode-inputValidation-errorBorder)',
          borderRadius: '4px',
        }}
      >
        {error}
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        {t('mcp.empty.servers')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {servers.map((server) => (
        <button
          key={server.id}
          type="button"
          onClick={() => onServerSelect(server)}
          style={{
            padding: '12px',
            backgroundColor:
              selectedServerId === server.id
                ? 'var(--vscode-list-activeSelectionBackground)'
                : 'var(--vscode-list-inactiveSelectionBackground)',
            color:
              selectedServerId === server.id
                ? 'var(--vscode-list-activeSelectionForeground)'
                : 'var(--vscode-foreground)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (selectedServerId !== server.id) {
              e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedServerId !== server.id) {
              e.currentTarget.style.backgroundColor =
                'var(--vscode-list-inactiveSelectionBackground)';
            }
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 500,
                }}
              >
                {server.name}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: getScopeColor(server.scope),
                  color: 'var(--vscode-badge-foreground)',
                }}
              >
                {server.scope}
              </span>
              {server.status && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: getStatusColor(server.status),
                    color: 'var(--vscode-badge-foreground)',
                  }}
                >
                  {server.status}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * Get background color for scope badge
 */
function getScopeColor(scope: 'user' | 'project' | 'enterprise'): string {
  switch (scope) {
    case 'user':
      return 'var(--vscode-button-background)';
    case 'project':
      return 'var(--vscode-button-secondaryBackground)';
    case 'enterprise':
      return 'var(--vscode-badge-background)';
    default:
      return 'var(--vscode-badge-background)';
  }
}

/**
 * Get background color for status badge
 */
function getStatusColor(status: 'connected' | 'disconnected' | 'error'): string {
  switch (status) {
    case 'connected':
      return '#388a34'; // Success green
    case 'disconnected':
      return '#666666'; // Neutral gray
    case 'error':
      return 'var(--vscode-errorForeground)';
    default:
      return 'var(--vscode-badge-background)';
  }
}
