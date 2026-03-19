/**
 * Claude Code Workflow Studio - VSCode Bridge Service
 *
 * Handles communication between Webview and Extension Host
 * Based on: /specs/001-cc-wf-studio/contracts/extension-webview-api.md section 3
 */

import type {
  AiEditingProvider,
  CheckAnthropicApiKeyResultPayload,
  DeleteCustomSkillSuccessPayload,
  EditorContentUpdatedPayload,
  ExecuteSkillProgressPayload,
  ExecuteUploadedSkillPayload,
  ExecuteUploadedSkillSuccessPayload,
  ExportForAntigravityPayload,
  ExportForAntigravitySuccessPayload,
  ExportForCodexCliPayload,
  ExportForCodexCliSuccessPayload,
  ExportForCopilotCliPayload,
  ExportForCopilotCliSuccessPayload,
  ExportForCopilotPayload,
  ExportForCopilotSuccessPayload,
  ExportForCursorPayload,
  ExportForCursorSuccessPayload,
  ExportForGeminiCliPayload,
  ExportForGeminiCliSuccessPayload,
  ExportForRooCodePayload,
  ExportForRooCodeSuccessPayload,
  ExportWorkflowPayload,
  ExtensionMessage,
  GetChangelogResultPayload,
  GetMcpServerTypesResultPayload,
  GetSavedMcpServerUrlsResultPayload,
  GetSkillVersionDetailsSuccessPayload,
  ListCustomSkillsSuccessPayload,
  LookupMcpRegistryResultPayload,
  OpenInEditorPayload,
  RunAsSlashCommandPayload,
  RunForAntigravityPayload,
  RunForAntigravitySuccessPayload,
  RunForCodexCliPayload,
  RunForCodexCliSuccessPayload,
  RunForCopilotCliPayload,
  RunForCopilotCliSuccessPayload,
  RunForCopilotPayload,
  RunForCopilotSuccessPayload,
  RunForCursorPayload,
  RunForCursorSuccessPayload,
  RunForGeminiCliPayload,
  RunForGeminiCliSuccessPayload,
  RunForRooCodePayload,
  RunForRooCodeSuccessPayload,
  SaveWorkflowPayload,
  UploadDependentSkillSuccessPayload,
  UploadToClaudeApiPayload,
  UploadToClaudeApiSuccessPayload,
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
export function runAsSlashCommand(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<void> {
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
    const payload: RunAsSlashCommandPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
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
export function exportForCopilot(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<ExportForCopilotSuccessPayload> {
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

    const payload: ExportForCopilotPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
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
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
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

    const payload: ExportForCopilotCliPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
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
export function runForCopilot(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<RunForCopilotSuccessPayload> {
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

    const payload: RunForCopilotPayload = { workflow, highlightEnabled: options?.highlightEnabled };
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
export function runForCopilotCli(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<RunForCopilotCliSuccessPayload> {
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

    const payload: RunForCopilotCliPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
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
export function exportForCodexCli(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<ExportForCodexCliSuccessPayload> {
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

    const payload: ExportForCodexCliPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
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
export function runForCodexCli(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<RunForCodexCliSuccessPayload> {
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

    const payload: RunForCodexCliPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
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
// Roo Code Integration Functions (Beta)
// ============================================================================

/**
 * Export workflow for Roo Code (Beta)
 *
 * Exports the workflow to Skills format (.roo/skills/name/SKILL.md)
 *
 * @param workflow - Workflow to export
 * @returns Promise that resolves with export result
 */
export function exportForRooCode(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<ExportForRooCodeSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_FOR_ROO_CODE_SUCCESS') {
          resolve(message.payload as ExportForRooCodeSuccessPayload);
        } else if (message.type === 'EXPORT_FOR_ROO_CODE_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            skillName: '',
            skillPath: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'EXPORT_FOR_ROO_CODE_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to export for Roo Code'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExportForRooCodePayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'EXPORT_FOR_ROO_CODE',
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
 * Run workflow for Roo Code (Beta)
 *
 * Exports the workflow to Roo Code Skills format and starts
 * Roo Code with :skill command via Extension API
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves with run result
 */
export function runForRooCode(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<RunForRooCodeSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_FOR_ROO_CODE_SUCCESS') {
          resolve(message.payload as RunForRooCodeSuccessPayload);
        } else if (message.type === 'RUN_FOR_ROO_CODE_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            workflowName: '',
            rooCodeOpened: false,
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'RUN_FOR_ROO_CODE_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run for Roo Code'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: RunForRooCodePayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'RUN_FOR_ROO_CODE',
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
// Gemini CLI Integration Functions (Beta)
// ============================================================================

/**
 * Export workflow for Gemini CLI (Beta)
 *
 * Exports the workflow to Skills format (.gemini/skills/name/SKILL.md)
 *
 * @param workflow - Workflow to export
 * @returns Promise that resolves with export result
 */
export function exportForGeminiCli(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<ExportForGeminiCliSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_FOR_GEMINI_CLI_SUCCESS') {
          resolve(message.payload as ExportForGeminiCliSuccessPayload);
        } else if (message.type === 'EXPORT_FOR_GEMINI_CLI_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            skillName: '',
            skillPath: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'EXPORT_FOR_GEMINI_CLI_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to export for Gemini CLI'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExportForGeminiCliPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'EXPORT_FOR_GEMINI_CLI',
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
 * Run workflow for Gemini CLI (Beta)
 *
 * Exports the workflow to Gemini Skills format and runs it via
 * Gemini CLI terminal
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves with run result
 */
export function runForGeminiCli(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<RunForGeminiCliSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_FOR_GEMINI_CLI_SUCCESS') {
          resolve(message.payload as RunForGeminiCliSuccessPayload);
        } else if (message.type === 'RUN_FOR_GEMINI_CLI_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            workflowName: '',
            terminalName: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'RUN_FOR_GEMINI_CLI_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run for Gemini CLI'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: RunForGeminiCliPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'RUN_FOR_GEMINI_CLI',
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
// Antigravity Integration
// ============================================================================

/**
 * Export workflow for Antigravity
 *
 * Exports the workflow to Skills format (.claude/skills/name/SKILL.md)
 *
 * @param workflow - Workflow to export
 * @returns Promise that resolves with export result
 */
export function exportForAntigravity(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<ExportForAntigravitySuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_FOR_ANTIGRAVITY_SUCCESS') {
          resolve(message.payload as ExportForAntigravitySuccessPayload);
        } else if (message.type === 'EXPORT_FOR_ANTIGRAVITY_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            skillName: '',
            skillPath: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'EXPORT_FOR_ANTIGRAVITY_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to export for Antigravity'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExportForAntigravityPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'EXPORT_FOR_ANTIGRAVITY',
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
 * Run workflow for Antigravity
 *
 * Exports the workflow to Skills format and runs it via Antigravity (Cascade)
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves with run result
 */
export function runForAntigravity(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<RunForAntigravitySuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_FOR_ANTIGRAVITY_SUCCESS') {
          resolve(message.payload as RunForAntigravitySuccessPayload);
        } else if (message.type === 'RUN_FOR_ANTIGRAVITY_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            workflowName: '',
            antigravityOpened: false,
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'RUN_FOR_ANTIGRAVITY_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run for Antigravity'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: RunForAntigravityPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'RUN_FOR_ANTIGRAVITY',
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
// Cursor Integration
// ============================================================================

/**
 * Export workflow for Cursor
 *
 * Exports the workflow to Skills format (.cursor/skills/name/SKILL.md)
 *
 * @param workflow - Workflow to export
 * @returns Promise that resolves with export result
 */
export function exportForCursor(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<ExportForCursorSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'EXPORT_FOR_CURSOR_SUCCESS') {
          resolve(message.payload as ExportForCursorSuccessPayload);
        } else if (message.type === 'EXPORT_FOR_CURSOR_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            skillName: '',
            skillPath: '',
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'EXPORT_FOR_CURSOR_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to export for Cursor'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExportForCursorPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'EXPORT_FOR_CURSOR',
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
 * Run workflow for Cursor
 *
 * Exports the workflow to Skills format and runs it via Cursor
 *
 * @param workflow - Workflow to run
 * @returns Promise that resolves with run result
 */
export function runForCursor(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): Promise<RunForCursorSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_FOR_CURSOR_SUCCESS') {
          resolve(message.payload as RunForCursorSuccessPayload);
        } else if (message.type === 'RUN_FOR_CURSOR_CANCELLED') {
          // User cancelled - resolve with empty result
          resolve({
            workflowName: '',
            cursorOpened: false,
            timestamp: new Date().toISOString(),
          });
        } else if (message.type === 'RUN_FOR_CURSOR_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run for Cursor'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: RunForCursorPayload = {
      workflow,
      highlightEnabled: options?.highlightEnabled,
    };
    vscode.postMessage({
      type: 'RUN_FOR_CURSOR',
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
// One-Click AI Agent Launch
// ============================================================================

/**
 * Launch AI agent with one-click orchestration
 *
 * Automatically starts MCP server, writes config, and launches the skill.
 *
 * @param provider - AI editing provider to launch
 * @returns Promise that resolves when agent is launched
 */
export function launchAiAgent(provider: AiEditingProvider): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (
          message.type === 'LAUNCH_AI_AGENT_SUCCESS' ||
          message.type === 'ANTIGRAVITY_MCP_REFRESH_NEEDED'
        ) {
          resolve();
        } else if (message.type === 'LAUNCH_AI_AGENT_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to launch AI agent'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'LAUNCH_AI_AGENT',
      requestId,
      payload: { provider },
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

/**
 * Run AI editing skill with specified provider
 *
 * Generates a skill template and launches the provider to run it.
 * The AI agent will use MCP tools to interact with the workflow canvas.
 *
 * @param provider - AI editing provider to use
 * @returns Promise that resolves when skill is launched
 */
export function runAiEditingSkill(provider: AiEditingProvider): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'RUN_AI_EDITING_SKILL_SUCCESS') {
          resolve();
        } else if (message.type === 'RUN_AI_EDITING_SKILL_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to run AI editing skill'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'RUN_AI_EDITING_SKILL',
      requestId,
      payload: { provider },
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 15000);
  });
}

/**
 * Upload workflow to Claude API as Custom Skill
 */
export function uploadToClaudeApi(workflow: Workflow): Promise<UploadToClaudeApiSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'UPLOAD_TO_CLAUDE_API_SUCCESS') {
          resolve(message.payload as UploadToClaudeApiSuccessPayload);
        } else if (message.type === 'UPLOAD_TO_CLAUDE_API_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to upload to Claude API'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: UploadToClaudeApiPayload = { workflow };
    vscode.postMessage({ type: 'UPLOAD_TO_CLAUDE_API', requestId, payload });

    // Timeout after 60 seconds (API communication)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 60000);
  });
}

/**
 * Execute an uploaded skill via Messages API (with streaming support)
 */
export function executeUploadedSkill(
  skillId: string,
  prompt: string,
  model: string,
  onProgress?: (payload: { chunk: string; accumulatedText: string }) => void,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  containerId?: string,
  mcpServers?: Array<{ id: string; url: string; authorization_token?: string }>,
  additionalSkillIds?: string[],
  system?: string
): Promise<ExecuteUploadedSkillSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        if (message.type === 'EXECUTE_SKILL_PROGRESS') {
          const progress = message.payload as ExecuteSkillProgressPayload;
          onProgress?.({ chunk: progress.chunk, accumulatedText: progress.accumulatedText });
          return; // Keep listener active for more chunks
        }

        window.removeEventListener('message', handler);

        if (message.type === 'EXECUTE_UPLOADED_SKILL_SUCCESS') {
          resolve(message.payload as ExecuteUploadedSkillSuccessPayload);
        } else if (message.type === 'EXECUTE_UPLOADED_SKILL_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to execute skill'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: ExecuteUploadedSkillPayload = {
      skillId,
      prompt,
      model,
      conversationHistory,
      containerId,
      mcpServers,
      additionalSkillIds,
      system,
    };
    vscode.postMessage({ type: 'EXECUTE_UPLOADED_SKILL', requestId, payload });

    // Timeout after 300 seconds (streaming execution can be slow)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 300000);
  });
}

/**
 * List custom skills from Claude API
 */
export function listCustomSkills(): Promise<ListCustomSkillsSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'LIST_CUSTOM_SKILLS_SUCCESS') {
          resolve(message.payload as ListCustomSkillsSuccessPayload);
        } else if (message.type === 'LIST_CUSTOM_SKILLS_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to list skills'));
        }
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'LIST_CUSTOM_SKILLS', requestId });

    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

/**
 * Delete a custom skill from Claude API
 */
export function deleteCustomSkill(skillId: string): Promise<DeleteCustomSkillSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'DELETE_CUSTOM_SKILL_SUCCESS') {
          resolve(message.payload as DeleteCustomSkillSuccessPayload);
        } else if (message.type === 'DELETE_CUSTOM_SKILL_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to delete skill'));
        }
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'DELETE_CUSTOM_SKILL', requestId, payload: { skillId } });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Store Anthropic API key in secure storage
 */
export function storeAnthropicApiKey(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'STORE_ANTHROPIC_API_KEY_SUCCESS') {
          resolve();
        } else {
          reject(
            new Error(
              (message.payload as { errorMessage?: string })?.errorMessage ||
                'Failed to store API key'
            )
          );
        }
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'STORE_ANTHROPIC_API_KEY', requestId, payload: { apiKey } });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Check if Anthropic API key is configured
 */
export function checkAnthropicApiKey(): Promise<CheckAnthropicApiKeyResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'CHECK_ANTHROPIC_API_KEY_RESULT') {
          resolve(message.payload as CheckAnthropicApiKeyResultPayload);
        } else {
          reject(new Error('Failed to check API key'));
        }
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'CHECK_ANTHROPIC_API_KEY', requestId });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Clear Anthropic API key from secure storage
 */
