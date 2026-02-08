/**
 * MCP SDK Client Service
 *
 * Feature: 001-mcp-node
 * Purpose: Connect to MCP servers using @modelcontextprotocol/sdk and retrieve tools
 *
 * This service provides direct connection to MCP servers instead of using Claude Code CLI,
 * allowing us to retrieve tool lists directly from the MCP protocol.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpToolReference, ToolParameter } from '../../shared/types/mcp-node';
import { log } from '../extension';

/**
 * Connect to an MCP server using stdio transport
 *
 * @param command - Command to execute (e.g., "npx")
 * @param args - Command arguments (e.g., ["mcp-remote", "https://..."])
 * @param env - Environment variables
 * @param timeoutMs - Connection timeout in milliseconds (default: 5000)
 * @returns Connected MCP client
 */
export async function connectToMcpServer(
  command: string,
  args: string[],
  env: Record<string, string>,
  timeoutMs = 5000
): Promise<Client> {
  log('INFO', 'Connecting to MCP server via SDK', {
    command,
    args,
    timeoutMs,
  });

  const transport = new StdioClientTransport({
    command,
    args,
    env: {
      ...(Object.fromEntries(
        Object.entries(process.env).filter(([_, v]) => v !== undefined)
      ) as Record<string, string>),
      ...env,
    },
  });

  const client = new Client(
    {
      name: 'cc-workflow-studio',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`MCP server connection timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    // Race between connection and timeout
    await Promise.race([client.connect(transport), timeoutPromise]);

    log('INFO', 'Successfully connected to MCP server', {
      command,
      args,
    });

    return client;
  } catch (error) {
    log('ERROR', 'Failed to connect to MCP server', {
      command,
      args,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

/**
 * Convert MCP input schema to ToolParameter array
 *
 * @param inputSchema - MCP tool input schema (JSON Schema format)
 * @returns Array of tool parameters
 */
function convertJsonSchemaToToolParameters(inputSchema: {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
}): ToolParameter[] {
  if (!inputSchema.properties) {
    return [];
  }

  const required = inputSchema.required || [];

  return Object.entries(inputSchema.properties).map(([name, schema]) => {
    const paramSchema = schema as {
      type?: string;
      description?: string;
      enum?: unknown[];
      default?: unknown;
    };

    // Map JSON Schema type to ToolParameter type
    let paramType: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object' = 'string';
    const schemaType = paramSchema.type || 'string';

    if (
      schemaType === 'string' ||
      schemaType === 'number' ||
      schemaType === 'boolean' ||
      schemaType === 'integer' ||
      schemaType === 'array' ||
      schemaType === 'object'
    ) {
      paramType = schemaType;
    }

    return {
      name,
      type: paramType,
      description: paramSchema.description || '',
      required: required.includes(name),
    };
  });
}

/**
 * List all tools available from a specific MCP server using SDK
 *
 * @param serverId - Server identifier
 * @param command - Command to execute
 * @param args - Command arguments
 * @param env - Environment variables
 * @returns List of available tools
 */
export async function listToolsFromMcpServer(
  serverId: string,
  command: string,
  args: string[],
  env: Record<string, string>
): Promise<McpToolReference[]> {
  const startTime = Date.now();

  log('INFO', 'Listing tools from MCP server via SDK', {
    serverId,
    command,
    args,
  });

  let client: Client | null = null;

  try {
    // Connect to MCP server
    client = await connectToMcpServer(command, args, env);

    // List tools using MCP protocol
    const response = await client.listTools();

    log('INFO', 'Successfully retrieved tools from MCP server', {
      serverId,
      toolCount: response.tools.length,
      executionTimeMs: Date.now() - startTime,
    });

    // Convert MCP tools to our internal format
    return response.tools.map((tool) => ({
      serverId,
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema ? convertJsonSchemaToToolParameters(tool.inputSchema) : [],
    }));
  } catch (error) {
    log('ERROR', 'Failed to list tools from MCP server', {
      serverId,
      command,
      args,
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs: Date.now() - startTime,
    });

    throw error;
  } finally {
    // Always close the client connection
    if (client) {
      try {
        await client.close();
        log('INFO', 'Closed MCP server connection', { serverId });
      } catch (closeError) {
        log('WARN', 'Failed to close MCP server connection', {
          serverId,
          error: closeError instanceof Error ? closeError.message : String(closeError),
        });
      }
    }
  }
}
