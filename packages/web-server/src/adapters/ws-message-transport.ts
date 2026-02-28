/**
 * WebSocket Message Transport
 *
 * IMessageTransport implementation using WebSocket.
 * Used by McpServerManager to communicate with the browser client.
 */

import type { IMessageTransport } from '@cc-wf-studio/core';
import type { WebSocketMessageSender } from '../routes/ws-handler.js';

export class WebSocketMessageTransport implements IMessageTransport {
  private sender: WebSocketMessageSender | null = null;
  private handler:
    | ((message: { type: string; requestId?: string; payload?: unknown }) => void)
    | null = null;

  setSender(sender: WebSocketMessageSender | null): void {
    this.sender = sender;
  }

  postMessage(message: { type: string; requestId?: string; payload?: unknown }): void {
    this.sender?.(message);
  }

  onMessage(
    handler: (message: { type: string; requestId?: string; payload?: unknown }) => void
  ): void {
    this.handler = handler;
  }

  /** Called by the WS handler when a message arrives from the client */
  handleIncomingMessage(message: { type: string; requestId?: string; payload?: unknown }): void {
    this.handler?.(message);
  }
}