export function clearAnthropicApiKey(): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'CLEAR_ANTHROPIC_API_KEY_SUCCESS') {
          resolve();
        } else {
          reject(new Error('Failed to clear API key'));
        }
      }
    };

    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'CLEAR_ANTHROPIC_API_KEY', requestId });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Get MCP server types for a list of server IDs
 *
 * @param serverIds - Array of server IDs to check
 * @returns Promise that resolves with server types
 */
export function getMcpServerTypes(serverIds: string[]): Promise<GetMcpServerTypesResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'GET_MCP_SERVER_TYPES_RESULT') {
          resolve(message.payload as GetMcpServerTypesResultPayload);
        } else {
          reject(new Error('Failed to get MCP server types'));
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'GET_MCP_SERVER_TYPES', requestId, payload: { serverIds } });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Get saved response language from global state
 */
export function getResponseLanguage(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'GET_RESPONSE_LANGUAGE_RESULT') {
          resolve((message.payload as { language: string | null }).language);
        } else {
          reject(new Error('Failed to get response language'));
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'GET_RESPONSE_LANGUAGE', requestId });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Save response language to global state
 */
export function saveResponseLanguage(language: string): void {
  vscode.postMessage({ type: 'SET_RESPONSE_LANGUAGE', payload: { language } });
}

