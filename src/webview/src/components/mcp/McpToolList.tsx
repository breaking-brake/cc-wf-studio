/**
 * MCP Tool List Component
 *
 * Feature: 001-mcp-node
 * Purpose: Display list of tools from selected MCP server with selection capability
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.2
 * Task: T023
 */

import type { McpToolReference } from '@shared/types/messages';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { getMcpTools } from '../../services/mcp-service';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';

interface McpToolListProps {
  serverId: string;
  onToolSelect: (tool: McpToolReference) => void;
  selectedToolName?: string;
  searchQuery?: string;
}

export function McpToolList({
  serverId,
  onToolSelect,
  selectedToolName,
  searchQuery,
}: McpToolListProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolReference[]>([]);

  useEffect(() => {
    const loadTools = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getMcpTools({ serverId });

        if (!result.success) {
          setError(result.error?.message || t('mcp.error.toolLoadFailed'));
          setTools([]);
          return;
        }

        setTools(result.tools || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('mcp.error.toolLoadFailed'));
        setTools([]);
      } finally {
        setLoading(false);
      }
    };

    loadTools();
  }, [serverId, t]);

  if (loading) {
    return <IndeterminateProgressBar label={t('mcp.loading.tools')} />;
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

  // Filter tools by search query
  const filteredTools = searchQuery
    ? tools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tools;

  if (filteredTools.length === 0) {
    if (searchQuery) {
      return (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('mcp.search.noResults', { query: searchQuery })}
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '16px',
          textAlign: 'center',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        {t('mcp.empty.tools')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {filteredTools.map((tool) => (
        <button
          key={tool.name}
          type="button"
          onClick={() => onToolSelect(tool)}
          style={{
            padding: '12px',
            backgroundColor:
              selectedToolName === tool.name
                ? 'var(--vscode-list-activeSelectionBackground)'
                : 'var(--vscode-list-inactiveSelectionBackground)',
            color:
              selectedToolName === tool.name
                ? 'var(--vscode-list-activeSelectionForeground)'
                : 'var(--vscode-foreground)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (selectedToolName !== tool.name) {
              e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedToolName !== tool.name) {
              e.currentTarget.style.backgroundColor =
                'var(--vscode-list-inactiveSelectionBackground)';
            }
          }}
        >
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>{tool.name}</div>
          {tool.description && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              {tool.description}
            </div>
          )}
          {tool.parameters && tool.parameters.length > 0 && (
            <div
              style={{
                fontSize: '11px',
                marginTop: '6px',
                padding: '4px 6px',
                backgroundColor: 'var(--vscode-badge-background)',
                color: 'var(--vscode-badge-foreground)',
                borderRadius: '3px',
                display: 'inline-block',
              }}
            >
              {tool.parameters.length} parameter{tool.parameters.length !== 1 ? 's' : ''}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
