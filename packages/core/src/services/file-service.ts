/**
 * CC Workflow Studio - File Service (Core)
 *
 * Platform-agnostic file service using IFileSystem interface.
 */

import * as path from 'node:path';
import type { IFileSystem } from '../interfaces/file-system.js';

export class FileService {
  private readonly workspacePath: string;
  private readonly workflowsDirectory: string;

  constructor(
    private readonly fs: IFileSystem,
    workspacePath: string
  ) {
    this.workspacePath = workspacePath;
    this.workflowsDirectory = path.join(this.workspacePath, '.vscode', 'workflows');
  }

  async ensureWorkflowsDirectory(): Promise<void> {
    const exists = await this.fs
      .stat(this.workflowsDirectory)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      await this.fs.createDirectory(this.workflowsDirectory);
    }
  }

  async readFile(filePath: string): Promise<string> {
    return this.fs.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    return this.fs.writeFile(filePath, content);
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.fs.fileExists(filePath);
  }

  async createDirectory(dirPath: string): Promise<void> {
    return this.fs.createDirectory(dirPath);
  }

  getWorkflowsDirectory(): string {
    return this.workflowsDirectory;
  }

  getWorkspacePath(): string {
    return this.workspacePath;
  }

  getWorkflowFilePath(workflowName: string): string {
    return path.join(this.workflowsDirectory, `${workflowName}.json`);
  }

  async listWorkflowFiles(): Promise<string[]> {
    try {
      const entries = await this.fs.readDirectory(this.workflowsDirectory);
      return entries
        .filter((entry) => entry.isFile && entry.name.endsWith('.json'))
        .map((entry) => entry.name.replace(/\.json$/, ''));
    } catch {
      return [];
    }
  }
}
