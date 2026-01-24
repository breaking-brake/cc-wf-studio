/**
 * Claude Code Workflow Studio - VSCode Bridge Service
 *
 * Handles communication between Webview and Extension Host
 * Based on: /specs/001-cc-wf-studio/contracts/extension-webview-api.md section 3
 */

import type {
  EditorContentUpdatedPayload,
  ExportForCodexCliPayload,
  ExportForCodexCliSuccessPayload,
  ExportForCopilotCliPayload,
  ExportForCopilotCliSuccessPayload,
  ExportForCopilotPayload,
  ExportForCopilotSuccessPayload,
  ExportWorkflowPayload,
  ExtensionMessage,
  OpenInEditorPayload,
  RunAsSlashCommandPayload,
  RunForCodexCliPayload,
  RunForCodexCliSuccessPayload,
  RunForCopilotCliPayload,
  RunForCopilotCliSuccessPayload,
  RunForCopilotPayload,
  RunForCopilotSuccessPayload,
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

/**
 * Open text content in VSCode's native editor
 *
 * Allows users to edit content with full editor features (vim keybindings, themes, etc.)
 *
 * @param content - Current text content to edit
 * @param label - Optional label for the editor tab
 * @param language - Language mode for syntax highlighting (default: 'markdown')
 * @returns Promise that resolves with the updated content when user saves or closes
 */
export function openInEditor(
  content: string,
  label?: string,
  language?: 'markdown' | 'plaintext'
): Promise<EditorContentUpdatedPayload> {
  return new Promise((resolve) => {
    const sessionId = `editor-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.type === 'EDITOR_CONTENT_UPDATED' && message.payload?.sessionId === sessionId) {
        window.removeEventListener('message', handler);
        resolve(message.payload as EditorContentUpdatedPayload);
      }
    };

    window.addEventListener('message', handler);

    // Send request
    const payload: OpenInEditorPayload = {
      sessionId,
      content,
      label,
      language,
    };
    vscode.postMessage({
      type: 'OPEN_IN_EDITOR',
      payload,
    });

    // No timeout - user may take as long as they want to edit
  });
}

// ============================================================================
// Copilot Integration Functions (Beta)
// ============================================================================

/**
 * Export workflow for Copilot (Beta)
 *
 * Exports the workflow to Copilot Prompts format (.github/prompts/*.prompt.md)
 *
 * @param workflow - Workflow to export
 * @returns Promise that resolves with export result
 */
export function exportForCopilot(workflow: Workflow): Promise<ExportForCopilotSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_FOR_COPILOT_SUCCESS') {
          resolve(message.payload as ExportForCopilotSuccessPayload);
        } else if (message.type === 'EXPORT_FOR_COPILOT_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            exportedFiles: [],
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'EXPORT_FOR_COPILOT_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to export for Copilot'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExportForCopilotPayload = { workflow };
    vscode.postMessage({
      type: 'EXPORT_FOR_COPILOT',
      requestId,
      payload,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

/**
 * Export workflow for Copilot CLI (Beta)
 *
 * Exports the workflow to Skills format (.github/skills/name/SKILL.md)
 *
 * @param workflow - Workflow to export
 * @returns Promise that resolves with export result
 */
export function exportForCopilotCli(
  workflow: Workflow
): Promise<ExportForCopilotCliSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_FOR_COPILOT_CLI_SUCCESS') {
          resolve(message.payload as ExportForCopilotCliSuccessPayload);
        } else if (message.type === 'EXPORT_FOR_COPILOT_CLI_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            skillName: '',
            skillPath: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'EXPORT_FOR_COPILOT_CLI_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to export for Copilot CLI'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExportForCopilotCliPayload = { workflow };
    vscode.postMessage({
      type: 'EXPORT_FOR_COPILOT_CLI',
      requestId,
      payload,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

/**
 * Run workflow for Copilot (Beta)
 *
 * Exports the workflow to Copilot Prompts format and opens Copilot Chat
 * with the generated prompt
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves with run result
 */
export function runForCopilot(workflow: Workflow): Promise<RunForCopilotSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_FOR_COPILOT_SUCCESS') {
          resolve(message.payload as RunForCopilotSuccessPayload);
        } else if (message.type === 'RUN_FOR_COPILOT_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run for Copilot'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: RunForCopilotPayload = { workflow };
    vscode.postMessage({
      type: 'RUN_FOR_COPILOT',
      requestId,
      payload,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

/**
 * Run workflow for Copilot CLI (Beta)
 *
 * Exports the workflow to Copilot Prompts format and runs it via
 * Claude Code terminal using the copilot-cli-slash-command Skill
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves with run result
 */
export function runForCopilotCli(workflow: Workflow): Promise<RunForCopilotCliSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_FOR_COPILOT_CLI_SUCCESS') {
          resolve(message.payload as RunForCopilotCliSuccessPayload);
        } else if (message.type === 'RUN_FOR_COPILOT_CLI_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run for Copilot CLI'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: RunForCopilotCliPayload = { workflow };
    vscode.postMessage({
      type: 'RUN_FOR_COPILOT_CLI',
      requestId,
      payload,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

// ============================================================================
// Codex CLI Integration Functions (Beta)
// ============================================================================

/**
 * Export workflow for Codex CLI (Beta)
 *
 * Exports the workflow to Skills format (.codex/skills/name/SKILL.md)
 *
 * @param workflow - Workflow to export
 * @returns Promise that resolves with export result
 */
export function exportForCodexCli(workflow: Workflow): Promise<ExportForCodexCliSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_FOR_CODEX_CLI_SUCCESS') {
          resolve(message.payload as ExportForCodexCliSuccessPayload);
        } else if (message.type === 'EXPORT_FOR_CODEX_CLI_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            skillName: '',
            skillPath: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'EXPORT_FOR_CODEX_CLI_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to export for Codex CLI'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExportForCodexCliPayload = { workflow };
    vscode.postMessage({
      type: 'EXPORT_FOR_CODEX_CLI',
      requestId,
      payload,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

/**
 * Run workflow for Codex CLI (Beta)
 *
 * Exports the workflow to Codex Skills format and runs it via
 * Codex CLI terminal using $skill-name format
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves with run result
 */
export function runForCodexCli(workflow: Workflow): Promise<RunForCodexCliSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_FOR_CODEX_CLI_SUCCESS') {
          resolve(message.payload as RunForCodexCliSuccessPayload);
        } else if (message.type === 'RUN_FOR_CODEX_CLI_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            workflowName: '',
            terminalName: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'RUN_FOR_CODEX_CLI_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run for Codex CLI'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: RunForCodexCliPayload = { workflow };
    vscode.postMessage({
      type: 'RUN_FOR_CODEX_CLI',
      requestId,
      payload,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Open external URL in browser
 *
 * Sends a message to the extension host to open the URL in the user's default browser.
 * This is necessary because webview content cannot directly open external URLs.
 *
 * @param url - URL to open
 */
export function openExternalUrl(url: string): void {
  vscode.postMessage({
    type: 'OPEN_EXTERNAL_URL',
    payload: { url },
  });
}
