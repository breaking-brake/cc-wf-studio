/**
 * MCP CLI Service
 *
 * Wrapper service for executing 'claude mcp' CLI commands.
 * Based on: contracts/mcp-cli.schema.json
 */

import { spawn } from 'node:child_process';
import type { McpServerReference, McpToolReference } from '../../shared/types/mcp-node';
import { log } from '../extension';

/**
 * Error codes for MCP CLI operations
 */
export type McpErrorCode =
  | 'MCP_CLI_NOT_FOUND'
  | 'MCP_CLI_TIMEOUT'
  | 'MCP_SERVER_NOT_FOUND'
  | 'MCP_CONNECTION_FAILED'
  | 'MCP_PARSE_ERROR'
  | 'MCP_UNKNOWN_ERROR';

export interface McpExecutionError {
  code: McpErrorCode;
  message: string;
  details?: string;
}

export interface McpExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: McpExecutionError;
  executionTimeMs: number;
}

/**
 * Default timeout for MCP CLI commands (from contracts/mcp-cli.schema.json)
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Execute a Claude Code MCP CLI command
 *
 * @param args - CLI arguments (e.g., ['mcp', 'list'])
 * @param timeoutMs - Timeout in milliseconds
 * @returns Execution result with stdout/stderr
 */
async function executeClaudeMcpCommand(
  args: string[],
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number | null }> {
  const startTime = Date.now();

  log('INFO', 'Executing claude mcp command', {
    args,
    timeoutMs,
  });

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Spawn 'claude' CLI process
    const childProcess = spawn('claude', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      childProcess.kill();

      const executionTimeMs = Date.now() - startTime;
      log('WARN', 'MCP CLI command timed out', {
        args,
        timeoutMs,
        executionTimeMs,
      });

      resolve({
        success: false,
        stdout: '',
        stderr: `Timeout after ${timeoutMs}ms`,
        exitCode: null,
      });
    }, timeoutMs);

    // Collect stdout
    childProcess.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    // Collect stderr
    childProcess.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Handle process errors (e.g., ENOENT when command not found)
    childProcess.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);

      if (timedOut) return;

      const executionTimeMs = Date.now() - startTime;

      log('ERROR', 'MCP CLI command error', {
        args,
        errorCode: err.code,
        errorMessage: err.message,
        executionTimeMs,
      });

      resolve({
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: null,
      });
    });

    // Handle process exit
    childProcess.on('exit', (code) => {
      clearTimeout(timeout);

      if (timedOut) return;

      const executionTimeMs = Date.now() - startTime;

      log('INFO', 'MCP CLI command completed', {
        args,
        exitCode: code,
        executionTimeMs,
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
      });

      resolve({
        success: code === 0,
        stdout,
        stderr,
        exitCode: code,
      });
    });
  });
}

/**
 * List all configured MCP servers
 *
 * Executes: claude mcp list
 * Based on: contracts/mcp-cli.schema.json - McpListCommand
 *
 * @returns List of MCP servers with connection status
 */
