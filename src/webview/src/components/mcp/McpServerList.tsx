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
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';

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
    return <IndeterminateProgressBar label={t('mcp.loading.servers')} />;
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
        }}
      >
        <div
          style={{
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '8px',
          }}
        >
          {t('mcp.empty.servers')}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          <div>{t('mcp.empty.servers.hint')}</div>
          <div
            style={{
              marginTop: '4px',
              fontFamily: 'monospace',
              fontSize: '11px',
            }}
          >
            {t('mcp.empty.servers.docUrl')}
          </div>
        </div>
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
