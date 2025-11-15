/**
 * MCP (Model Context Protocol) Node Type Definitions
 *
 * Defines TypeScript types for MCP tool nodes in workflows.
 * These types map to the JSON schemas defined in contracts/workflow-mcp-node.schema.json
 * and contracts/mcp-cli.schema.json.
 */

/**
 * MCP server reference information (from 'claude mcp list')
 */
export interface McpServerReference {
  /** Server identifier (e.g., 'aws-knowledge-mcp') */
  id: string;
  /** Display name of the MCP server */
  name: string;
  /** Configuration scope */
  scope: 'user' | 'project' | 'enterprise';
  /** Connection status */
  status: 'connected' | 'disconnected';
  /** Executable command */
  command: string;
  /** Command arguments */
  args: string[];
  /** MCP transport type */
  type: 'stdio' | 'sse' | 'http';
  /** Environment variables (optional) */
  environment?: Record<string, string>;
}

/**
 * MCP tool reference information (from 'claude mcp get')
 */
export interface McpToolReference {
  /** Server identifier this tool belongs to */
  serverId: string;
  /** Tool function name */
  name: string;
  /** Human-readable description of the tool's functionality */
  description: string;
  /** Array of parameter schemas for this tool */
  parameters: ToolParameter[];
}

/**
 * Parameter validation constraints
 */
export interface ParameterValidation {
  /** Minimum string length */
  minLength?: number;
  /** Maximum string length */
  maxLength?: number;
  /** Regex pattern for string validation */
  pattern?: string;
  /** Minimum numeric value */
  minimum?: number;
  /** Maximum numeric value */
  maximum?: number;
  /** Enumerated valid values */
  enum?: (string | number)[];
}

/**
 * Tool parameter schema definition
 *
 * Recursive structure to support array and object types.
 */
export interface ToolParameter {
  /** Parameter identifier (e.g., 'region') */
  name: string;
  /** Parameter data type */
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  /** User-friendly description of the parameter */
  description?: string | null;
  /** Whether this parameter is mandatory for tool execution */
  required: boolean;
  /** Default value if not provided by user */
  default?: unknown;
  /** Constraints and validation rules */
  validation?: ParameterValidation;
  /** For array types: schema of array items */
  items?: ToolParameter;
  /** For object types: schema of nested properties */
  properties?: Record<string, ToolParameter>;
}

/**
 * MCP node data
 *
 * Contains MCP-specific configuration and tool information.
 */
export interface McpNodeData {
  /** MCP server identifier (from 'claude mcp list') */
  serverId: string;
  /** Tool function name from the MCP server */
  toolName: string;
  /** Human-readable description of the tool's functionality */
  toolDescription: string;
  /** Array of parameter schemas for this tool (immutable, from MCP definition) */
  parameters: ToolParameter[];
  /** User-configured values for the tool's parameters */
  parameterValues: Record<string, unknown>;
  /** Validation state (computed during workflow load) */
  validationStatus: 'valid' | 'missing' | 'invalid';
  /** Number of output ports (fixed at 1 for MCP nodes) */
  outputPorts: 1;
}

/**
 * MCP node definition
 *
 * Note: The actual McpNode interface that extends BaseNode
 * will be defined in workflow-definition.ts to avoid circular dependencies.
 * This file only contains the data structure definitions.
 */
