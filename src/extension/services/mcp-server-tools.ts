/**
 * CC Workflow Studio - MCP Server Tool Definitions
 *
 * Registers tools on the built-in MCP server that external AI agents
 * can call to interact with the workflow editor.
 *
 * Tools:
 * - get_current_workflow: Get the currently active workflow from the canvas
 * - get_workflow_schema: Get the workflow JSON schema for generating valid workflows
 * - apply_workflow: Apply a workflow to the canvas (validates first)
 * - list_available_agents: List available .claude/agents/*.md agent files
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { PlannedSubAgentFile } from '../../shared/types/messages';
import type { Workflow, WorkflowNode } from '../../shared/types/workflow-definition';
import { getProjectCommandsDir } from '../utils/path-utils';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';
import { scanAllCommands } from './command-service';
import { generateSubAgentFile, nodeNameToFileName } from './export-service';
import type { McpServerManager } from './mcp-server-service';
import { getDefaultSchemaPath, loadWorkflowSchemaToon } from './schema-loader-service';

export function registerMcpTools(server: McpServer, manager: McpServerManager): void {
  // Tool 1: get_current_workflow
  server.tool(
    'get_current_workflow',
    'Get the currently active workflow from CC Workflow Studio canvas. Returns the workflow JSON and whether it is stale (from cache when the editor is closed).',
    {},
    async () => {
      try {
        const result = await manager.requestCurrentWorkflow();

        if (!result.workflow) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'No active workflow. Please open a workflow in CC Workflow Studio first.',
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                isStale: result.isStale,
                workflow: result.workflow,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 2: get_workflow_schema
  server.tool(
    'get_workflow_schema',
    'Get the workflow schema documentation in optimized TOON format. Use this to understand the valid structure for creating or modifying workflows.',
    {},
    async () => {
      try {
        const extensionPath = manager.getExtensionPath();
        if (!extensionPath) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'Extension path not available',
                }),
              },
            ],
            isError: true,
          };
        }

        const schemaPath = getDefaultSchemaPath(extensionPath);
        const result = await loadWorkflowSchemaToon(schemaPath);

        if (!result.success || !result.schemaString) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: result.error?.message || 'Failed to load schema',
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: result.schemaString,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 3: apply_workflow
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
    },
    async ({ workflow: workflowJson, description }) => {
      try {
        // Parse JSON
        let parsedWorkflow: unknown;
        try {
          parsedWorkflow = JSON.parse(workflowJson);
        } catch {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'Invalid JSON: Failed to parse workflow string',
                }),
              },
            ],
            isError: true,
          };
        }

        // Pre-process: Plan .md files for SubAgent nodes without commandFilePath
        // (no disk writes yet — files are created only after user approval)
        const plannedFiles = await planSubAgentFiles(parsedWorkflow);

        // Validate (planSubAgentFiles sets commandFilePath in-place so validation passes)
        const validation = validateAIGeneratedWorkflow(parsedWorkflow);
        if (!validation.valid) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: 'Validation failed',
                  validationErrors: validation.errors,
                }),
              },
            ],
            isError: true,
          };
        }

        // Apply to canvas (plannedFiles are shown in the diff preview dialog)
        const applied = await manager.applyWorkflowToCanvas(
          parsedWorkflow as Workflow,
          description,
          plannedFiles
        );

        // Only create files on disk after successful canvas apply (user accepted)
        if (applied && plannedFiles.length > 0) {
          await executeSubAgentFileCreation(plannedFiles);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: applied,
                ...(plannedFiles.length > 0
                  ? { autoCreatedFiles: plannedFiles.map((f) => f.filePath) }
                  : {}),
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool 4: list_available_agents
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
        const { user, project } = await scanAllCommands();
        const allCommands = [...user, ...project];

        const commands = allCommands.map((cmd) => ({
          name: cmd.name,
          description: cmd.description,
          scope: cmd.scope,
          commandPath: cmd.commandPath,
          ...(includeContent ? { promptContent: cmd.promptContent } : {}),
        }));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                commands,
                totalCount: commands.length,
                userCount: user.length,
                projectCount: project.length,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
  // Tool 5: highlight_group_node
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
        // Empty string clears the highlight
        const effectiveId = groupNodeId || null;
        manager.highlightGroupNode(effectiveId);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                highlightedGroupNodeId: effectiveId,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Plan .claude/agents/*.md files for SubAgent nodes that don't have commandFilePath.
 *
 * Mutates the parsedWorkflow object in-place, setting commandFilePath and commandScope
 * on each SubAgent node so that validation passes. Does NOT write files to disk.
 *
 * @param parsedWorkflow - Parsed workflow object (mutated in-place)
 * @returns Array of planned files with content ready to be written
 */