/**
 * Upload a dependent skill file directly to Claude API
 */
export function uploadDependentSkill(
  skillName: string,
  skillPath: string
): Promise<UploadDependentSkillSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'UPLOAD_DEPENDENT_SKILL_SUCCESS') {
          resolve(message.payload as UploadDependentSkillSuccessPayload);
        } else if (message.type === 'UPLOAD_DEPENDENT_SKILL_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to upload dependent skill'));
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({
      type: 'UPLOAD_DEPENDENT_SKILL',
      requestId,
      payload: { skillName, skillPath },
    });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 60000);
  });
}

/**
 * Get saved MCP server URLs from globalState
 */
export function getSavedMcpServerUrls(): Promise<GetSavedMcpServerUrlsResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'GET_SAVED_MCP_SERVER_URLS_RESULT') {
          resolve(message.payload as GetSavedMcpServerUrlsResultPayload);
        } else {
          reject(new Error('Failed to get saved MCP server URLs'));
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'GET_SAVED_MCP_SERVER_URLS', requestId });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Save MCP server URLs to globalState
 */
export function saveMcpServerUrls(urls: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'SAVE_MCP_SERVER_URLS_SUCCESS') {
          resolve();
        } else {
          reject(new Error('Failed to save MCP server URLs'));
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'SAVE_MCP_SERVER_URLS', requestId, payload: { urls } });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Lookup MCP server URLs from the official MCP Registry
 */