export async function listServers(): Promise<McpExecutionResult<McpServerReference[]>> {
  const startTime = Date.now();

  const result = await executeClaudeMcpCommand(['mcp', 'list']);
  const executionTimeMs = Date.now() - startTime;

  if (!result.success) {
    // Check for ENOENT (command not found)
    if (result.stderr.includes('ENOENT') || result.exitCode === null) {
      return {
        success: false,
        error: {
          code: 'MCP_CLI_NOT_FOUND',
          message: 'Claude Code CLI is not installed or not in PATH',
          details: result.stderr,
        },
        executionTimeMs,
      };
    }

    // Check for timeout
    if (result.stderr.includes('Timeout')) {
      return {
        success: false,
        error: {
          code: 'MCP_CLI_TIMEOUT',
          message: 'MCP server query timed out',
          details: result.stderr,
        },
        executionTimeMs,
      };
    }

    return {
      success: false,
      error: {
        code: 'MCP_UNKNOWN_ERROR',
        message: 'Failed to list MCP servers',
        details: result.stderr,
      },
      executionTimeMs,
    };
  }

  // Parse output
  try {
    const servers = parseMcpListOutput(result.stdout);

    log('INFO', 'Successfully listed MCP servers', {
      serverCount: servers.length,
      executionTimeMs,
    });

    return {
      success: true,
      data: servers,
      executionTimeMs,
    };
  } catch (error) {
    log('ERROR', 'Failed to parse MCP list output', {
      error: error instanceof Error ? error.message : String(error),
      stdout: result.stdout.substring(0, 200),
    });

    return {
      success: false,
      error: {
        code: 'MCP_PARSE_ERROR',
        message: 'Failed to parse MCP server list',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
    };
  }
}

/**
 * Parse 'claude mcp list' output
 *
 * Example output:
 * ```
 * Checking MCP server health...
 *
 * aws-knowledge-mcp: npx mcp-remote https://knowledge-mcp.global.api.aws - ✓ Connected
 * local-tools: npx mcp-local /path/to/tools - ✗ Connection timeout
 * ```
 *
 * @param output - Raw output from 'claude mcp list'
 * @returns Parsed server list
 */
function parseMcpListOutput(output: string): McpServerReference[] {
  const servers: McpServerReference[] = [];
  const lines = output.split('\n');

  // Regex: /^([^:]+):\s+(.+?)\s+-\s+(.*)$/
  // Groups: (1) server name, (2) command+args, (3) status
  const lineRegex = /^([^:]+):\s+(.+?)\s+-\s+(.*)$/;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and header
    if (!trimmedLine || trimmedLine.startsWith('Checking MCP')) {
      continue;
    }

    const match = lineRegex.exec(trimmedLine);
    if (!match) {
      continue;
    }

    const [, serverName, commandAndArgs, statusText] = match;

    // Parse command and args
    const parts = commandAndArgs.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    // Detect connection status from ✓ check mark
    const status = statusText.includes('✓') ? 'connected' : 'disconnected';

    servers.push({
      id: serverName.trim(),
      name: serverName.trim(),
      scope: 'user', // Will be determined by 'claude mcp get'
      status: status as 'connected' | 'disconnected',
      command,
      args,
      type: 'stdio', // Will be determined by 'claude mcp get'
    });
  }

  return servers;
}

/**
 * Get detailed information about a specific MCP server
 *
 * Executes: claude mcp get <server-name>
 * Based on: contracts/mcp-cli.schema.json - McpGetCommand
 *
 * @param serverId - Server identifier from 'claude mcp list'
 * @returns Detailed server information
 */
