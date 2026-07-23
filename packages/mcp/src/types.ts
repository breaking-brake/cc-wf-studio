/**
 * Types and adapter interface for the transport-agnostic MCP server core.
 *
 * The factory in `./factory.ts` registers the cc-wf-studio MCP tools on
 * an `McpServer` instance, delegating all side-effects (read/write workflow,
 * highlight, list agents, export, etc.) to a `WorkflowIoAdapter`
 * implementation. Optional adapter capabilities (currently `exportWorkflow`)
 * gate the registration of their tool.
 *
 * Two adapters live downstream of this package:
 *   - `CanvasWorkflowAdapter` in packages/vscode — drives the live webview via
 *     postMessage RPC. Backs the in-process HTTP MCP server on port 6282.
 *   - `FileWorkflowAdapter` in this package — reads/writes a single `.json`
 *     workflow file. Backs the `ccwf-mcp` stdio bin.
 */

import type { Workflow, WorkflowTargetAgent } from '@cc-wf-studio/core';

/**
 * Information about a discovered sub-agent definition file (`.claude/agents/*.md`
 * or `.claude/commands/*.md`). Returned from `listAvailableAgents`.
 */
export interface AgentCommandInfo {
  name: string;
  description?: string;
  scope: 'user' | 'project';
  commandPath: string;
  promptContent?: string;
}

/**
 * A sub-agent `.md` file that the adapter materialised while applying a
 * workflow. Returned from `planAndPersistSubAgentFiles` so the tool layer
 * can surface the list to the caller for transparency.
 */
export interface PlannedSubAgentFile {
  nodeId: string;
  nodeName: string;
  filePath: string;
}

export type GetCurrentWorkflowResult =
  | {
      workflow: Workflow;
      /**
       * Opaque revision identifier (string in both modes).
       *   - canvas adapter: stringified numeric counter, e.g. `'42'`
       *   - file adapter:   `'sha256:<hex>'` of the file content
       */
      revision: string;
      /** True when the canvas is closed and the workflow comes from cache. */
      isStale?: boolean;
    }
  | { workflow: null };

export interface ApplyWorkflowOptions {
  /** Free-form change description; canvas adapters show it in the review dialog. */
  description?: string;
  /** Sub-agent files the apply path materialised (canvas previews these). */
  plannedFiles?: PlannedSubAgentFile[];
  /** Caller-supplied revision; adapters honouring optimistic locking compare it. */
  expectedRevision?: string;
}

export interface ApplyWorkflowResult {
  success: boolean;
  /**
   * Revision of the workflow after this apply (or before, on failure).
   * Optional because the canvas adapter doesn't always learn the new revision
   * synchronously — clients should call get_current_workflow when they need it.
   */
  revision?: string;
  /** Populated on failure. */
  error?: string;
}

export interface HighlightResult {
  success: boolean;
  /** Diagnostic note (e.g. file mode reporting that highlight is canvas-only). */
  note?: string;
}

export type GetWorkflowSchemaResult =
  | { success: true; schema: string }
  | { success: false; error: string };

export interface ListAvailableAgentsResult {
  user: AgentCommandInfo[];
  project: AgentCommandInfo[];
}

/** On-disk classification of one planned export file (before any write). */
export type ExportPlannedFileStatus = 'new' | 'up-to-date' | 'conflict';

export interface ExportWorkflowRequest {
  /** De-duped target agents in first-mention order. Never empty. */
  agents: WorkflowTargetAgent[];
  /** Replace files whose on-disk content differs from the plan. */
  overwrite: boolean;
  /** Classify the plan only — never write anything. */
  dryRun: boolean;
}

/** Planned files + compatibility warnings for one requested agent. */
export interface ExportAgentOutcome {
  agent: WorkflowTargetAgent;
  /**
   * Every planned file in plan order. Paths are root-relative with forward
   * slashes; `status` is the on-disk classification before any write.
   */
  files: { path: string; status: ExportPlannedFileStatus }[];
  /** Target-compatibility warnings for this agent. */
  warnings: string[];
}

export interface ExportWorkflowResult {
  /**
   * False when conflicts blocked the run (real run: nothing was written;
   * dry run: a real run would fail the same way).
   */
  success: boolean;
  /** Absolute export root every `files[].path` is relative to. */
  root: string;
  /** Slash-command name derived from the workflow name. */
  slashName: string;
  /** One entry per requested agent, in request order. */
  outcomes: ExportAgentOutcome[];
  /** Populated when `success` is false. */
  error?: string;
}

/**
 * Surface contract the factory needs to drive the MCP tools.
 *
 * All methods return promises (even ones that look synchronous in the
 * canvas-mode current implementation) so file-mode IO can stay async without
 * any contortions at the call site.
 */
export interface WorkflowIoAdapter {
  /** Resolve the current workflow + revision, or `null` when none is available. */
  getCurrentWorkflow(): Promise<GetCurrentWorkflowResult>;

  /** Persist the supplied workflow. Canvas: webview RPC. File: write the target. */
  applyWorkflow(
    workflow: Workflow,
    opts: ApplyWorkflowOptions
  ): Promise<ApplyWorkflowResult>;

  /**
   * Highlight a group node on the canvas. Pass `null` to clear.
   * File-mode adapters return `{ success: true, note: '...' }` and do nothing.
   */
  highlightGroupNode(groupNodeId: string | null): Promise<HighlightResult>;

  /** Resolve the workflow schema in TOON form (the AI-optimised serialisation). */
  getWorkflowSchemaToon(): Promise<GetWorkflowSchemaResult>;

  /** Enumerate sub-agent definitions discoverable from user + project scopes. */
  listAvailableAgents(includeContent: boolean): Promise<ListAvailableAgentsResult>;

  /**
   * For SubAgent nodes that lack `commandFilePath`, plan + write `.claude/agents/*.md`
   * files and return their metadata. May mutate the workflow in-place to set
   * `commandFilePath`/`commandScope` on each newly-planned node so subsequent
   * validation passes. File-mode adapters can return an empty array to skip
   * auto-creation entirely.
   */
  planAndPersistSubAgentFiles(workflow: Workflow): Promise<PlannedSubAgentFile[]>;

  /**
   * Optional capability: materialise the workflow as agent-skill files under
   * the adapter's project root — the same plan `ccwf export` writes. The run
   * must be atomic across the whole request: any conflict without
   * `overwrite` aborts before anything is written.
   *
   * Adapters that cannot export server-side (e.g. the canvas adapter, where
   * export lives in the extension UI) leave this undefined; the
   * `export_workflow` tool is registered only when it is implemented.
   */
  exportWorkflow?(
    workflow: Workflow,
    request: ExportWorkflowRequest
  ): Promise<ExportWorkflowResult>;
}
