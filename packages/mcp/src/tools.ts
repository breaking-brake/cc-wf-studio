/**
 * Tool registrations for the cc-wf-studio MCP server.
 *
 * Each tool delegates IO to the supplied `WorkflowIoAdapter`. In `canvas`
 * mode the MCP request shape (name, description, zod schema, response
 * envelope) is preserved byte-for-byte from the previous in-process VSCode
 * implementation so AI clients connected via the existing skill continue to
 * work. In `file` mode the descriptions and error strings describe the
 * workflow file being edited instead of the canvas — there is no editor to
 * open, no review dialog, and no sub-agent auto-creation.
 */

import {
  type BaseNode,
  type Connection,
  NodeType,
  WORKFLOW_TARGET_AGENTS,
  collectAgentCompatibilityWarnings,
  generateAgentExecutionInstructions,
  generateExecutionInstructions,
  generateMermaidFlowchart,
  validateAIGeneratedWorkflow,
  type Workflow,
  type WorkflowNode,
  type WorkflowTargetAgent,
} from '@cc-wf-studio/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ExportAgentOutcome, WorkflowIoAdapter } from './types.js';

type ToolReply = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

const ok = (payload: unknown): ToolReply => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
});

const fail = (payload: unknown, isError = true): ToolReply => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
  isError,
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Which surface the server edits. Selects the tool description/error text:
 *   - `canvas` — the live CC Workflow Studio webview (VSCode in-process server)
 *   - `file`   — a workflow JSON file (`ccwf mcp --file` / `ccwf-mcp` stdio bin)
 */
export type WorkflowMcpMode = 'canvas' | 'file';

export interface RegisterWorkflowToolsOptions {
  /** Defaults to `'canvas'`, which preserves the historical tool text exactly. */
  mode?: WorkflowMcpMode;
}

interface ToolText {
  getCurrentWorkflowDescription: string;
  noActiveWorkflowError: string;
  applyWorkflowDescription: string;
  applyWorkflowParamDescription: string;
  applyChangeDescriptionParam: string;
  applyRevisionParamDescription: string;
  validateWorkflowDescription: string;
  updateNodesDescription: string;
  updateNodesChangeDescriptionParam: string;
  patchWorkflowDescription: string;
  highlightGroupNodeDescription: string;
  exportWorkflowDescription: string;
  renderWorkflowDescription: string;
}