export async function getServerDetails(
  serverId: string
): Promise<McpExecutionResult<McpServerReference>> {
  const startTime = Date.now();

  const result = await executeClaudeMcpCommand(['mcp', 'get', serverId]);
  const executionTimeMs = Date.now() - startTime;

  if (!result.success) {
    // Check for ENOENT (command not found)
    if (result.stderr.includes('ENOENT') || result.exitCode === null) {
      return {
        success: false,
        error: {
          code: 'MCP_CLI_NOT_FOUND',
          message: 'Claude Code CLI is not installed or not in PATH',
          details: result.stderr,
        },
        executionTimeMs,
      };
    }

    // Check for server not found (exit code 1 + stderr pattern)
    if (result.exitCode === 1 && result.stderr.includes('No MCP server found')) {
      return {
        success: false,
        error: {
          code: 'MCP_SERVER_NOT_FOUND',
          message: `MCP server '${serverId}' not found`,
          details: result.stderr,
        },
        executionTimeMs,
      };
    }

    return {
      success: false,
      error: {
        code: 'MCP_UNKNOWN_ERROR',
        message: `Failed to get details for MCP server '${serverId}'`,
        details: result.stderr,
      },
      executionTimeMs,
    };
  }

  // Parse output
  try {
    const serverDetails = parseMcpGetOutput(result.stdout, serverId);

    log('INFO', 'Successfully retrieved MCP server details', {
      serverId,
      executionTimeMs,
    });

    return {
      success: true,
      data: serverDetails,
      executionTimeMs,
    };
  } catch (error) {
    log('ERROR', 'Failed to parse MCP get output', {
      serverId,
      error: error instanceof Error ? error.message : String(error),
      stdout: result.stdout.substring(0, 200),
    });

    return {
      success: false,
      error: {
        code: 'MCP_PARSE_ERROR',
        message: 'Failed to parse MCP server details',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
    };
  }
}

/**
 * Parse 'claude mcp get <server-name>' output
 *
 * Example output:
 * ```
 * aws-knowledge-mcp:
 *   Scope: User config (available in all your projects)
 *   Status: ✓ Connected
 *   Type: stdio
 *   Command: npx
 *   Args: mcp-remote https://knowledge-mcp.global.api.aws
 *   Environment:
 *
 * To remove this server, run: claude mcp remove "aws-knowledge-mcp" -s user
 * ```
 *
 * @param output - Raw output from 'claude mcp get'
 * @param serverId - Server identifier
 * @returns Parsed server details
 */
function parseMcpGetOutput(output: string, serverId: string): McpServerReference {
  const lines = output.split('\n');
  const details: Partial<McpServerReference> = {
    id: serverId,
    name: serverId,
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and removal command
    if (!trimmedLine || trimmedLine.startsWith('To remove')) {
      continue;
    }

    // Skip server name line (first line)
    if (trimmedLine === `${serverId}:`) {
      continue;
    }

    // Parse key-value pairs (indented lines)
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmedLine.substring(0, colonIndex).trim();
    const value = trimmedLine.substring(colonIndex + 1).trim();

    switch (key) {
      case 'Scope':
        // Extract scope from parenthetical note
        if (value.includes('User config')) {
          details.scope = 'user';
        } else if (value.includes('Project config')) {
          details.scope = 'project';
        } else if (value.includes('Enterprise')) {
          details.scope = 'enterprise';
        }
        break;

      case 'Status':
        details.status = value.includes('✓') ? 'connected' : 'disconnected';
        break;

      case 'Type':
        details.type = value as 'stdio' | 'sse' | 'http';
        break;

      case 'Command':
        details.command = value;
        break;

      case 'Args':
        // Split on whitespace into array
        details.args = value.split(/\s+/).filter((arg) => arg.length > 0);
        break;

      case 'Environment':
        // Environment variables (currently not parsed, assumed empty)
        details.environment = {};
        break;
    }
  }

  // Validate required fields
  if (!details.scope || !details.status || !details.type || !details.command || !details.args) {
    throw new Error('Missing required fields in MCP server details');
  }

  return details as McpServerReference;
}

/**
 * List all tools available from a specific MCP server
 *
 * Executes: claude mcp list-tools <server-name>
 * Based on: contracts/mcp-cli.schema.json - McpListToolsCommand (T021)
 *
 * NOTE: The actual CLI command may vary. This implementation assumes
 * the command exists and returns a JSON list of tools.
 *
 * @param serverId - Server identifier
 * @returns List of available tools
 */
export async function listTools(serverId: string): Promise<McpExecutionResult<McpToolReference[]>> {
  const startTime = Date.now();

  const result = await executeClaudeMcpCommand(['mcp', 'list-tools', serverId]);
  const executionTimeMs = Date.now() - startTime;

  if (!result.success) {
    // Check for ENOENT (command not found)
    if (result.stderr.includes('ENOENT') || result.exitCode === null) {
      return {
        success: false,
        error: {
          code: 'MCP_CLI_NOT_FOUND',
          message: 'Claude Code CLI is not installed or not in PATH',
          details: result.stderr,
        },
        executionTimeMs,
      };
    }

    // Check for server not found
    if (result.exitCode === 1 && result.stderr.includes('No MCP server found')) {
      return {
        success: false,
        error: {
          code: 'MCP_SERVER_NOT_FOUND',
          message: `MCP server '${serverId}' not found`,
          details: result.stderr,
        },
        executionTimeMs,
      };
    }

    // Check for timeout
    if (result.stderr.includes('Timeout')) {
      return {
        success: false,
        error: {
          code: 'MCP_CLI_TIMEOUT',
          message: 'MCP tool list query timed out',
          details: result.stderr,
        },
        executionTimeMs,
      };
    }

    return {
      success: false,
      error: {
        code: 'MCP_UNKNOWN_ERROR',
        message: `Failed to list tools for MCP server '${serverId}'`,
        details: result.stderr,
      },
      executionTimeMs,
    };
  }

  // Parse output
  try {
    const tools = parseMcpListToolsOutput(result.stdout, serverId);

    log('INFO', 'Successfully listed MCP tools', {
      serverId,
      toolCount: tools.length,
      executionTimeMs,
    });

    return {
      success: true,
      data: tools,
      executionTimeMs,
    };
  } catch (error) {
    log('ERROR', 'Failed to parse MCP list-tools output', {
      serverId,
      error: error instanceof Error ? error.message : String(error),
      stdout: result.stdout.substring(0, 200),
    });

    return {
      success: false,
      error: {
        code: 'MCP_PARSE_ERROR',
        message: 'Failed to parse MCP tool list',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
    };
  }
}

/**
 * Parse 'claude mcp list-tools <server-name>' output
 *
 * Example output (expected JSON format):
 * ```json
 * [
 *   {
 *     "name": "list_regions",
 *     "description": "Retrieve a list of all AWS regions",
 *     "parameters": [
 *       {
 *         "name": "include_opt_in",
 *         "type": "boolean",
 *         "description": "Include opt-in regions",
 *         "required": false
 *       }
 *     ]
 *   }
 * ]
 * ```
 *
 * @param output - Raw output from 'claude mcp list-tools'
 * @param serverId - Server identifier
 * @returns Parsed tool list
 */
function parseMcpListToolsOutput(output: string, serverId: string): McpToolReference[] {
  // Try to parse as JSON first
  try {
    const jsonData = JSON.parse(output);

    if (!Array.isArray(jsonData)) {
      throw new Error('Expected JSON array of tools');
    }

    return jsonData.map(
      (tool: { name?: string; description?: string; parameters?: unknown[] }) => ({
        serverId,
        toolName: tool.name || '',
        description: tool.description || '',
        parameters: tool.parameters || [],
      })
    );
  } catch (_jsonError) {
    // Fallback: parse as plain text output
    // Format: "tool_name - description"
    const tools: McpToolReference[] = [];
    const lines = output.split('\n');
    const lineRegex = /^([^\s-]+)\s+-\s+(.+)$/;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('Available tools')) {
        continue;
      }

      const match = lineRegex.exec(trimmedLine);
      if (!match) {
        continue;
      }

      const [, toolName, description] = match;

      tools.push({
        serverId,
        toolName: toolName.trim(),
        description: description.trim(),
        parameters: [], // Will be populated by get-tool-schema later
      });
    }

    return tools;
  }
}

