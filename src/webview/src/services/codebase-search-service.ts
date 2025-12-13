/**
 * Codebase Search Service
 *
 * Webview service for interacting with the codebase index.
 * Provides BM25 full-text search capabilities via Extension Host communication.
 *
 * Based on: GitHub Issue #265 Phase 2 UX Implementation
 */

import type {
  BuildIndexPayload,
  ExtensionMessage,
  GetSettingPayload,
  IndexBuildResult,
  IndexProgress,
  IndexStatus,
  SearchCodebasePayload,
  SearchOptions,
  SearchResponse,
  SetSettingPayload,
} from '@shared/types/messages';
import { vscode } from '../main';

// ============================================================================
// Types
// ============================================================================

/**
 * Error class for codebase index operations
 */
export class CodebaseIndexError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = 'CodebaseIndexError';
  }
}

/**
 * Parsed @codebase command result
 */
export interface ParsedCodebaseCommand {
  /** Whether @codebase command was found */
  hasCommand: boolean;
  /** Search query extracted from the command */
  searchQuery: string | null;
  /** Message text with @codebase command removed */
  cleanedMessage: string;
}

// ============================================================================
// Index Operations
// ============================================================================

/**
 * Get current index status
 *
 * @returns Promise that resolves to the current index status
 * @throws {CodebaseIndexError} If status retrieval fails
 */
export function getIndexStatus(): Promise<IndexStatus> {
  return new Promise((resolve, reject) => {
    const requestId = `req-index-status-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'INDEX_STATUS' && message.payload) {
          resolve(message.payload.status);
        } else if (message.type === 'ERROR') {
          reject(
            new CodebaseIndexError(
              message.payload?.message || 'Failed to get index status',
              'UNKNOWN_ERROR'
            )
          );
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'GET_INDEX_STATUS',
      requestId,
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new CodebaseIndexError('Get index status request timed out', 'TIMEOUT'));
    }, 5000);
  });
}

/**
 * Build the codebase index
 *
 * @param options - Optional build options
 * @param onProgress - Optional progress callback
 * @returns Promise that resolves to the build result
 * @throws {CodebaseIndexError} If build fails
 */
export function buildIndex(
  options?: BuildIndexPayload['options'],
  onProgress?: (progress: IndexProgress) => void
): Promise<IndexBuildResult> {
  return new Promise((resolve, reject) => {
    const requestId = `req-build-index-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        if (message.type === 'INDEX_BUILD_PROGRESS' && message.payload && onProgress) {
          onProgress(message.payload.progress);
          return; // Don't remove listener, wait for completion
        }

        if (message.type === 'INDEX_BUILD_SUCCESS' && message.payload) {
          window.removeEventListener('message', handler);
          resolve(message.payload.result);
        } else if (message.type === 'INDEX_BUILD_FAILED' && message.payload) {
          window.removeEventListener('message', handler);
          reject(
            new CodebaseIndexError(
              message.payload.errorMessage,
              message.payload.errorCode,
              message.payload.details
            )
          );
        } else if (message.type === 'INDEX_BUILD_CANCELLED') {
          window.removeEventListener('message', handler);
          reject(new CodebaseIndexError('Index build cancelled', 'INDEX_CANCELLED'));
        } else if (message.type === 'ERROR') {
          window.removeEventListener('message', handler);
          reject(
            new CodebaseIndexError(
              message.payload?.message || 'Failed to build index',
              'UNKNOWN_ERROR'
            )
          );
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: BuildIndexPayload = { options };
    vscode.postMessage({
      type: 'BUILD_INDEX',
      requestId,
      payload,
    });

    // Timeout after 10 minutes (large codebases may take time)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new CodebaseIndexError('Index build timed out', 'TIMEOUT'));
    }, 600000);
  });
}

/**
 * Cancel an ongoing index build
 */
export function cancelIndexBuild(): void {
  vscode.postMessage({
    type: 'CANCEL_INDEX_BUILD',
  });
}

/**
 * Clear the codebase index
 *
 * @returns Promise that resolves when index is cleared
 * @throws {CodebaseIndexError} If clear fails
 */
export function clearIndex(): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-clear-index-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'INDEX_CLEARED') {
          resolve();
        } else if (message.type === 'ERROR') {
          reject(
            new CodebaseIndexError(
              message.payload?.message || 'Failed to clear index',
              'UNKNOWN_ERROR'
            )
          );
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'CLEAR_INDEX',
      requestId,
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new CodebaseIndexError('Clear index request timed out', 'TIMEOUT'));
    }, 10000);
  });
}

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Search the codebase
 *
 * @param query - Search query string
 * @param options - Optional search options
 * @returns Promise that resolves to search results
 * @throws {CodebaseIndexError} If search fails
 */
