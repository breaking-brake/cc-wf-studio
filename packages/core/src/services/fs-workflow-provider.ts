/**
 * File System Workflow Provider
 *
 * IWorkflowProvider implementation that reads/writes workflow JSON files directly.
 * Used for headless MCP server mode.
 */

import type { IFileSystem } from '../interfaces/file-system.js';
import type { IWorkflowProvider } from '../interfaces/workflow-provider.js';
import type { Workflow } from '../types/workflow-definition.js';

export class FileSystemWorkflowProvider implements IWorkflowProvider {
  constructor(
    private readonly fs: IFileSystem,
    private readonly workflowPath: string
  ) {}

  async getCurrentWorkflow(): Promise<{ workflow: Workflow | null; isStale: boolean }> {
    if (await this.fs.fileExists(this.workflowPath)) {
      const content = await this.fs.readFile(this.workflowPath);
      return { workflow: JSON.parse(content), isStale: false };
    }
    return { workflow: null, isStale: false };
  }

  async applyWorkflow(workflow: Workflow): Promise<boolean> {
    await this.fs.writeFile(this.workflowPath, JSON.stringify(workflow, null, 2));
    return true;
  }
}