/**
 * Get JSON schema for a specific tool's parameters
 *
 * NOTE: This is a placeholder - actual implementation depends on Claude Code CLI
 * supporting 'claude mcp get-tool-schema <server-name> <tool-name>' command.
 *
 * @param serverId - Server identifier
 * @param toolName - Tool name
 * @returns Tool parameter schema
 */
export async function getToolSchema(
  serverId: string,
  toolName: string
): Promise<McpExecutionResult<McpToolReference>> {
  // TODO: Implement when 'claude mcp get-tool-schema' is available
  log('WARN', 'getToolSchema() not yet implemented - placeholder', { serverId, toolName });

  return {
    success: false,
    error: {
      code: 'MCP_UNKNOWN_ERROR',
      message: 'Tool schema retrieval not yet implemented',
      details: 'Waiting for Claude Code CLI support for retrieving tool schemas',
    },
    executionTimeMs: 0,
  };
}

/**
 * Execute an MCP tool with parameters
 *
 * NOTE: This is a placeholder - actual implementation depends on Claude Code CLI
 * supporting 'claude mcp run <server-name> <tool-name> [params]' command.
 *
 * @param serverId - Server identifier
 * @param toolName - Tool name
 * @param parameters - Tool parameters
 * @returns Tool execution result
 */
export async function executeTool(
  serverId: string,
  toolName: string,
  parameters: Record<string, unknown>
): Promise<McpExecutionResult<unknown>> {
  // TODO: Implement when 'claude mcp run' is available
  log('WARN', 'executeTool() not yet implemented - placeholder', {
    serverId,
    toolName,
    parameters,
  });

  return {
    success: false,
    error: {
      code: 'MCP_UNKNOWN_ERROR',
      message: 'Tool execution not yet implemented',
      details: 'Waiting for Claude Code CLI support for executing tools',
    },
    executionTimeMs: 0,
  };
}