export function searchCodebase(query: string, options?: SearchOptions): Promise<SearchResponse> {
  return new Promise((resolve, reject) => {
    const requestId = `req-search-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SEARCH_CODEBASE_RESULT' && message.payload) {
          resolve(message.payload.response);
        } else if (message.type === 'SEARCH_CODEBASE_FAILED' && message.payload) {
          reject(new CodebaseIndexError(message.payload.errorMessage, message.payload.errorCode));
        } else if (message.type === 'ERROR') {
          reject(
            new CodebaseIndexError(message.payload?.message || 'Search failed', 'UNKNOWN_ERROR')
          );
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: SearchCodebasePayload = { query, options };
    vscode.postMessage({
      type: 'SEARCH_CODEBASE',
      requestId,
      payload,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new CodebaseIndexError('Search request timed out', 'TIMEOUT'));
    }, 30000);
  });
}

// ============================================================================
// @codebase Command Parsing
// ============================================================================

/**
 * Parse @codebase command from user message
 *
 * Supported formats:
 * - "@codebase keyword" -> search for "keyword"
 * - "@codebase multiple words" -> search for "multiple words"
 * - "text @codebase keyword more text" -> search for "keyword", cleaned = "text more text"
 *
 * @param message - User input message
 * @returns Parsed command result
 */
export function parseCodebaseCommand(message: string): ParsedCodebaseCommand {
  // Match @codebase followed by search terms (until end of line or next @)
  const codebaseRegex = /@codebase\s+([^@\n]+)/i;
  const match = message.match(codebaseRegex);

  if (!match) {
    return {
      hasCommand: false,
      searchQuery: null,
      cleanedMessage: message,
    };
  }

  const searchQuery = match[1].trim();
  const cleanedMessage = message.replace(codebaseRegex, '').trim();

  return {
    hasCommand: true,
    searchQuery: searchQuery || null,
    cleanedMessage,
  };
}

/**
 * Extract keywords from user message for auto-search
 *
 * Extracts potential code-related keywords for automatic codebase search.
 * Used when auto-search is enabled to find relevant code context.
 *
 * @param message - User message
 * @returns Array of keywords to search
 */
export function extractSearchKeywords(message: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'and',
    'but',
    'if',
    'or',
    'because',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'what',
    'which',
    'who',
    'whom',
    'please',
    'add',
    'create',
    'make',
    'update',
    'change',
    'modify',
    'remove',
    'delete',
    'fix',
    'implement',
    'want',
    'like',
    'need',
    // Japanese particles and common words
    'は',
    'が',
    'を',
    'に',
    'で',
    'と',
    'も',
    'の',
    'へ',
    'から',
    'まで',
    'より',
    'ので',
    'けど',
    'して',
    'する',
    'です',
    'ます',
    'った',
    'てください',
    'ください',
    'ほしい',
    'たい',
    '追加',
    '作成',
    '変更',
    '修正',
    '削除',
  ]);

  // Split message into words (handle both English and Japanese)
  const words = message
    .toLowerCase()
    // Remove punctuation but keep Japanese characters
    .replace(/[.,!?;:'"()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter((word) => {
      // Keep words with 2+ characters that aren't stop words
      return word.length >= 2 && !stopWords.has(word);
    });

  // Deduplicate and limit to 5 keywords
  return [...new Set(words)].slice(0, 5);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format search result for display in chat
 *
 * @param filePath - File path
 * @param startLine - Start line number
 * @param endLine - End line number
 * @returns Formatted string like "src/utils/helper.ts:10-25"
 */
export function formatSearchResultLocation(
  filePath: string,
  startLine: number,
  endLine: number
): string {
  return `${filePath}:${startLine}-${endLine}`;
}

/**
 * Truncate content for preview display
 *
 * @param content - Full content
 * @param maxLength - Maximum length (default: 100)
 * @returns Truncated content with ellipsis if needed
 */
export function truncateContent(content: string, maxLength = 100): string {
  const singleLine = content.replace(/\n/g, ' ').trim();
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.substring(0, maxLength)}...`;
}

// ============================================================================
// Settings Operations
// ============================================================================

/**
 * Get a setting value from VSCode configuration
 *
 * @param key - Setting key (e.g., 'codebaseReference.enabled')
 * @returns Promise that resolves to the setting value
 */
export function getSetting<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    const requestId = `req-get-setting-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId && message.type === 'GET_SETTING_RESULT') {
        window.removeEventListener('message', handler);
        resolve(message.payload?.value as T | undefined);
      }
    };

    window.addEventListener('message', handler);

    const payload: GetSettingPayload = { key };
    vscode.postMessage({
      type: 'GET_SETTING',
      requestId,
      payload,
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(undefined);
    }, 5000);
  });
}

/**
 * Set a setting value in VSCode configuration
 *
 * @param key - Setting key (e.g., 'codebaseReference.enabled')
 * @param value - Setting value
 * @returns Promise that resolves to true if successful
 */
export function setSetting<T>(key: string, value: T): Promise<boolean> {
  return new Promise((resolve) => {
    const requestId = `req-set-setting-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId && message.type === 'SET_SETTING_RESULT') {
        window.removeEventListener('message', handler);
        resolve(message.payload?.success ?? false);
      }
    };

    window.addEventListener('message', handler);

    const payload: SetSettingPayload = { key, value };
    vscode.postMessage({
      type: 'SET_SETTING',
      requestId,
      payload,
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(false);
    }, 5000);
  });
}