export function lookupMcpRegistry(serverIds: string[]): Promise<LookupMcpRegistryResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'LOOKUP_MCP_REGISTRY_RESULT') {
          resolve(message.payload as LookupMcpRegistryResultPayload);
        } else {
          reject(new Error('Failed to lookup MCP registry'));
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'LOOKUP_MCP_REGISTRY', requestId, payload: { serverIds } });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Get skill version details from Claude API.
 */
export function getSkillVersionDetails(
  skillId: string,
  version: string
): Promise<GetSkillVersionDetailsSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'GET_SKILL_VERSION_DETAILS_SUCCESS') {
          resolve(message.payload as GetSkillVersionDetailsSuccessPayload);
        } else {
          reject(
            new Error(
              (message.payload as { errorMessage?: string })?.errorMessage ||
                'Failed to get skill version details'
            )
          );
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({
      type: 'GET_SKILL_VERSION_DETAILS',
      requestId,
      payload: { skillId, version },
    });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Get changelog entries from CHANGELOG.md
 */
export function getChangelog(): Promise<GetChangelogResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);
        if (message.type === 'GET_CHANGELOG_RESULT') {
          resolve(message.payload as GetChangelogResultPayload);
        } else {
          reject(new Error('Failed to get changelog'));
        }
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'GET_CHANGELOG', requestId });
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 10000);
  });
}

/**
 * Mark changelog as read (fire-and-forget)
 */
export function markChangelogRead(): void {
  vscode.postMessage({ type: 'MARK_CHANGELOG_READ' });
}

/**
 * Set whether to show the What's New badge (fire-and-forget)
 */
export function setWhatsNewBadge(show: boolean): void {
  vscode.postMessage({ type: 'SET_WHATS_NEW_BADGE', payload: { show } });
}
