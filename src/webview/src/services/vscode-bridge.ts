/**
 * Claude Code Workflow Studio - VSCode Bridge Service
 *
 * Handles communication between Webview and Extension Host
 * Based on: /specs/001-cc-wf-studio/contracts/extension-webview-api.md section 3
 */

import type {
  ExportWorkflowPayload,
  ExtensionMessage,
  RunAsSlashCommandPayload,
  SaveWorkflowPayload,
  Workflow,
} from '@shared/types/messages';
import { vscode } from '../main';

/**
 * Send a save workflow request to the extension
 *
 * @param workflow - Workflow to save
 * @returns Promise that resolves when save is successful
 */
export function saveWorkflow(workflow: Workflow): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SAVE_SUCCESS') {
          resolve();
        } else if (message.type === 'SAVE_CANCELLED') {
          // User cancelled save - resolve silently without showing error
          resolve();
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload?.message || 'Failed to save workflow'));
        }
      }
    };

    window.addEventListener('message', handler);

    // Send request
    const payload: SaveWorkflowPayload = { workflow };
    vscode.postMessage({
      type: 'SAVE_WORKFLOW',
      requestId,
      payload,
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Send an export workflow request to the extension
 *
 * @param workflow - Workflow to export
 * @param overwriteExisting - Whether to overwrite existing files
 * @returns Promise that resolves when export is successful
 */
export function exportWorkflow(workflow: Workflow, overwriteExisting = false): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_SUCCESS') {
          resolve(message.payload?.exportedFiles || []);
        } else if (message.type === 'EXPORT_CANCELLED') {
          // User cancelled export - resolve silently without showing error
          resolve([]);
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload?.message || 'Failed to export workflow'));
        }
      }
    };

    window.addEventListener('message', handler);

    // Send request
    const payload: ExportWorkflowPayload = { workflow, overwriteExisting };
    vscode.postMessage({
      type: 'EXPORT_WORKFLOW',
      requestId,
      payload,
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Request workflow list from the extension
 *
 * @returns Promise that resolves when workflow list is received
 */
export function loadWorkflowList(): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'WORKFLOW_LIST_LOADED') {
          resolve();
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload?.message || 'Failed to load workflow list'));
        }
      }
    };

    window.addEventListener('message', handler);

    // Send request
    vscode.postMessage({
      type: 'LOAD_WORKFLOW_LIST',
      requestId,
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Send a state update to the extension (for persistence)
 *
 * @param nodes - Current nodes
 * @param edges - Current edges
 * @param selectedNodeId - Currently selected node ID
 */
export function sendStateUpdate(
  nodes: unknown[],
  edges: unknown[],
  selectedNodeId: string | null
): void {
  vscode.postMessage({
    type: 'STATE_UPDATE',
    payload: {
      nodes,
      edges,
      selectedNodeId,
    },
  });
}

/**
 * Run workflow as slash command in VSCode terminal
 *
 * This function exports the workflow to .claude format and then
 * runs it as a slash command in a new VSCode integrated terminal.
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves when run starts successfully
 */
export function runAsSlashCommand(workflow: Workflow): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_AS_SLASH_COMMAND_SUCCESS') {
          resolve();
        } else if (message.type === 'RUN_AS_SLASH_COMMAND_CANCELLED') {
          // User cancelled run - resolve silently without showing error
          resolve();
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload?.message || 'Failed to run workflow'));
        }
      }
    };

    window.addEventListener('message', handler);

    // Send request
    const payload: RunAsSlashCommandPayload = { workflow };
    vscode.postMessage({
      type: 'RUN_AS_SLASH_COMMAND',
      requestId,
      payload,
    });

    // Timeout after 30 seconds (export + terminal creation may take time)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}
