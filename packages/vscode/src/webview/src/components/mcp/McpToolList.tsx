/**
 * MCP Tool List Component
 *
 * Feature: 001-mcp-node
 * Purpose: Display list of tools from selected MCP server with selection capability
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.2
 * Task: T023
 */

import type { McpToolReference, McpToolsResultPayload } from '@shared/types/messages';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { getMcpTools, saveMcpBearerToken } from '../../services/mcp-service';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';

interface McpToolListProps {
  serverId: string;
  onToolSelect: (tool: McpToolReference) => void;
  selectedToolName?: string;
  searchQuery?: string;
  /** Change this value to force a tool list reload */
  refreshKey?: number;
  /** Called when a bearer token is saved successfully */
  onTokenSaved?: () => void;
}

export function McpToolList({
  serverId,
  onToolSelect,
  selectedToolName,
  searchQuery,
  refreshKey,
  onTokenSaved,
}: McpToolListProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolReference[]>([]);
  const [tokenInput, setTokenInput] = useState('');
  const [oauthTokenInput, setOauthTokenInput] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [tokenSaving, setTokenSaving] = useState(false);

  const loadTools = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAuthRequired(null);

    try {
      const result: McpToolsResultPayload = await getMcpTools({ serverId });

      if (!result.success) {
        if (result.error?.code === 'MCP_AUTH_REQUIRED') {
          setAuthRequired(result.error?.details || serverId);
        } else {
          setError(result.error?.message || t('mcp.error.toolLoadFailed'));
        }
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
  }, [serverId, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey triggers reload without being used inside loadTools
  useEffect(() => {
    loadTools();
  }, [loadTools, refreshKey]);

  const handleTokenSubmit = useCallback(async () => {
    if (!tokenInput.trim()) return;
    setTokenSaving(true);
    // Strip "Bearer " prefix if user pasted the full header value
    const token = tokenInput.trim().replace(/^Bearer\s+/i, '');
    saveMcpBearerToken(serverId, token);
    setTokenInput('');
    await new Promise((r) => setTimeout(r, 300));
    setTokenSaving(false);
    loadTools();
    onTokenSaved?.();
  }, [serverId, tokenInput, loadTools, onTokenSaved]);

  const handleOauthTokenSubmit = useCallback(async () => {
    if (!oauthTokenInput.trim()) return;
    setTokenSaving(true);
    saveMcpBearerToken(serverId, oauthTokenInput.trim());
    setOauthTokenInput('');
    await new Promise((r) => setTimeout(r, 300));
    setTokenSaving(false);
    loadTools();
    onTokenSaved?.();
  }, [serverId, oauthTokenInput, loadTools, onTokenSaved]);

  const handleCopyCmd = useCallback(() => {
    navigator.clipboard.writeText('npx @modelcontextprotocol/inspector');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  }, []);

  const handleCopyUrl = useCallback(() => {
    if (authRequired) {
      navigator.clipboard.writeText(authRequired);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  }, [authRequired]);

  if (loading || tokenSaving) {
    return <IndeterminateProgressBar label={t('mcp.loading.tools')} />;
  }

  if (authRequired) {
    return (
      <div
        style={{
          padding: '12px',
          backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--vscode-foreground)',
            marginBottom: '12px',
          }}
        >
          Authentication Required
        </div>

        {/* Section 1: Bearer Token input */}
        <div
          style={{
            marginBottom: '12px',
            padding: '10px',
            backgroundColor: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            Enter Bearer Token
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              marginBottom: '8px',
            }}
          >
            Paste a Personal Access Token (PAT) or Bearer token for this server.
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '2px',
              }}
            >
              <span
                style={{
                  padding: '5px 0 5px 8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--vscode-descriptionForeground)',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Bearer
              </span>
              <input
                type="password"
                placeholder="paste token here"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTokenSubmit();
                }}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  backgroundColor: 'transparent',
                  color: 'var(--vscode-input-foreground)',
                  border: 'none',
                  outline: 'none',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleTokenSubmit}
              disabled={!tokenInput.trim()}
              style={{
                padding: '5px 12px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '2px',
                fontSize: '11px',
                cursor: tokenInput.trim() ? 'pointer' : 'default',
                opacity: tokenInput.trim() ? 1 : 0.5,
              }}
            >
              Connect
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--vscode-panel-border)' }} />
          <span
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            or
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--vscode-panel-border)' }} />
        </div>

        {/* Section 2: OAuth via MCP Inspector */}
        <div
          style={{
            padding: '10px',
            backgroundColor: 'var(--vscode-input-background)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            Obtain Token via OAuth (MCP Inspector)
          </div>
          <ol
            style={{
              margin: '0 0 0 16px',
              padding: 0,
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              lineHeight: '1.6',
            }}
          >
            <li style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              Run: <code style={{ fontSize: '10px' }}>npx @modelcontextprotocol/inspector</code>
              <span
                role="button"
                tabIndex={0}
                onClick={handleCopyCmd}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCopyCmd();
                }}
                style={{
                  cursor: 'pointer',
                  color: copiedCmd
                    ? 'var(--vscode-testing-iconPassed, #73c991)'
                    : 'var(--vscode-descriptionForeground)',
                  display: 'inline-flex',
                  fontSize: '10px',
                }}
                title={copiedCmd ? 'Copied!' : 'Copy to clipboard'}
              >
                {copiedCmd ? '✓' : '📋'}
              </span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              In the sidebar: enter the server URL{' '}
              <code style={{ fontSize: '10px' }}>{authRequired}</code>
              <span
                role="button"
                tabIndex={0}
                onClick={handleCopyUrl}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleCopyUrl();
                }}
                style={{
                  cursor: 'pointer',
                  color: copiedUrl
                    ? 'var(--vscode-testing-iconPassed, #73c991)'
                    : 'var(--vscode-descriptionForeground)',
                  display: 'inline-flex',
                  fontSize: '10px',
                }}
                title={copiedUrl ? 'Copied!' : 'Copy to clipboard'}
              >
                {copiedUrl ? '✓' : '📋'}
              </span>{' '}
              and click &quot;Connect&quot;
            </li>
            <li>
              In the main area: click &quot;Open Auth Settings&quot; → &quot;Quick OAuth Flow&quot;
            </li>
            <li>
              Complete authorization, expand &quot;Access Token&quot; at the bottom, and copy the{' '}
              <code style={{ fontSize: '10px' }}>access_token</code> value
            </li>
            <li>Paste the token below and click &quot;Connect&quot;</li>
          </ol>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
            <input
              type="password"
              placeholder="paste access_token here"
              value={oauthTokenInput}
              onChange={(e) => setOauthTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOauthTokenSubmit();
              }}
              style={{
                flex: 1,
                padding: '5px 8px',
                backgroundColor: 'var(--vscode-editor-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '2px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            />
            <button
              type="button"
              onClick={handleOauthTokenSubmit}
              disabled={!oauthTokenInput.trim()}
              style={{
                padding: '5px 12px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '2px',
                fontSize: '11px',
                cursor: oauthTokenInput.trim() ? 'pointer' : 'default',
                opacity: oauthTokenInput.trim() ? 1 : 0.5,
              }}
            >
              Connect
            </button>
          </div>
        </div>
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
