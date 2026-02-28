/**
 * Electron IPC Handlers
 *
 * Routes messages from the renderer process to core services.
 * Mirrors the message routing in the VSCode extension's open-editor.ts,
 * but delegates to core package services instead of VSCode APIs.
 */

import * as path from 'node:path';
import type { IDialogService, IFileSystem, ILogger } from '@cc-wf-studio/core';
import { FileService, type McpServerManager } from '@cc-wf-studio/core';
import type { BrowserWindow, IpcMain } from 'electron';

interface IpcDependencies {
  getMainWindow: () => BrowserWindow | null;
  fs: IFileSystem;
  logger: ILogger;
  dialog: IDialogService;
  mcpManager: McpServerManager;
}

export function setupIpcHandlers(ipcMain: IpcMain, deps: IpcDependencies): void {
  let fileService: FileService | null = null;

  ipcMain.on('webview-message', async (_event, message) => {
    const { type, requestId, payload } = message;
    const win = deps.getMainWindow();

    const reply = (responseType: string, responsePayload?: unknown): void => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('host-message', {
          type: responseType,
          requestId,
          payload: responsePayload,
        });
      }
    };

    try {
      switch (type) {
        case 'WEBVIEW_READY': {
          deps.logger.info('Webview ready');
          // Send initial state
          reply('INITIAL_STATE', { locale: 'en' });
          break;
        }

        case 'SAVE_WORKFLOW': {
          if (!fileService) {
            // Use current working directory as workspace root
            fileService = new FileService(deps.fs, process.cwd());
          }
          await fileService.ensureWorkflowsDirectory();
          const workflow = payload.workflow;
          const filePath = fileService.getWorkflowFilePath(workflow.name);
          await fileService.writeFile(filePath, JSON.stringify(workflow, null, 2));
          reply('SAVE_SUCCESS');
          break;
        }

        case 'LOAD_WORKFLOW_LIST': {
          if (!fileService) {
            fileService = new FileService(deps.fs, process.cwd());
          }
          const files = await fileService.listWorkflowFiles();
          const workflows = [];
          for (const name of files) {
            try {
              const filePath = fileService.getWorkflowFilePath(name);
              const content = await fileService.readFile(filePath);
              workflows.push(JSON.parse(content));
            } catch {
              deps.logger.warn(`Failed to load workflow: ${name}`);
            }
          }
          reply('WORKFLOW_LIST_LOADED', { workflows });
          break;
        }

        case 'EXPORT_WORKFLOW': {
          deps.logger.info('Export workflow requested');
          // Basic export — write to .claude/commands/
          if (!fileService) {
            fileService = new FileService(deps.fs, process.cwd());
          }
          const exportWorkflow = payload.workflow;
          const commandsDir = path.join(process.cwd(), '.claude', 'commands');
          await deps.fs.createDirectory(commandsDir);
          const exportPath = path.join(commandsDir, `${exportWorkflow.name}.md`);
          await deps.fs.writeFile(exportPath, `# ${exportWorkflow.name}\n\nExported workflow.`);
          reply('EXPORT_SUCCESS', { exportedFiles: [exportPath] });
          break;
        }

        case 'STATE_UPDATE': {
          // State persistence — store in localStorage via preload
          deps.logger.info('State update received');
          break;
        }

        case 'OPEN_EXTERNAL_URL': {
          const { shell } = require('electron');
          shell.openExternal(payload.url);
          break;
        }

        case 'GET_CURRENT_WORKFLOW_RESPONSE': {
          deps.mcpManager.handleWorkflowResponse(payload);
          break;
        }

        case 'APPLY_WORKFLOW_FROM_MCP_RESPONSE': {
          deps.mcpManager.handleApplyResponse(payload);
          break;
        }

        default: {
          deps.logger.info(`Unhandled message type: ${type}`);
          break;
        }
      }
    } catch (error) {
      deps.logger.error(`Error handling message ${type}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      reply('ERROR', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
