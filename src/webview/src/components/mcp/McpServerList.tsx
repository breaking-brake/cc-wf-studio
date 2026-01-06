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
import { listMcpServers, refreshMcpCache } from '../../services/mcp-service';
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<McpServerReference[]>([]);
  const [filterText, setFilterText] = useState('');

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadServers is stable and shouldn't trigger re-renders
  useEffect(() => {
    loadServers();
  }, [filterByScope, t]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      // Invalidate cache first
      await refreshMcpCache({});

      // Reload server list
      await loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mcp.error.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

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
      <div>
        {/* Refresh Button */}
        <div style={{ marginBottom: '12px' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              cursor: refreshing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>{refreshing ? t('mcp.refreshing') : t('mcp.action.refresh')}</span>
          </button>
        </div>

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
            {t('mcp.empty.servers.hint')}
          </div>
        </div>
      </div>
    );
  }

  // Filter servers by name
  const filterLower = filterText.toLowerCase().trim();
  const filteredServers = filterLower
    ? servers.filter((server) => server.name.toLowerCase().includes(filterLower))
    : servers;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Filter Input */}
      <input
        type="text"
        placeholder={t('mcp.search.serverPlaceholder')}
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '13px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '4px',
          outline: 'none',
        }}
      />

      {/* Refresh Button */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          padding: '8px 12px',
          fontSize: '13px',
          backgroundColor: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          cursor: refreshing ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <span>{refreshing ? t('mcp.refreshing') : t('mcp.action.refresh')}</span>
      </button>

      {/* No results message */}
      {filteredServers.length === 0 && filterText && (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('mcp.search.noServers', { query: filterText })}
        </div>
      )}

      {/* Server List */}
      {filteredServers.map((server) => (
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
                  color: getScopeForegroundColor(server.scope),
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
                    color: getStatusForegroundColor(server.status),
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
 * Get foreground color for scope badge
 */
function getScopeForegroundColor(scope: 'user' | 'project' | 'enterprise'): string {
  switch (scope) {
    case 'user':
      return 'var(--vscode-button-foreground)';
    case 'project':
      return 'var(--vscode-button-secondaryForeground)';
    case 'enterprise':
      return 'var(--vscode-badge-foreground)';
    default:
      return 'var(--vscode-badge-foreground)';
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

/**
 * Get foreground color for status badge
 */
function getStatusForegroundColor(status: 'connected' | 'disconnected' | 'error'): string {
  switch (status) {
    case 'connected':
    case 'disconnected':
    case 'error':
      return '#ffffff'; // White text for colored backgrounds
    default:
      return 'var(--vscode-badge-foreground)';
  }
}