async function planSubAgentFiles(
  parsedWorkflow: unknown
): Promise<(PlannedSubAgentFile & { content: string })[]> {
  if (typeof parsedWorkflow !== 'object' || parsedWorkflow === null) {
    return [];
  }

  const wf = parsedWorkflow as { nodes?: WorkflowNode[] };
  if (!Array.isArray(wf.nodes)) {
    return [];
  }

  const subAgentNodes = wf.nodes.filter(
    (n) =>
      n.type === 'subAgent' &&
      !(n.data as { commandFilePath?: string }).commandFilePath &&
      !(n.data as { builtInType?: string }).builtInType
  );

  if (subAgentNodes.length === 0) {
    return [];
  }

  // Determine project agents directory
  const projectAgentsDir = getProjectCommandsDir();
  if (!projectAgentsDir) {
    return []; // No workspace open, skip auto-creation
  }

  const planned: (PlannedSubAgentFile & { content: string })[] = [];

  for (const node of subAgentNodes) {
    const data = node.data as {
      description?: string;
      agentDefinition?: string;
      prompt?: string;
      model?: string;
      tools?: string;
      memory?: string;
      color?: string;
      commandFilePath?: string;
      commandScope?: string;
      outputPorts?: number;
    };

    // Generate file name from description or node name
    const baseName = nodeNameToFileName(data.description || node.name || 'sub-agent');

    // Avoid collision by appending suffix if needed
    let fileName = `${baseName}.md`;
    let filePath = path.join(projectAgentsDir, fileName);
    let suffix = 1;
    try {
      while (
        await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false)
      ) {
        fileName = `${baseName}-${suffix}.md`;
        filePath = path.join(projectAgentsDir, fileName);
        suffix++;
      }
    } catch {
      // access throws on not-found, which is fine
    }

    // Build pseudo node for generateSubAgentFile
    const pseudoNode = {
      id: node.id,
      type: 'subAgent' as const,
      name: data.description || node.name || 'sub-agent',
      position: node.position,
      data: {
        description: data.description || '',
        agentDefinition: data.agentDefinition || '',
        prompt: data.prompt || '',
        model: data.model,
        tools: data.tools,
        memory: data.memory as 'user' | 'project' | 'local' | undefined,
        color: data.color,
        outputPorts: data.outputPorts || 1,
      },
    };

    const content = generateSubAgentFile(pseudoNode);

    // Mutate node data in-place (so validation passes)
    data.commandFilePath = filePath;
    data.commandScope = 'project';

    planned.push({
      nodeId: node.id,
      nodeName: data.description || node.name || 'sub-agent',
      filePath,
      content,
    });
  }

  return planned;
}

/**
 * Write planned sub-agent files to disk.
 * Called only after the user has accepted the changes.
 *
 * @param plannedFiles - Files planned by planSubAgentFiles
 * @returns Array of created file paths
 */
async function executeSubAgentFileCreation(
  plannedFiles: (PlannedSubAgentFile & { content: string })[]
): Promise<string[]> {
  if (plannedFiles.length === 0) return [];

  // Ensure directory exists (use the directory of the first file)
  const dir = path.dirname(plannedFiles[0].filePath);
  const dotClaudeDir = path.dirname(dir);
  await fs.mkdir(dotClaudeDir, { recursive: true });
  await fs.mkdir(dir, { recursive: true });

  const createdFiles: string[] = [];
  for (const file of plannedFiles) {
    await fs.writeFile(file.filePath, file.content, 'utf-8');
    createdFiles.push(file.filePath);
  }
  return createdFiles;
}
