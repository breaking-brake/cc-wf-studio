/**
 * Tool registrations for the cc-wf-studio MCP server.
 *
 * Each tool delegates IO to the supplied `WorkflowIoAdapter`. The MCP request
 * shape (name, description, zod schema, response envelope) is preserved
 * byte-for-byte from the previous in-process VSCode implementation so AI
 * clients connected via the existing skill continue to work.
 */

import {
  type BaseNode,
  NodeType,
  validateAIGeneratedWorkflow,
  type Workflow,
  type WorkflowNode,
} from '@cc-wf-studio/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { WorkflowIoAdapter } from './types.js';

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

export function registerWorkflowTools(
  server: McpServer,
  adapter: WorkflowIoAdapter
): void {
  registerGetCurrentWorkflow(server, adapter);
  registerGetWorkflowSchema(server, adapter);
  registerApplyWorkflow(server, adapter);
  registerListAvailableAgents(server, adapter);
  registerUpdateNodes(server, adapter);
  registerHighlightGroupNode(server, adapter);
}

function registerGetCurrentWorkflow(server: McpServer, adapter: WorkflowIoAdapter): void {
  server.tool(
    'get_current_workflow',
    'Get the currently active workflow from CC Workflow Studio canvas. Returns the workflow JSON and whether it is stale (from cache when the editor is closed).',
    {},
    async () => {
      try {
        const result = await adapter.getCurrentWorkflow();
        if (!result.workflow) {
          return fail(
            {
              success: false,
              error:
                'No active workflow. Please open a workflow in CC Workflow Studio first.',
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

function registerApplyWorkflow(server: McpServer, adapter: WorkflowIoAdapter): void {
  server.tool(
    'apply_workflow',
    'Apply a workflow to the CC Workflow Studio canvas. The workflow is validated before being applied. If the user has review mode enabled, they will see a diff preview and must accept changes before they are applied. If rejected, an error with message "User rejected the changes" is returned. The editor must be open. SubAgent nodes without commandFilePath will have .md files auto-created in .claude/agents/.',
    {
      workflow: z.string().describe('The workflow JSON string to apply to the canvas'),
      description: z
        .string()
        .optional()
        .describe(
          'A brief description of the changes being made (e.g., "Added error handling step after API call"). Shown to the user in the review dialog.'
        ),
      revision: z
        .string()
        .optional()
        .describe(
          'Workflow revision from get_current_workflow for conflict detection. If provided and the workflow has been modified since, the apply will be rejected or a warning shown.'
        ),
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

function registerUpdateNodes(server: McpServer, adapter: WorkflowIoAdapter): void {
  server.tool(
    'update_nodes',
    'Update specific nodes in the current workflow by ID. More efficient than apply_workflow for partial changes. Fetches the current workflow, merges the specified node changes, validates the result, and applies to the canvas. Only updates existing nodes — use apply_workflow to add or remove nodes.',
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
      description: z
        .string()
        .optional()
        .describe(
          'A brief description of the changes being made. Shown to the user in the review dialog.'
        ),
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
            error:
              'No active workflow. Please open a workflow in CC Workflow Studio first.',
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

function registerHighlightGroupNode(
  server: McpServer,
  adapter: WorkflowIoAdapter
): void {
  server.tool(
    'highlight_group_node',
    'Highlight a group node on the CC Workflow Studio canvas to indicate it is currently being executed. Call this before executing nodes within a group to visually track progress.',
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
