/**
 * Node.js File System Implementation
 *
 * IFileSystem implementation using node:fs/promises.
 * Used by Electron and CLI headless mode.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { IFileSystem } from '../interfaces/file-system.js';

export class NodeFileSystem implements IFileSystem {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  async readDirectory(
    dirPath: string
  ): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
    }));
  }

  async stat(filePath: string): Promise<{ isFile: boolean; isDirectory: boolean }> {
    const stats = await fs.stat(filePath);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  }
}
