/**
 * Web Bridge Adapter
 *
 * IHostBridge implementation for standalone web app mode.
 * Uses WebSocket for communication with the Hono backend server,
 * maintaining the same message protocol as the VSCode postMessage API.
 */

import type { IHostBridge } from './bridge';

const WS_RECONNECT_DELAY = 2000;
const WS_MAX_RECONNECT_ATTEMPTS = 10;

export function createWebBridge(): IHostBridge {
  let socket: WebSocket | null = null;
  let messageHandler: ((event: { data: unknown }) => void) | null = null;
  let reconnectAttempts = 0;
  let pendingMessages: string[] = [];

  function getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  function connect(): void {
    try {
      socket = new WebSocket(getWebSocketUrl());

      socket.onopen = () => {
        console.log('[Web Bridge] WebSocket connected');
        reconnectAttempts = 0;

        // Send any queued messages
        for (const msg of pendingMessages) {
          socket?.send(msg);
        }
        pendingMessages = [];
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);
          // Handle special web-mode messages
          if (data.type === 'OPEN_URL' && data.payload?.url) {
            window.open(data.payload.url, '_blank');
            return;
          }
          // Forward to registered handler as if it were a postMessage event
          messageHandler?.({ data });
        } catch {
          console.error('[Web Bridge] Failed to parse message:', event.data);
        }
      };

      socket.onclose = () => {
        console.log('[Web Bridge] WebSocket disconnected');
        socket = null;

        if (reconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(
            `[Web Bridge] Reconnecting (attempt ${reconnectAttempts}/${WS_MAX_RECONNECT_ATTEMPTS})...`
          );
          setTimeout(connect, WS_RECONNECT_DELAY);
        } else {
          console.error('[Web Bridge] Max reconnection attempts reached');
        }
      };

      socket.onerror = (error) => {
        console.error('[Web Bridge] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[Web Bridge] Failed to create WebSocket:', error);
    }
  }

  // Initiate connection
  connect();

  return {
    postMessage: (message: { type: string; requestId?: string; payload?: unknown }) => {
      const serialized = JSON.stringify(message);

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      } else {
        // Queue message for when connection is established
        pendingMessages.push(serialized);
      }
    },

    onMessage: (handler: (event: { data: unknown }) => void) => {
      messageHandler = handler;
      return () => {
        messageHandler = null;
      };
    },

    getState: () => {
      try {
        return JSON.parse(localStorage.getItem('cc-wf-studio-state') || 'null');
      } catch {
        return null;
      }
    },

    setState: (state: unknown) => {
      try {
        localStorage.setItem('cc-wf-studio-state', JSON.stringify(state));
      } catch {
        console.error('[Web Bridge] Failed to persist state');
      }
    },
  };
}
