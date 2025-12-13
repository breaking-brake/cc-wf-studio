/**
 * Claude Code Workflow Studio - Codebase Index Handlers
 *
 * Handles Webview messages for codebase indexing operations.
 * Based on: GitHub Issue #265
 */

import * as vscode from 'vscode';
import type {
  BuildIndexPayload,
  GetSettingPayload,
  IndexProgress,
  SearchCodebasePayload,
  SetSettingPayload,
} from '../../shared/types/messages';
import {
  getCodebaseIndexService,
  initializeCodebaseIndexService,
} from '../services/codebase-index-service';

/**
 * Output channel for logging
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Get or create the output channel
 */
function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(
      'Claude Code Workflow Studio - Codebase Index'
    );
  }
  return outputChannel;
}

/**
 * Log message to output channel
 */
function log(message: string): void {
  const timestamp = new Date().toISOString();
  getOutputChannel().appendLine(`[${timestamp}] [Handler] ${message}`);
}

/**
 * Handle BUILD_INDEX message
 */
export async function handleBuildIndex(
  payload: BuildIndexPayload | undefined,
  webview: vscode.Webview,
  requestId: string,
  context: vscode.ExtensionContext
): Promise<void> {
  log('Handling BUILD_INDEX request');

  try {
    // Initialize service if needed
    let service = getCodebaseIndexService();
    if (!service) {
      service = await initializeCodebaseIndexService(context);
      if (!service) {
        webview.postMessage({
          type: 'INDEX_BUILD_FAILED',
          requestId,
          payload: {
            errorCode: 'INDEX_WORKSPACE_NOT_FOUND',
            errorMessage: 'No workspace folder found',
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
    }

    // Set up progress callback
    service.setProgressCallback((progress: IndexProgress) => {
      webview.postMessage({
        type: 'INDEX_BUILD_PROGRESS',
        requestId,
        payload: {
          progress,
        },
      });
    });

    // Build the index
    const result = await service.buildIndex(payload?.options);

    // Clear progress callback
    service.setProgressCallback(null);

    if (result.success) {
      webview.postMessage({
        type: 'INDEX_BUILD_SUCCESS',
        requestId,
        payload: {
          result,
          timestamp: new Date().toISOString(),
        },
      });
      log(
        `Index build successful: ${result.documentCount} documents from ${result.fileCount} files`
      );
    } else if (result.errorCode === 'INDEX_CANCELLED') {
      webview.postMessage({
        type: 'INDEX_BUILD_CANCELLED',
        requestId,
      });
      log('Index build cancelled');
    } else {
      webview.postMessage({
        type: 'INDEX_BUILD_FAILED',
        requestId,
        payload: {
          errorCode: result.errorCode || 'INDEX_DATABASE_ERROR',
          errorMessage: result.errorMessage || 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      });
      log(`Index build failed: ${result.errorMessage}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling BUILD_INDEX: ${errorMessage}`);

    webview.postMessage({
      type: 'INDEX_BUILD_FAILED',
      requestId,
      payload: {
        errorCode: 'INDEX_DATABASE_ERROR',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Handle GET_INDEX_STATUS message
 */
export async function handleGetIndexStatus(
  webview: vscode.Webview,
  requestId: string,
  context: vscode.ExtensionContext
): Promise<void> {
  log('Handling GET_INDEX_STATUS request');

  try {
    let service = getCodebaseIndexService();
    if (!service) {
      service = await initializeCodebaseIndexService(context);
    }

    if (!service) {
      webview.postMessage({
        type: 'INDEX_STATUS',
        requestId,
        payload: {
          status: {
            state: 'idle',
            documentCount: 0,
            fileCount: 0,
            lastBuildTime: null,
            indexFilePath: null,
            errorMessage: 'No workspace folder found',
          },
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const status = await service.getStatus();

    webview.postMessage({
      type: 'INDEX_STATUS',
      requestId,
      payload: {
        status,
        timestamp: new Date().toISOString(),
      },
    });

    log(`Index status: ${status.state}, ${status.documentCount} documents`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling GET_INDEX_STATUS: ${errorMessage}`);

    webview.postMessage({
      type: 'INDEX_STATUS',
      requestId,
      payload: {
        status: {
          state: 'error',
          documentCount: 0,
          fileCount: 0,
          lastBuildTime: null,
          indexFilePath: null,
          errorMessage,
        },
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Handle CANCEL_INDEX_BUILD message
 */
export async function handleCancelIndexBuild(
  _webview: vscode.Webview,
  _requestId: string
): Promise<void> {
  log('Handling CANCEL_INDEX_BUILD request');

  const service = getCodebaseIndexService();
  if (service) {
    service.cancelBuild();
    // Note: The actual cancellation response will be sent by the build process
    log('Index build cancellation requested');
  } else {
    log('No active index service to cancel');
  }
}

/**
 * Handle CLEAR_INDEX message
 */
export async function handleClearIndex(webview: vscode.Webview, requestId: string): Promise<void> {
  log('Handling CLEAR_INDEX request');

  try {
    const service = getCodebaseIndexService();
    if (service) {
      await service.clearIndex();
      webview.postMessage({
        type: 'INDEX_CLEARED',
        requestId,
      });
      log('Index cleared successfully');
    } else {
      webview.postMessage({
        type: 'INDEX_CLEARED',
        requestId,
      });
      log('No index to clear');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling CLEAR_INDEX: ${errorMessage}`);

    webview.postMessage({
      type: 'INDEX_BUILD_FAILED',
      requestId,
      payload: {
        errorCode: 'INDEX_DATABASE_ERROR',
        errorMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Handle SEARCH_CODEBASE message
 */
export async function handleSearchCodebase(
  payload: SearchCodebasePayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  log(`Handling SEARCH_CODEBASE request: "${payload.query}"`);

  try {
    const service = getCodebaseIndexService();
    if (!service) {
      webview.postMessage({
        type: 'SEARCH_CODEBASE_FAILED',
        requestId,
        payload: {
          errorCode: 'SEARCH_INDEX_NOT_FOUND',
          errorMessage: 'Index not initialized. Build the index first.',
          query: payload.query,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (!payload.query || payload.query.trim().length === 0) {
      webview.postMessage({
        type: 'SEARCH_CODEBASE_FAILED',
        requestId,
        payload: {
          errorCode: 'SEARCH_QUERY_EMPTY',
          errorMessage: 'Search query cannot be empty',
          query: payload.query,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const response = await service.search(payload.query, payload.options);

    webview.postMessage({
      type: 'SEARCH_CODEBASE_RESULT',
      requestId,
      payload: {
        response,
        timestamp: new Date().toISOString(),
      },
    });

    log(`Search completed: ${response.results.length} results in ${response.executionTimeMs}ms`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling SEARCH_CODEBASE: ${errorMessage}`);

    // Determine error code based on error message
    let errorCode: 'SEARCH_INDEX_NOT_FOUND' | 'SEARCH_QUERY_EMPTY' | 'SEARCH_DATABASE_ERROR' =
      'SEARCH_DATABASE_ERROR';
    if (errorMessage.includes('not ready')) {
      errorCode = 'SEARCH_INDEX_NOT_FOUND';
    } else if (errorMessage.includes('empty')) {
      errorCode = 'SEARCH_QUERY_EMPTY';
    }

    webview.postMessage({
      type: 'SEARCH_CODEBASE_FAILED',
      requestId,
      payload: {
        errorCode,
        errorMessage,
        query: payload.query,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Handle GET_SETTING message
 */
export async function handleGetSetting(
  payload: GetSettingPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  log(`Handling GET_SETTING request: "${payload.key}"`);

  try {
    const config = vscode.workspace.getConfiguration('cc-wf-studio');
    const value = config.get(payload.key);

    webview.postMessage({
      type: 'GET_SETTING_RESULT',
      requestId,
      payload: {
        key: payload.key,
        value,
      },
    });

    log(`Setting ${payload.key} = ${JSON.stringify(value)}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling GET_SETTING: ${errorMessage}`);

    webview.postMessage({
      type: 'GET_SETTING_RESULT',
      requestId,
      payload: {
        key: payload.key,
        value: undefined,
      },
    });
  }
}

/**
 * Handle SET_SETTING message
 */
export async function handleSetSetting(
  payload: SetSettingPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  log(`Handling SET_SETTING request: "${payload.key}" = ${JSON.stringify(payload.value)}`);

  try {
    const config = vscode.workspace.getConfiguration('cc-wf-studio');
    await config.update(payload.key, payload.value, vscode.ConfigurationTarget.Global);

    webview.postMessage({
      type: 'SET_SETTING_RESULT',
      requestId,
      payload: {
        key: payload.key,
        success: true,
      },
    });

    log(`Setting ${payload.key} updated successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error handling SET_SETTING: ${errorMessage}`);

    webview.postMessage({
      type: 'SET_SETTING_RESULT',
      requestId,
      payload: {
        key: payload.key,
        success: false,
      },
    });
  }
}

/**
 * Handle all codebase index messages
 */
export async function handleCodebaseIndexMessage(
  message: {
    type: string;
    payload?: unknown;
    requestId?: string;
  },
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): Promise<boolean> {
  const requestId = message.requestId || '';

  switch (message.type) {
    case 'BUILD_INDEX':
      await handleBuildIndex(
        message.payload as BuildIndexPayload | undefined,
        webview,
        requestId,
        context
      );
      return true;

    case 'GET_INDEX_STATUS':
      await handleGetIndexStatus(webview, requestId, context);
      return true;

    case 'CANCEL_INDEX_BUILD':
      await handleCancelIndexBuild(webview, requestId);
      return true;

    case 'CLEAR_INDEX':
      await handleClearIndex(webview, requestId);
      return true;

    case 'SEARCH_CODEBASE':
      if (message.payload) {
        await handleSearchCodebase(message.payload as SearchCodebasePayload, webview, requestId);
      } else {
        webview.postMessage({
          type: 'SEARCH_CODEBASE_FAILED',
          requestId,
          payload: {
            errorCode: 'SEARCH_QUERY_EMPTY',
            errorMessage: 'Search payload is required',
            query: '',
            timestamp: new Date().toISOString(),
          },
        });
      }
      return true;

    case 'GET_SETTING':
      if (message.payload) {
        await handleGetSetting(message.payload as GetSettingPayload, webview, requestId);
      }
      return true;

    case 'SET_SETTING':
      if (message.payload) {
        await handleSetSetting(message.payload as SetSettingPayload, webview, requestId);
      }
      return true;

    default:
      return false;
  }
}
