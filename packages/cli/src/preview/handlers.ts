/**
 * Preview-mode message handlers.
 *
 * The webview was originally built against the VSCode extension's message
 * contract; here we re-implement just enough of it to:
 *   - boot the canvas with a single workflow file (`WEBVIEW_READY`)
 *   - answer the workflow list / load / save requests
 *   - persist the file when the user clicks "Save"
 * Everything else (Slack, Claude API, MCP, export-for-*) returns an `ERROR`
 * envelope with a friendly "Not available in preview mode" message so the
 * webview shows the failure inline instead of hanging forever.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type Workflow, migrateWorkflow } from '@cc-wf-studio/core';
import type { PreviewServerHandlers } from './server.js';

// Local shape declarations for the message envelopes the webview expects.
// These mirror `packages/vscode/src/shared/types/messages.ts` for the handful
// of types preview actually answers. Keeping a small local copy avoids reaching
// into vscode's source tree from the CLI build.
interface InitialStatePayload {
  isFirstTimeUser: boolean;
  unreadReleaseCount: number;
  showWhatsNewBadge: boolean;
  extensionVersion: string;
  recentWorkflows?: Array<{ id: string; name: string }>;
}
interface LoadWorkflowPayload {
  workflow: Workflow;
}
interface LoadWorkflowRequestPayload {
  workflowId: string;
}
interface SaveSuccessPayload {
  filePath: string;
  timestamp: string;
}
interface SaveWorkflowPayload {
  workflow: Workflow;
}
interface WorkflowListPayload {
  workflows: Array<{ id: string; name: string; description?: string; updatedAt: string }>;
}

interface IncomingMessage {
  type?: string;
  requestId?: string;
  payload?: unknown;
}

export interface PreviewHandlersOptions {
  /** Absolute path to the workflow JSON the user passed to `ccwf preview`. */
  workflowPath: string;
}

// Heuristic: any message type that starts with one of these prefixes is
// extension-side functionality the preview server intentionally does not
// implement. Listed by prefix so adding a new export-for-X message in the
// future continues to surface a clean "not available" error here.
const UNSUPPORTED_PREFIXES: readonly string[] = [
  'EXPORT_',
  'RUN_',
  'LAUNCH_',
  'SLACK_',
  'SHARE_',
  'IMPORT_',
  'UPLOAD_',
  'EXECUTE_',
  'LIST_CUSTOM_',
  'DELETE_CUSTOM_',
  'STORE_ANTHROPIC_',
  'CHECK_ANTHROPIC_',
  'CLEAR_ANTHROPIC_',
  'GET_MCP_',
  'GET_SAVED_MCP_',
  'SAVE_MCP_',
  'LOOKUP_MCP_',
  'GET_SKILL_',
  'GET_CHANGELOG',
  'MARK_CHANGELOG_',
  'SET_WHATS_NEW_',
  'UPLOAD_DEPENDENT_',
];

function isPreviewUnsupported(type: string): boolean {
  return UNSUPPORTED_PREFIXES.some((prefix) => type.startsWith(prefix));
}

export function createPreviewHandlers(options: PreviewHandlersOptions): PreviewServerHandlers {
  const workflowAbsPath = path.resolve(options.workflowPath);
  const workflowId = path.basename(workflowAbsPath, '.json');
  const workflowDisplayName = workflowId;

  async function readWorkflowFromDisk() {
    const raw = await fs.readFile(workflowAbsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return migrateWorkflow(parsed);
  }

  return {
    async onMessage(raw, send) {
      const message = (raw ?? {}) as IncomingMessage;
      const type = typeof message.type === 'string' ? message.type : '';
      const requestId = typeof message.requestId === 'string' ? message.requestId : undefined;

      switch (type) {
        case 'WEBVIEW_READY': {
          const initialState: InitialStatePayload = {
            isFirstTimeUser: false,
            unreadReleaseCount: 0,
            showWhatsNewBadge: false,
            extensionVersion: 'ccwf-preview',
            recentWorkflows: [{ id: workflowId, name: workflowDisplayName }],
          };
          send({ type: 'INITIAL_STATE', payload: initialState });
          try {
            const workflow = await readWorkflowFromDisk();
            const payload: LoadWorkflowPayload = { workflow };
            send({ type: 'LOAD_WORKFLOW', payload });
          } catch (error) {
            send({
              type: 'ERROR',
              payload: {
                code: 'LOAD_FAILED',
                message: `Failed to read ${workflowAbsPath}: ${error instanceof Error ? error.message : String(error)}`,
              },
            });
          }
          return;
        }

        case 'LOAD_WORKFLOW_LIST': {
          const payload: WorkflowListPayload = {
            workflows: [
              {
                id: workflowId,
                name: workflowDisplayName,
                updatedAt: new Date().toISOString(),
              },
            ],
          };
          send({ type: 'WORKFLOW_LIST_LOADED', requestId, payload });
          return;
        }

        case 'LOAD_WORKFLOW': {
          const req = (message.payload ?? {}) as LoadWorkflowRequestPayload;
          if (req.workflowId && req.workflowId !== workflowId) {
            send({
              type: 'ERROR',
              requestId,
              payload: {
                code: 'LOAD_FAILED',
                message: `Preview only serves "${workflowId}"; "${req.workflowId}" is unavailable.`,
              },
            });
            return;
          }
          try {
            const workflow = await readWorkflowFromDisk();
            const payload: LoadWorkflowPayload = { workflow };
            send({ type: 'LOAD_WORKFLOW', requestId, payload });
          } catch (error) {
            send({
              type: 'ERROR',
              requestId,
              payload: {
                code: 'LOAD_FAILED',
                message: `Failed to read ${workflowAbsPath}: ${error instanceof Error ? error.message : String(error)}`,
              },
            });
          }
          return;
        }

        case 'SAVE_WORKFLOW': {
          const save = (message.payload ?? {}) as SaveWorkflowPayload;
          if (!save.workflow) {
            send({
              type: 'ERROR',
              requestId,
              payload: { code: 'INVALID_PAYLOAD', message: 'SAVE_WORKFLOW missing workflow.' },
            });
            return;
          }
          try {
            const contents = `${JSON.stringify(save.workflow, null, 2)}\n`;
            await fs.writeFile(workflowAbsPath, contents, 'utf-8');
            const payload: SaveSuccessPayload = {
              filePath: workflowAbsPath,
              timestamp: new Date().toISOString(),
            };
            send({ type: 'SAVE_SUCCESS', requestId, payload });
          } catch (error) {
            send({
              type: 'ERROR',
              requestId,
              payload: {
                code: 'SAVE_FAILED',
                message: `Failed to write ${workflowAbsPath}: ${error instanceof Error ? error.message : String(error)}`,
              },
            });
          }
          return;
        }

        case 'STATE_UPDATE':
          // State persistence is a no-op in preview; the canvas already has
          // the latest state in memory.
          return;

        case 'OPEN_EXTERNAL_URL':
          // The browser can follow external links itself; ignore silently.
          return;

        default:
          if (isPreviewUnsupported(type)) {
            send({
              type: 'ERROR',
              requestId,
              payload: {
                code: 'PREVIEW_UNSUPPORTED',
                message: `'${type}' is not available in preview mode (it requires the full VSCode extension).`,
              },
            });
            return;
          }
          // Unknown message type — log on the server side but stay silent to
          // the client so we don't break unrelated flows.
          console.warn(`[ccwf preview] Ignoring unknown message: ${type || '(no type)'}`);
      }
    },
  };
}
