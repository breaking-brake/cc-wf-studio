/**
 * Module-level logger holder
 *
 * Provides a default console logger that can be overridden
 * by platform-specific implementations (VSCode, Electron).
 */
import type { ILogger } from '../interfaces/logger.js';

const consoleLogger: ILogger = {
  info(message: string, data?: unknown): void {
    console.log(`[INFO] ${message}`, data ?? '');
  },
  warn(message: string, data?: unknown): void {
    console.warn(`[WARN] ${message}`, data ?? '');
  },
  error(message: string, data?: unknown): void {
    console.error(`[ERROR] ${message}`, data ?? '');
  },
};

let currentLogger: ILogger = consoleLogger;

export function setLogger(logger: ILogger): void {
  currentLogger = logger;
}

export function getLogger(): ILogger {
  return currentLogger;
}

/**
 * Compatibility bridge for code that used `log('INFO'|'WARN'|'ERROR', message, data?)`
 */
export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  switch (level) {
    case 'INFO':
      currentLogger.info(message, data);
      break;
    case 'WARN':
      currentLogger.warn(message, data);
      break;
    case 'ERROR':
      currentLogger.error(message, data);
      break;
  }
}
