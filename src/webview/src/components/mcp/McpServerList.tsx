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
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { listMcpServers, refreshMcpCache } from '../../services/mcp-service';
import { AIProviderBadge, type AIProviderType } from '../common/AIProviderBadge';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';

type SourceType = 'claude' | 'copilot' | 'codex';

interface GroupedServers {
  source: SourceType;
  servers: McpServerReference[];
}

/**
 * Groups MCP servers by their source (claude/copilot/codex).
 * Servers without a source are treated as 'claude' for backward compatibility.
 */
function groupServersBySource(servers: McpServerReference[]): GroupedServers[] {
  const sourceOrder: SourceType[] = ['claude', 'copilot', 'codex'];
  const groups = new Map<SourceType, McpServerReference[]>();

  // Initialize all groups
  for (const source of sourceOrder) {
    groups.set(source, []);
  }

  // Group servers by source (undefined source → 'claude')
  for (const server of servers) {
    const source = (server.source as SourceType) || 'claude';
    groups.get(source)?.push(server);
  }

  // Return only non-empty groups in order
  return sourceOrder
    .map((source) => ({ source, servers: groups.get(source) ?? [] }))
    .filter((group) => group.servers.length > 0);
}

/**
 * Scroll to a specific section by source
 */
function scrollToSection(source: SourceType) {
  const element = document.getElementById(`mcp-server-section-${source}`);
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

interface McpServerListProps {
  onServerSelect: (server: McpServerReference) => void;
  selectedServerId?: string;
  selectedServerSource?: string;
  filterByScope?: ('user' | 'project' | 'enterprise')[];
}

/**
 * Create a unique key for server identification (source:id)
 */
function getServerKey(id: string, source: string | undefined): string {
  return `${source || 'claude'}:${id}`;
}

export function McpServerList({
  onServerSelect,
  selectedServerId,
  selectedServerSource,
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

  // Filter servers by name - must be before early returns for hooks rule
  const filterLower = filterText.toLowerCase().trim();
  const filteredServers = filterLower
    ? servers.filter((server) => server.name.toLowerCase().includes(filterLower))
    : servers;

  // Group filtered servers by source - must be before early returns for hooks rule
  const groupedServers = useMemo(() => groupServersBySource(filteredServers), [filteredServers]);

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

      {/* Jump Navigation - only show when multiple groups exist */}
      {groupedServers.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {groupedServers.map((group) => (
            <button
              key={group.source}
              type="button"
              onClick={() => scrollToSection(group.source)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <AIProviderBadge provider={group.source as AIProviderType} size="small" />
              <span>({group.servers.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Grouped Server List */}
      {groupedServers.length > 0 && (
        <div
          style={{
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
            maxHeight: '400px',
            overflow: 'auto',
          }}
        >
          {groupedServers.map((group) => (
            <div key={group.source} id={`mcp-server-section-${group.source}`}>
              {/* Sticky Section Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
                  borderBottom: '1px solid var(--vscode-panel-border)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <AIProviderBadge provider={group.source as AIProviderType} size="medium" />
                <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                  ({group.servers.length})
                </span>
              </div>

              {/* Servers in group */}
              {group.servers.map((server) => {
                const serverKey = getServerKey(server.id, server.source);
                const selectedKey = getServerKey(selectedServerId || '', selectedServerSource);
                const isSelected = selectedServerId && serverKey === selectedKey;

                return (
                  <button
                    key={serverKey}
                    type="button"
                    onClick={() => onServerSelect(server)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: isSelected
                        ? 'var(--vscode-list-activeSelectionBackground)'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--vscode-list-activeSelectionForeground)'
                        : 'var(--vscode-foreground)',
                      border: 'none',
                      borderBottom: '1px solid var(--vscode-panel-border)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor =
                          'var(--vscode-list-hoverBackground)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
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
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '6px',
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
                );
              })}
            </div>
          ))}
        </div>
      )}
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