const TOOL_TEXT: Record<WorkflowMcpMode, ToolText> = {
  canvas: {
    getCurrentWorkflowDescription:
      'Get the currently active workflow from CC Workflow Studio canvas. Returns the workflow JSON and whether it is stale (from cache when the editor is closed).',
    noActiveWorkflowError:
      'No active workflow. Please open a workflow in CC Workflow Studio first.',
    applyWorkflowDescription:
      'Apply a workflow to the CC Workflow Studio canvas. The workflow is validated before being applied. If the user has review mode enabled, they will see a diff preview and must accept changes before they are applied. If rejected, an error with message "User rejected the changes" is returned. The editor must be open. SubAgent nodes without commandFilePath will have .md files auto-created in .claude/agents/.',
    applyWorkflowParamDescription: 'The workflow JSON string to apply to the canvas',
    applyChangeDescriptionParam:
      'A brief description of the changes being made (e.g., "Added error handling step after API call"). Shown to the user in the review dialog.',
    applyRevisionParamDescription:
      'Workflow revision from get_current_workflow for conflict detection. If provided and the workflow has been modified since, the apply will be rejected or a warning shown.',
    validateWorkflowDescription:
      'Validate a workflow JSON draft WITHOUT applying it to the canvas. Checks schema validity and, when "agent" is provided, also reports target-compatibility warnings (Claude Code-only nodes the agent cannot execute, configured fields that target ignores) — pass "all" or an array of agents to preflight several targets in one call. No side effects: nothing is applied, no review dialog is shown, and no sub-agent files are created. Use this to check a draft before apply_workflow.',
    updateNodesDescription:
      'Update specific nodes in the current workflow by ID. More efficient than apply_workflow for partial changes. Fetches the current workflow, merges the specified node changes, validates the result, and applies to the canvas. Only updates existing nodes — use patch_workflow to add or remove nodes/connections.',
    updateNodesChangeDescriptionParam:
      'A brief description of the changes being made. Shown to the user in the review dialog.',
    patchWorkflowDescription:
      'Add and/or remove nodes and connections in the current workflow WITHOUT resending the whole workflow JSON. More token-efficient than apply_workflow for structural edits to an existing workflow. Fetches the current workflow, applies the operations (removals first, then additions), validates the result, and applies to the canvas. Removing a node also removes every connection touching it (reported as cascadedConnectionIds); removing a group node detaches its children, preserving their visual position (reported as detachedNodeIds). Use update_nodes to change fields of existing nodes; use apply_workflow to create a workflow from scratch or rewrite it wholesale. SubAgent nodes added without commandFilePath will have .md files auto-created in .claude/agents/.',
    highlightGroupNodeDescription:
      'Highlight a group node on the CC Workflow Studio canvas to indicate it is currently being executed. Call this before executing nodes within a group to visually track progress.',
    exportWorkflowDescription:
      'Export the current workflow as agent-skill files under the workspace root — the same files `ccwf export` writes. For claude-code (the default): Sub-Agent files under .claude/agents/ plus the workflow entry at .claude/skills/<workflow>/SKILL.md. For other agents (antigravity, codex, copilot, cursor, gemini, roo-code): the provider\'s own skills/<workflow>/SKILL.md layout. Pass "agent" as a single name, an array, or "all" to export several targets in one atomic run — any existing file with different content aborts the whole export with nothing written unless overwrite is true. Set dryRun to preview every planned file\'s status (new / up-to-date / conflict) without writing. The workflow is schema-validated first; an invalid workflow is refused with validationErrors.',
    renderWorkflowDescription:
      'Render the currently active workflow from the CC Workflow Studio canvas as human-readable Markdown. Default format "mermaid" returns just the fenced ```mermaid flowchart block — paste it into your reply so the user sees a diagram of the workflow (most chat UIs render Mermaid natively). Format "md" returns the full document `ccwf render` produces: title, description, diagram, and step-by-step execution instructions; optional "agent" phrases those instructions for that target agent (the diagram itself is agent-agnostic). Read-only: nothing is applied or written.',
  },
  file: {
    getCurrentWorkflowDescription:
      'Get the current workflow from the target workflow JSON file. Returns the workflow JSON and a revision hash (sha256 of the file contents) for conflict detection.',
    noActiveWorkflowError:
      'No workflow found: the target workflow file does not exist yet. Use apply_workflow to create it.',
    applyWorkflowDescription:
      'Write a workflow to the target workflow JSON file. The workflow is validated before being written; the write is atomic and is rejected with a revision-conflict error if the file changed since the provided revision was read. File mode does NOT auto-create sub-agent .md files — set commandFilePath to an existing file on each SubAgent node.',
    applyWorkflowParamDescription: 'The workflow JSON string to write to the workflow file',
    applyChangeDescriptionParam:
      'A brief description of the changes being made (e.g., "Added error handling step after API call"). Not displayed in file mode; safe to omit.',
    applyRevisionParamDescription:
      'Workflow revision from get_current_workflow for conflict detection. If provided and the file has changed since it was read, the write is rejected with a revision-conflict error.',
    validateWorkflowDescription:
      'Validate a workflow JSON draft WITHOUT writing the workflow file. Checks schema validity and, when "agent" is provided, also reports target-compatibility warnings (Claude Code-only nodes the agent cannot execute, configured fields that target ignores) — pass "all" or an array of agents to preflight several targets in one call. No side effects: the file is not touched. Use this to check a draft before apply_workflow.',
    updateNodesDescription:
      'Update specific nodes in the current workflow by ID. More efficient than apply_workflow for partial changes. Fetches the current workflow, merges the specified node changes, validates the result, and writes it back to the workflow file. Only updates existing nodes — use patch_workflow to add or remove nodes/connections.',
    updateNodesChangeDescriptionParam:
      'A brief description of the changes being made. Not displayed in file mode; safe to omit.',
    patchWorkflowDescription:
      'Add and/or remove nodes and connections in the current workflow WITHOUT resending the whole workflow JSON. More token-efficient than apply_workflow for structural edits to an existing workflow. Fetches the current workflow from the target file, applies the operations (removals first, then additions), validates the result, and writes it back atomically. Removing a node also removes every connection touching it (reported as cascadedConnectionIds); removing a group node detaches its children, preserving their visual position (reported as detachedNodeIds). Use update_nodes to change fields of existing nodes; use apply_workflow to create the file or rewrite it wholesale. File mode does NOT auto-create sub-agent .md files — set commandFilePath to an existing file on added SubAgent nodes.',
    highlightGroupNodeDescription:
      'Highlight a group node to indicate it is currently being executed. In file mode this is a no-op kept for compatibility — highlighting is only visible on the CC Workflow Studio canvas.',
    exportWorkflowDescription:
      'Export the current workflow (read from the target workflow file) as agent-skill files under the project root — the same files `ccwf export` writes. For claude-code (the default): Sub-Agent files under .claude/agents/ plus the workflow entry at .claude/skills/<workflow>/SKILL.md. For other agents (antigravity, codex, copilot, cursor, gemini, roo-code): the provider\'s own skills/<workflow>/SKILL.md layout. Pass "agent" as a single name, an array, or "all" to export several targets in one atomic run — any existing file with different content aborts the whole export with nothing written unless overwrite is true. Set dryRun to preview every planned file\'s status (new / up-to-date / conflict) without writing. The workflow is schema-validated first; an invalid workflow is refused with validationErrors.',
    renderWorkflowDescription:
      'Render the current workflow (read from the target workflow file) as human-readable Markdown. Default format "mermaid" returns just the fenced ```mermaid flowchart block — paste it into your reply so the user sees a diagram of the workflow (most chat UIs render Mermaid natively). Format "md" returns the full document `ccwf render` produces: title, description, diagram, and step-by-step execution instructions; optional "agent" phrases those instructions for that target agent (the diagram itself is agent-agnostic). Read-only: the file is not touched.',
  },
};

