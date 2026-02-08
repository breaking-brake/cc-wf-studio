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
 * - validate_workflow: Validate a workflow JSON without applying
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { AiEditingProvider } from '../../shared/types/messages';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';
import type { McpServerManager } from './mcp-server-service';
import {
  getDefaultSchemaPath,
  loadWorkflowSchema,
  type SchemaVariant,
} from './schema-loader-service';

function getSchemaVariantForProvider(provider: AiEditingProvider | null): SchemaVariant {
  if (provider === 'codex' || provider === 'roo-code' || provider === 'copilot-vscode')
    return 'basic';
  return 'full';
}

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
    'Get the workflow JSON schema documentation. Use this to understand the valid structure for creating or modifying workflows.',
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

        const variant = getSchemaVariantForProvider(manager.getCurrentProvider());
        const schemaPath = getDefaultSchemaPath(extensionPath, variant);
        const result = await loadWorkflowSchema(schemaPath, variant);

        if (!result.success || !result.schema) {
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
              text: JSON.stringify({
                success: true,
                schema: result.schema,
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

  // Tool 3: apply_workflow
  server.tool(
    'apply_workflow',
    'Apply a workflow to the CC Workflow Studio canvas. The workflow is validated before being applied. The editor must be open.',
    {
      workflow: z.string().describe('The workflow JSON string to apply to the canvas'),
    },
    async ({ workflow: workflowJson }) => {
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

        // Validate
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

        // Apply to canvas
        const applied = await manager.applyWorkflowToCanvas(
          parsedWorkflow as import('../../shared/types/workflow-definition').Workflow
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: applied,
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

  // Tool 4: validate_workflow
  server.tool(
    'validate_workflow',
    'Validate a workflow JSON without applying it to the canvas. Returns validation results with any errors found.',
    {
      workflow: z.string().describe('The workflow JSON string to validate'),
    },
    async ({ workflow: workflowJson }) => {
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
                  valid: false,
                  errors: [
                    {
                      code: 'PARSE_ERROR',
                      message: 'Invalid JSON: Failed to parse workflow string',
                    },
                  ],
                }),
              },
            ],
          };
        }

        // Validate
        const validation = validateAIGeneratedWorkflow(parsedWorkflow);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                valid: validation.valid,
                errors: validation.errors,
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
                valid: false,
                errors: [
                  {
                    code: 'UNKNOWN_ERROR',
                    message: error instanceof Error ? error.message : String(error),
                  },
                ],
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
