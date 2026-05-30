/**
 * File-mode WorkflowIoAdapter.
 *
 * Reads and writes a single workflow JSON file. Suitable for the
 * `ccwf-mcp --file <path>` standalone stdio server: no canvas, no webview,
 * no live UI feedback.
 *
 * Behavioural notes:
 *   - `revision` is `sha256:<hex>` of the file's UTF-8 contents.
 *   - `applyWorkflow` performs an atomic temp-file + rename write, and refuses
 *     the write when `expectedRevision` doesn't match the current file hash.
 *   - `highlightGroupNode` is a no-op success (returns a diagnostic note).
 *   - `planAndPersistSubAgentFiles` returns `[]` — file-mode does NOT
 *     auto-create `.claude/agents/*.md` files in this initial release.
 *   - `listAvailableAgents` walks `process.cwd()/.claude/agents` and
 *     `~/.claude/agents`, treating each `.md` as a single sub-agent.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Workflow } from '@cc-wf-studio/core';
import type {
  AgentCommandInfo,
  ApplyWorkflowOptions,
  ApplyWorkflowResult,
  GetCurrentWorkflowResult,
  GetWorkflowSchemaResult,
  HighlightResult,
  ListAvailableAgentsResult,
  PlannedSubAgentFile,
  WorkflowIoAdapter,
} from './types.js';

export interface FileWorkflowAdapterOptions {
  /** Absolute path to the workflow JSON file. */
  filePath: string;
  /** Base directory used to resolve project-scope sub-agent files. Defaults to `process.cwd()`. */
  projectRoot?: string;
}

export class FileWorkflowAdapter implements WorkflowIoAdapter {
  private readonly filePath: string;
  private readonly projectRoot: string;

  constructor(options: FileWorkflowAdapterOptions) {
    this.filePath = path.resolve(options.filePath);
    this.projectRoot = options.projectRoot ?? process.cwd();
  }

  async getCurrentWorkflow(): Promise<GetCurrentWorkflowResult> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, 'utf-8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return { workflow: null };
      }
      throw error;
    }
    const workflow = JSON.parse(raw) as Workflow;
    return {
      workflow,
      revision: computeRevision(raw),
    };
  }

  async applyWorkflow(
    workflow: Workflow,
    opts: ApplyWorkflowOptions
  ): Promise<ApplyWorkflowResult> {
    if (opts.expectedRevision) {
      const existing = await this.safeRead();
      const currentRevision = existing === null ? null : computeRevision(existing);
      if (currentRevision !== null && currentRevision !== opts.expectedRevision) {
        return {
          success: false,
          revision: currentRevision,
          error: `Revision conflict: file has changed since it was last read (expected ${opts.expectedRevision}, found ${currentRevision}).`,
        };
      }
    }

    const serialised = `${JSON.stringify(workflow, null, 2)}\n`;
    await this.atomicWrite(serialised);
    return {
      success: true,
      revision: computeRevision(serialised),
    };
  }

  async highlightGroupNode(_groupNodeId: string | null): Promise<HighlightResult> {
    return {
      success: true,
      note: 'highlight_group_node is canvas-only; no-op in file mode',
    };
  }

  async getWorkflowSchemaToon(): Promise<GetWorkflowSchemaResult> {
    try {
      const url = import.meta.resolve('@cc-wf-studio/core/resources/workflow-schema.toon');
      const schemaPath = fileURLToPath(url);
      const schema = await fs.readFile(schemaPath, 'utf-8');
      return { success: true, schema };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listAvailableAgents(includeContent: boolean): Promise<ListAvailableAgentsResult> {
    const userDir = path.join(os.homedir(), '.claude', 'agents');
    const projectDir = path.join(this.projectRoot, '.claude', 'agents');

    const [user, project] = await Promise.all([
      scanAgentDir(userDir, 'user', includeContent),
      scanAgentDir(projectDir, 'project', includeContent),
    ]);

    return { user, project };
  }

  async planAndPersistSubAgentFiles(_workflow: Workflow): Promise<PlannedSubAgentFile[]> {
    // File mode defers auto-creation. AI clients should supply complete
    // commandFilePath on SubAgent nodes when running through the stdio bin.
    return [];
  }

  // ---------------------------------------------------------------------

  private async safeRead(): Promise<string | null> {
    try {
      return await fs.readFile(this.filePath, 'utf-8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return null;
      throw error;
    }
  }

  private async atomicWrite(contents: string): Promise<void> {
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(tmpPath, contents, 'utf-8');
    await fs.rename(tmpPath, this.filePath);
  }
}

function computeRevision(content: string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

async function scanAgentDir(
  dir: string,
  scope: 'user' | 'project',
  includeContent: boolean
): Promise<AgentCommandInfo[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return [];
    }
    throw error;
  }

  const results: AgentCommandInfo[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const filePath = path.join(dir, entry);
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }
    const name = entry.replace(/\.md$/, '');
    const description = extractFrontmatterDescription(content);
    results.push({
      name,
      description,
      scope,
      commandPath: filePath,
      ...(includeContent ? { promptContent: content } : {}),
    });
  }
  return results;
}

function extractFrontmatterDescription(content: string): string | undefined {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return undefined;
  const descLine = match[1].match(/^description:\s*(.+)$/m);
  if (!descLine) return undefined;
  return descLine[1].trim().replace(/^["']|["']$/g, '');
}