export function registerWorkflowTools(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  options: RegisterWorkflowToolsOptions = {}
): void {
  const text = TOOL_TEXT[options.mode ?? 'canvas'];
  registerGetCurrentWorkflow(server, adapter, text);
  registerGetWorkflowSchema(server, adapter);
  registerApplyWorkflow(server, adapter, text);
  registerValidateWorkflow(server, text);
  registerListAvailableAgents(server, adapter);
  registerUpdateNodes(server, adapter, text);
  registerPatchWorkflow(server, adapter, text);
  registerHighlightGroupNode(server, adapter, text);
  registerExportWorkflow(server, adapter, text);
  registerRenderWorkflow(server, adapter, text);
}

function registerGetCurrentWorkflow(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  text: ToolText
): void {
  server.tool(
    'get_current_workflow',
    text.getCurrentWorkflowDescription,
    {},
    async () => {
      try {
        const result = await adapter.getCurrentWorkflow();
        if (!result.workflow) {
          return fail(
            {
              success: false,
              error: text.noActiveWorkflowError,
            },
            false
          );
        }
        return ok({
          success: true,
          isStale: result.isStale,
          revision: result.revision,
          workflow: result.workflow,
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

function registerGetWorkflowSchema(server: McpServer, adapter: WorkflowIoAdapter): void {
  server.tool(
    'get_workflow_schema',
    'Get the workflow schema documentation in optimized TOON format. Use this to understand the valid structure for creating or modifying workflows.',
    {},
    async () => {
      try {
        const result = await adapter.getWorkflowSchemaToon();
        if (!result.success) {
          return fail({ success: false, error: result.error });
        }
        // Schema is returned as raw text so AI clients can stream it without
        // parsing a JSON envelope.
        return { content: [{ type: 'text' as const, text: result.schema }] };
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

function registerApplyWorkflow(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  text: ToolText
): void {
  server.tool(
    'apply_workflow',
    text.applyWorkflowDescription,
    {
      workflow: z.string().describe(text.applyWorkflowParamDescription),
      description: z.string().optional().describe(text.applyChangeDescriptionParam),
      revision: z.string().optional().describe(text.applyRevisionParamDescription),
    },
    async ({ workflow: workflowJson, description, revision }) => {
      try {
        let parsedWorkflow: unknown;
        try {
          parsedWorkflow = JSON.parse(workflowJson);
        } catch {
          return fail({
            success: false,
            error: 'Invalid JSON: Failed to parse workflow string',
          });
        }

        // Plan + persist sub-agent files first so commandFilePath is set
        // before validation. File-mode adapters may return [] here.
        const plannedFiles = await adapter.planAndPersistSubAgentFiles(
          parsedWorkflow as Workflow
        );

        const validation = validateAIGeneratedWorkflow(parsedWorkflow);
        if (!validation.valid) {
          return fail({
            success: false,
            error: 'Validation failed',
            validationErrors: validation.errors,
          });
        }

        const applyResult = await adapter.applyWorkflow(parsedWorkflow as Workflow, {
          description,
          plannedFiles,
          expectedRevision: revision,
        });

        return ok({
          success: applyResult.success,
          ...(applyResult.revision ? { revision: applyResult.revision } : {}),
          ...(applyResult.error ? { error: applyResult.error } : {}),
          ...(plannedFiles.length > 0
            ? { autoCreatedFiles: plannedFiles.map((f) => f.filePath) }
            : {}),
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

/**
 * Normalize the `agent` param to a de-duped list in first-mention order:
 * a single agent name stays a one-element list, `'all'` expands to every
 * supported target, and an array is de-duped. Mirrors the CLI's repeatable
 * `--agent` accumulator so both surfaces agree on semantics.
 */
function resolveRequestedAgents(
  agent: WorkflowTargetAgent | 'all' | WorkflowTargetAgent[] | undefined
): WorkflowTargetAgent[] {
  if (agent === undefined) {
    return [];
  }
  const requested = agent === 'all' ? WORKFLOW_TARGET_AGENTS : Array.isArray(agent) ? agent : [agent];
  const deduped: WorkflowTargetAgent[] = [];
  for (const name of requested) {
    if (!deduped.includes(name)) {
      deduped.push(name);
    }
  }
  return deduped;
}

function registerValidateWorkflow(server: McpServer, text: ToolText): void {
  server.tool(
    'validate_workflow',
    text.validateWorkflowDescription,
    {
      workflow: z.string().describe('The workflow JSON string to validate'),
      agent: z
        .union([
          z.enum([...WORKFLOW_TARGET_AGENTS, 'all'] as const),
          z.array(z.enum(WORKFLOW_TARGET_AGENTS)).min(1),
        ])
        .optional()
        .describe(
          'Optional target agent(s) to preflight compatibility for: a single agent name, an array of agent names, or "all" for every supported target. When set (and the workflow is schema-valid), the result includes the same warnings `ccwf validate --agent` reports: Claude Code-only nodes the agent cannot execute, plus configured node fields that target ignores. With exactly one agent the result carries `warnings: string[]`; with several it carries `warningsByAgent: { <agent>: string[] }`. Warnings never make the workflow invalid.'
        ),
    },
    async ({ workflow: workflowJson, agent }) => {
      try {
        let parsedWorkflow: unknown;
        try {
          parsedWorkflow = JSON.parse(workflowJson);
        } catch {
          return fail({
            success: false,
            error: 'Invalid JSON: Failed to parse workflow string',
          });
        }

        const validation = validateAIGeneratedWorkflow(parsedWorkflow);
        // Compatibility warnings only for a schema-valid workflow —
        // malformed node data would produce garbage reports.
        const agents = validation.valid ? resolveRequestedAgents(agent) : [];
        const collect = (target: WorkflowTargetAgent): string[] =>
          collectAgentCompatibilityWarnings(parsedWorkflow as Workflow, target);

        // An invalid draft is still a successful validation run: return a
        // normal result so the agent can read the errors and iterate.
        // Exactly one agent keeps the stable single-agent `warnings` shape;
        // several agents get a per-agent map instead (same split as the CLI).
        return ok({
          success: true,
          valid: validation.valid,
          ...(validation.valid ? {} : { validationErrors: validation.errors }),
          ...(agents.length === 1 ? { warnings: collect(agents[0]) } : {}),
          ...(agents.length > 1
            ? {
                warningsByAgent: Object.fromEntries(
                  agents.map((target) => [target, collect(target)])
                ),
              }
            : {}),
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

function registerListAvailableAgents(
  server: McpServer,
  adapter: WorkflowIoAdapter
): void {
  server.tool(
    'list_available_agents',
    'List available .claude/agents/*.md agent files that can be referenced as sub-agent nodes in workflows. Returns both user-scope (~/.claude/agents/) and project-scope (.claude/agents/) agents.',
    {
      includeContent: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, include the full prompt content of each command file. Default: false (only returns name, description, scope, and path).'
        ),
    },
    async ({ includeContent }) => {
      try {
        const { user, project } = await adapter.listAvailableAgents(
          includeContent ?? false
        );
        const commands = [...user, ...project].map((cmd) => ({
          name: cmd.name,
          description: cmd.description,
          scope: cmd.scope,
          commandPath: cmd.commandPath,
          ...(includeContent ? { promptContent: cmd.promptContent } : {}),
        }));
        return ok({
          success: true,
          commands,
          totalCount: commands.length,
          userCount: user.length,
          projectCount: project.length,
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

function registerUpdateNodes(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  text: ToolText
): void {
  server.tool(
    'update_nodes',
    text.updateNodesDescription,
    {
      nodes: z
        .array(
          z.object({
            id: z.string().describe('The ID of the node to update'),
            name: z.string().optional().describe('New display name for the node'),
            position: z
              .object({ x: z.number(), y: z.number() })
              .optional()
              .describe('New position for the node'),
            data: z
              .record(z.string(), z.unknown())
              .optional()
              .describe(
                'Data fields to shallow-merge into the node data. Set a field to null to remove it (e.g., {"commandFilePath": null} deletes commandFilePath).'
              ),
            type: z
              .nativeEnum(NodeType)
              .optional()
              .describe(
                'New node type. When type is changed, data must also be provided and will fully replace (not merge) the existing data.'
              ),
            parentId: z
              .string()
              .nullable()
              .optional()
              .describe('Parent group node ID. Set to null to remove from group.'),
            style: z
              .object({
                width: z.number().optional(),
                height: z.number().optional(),
              })
              .optional()
              .describe('Node dimensions (mainly for group nodes).'),
          })
        )
        .describe(
          'Array of node updates. Each must include an id and at least one of: name, position, data, type, parentId, or style.'
        ),
      description: z.string().optional().describe(text.updateNodesChangeDescriptionParam),
      revision: z
        .string()
        .optional()
        .describe(
          'Workflow revision from get_current_workflow for conflict detection. If omitted, the revision from the internal fetch is used.'
        ),
    },
    async ({ nodes: nodeUpdates, description, revision }) => {
      try {
        const current = await adapter.getCurrentWorkflow();
        if (!current.workflow) {
          return fail({
            success: false,
            error: text.noActiveWorkflowError,
          });
        }

        const currentNodeIds = new Set(current.workflow.nodes.map((n) => n.id));
        const missingIds = nodeUpdates
          .map((u) => u.id)
          .filter((id) => !currentNodeIds.has(id));
        if (missingIds.length > 0) {
          return fail({
            success: false,
            error: `Nodes not found: ${missingIds.join(
              ', '
            )}. Use get_current_workflow to see available node IDs.`,
          });
        }

        const updatedWorkflow = JSON.parse(JSON.stringify(current.workflow)) as Workflow;

        for (const update of nodeUpdates) {
          const node = updatedWorkflow.nodes.find((n) => n.id === update.id);
          if (!node) continue;

          const typeChanged = update.type !== undefined && update.type !== node.type;
          if (typeChanged && update.data === undefined) {
            return fail(
              {
                success: false,
                error: `When changing node type, data must also be provided to match the new type schema. Node ID: ${update.id}`,
              },
              false
            );
          }
          if (update.type !== undefined) {
            (node as BaseNode).type = update.type;
          }
          if (update.name !== undefined) node.name = update.name;
          if (update.position !== undefined) node.position = update.position;

          if (typeChanged && update.data !== undefined) {
            node.data = update.data as WorkflowNode['data'];
          } else {
            const merged = { ...node.data, ...(update.data ?? {}) };
            for (const key of Object.keys(merged)) {
              if ((merged as Record<string, unknown>)[key] === null) {
                delete (merged as Record<string, unknown>)[key];
              }
            }
            node.data = merged as WorkflowNode['data'];
          }

          if ('parentId' in update) {
            if (update.parentId === null || update.parentId === undefined) {
              delete node.parentId;
            } else {
              node.parentId = update.parentId;
            }
          }
          if (update.style !== undefined) node.style = update.style;
        }

        const plannedFiles = await adapter.planAndPersistSubAgentFiles(updatedWorkflow);

        const validation = validateAIGeneratedWorkflow(updatedWorkflow);
        if (!validation.valid) {
          return fail({
            success: false,
            error: 'Validation failed',
            validationErrors: validation.errors,
          });
        }

        const applyResult = await adapter.applyWorkflow(updatedWorkflow, {
          description,
          plannedFiles,
          expectedRevision: revision ?? current.revision,
        });

        return ok({
          success: applyResult.success,
          ...(applyResult.revision ? { revision: applyResult.revision } : {}),
          ...(applyResult.error ? { error: applyResult.error } : {}),
          ...(plannedFiles.length > 0
            ? { autoCreatedFiles: plannedFiles.map((f) => f.filePath) }
            : {}),
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

/**
 * `patch_workflow` — structural edits (add/remove nodes and connections)
 * without resending the whole workflow. Removals apply before additions, so
 * an add may reuse the ID of a node removed in the same call (replace).
 * Removing a node cascades to its connections; removing a group re-parents
 * its children to the group's own parent (or detaches them) with their
 * position shifted by the group's offset, so they stay visually in place.
 */
function registerPatchWorkflow(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  text: ToolText
): void {
  server.tool(
    'patch_workflow',
    text.patchWorkflowDescription,
    {
      addNodes: z
        .array(
          z.object({
            id: z.string().describe('Unique node ID'),
            type: z.nativeEnum(NodeType).describe('Node type'),
            name: z.string().describe('Display name for the node'),
            position: z
              .object({ x: z.number(), y: z.number() })
              .describe('Canvas position (relative to the parent group when parentId is set)'),
            data: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Node data matching the workflow schema for this node type'),
            parentId: z.string().optional().describe('Parent group node ID'),
            style: z
              .object({ width: z.number().optional(), height: z.number().optional() })
              .optional()
              .describe('Node dimensions (mainly for group nodes).'),
          })
        )
        .optional()
        .describe(
          'Complete node objects to add. IDs must not collide with existing nodes (removals in the same call apply first, so reusing a removed ID replaces that node).'
        ),
      removeNodeIds: z
        .array(z.string())
        .optional()
        .describe(
          'IDs of nodes to remove. Every connection touching a removed node is removed too; children of a removed group are kept, re-parented to the group\'s parent with their visual position preserved. Unknown IDs are an error.'
        ),
      addConnections: z
        .array(
          z.object({
            id: z.string().describe('Unique connection ID'),
            from: z.string().describe('Source node ID'),
            to: z.string().describe('Target node ID'),
            fromPort: z.string().describe('Source handle ID (usually "output")'),
            toPort: z.string().describe('Target handle ID (usually "input")'),
            condition: z
              .string()
              .optional()
              .describe('Option label for AskUserQuestion branches'),
          })
        )
        .optional()
        .describe('Complete connection objects to add.'),
      removeConnectionIds: z
        .array(z.string())
        .optional()
        .describe('IDs of connections to remove. Unknown IDs are an error.'),
      description: z.string().optional().describe(text.updateNodesChangeDescriptionParam),
      revision: z
        .string()
        .optional()
        .describe(
          'Workflow revision from get_current_workflow for conflict detection. If omitted, the revision from the internal fetch is used.'
        ),
    },
    async ({ addNodes, removeNodeIds, addConnections, removeConnectionIds, description, revision }) => {
      try {
        const hasOps =
          (addNodes?.length ?? 0) > 0 ||
          (removeNodeIds?.length ?? 0) > 0 ||
          (addConnections?.length ?? 0) > 0 ||
          (removeConnectionIds?.length ?? 0) > 0;
        if (!hasOps) {
          return fail(
            {
              success: false,
              error:
                'No operations provided. Pass at least one of: addNodes, removeNodeIds, addConnections, removeConnectionIds.',
            },
            false
          );
        }

        const current = await adapter.getCurrentWorkflow();
        if (!current.workflow) {
          return fail({
            success: false,
            error: text.noActiveWorkflowError,
          });
        }

        // Validate every removal ID against the CURRENT workflow before
        // touching anything, so a stale agent view fails loudly.
        const nodeIdsToRemove = new Set(removeNodeIds ?? []);
        const connectionIdsToRemove = new Set(removeConnectionIds ?? []);
        const currentNodeIds = new Set(current.workflow.nodes.map((n) => n.id));
        const currentConnectionIds = new Set(current.workflow.connections.map((c) => c.id));
        const missingNodeIds = [...nodeIdsToRemove].filter((id) => !currentNodeIds.has(id));
        if (missingNodeIds.length > 0) {
          return fail({
            success: false,
            error: `Nodes not found: ${missingNodeIds.join(
              ', '
            )}. Use get_current_workflow to see available node IDs.`,
          });
        }
        const missingConnectionIds = [...connectionIdsToRemove].filter(
          (id) => !currentConnectionIds.has(id)
        );
        if (missingConnectionIds.length > 0) {
          return fail({
            success: false,
            error: `Connections not found: ${missingConnectionIds.join(
              ', '
            )}. Use get_current_workflow to see available connection IDs.`,
          });
        }

        const updatedWorkflow = JSON.parse(JSON.stringify(current.workflow)) as Workflow;

        // Removals first: explicit connections, then nodes (with cascade).
        updatedWorkflow.connections = updatedWorkflow.connections.filter(
          (c) => !connectionIdsToRemove.has(c.id)
        );

        const detachedNodeIds: string[] = [];
        if (nodeIdsToRemove.size > 0) {
          // Re-parent children of removed groups, walking up until a
          // surviving ancestor (or none). Positions are parent-relative, so
          // each hop adds the removed parent's offset to keep the child in
          // the same visual place.
          const nodeById = new Map(updatedWorkflow.nodes.map((n) => [n.id, n]));
          for (const node of updatedWorkflow.nodes) {
            if (nodeIdsToRemove.has(node.id)) continue;
            let moved = false;
            while (node.parentId && nodeIdsToRemove.has(node.parentId)) {
              const parent = nodeById.get(node.parentId);
              if (!parent) break;
              node.position = {
                x: node.position.x + parent.position.x,
                y: node.position.y + parent.position.y,
              };
              if (parent.parentId) {
                node.parentId = parent.parentId;
              } else {
                delete node.parentId;
              }
              moved = true;
            }
            if (moved) {
              detachedNodeIds.push(node.id);
            }
          }
          updatedWorkflow.nodes = updatedWorkflow.nodes.filter(
            (n) => !nodeIdsToRemove.has(n.id)
          );
        }

        const cascadedConnectionIds = updatedWorkflow.connections
          .filter((c) => nodeIdsToRemove.has(c.from) || nodeIdsToRemove.has(c.to))
          .map((c) => c.id);
        if (cascadedConnectionIds.length > 0) {
          const cascaded = new Set(cascadedConnectionIds);
          updatedWorkflow.connections = updatedWorkflow.connections.filter(
            (c) => !cascaded.has(c.id)
          );
        }

        // Additions, checked against the post-removal workflow so a removed
        // ID may be reused in the same call.
        if (addNodes && addNodes.length > 0) {
          const remainingNodeIds = new Set(updatedWorkflow.nodes.map((n) => n.id));
          const collidingNodeIds: string[] = [];
          for (const node of addNodes) {
            if (remainingNodeIds.has(node.id)) {
              collidingNodeIds.push(node.id);
            }
            remainingNodeIds.add(node.id);
          }
          if (collidingNodeIds.length > 0) {
            return fail({
              success: false,
              error: `Node IDs already exist: ${collidingNodeIds.join(
                ', '
              )}. Use unique IDs, or remove the existing nodes in the same call to replace them.`,
            });
          }
          updatedWorkflow.nodes.push(...(addNodes as unknown as WorkflowNode[]));
        }

        if (addConnections && addConnections.length > 0) {
          const remainingConnectionIds = new Set(updatedWorkflow.connections.map((c) => c.id));
          const collidingConnectionIds: string[] = [];
          for (const connection of addConnections) {
            if (remainingConnectionIds.has(connection.id)) {
              collidingConnectionIds.push(connection.id);
            }
            remainingConnectionIds.add(connection.id);
          }
          if (collidingConnectionIds.length > 0) {
            return fail({
              success: false,
              error: `Connection IDs already exist: ${collidingConnectionIds.join(
                ', '
              )}. Use unique IDs, or remove the existing connections in the same call to replace them.`,
            });
          }
          updatedWorkflow.connections.push(...(addConnections as Connection[]));
        }

        const plannedFiles = await adapter.planAndPersistSubAgentFiles(updatedWorkflow);

        const validation = validateAIGeneratedWorkflow(updatedWorkflow);
        if (!validation.valid) {
          return fail({
            success: false,
            error: 'Validation failed',
            validationErrors: validation.errors,
          });
        }

        const applyResult = await adapter.applyWorkflow(updatedWorkflow, {
          description,
          plannedFiles,
          expectedRevision: revision ?? current.revision,
        });

        return ok({
          success: applyResult.success,
          ...(applyResult.revision ? { revision: applyResult.revision } : {}),
          ...(applyResult.error ? { error: applyResult.error } : {}),
          ...(cascadedConnectionIds.length > 0 ? { cascadedConnectionIds } : {}),
          ...(detachedNodeIds.length > 0 ? { detachedNodeIds } : {}),
          ...(plannedFiles.length > 0
            ? { autoCreatedFiles: plannedFiles.map((f) => f.filePath) }
            : {}),
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

/**
 * `export_workflow` — registered only when the adapter implements the
 * optional `exportWorkflow` capability (today: file mode). Payload shapes
 * mirror `ccwf export --json`: exactly one agent keeps flat single-agent
 * keys, several agents get `agents` + `resultsByAgent` (same split as
 * `validate_workflow`'s warnings).
 */
function registerExportWorkflow(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  text: ToolText
): void {
  const exportImpl = adapter.exportWorkflow?.bind(adapter);
  if (!exportImpl) return;

  server.tool(
    'export_workflow',
    text.exportWorkflowDescription,
    {
      agent: z
        .union([
          z.enum([...WORKFLOW_TARGET_AGENTS, 'all'] as const),
          z.array(z.enum(WORKFLOW_TARGET_AGENTS)).min(1),
        ])
        .optional()
        .describe(
          'Target agent(s) to export for: a single agent name, an array of agent names, or "all" for every supported target. Default: claude-code. With exactly one agent the result carries flat written/upToDate/warnings keys (files with dryRun); with several it carries agents + resultsByAgent.'
        ),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Replace files that already exist with different content. Default: false — any conflict aborts the export with nothing written.'
        ),
      dryRun: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Classify every planned file (new / up-to-date / conflict) without writing anything. success reports whether a real run would succeed, honouring overwrite.'
        ),
    },
    async ({ agent, overwrite, dryRun }) => {
      try {
        const current = await adapter.getCurrentWorkflow();
        if (!current.workflow) {
          return fail({ success: false, error: text.noActiveWorkflowError });
        }

        const validation = validateAIGeneratedWorkflow(current.workflow);
        if (!validation.valid) {
          return fail({
            success: false,
            error: 'Validation failed: fix the workflow before exporting.',
            validationErrors: validation.errors,
          });
        }

        const requested = resolveRequestedAgents(agent);
        const agents = requested.length > 0 ? requested : (['claude-code'] as WorkflowTargetAgent[]);
        const effectiveOverwrite = overwrite ?? false;
        const result = await exportImpl(current.workflow, {
          agents,
          overwrite: effectiveOverwrite,
          dryRun: dryRun ?? false,
        });

        // Derive written/up-to-date/conflict views from the raw statuses so
        // the payload can never disagree with what hit the disk.
        const written = (o: ExportAgentOutcome): string[] =>
          o.files
            .filter((f) => f.status === 'new' || (f.status === 'conflict' && effectiveOverwrite))
            .map((f) => f.path);
        const upToDate = (o: ExportAgentOutcome): string[] =>
          o.files.filter((f) => f.status === 'up-to-date').map((f) => f.path);
        const conflicts = (o: ExportAgentOutcome): string[] =>
          o.files.filter((f) => f.status === 'conflict').map((f) => f.path);

        const single = agents.length === 1;
        const base = {
          success: result.success,
          ...(result.error ? { error: result.error } : {}),
          root: result.root,
          ...(dryRun ? { dryRun: true } : {}),
          slashName: result.slashName,
        };

        if (single) {
          const outcome = result.outcomes[0];
          return ok({
            ...base,
            agent: outcome.agent,
            ...(dryRun
              ? { files: outcome.files }
              : result.success
                ? { written: written(outcome), upToDate: upToDate(outcome) }
                : { conflicts: conflicts(outcome) }),
            warnings: outcome.warnings,
          });
        }

        return ok({
          ...base,
          agents,
          resultsByAgent: Object.fromEntries(
            result.outcomes.map((outcome) => [
              outcome.agent,
              {
                ...(dryRun
                  ? { files: outcome.files }
                  : result.success
                    ? { written: written(outcome), upToDate: upToDate(outcome) }
                    : { conflicts: conflicts(outcome) }),
                warnings: outcome.warnings,
              },
            ])
          ),
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

function registerHighlightGroupNode(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  text: ToolText
): void {
  server.tool(
    'highlight_group_node',
    text.highlightGroupNodeDescription,
    {
      groupNodeId: z
        .string()
        .describe(
          'The ID of the group node to highlight on the canvas. Pass an empty string to clear the highlight.'
        ),
    },
    async ({ groupNodeId }) => {
      try {
        const effectiveId = groupNodeId || null;
        const result = await adapter.highlightGroupNode(effectiveId);
        return ok({
          success: result.success,
          highlightedGroupNodeId: effectiveId,
          ...(result.note ? { note: result.note } : {}),
        });
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}

function registerRenderWorkflow(
  server: McpServer,
  adapter: WorkflowIoAdapter,
  text: ToolText
): void {
  server.tool(
    'render_workflow',
    text.renderWorkflowDescription,
    {
      format: z
        .enum(['mermaid', 'md'])
        .optional()
        .describe(
          'Output format. "mermaid" (default): only the fenced ```mermaid flowchart block — token-cheap, ideal for showing the user a diagram. "md": the full Markdown document (title, description, diagram, execution instructions), same as `ccwf render`.'
        ),
      agent: z
        .enum(WORKFLOW_TARGET_AGENTS)
        .optional()
        .describe(
          'Only used with format "md": phrase the execution instructions for this target agent, the same wording `ccwf render --agent` uses. Defaults to claude-code. The Mermaid diagram is agent-agnostic.'
        ),
    },
    async ({ format, agent }) => {
      try {
        const result = await adapter.getCurrentWorkflow();
        if (!result.workflow) {
          return fail({ success: false, error: text.noActiveWorkflowError }, false);
        }
        const workflow = result.workflow;
        // generateMermaidFlowchart already returns a fenced ```mermaid block.
        const mermaidBlock = generateMermaidFlowchart(workflow);
        if ((format ?? 'mermaid') === 'mermaid') {
          // Raw text (like get_workflow_schema) so the agent can paste the
          // block into a reply without unescaping a JSON envelope.
          return { content: [{ type: 'text' as const, text: `${mermaidBlock}\n` }] };
        }
        // Same Markdown bundle `ccwf render` (format md) prints.
        const target = agent ?? 'claude-code';
        const execution =
          target === 'claude-code'
            ? generateExecutionInstructions(workflow, { provider: 'claude-code' })
            : generateAgentExecutionInstructions(workflow, target);
        const title = `# ${workflow.name || 'Workflow'}`;
        const descriptionBlock = workflow.description ? `\n${workflow.description}\n` : '\n';
        return {
          content: [
            {
              type: 'text' as const,
              text: `${title}\n${descriptionBlock}\n${mermaidBlock}\n\n${execution}\n`,
            },
          ],
        };
      } catch (error) {
        return fail({ success: false, error: errorMessage(error) });
      }
    }
  );
}
