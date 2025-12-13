/**
 * Codebase Search Results Component
 *
 * Displays search results from codebase index in a collapsible section.
 * Shows related code snippets with file paths and line numbers.
 *
 * Based on: GitHub Issue #265 Phase 2 UX Implementation
 */

import type { SearchResult } from '@shared/types/codebase-index';
import { useState } from 'react';
import { useResponsiveFonts } from '../../contexts/ResponsiveFontContext';
import { useTranslation } from '../../i18n/i18n-context';
import { vscode } from '../../main';
import {
  formatSearchResultLocation,
  truncateContent,
} from '../../services/codebase-search-service';

interface CodebaseSearchResultsProps {
  /** Search results to display */
  results: SearchResult[];
  /** Search query used */
  query: string;
  /** Whether this was from @codebase command (true) or auto-search (false) */
  isExplicit: boolean;
  /** Optional: Maximum number of results to show */
  maxResults?: number;
}

export function CodebaseSearchResults({
  results,
  query,
  isExplicit,
  maxResults = 5,
}: CodebaseSearchResultsProps) {
  const { t } = useTranslation();
  const fontSizes = useResponsiveFonts();
  const [isExpanded, setIsExpanded] = useState(false);

  // Limit results to maxResults
  const displayResults = results.slice(0, maxResults);

  if (displayResults.length === 0) {
    return null;
  }

  const handleOpenFile = (filePath: string, startLine: number) => {
    // Request Extension Host to open file at specific line
    vscode.postMessage({
      type: 'OPEN_FILE_AT_LINE',
      payload: { filePath, line: startLine },
    });
  };

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '8px',
        backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
        borderRadius: '4px',
        border: '1px solid var(--vscode-panel-border)',
      }}
    >
      {/* Header - Collapsible toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          padding: '4px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--vscode-foreground)',
          fontSize: `${fontSizes.small}px`,
          textAlign: 'left',
        }}
        aria-expanded={isExpanded}
        aria-label={t('codebaseReference.toggle')}
      >
        <span style={{ fontSize: '14px' }}>{isExpanded ? '▼' : '▶'}</span>
        <span style={{ opacity: 0.8 }}>
          {isExplicit ? t('codebaseReference.explicitResults') : t('codebaseReference.relatedCode')}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            opacity: 0.6,
            fontSize: `${fontSizes.xsmall}px`,
          }}
        >
          {displayResults.length}
          {results.length > maxResults && `/${results.length}`}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ marginTop: '8px' }}>
          {/* Search query indicator */}
          <div
            style={{
              fontSize: `${fontSizes.xsmall}px`,
              opacity: 0.6,
              marginBottom: '8px',
              fontStyle: 'italic',
            }}
          >
            {t('codebaseReference.queryLabel')}: "{query}"
          </div>

          {/* Results list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {displayResults.map((result, index) => (
              <div
                key={`${result.document.filePath}-${result.document.chunkIndex}-${index}`}
                style={{
                  padding: '6px 8px',
                  backgroundColor: 'var(--vscode-list-hoverBackground)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                }}
                onClick={() => handleOpenFile(result.document.filePath, result.document.startLine)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenFile(result.document.filePath, result.document.startLine);
                  }
                }}
                role="button"
                tabIndex={0}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--vscode-list-activeSelectionBackground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                }}
              >
                {/* File path and line range */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: `${fontSizes.small}px`,
                    fontFamily: 'var(--vscode-editor-font-family)',
                  }}
                >
                  <span style={{ opacity: 0.7 }}>📄</span>
                  <span style={{ color: 'var(--vscode-textLink-foreground)' }}>
                    {formatSearchResultLocation(
                      result.document.filePath,
                      result.document.startLine,
                      result.document.endLine
                    )}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      opacity: 0.5,
                      fontSize: `${fontSizes.xsmall}px`,
                    }}
                  >
                    {result.document.language}
                  </span>
                </div>

                {/* Content preview */}
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: `${fontSizes.xsmall}px`,
                    opacity: 0.7,
                    fontFamily: 'var(--vscode-editor-font-family)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {truncateContent(result.document.content, 80)}
                </div>
              </div>
            ))}
          </div>

          {/* Show more indicator */}
          {results.length > maxResults && (
            <div
              style={{
                marginTop: '8px',
                fontSize: `${fontSizes.xsmall}px`,
                opacity: 0.6,
                textAlign: 'center',
              }}
            >
              {t('codebaseReference.moreResults', {
                count: String(results.length - maxResults),
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
