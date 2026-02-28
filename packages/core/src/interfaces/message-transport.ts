export interface IMessageTransport {
  postMessage(message: { type: string; requestId?: string; payload?: unknown }): void;
  onMessage(
    handler: (message: { type: string; requestId?: string; payload?: unknown }) => void
  ): void;
}
