/**
 * VSCode File System Adapter
 *
 * IFileSystem implementation using VSCode workspace.fs API.
 */

import type { IFileSystem } from '@cc-wf-studio/core';
import * as vscode from 'vscode';

export class VSCodeFileSystem implements IFileSystem {
  async readFile(filePath: string): Promise<string> {
    const uri = vscode.Uri.file(filePath);
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString('utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const bytes = Buffer.from(content, 'utf-8');
    await vscode.workspace.fs.writeFile(uri, bytes);
  }

  async fileExists(filePath: string): Promise<boolean> {
    const uri = vscode.Uri.file(filePath);
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    const uri = vscode.Uri.file(dirPath);
    await vscode.workspace.fs.createDirectory(uri);
  }

  async readDirectory(
    dirPath: string
  ): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>> {
    const uri = vscode.Uri.file(dirPath);
    const entries = await vscode.workspace.fs.readDirectory(uri);
    return entries.map(([name, type]) => ({
      name,
      isFile: type === vscode.FileType.File,
      isDirectory: type === vscode.FileType.Directory,
    }));
  }

  async stat(filePath: string): Promise<{ isFile: boolean; isDirectory: boolean }> {
    const uri = vscode.Uri.file(filePath);
    const stat = await vscode.workspace.fs.stat(uri);
    return {
      isFile: stat.type === vscode.FileType.File,
      isDirectory: stat.type === vscode.FileType.Directory,
    };
  }
}
