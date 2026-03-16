/**
 * Command Browser Service - Webview to Extension Communication
 *
 * Feature: 636 - Sub-Agent "Use Existing Command" support
 * Purpose: Request command browsing from Extension Host
 */

import type {
  CommandReference,
  CreateSubAgentPayload,
  SubAgentCreationSuccessPayload,
} from '../../../shared/types/messages';

declare const vscode: {
  postMessage: (message: unknown) => void;
};

const REQUEST_TIMEOUT = 10000;

/**
 * Browse available commands (user + project)
 *
 * Sends BROWSE_COMMANDS message to Extension Host and waits for COMMAND_LIST_LOADED response.
 */
export async function browseCommands(): Promise<CommandReference[]> {
  return new Promise((resolve, reject) => {
    const requestId = `browse-cmd-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return;
      }

      if (message.type === 'COMMAND_LIST_LOADED') {
        window.removeEventListener('message', handler);
        resolve(message.payload.commands);
      } else if (message.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload.message));
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'BROWSE_COMMANDS',
      requestId,
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: BROWSE_COMMANDS took longer than 10 seconds'));
    }, REQUEST_TIMEOUT);
  });
}

/**
 * Create a Sub-Agent file (.claude/agents/{name}.md)
 *
 * Sends CREATE_SUB_AGENT message to Extension Host and waits for SUB_AGENT_CREATION_SUCCESS response.
 */
export async function createSubAgent(
  payload: CreateSubAgentPayload
): Promise<SubAgentCreationSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `create-agent-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return;
      }

      if (message.type === 'SUB_AGENT_CREATION_SUCCESS') {
        window.removeEventListener('message', handler);
        resolve(message.payload);
      } else if (message.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload.message));
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'CREATE_SUB_AGENT',
      requestId,
      payload,
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: CREATE_SUB_AGENT took longer than 10 seconds'));
    }, REQUEST_TIMEOUT);
  });
}
