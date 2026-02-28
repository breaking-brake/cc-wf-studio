/**
 * Console Logger Implementation
 *
 * ILogger implementation using console.log/warn/error.
 * Used by Electron and CLI headless mode.
 */

import type { ILogger } from '../interfaces/logger.js';

export class ConsoleLogger implements ILogger {
  info(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data ?? '');
  }

  warn(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data ?? '');
  }

  error(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, data ?? '');
  }
}
