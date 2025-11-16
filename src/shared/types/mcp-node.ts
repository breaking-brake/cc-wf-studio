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
 * MCP node configuration mode
 *
 * Determines how the MCP tool node is configured and executed:
 * - 'detailed': User explicitly configures server, tool, and all parameters
 * - 'naturalLanguageParam': User selects server/tool, describes parameters in natural language
 * - 'fullNaturalLanguage': User selects server only, describes entire task in natural language
 */
export type McpNodeMode = 'detailed' | 'naturalLanguageParam' | 'fullNaturalLanguage';

/**
 * Natural Language Parameter Mode configuration
 *
 * Used when user selects a specific tool but describes parameters in natural language.
 * Claude Code will interpret this description to set appropriate parameter values.
 */
export interface NaturalLanguageParamConfig {
  /** Natural language description of desired parameter values */
  description: string;
  /** Timestamp when this description was created (ISO 8601 format) */
  timestamp: string;
}

/**
 * Full Natural Language Mode configuration
 *
 * Used when user describes the entire task in natural language without selecting a tool.
 * Claude Code will choose the most appropriate tool from the available tools list.
 */
export interface FullNaturalLanguageConfig {
  /** Natural language description of the task to accomplish */
  taskDescription: string;
  /** Snapshot of available tools from the MCP server at configuration time */
  availableTools: McpToolReference[];
  /** Timestamp when this configuration was created (ISO 8601 format) */
  timestamp: string;
}

/**
 * Preserved Detailed Mode configuration
 *
 * Stores detailed mode configuration when user switches to a natural language mode.
 * This allows switching back to detailed mode without losing the explicit configuration.
 */
export interface PreservedDetailedConfig {
  /** Previously configured tool name */
  toolName: string;
  /** Previously configured parameter values */
  parameterValues: Record<string, unknown>;
  /** Timestamp when this configuration was preserved (ISO 8601 format) */
  timestamp: string;
}

/**
 * MCP node data
 *
 * Contains MCP-specific configuration and tool information.
 * Supports three configuration modes: detailed, naturalLanguageParam, and fullNaturalLanguage.
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

  // Natural Language Mode fields (optional, for backwards compatibility)

  /** Configuration mode (defaults to 'detailed' if undefined) */
  mode?: McpNodeMode;
  /** Natural Language Parameter Mode configuration (only if mode === 'naturalLanguageParam') */
  naturalLanguageParamConfig?: NaturalLanguageParamConfig;
  /** Full Natural Language Mode configuration (only if mode === 'fullNaturalLanguage') */
  fullNaturalLanguageConfig?: FullNaturalLanguageConfig;
  /** Preserved detailed configuration (stores data when switching away from detailed mode) */
  preservedDetailedConfig?: PreservedDetailedConfig;
}

/**
 * Export metadata for Detailed Mode
 *
 * Contains explicit parameter values for reproduction.
 */
export interface DetailedModeMetadata {
  /** Mode discriminator */
  mode: 'detailed';
  /** MCP server identifier */
  serverId: string;
  /** Tool function name */
  toolName: string;
  /** Explicit parameter values configured by user */
  parameterValues: Record<string, unknown>;
}

/**
 * Export metadata for Natural Language Parameter Mode
 *
 * Contains natural language description and parameter schema for Claude Code interpretation.
 */
export interface NaturalLanguageParamModeMetadata {
  /** Mode discriminator */
  mode: 'naturalLanguageParam';
  /** MCP server identifier */
  serverId: string;
  /** Tool function name */
  toolName: string;
  /** Natural language description of desired parameter values */
  userIntent: string;
  /** Parameter schema for Claude Code to map description to values */
  parameterSchema: ToolParameter[];
}

/**
 * Export metadata for Full Natural Language Mode
 *
 * Contains task description and available tools list for Claude Code to select tool and parameters.
 */
export interface FullNaturalLanguageModeMetadata {
  /** Mode discriminator */
  mode: 'fullNaturalLanguage';
  /** MCP server identifier */
  serverId: string;
  /** Natural language description of the entire task */
  userIntent: string;
  /** List of available tools from the MCP server (snapshot at configuration time) */
  availableTools: Array<{
    /** Tool function name */
    name: string;
    /** Tool description */
    description: string;
  }>;
}

/**
 * Export metadata (discriminated union)
 *
 * Embedded in exported slash commands to help Claude Code interpret user intent.
 * The specific metadata type is determined by the 'mode' discriminator.
 */
export type ModeExportMetadata =
  | DetailedModeMetadata
  | NaturalLanguageParamModeMetadata
  | FullNaturalLanguageModeMetadata;

/**
 * Normalize MCP node data for backwards compatibility
 *
 * Ensures that mode field is set to 'detailed' if undefined (for v1.2.0 workflows).
 * This function should be called when loading workflows from disk or receiving
 * AI-generated workflows.
 *
 * @param data - Raw MCP node data (potentially missing mode field)
 * @returns Normalized MCP node data with mode field set
 */
export function normalizeMcpNodeData(data: McpNodeData): McpNodeData {
  return {
    ...data,
    mode: data.mode ?? 'detailed',
  };
}

/**
 * MCP node definition
 *
 * Note: The actual McpNode interface that extends BaseNode
 * will be defined in workflow-definition.ts to avoid circular dependencies.
 * This file only contains the data structure definitions.
 */
