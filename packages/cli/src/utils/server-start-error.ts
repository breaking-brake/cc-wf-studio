/**
 * Friendly error message for a failed local server bind (`ccwf canvas` /
 * `ccwf preview`). Node's raw `EADDRINUSE` message ("listen EADDRINUSE:
 * address already in use :::5175") gives no hint about what to do next —
 * this adds one when the user requested a specific port.
 */

export function formatServerStartError(error: unknown, requestedPort: number): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (code === 'EADDRINUSE' && requestedPort !== 0) {
    return `error: port ${requestedPort} is already in use (${message}). Try a different --port, or omit --port to bind an ephemeral one.`;
  }
  return `error: ${message}`;
}
