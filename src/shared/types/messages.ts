/**
 * Claude Code Workflow Studio - Extension ↔ Webview Message Types
 *
 * Based on: /specs/001-cc-wf-studio/contracts/extension-webview-api.md
 */

import type { Connection, Workflow, WorkflowNode } from './workflow-definition';

// Re-export Workflow for convenience
export type { Workflow, WorkflowNode, Connection };

// ============================================================================
// Base Message
// ============================================================================

export interface Message<T = unknown, K extends string = string> {
  type: K;
  payload?: T;
  requestId?: string;
}

// ============================================================================
// Extension → Webview Payloads
// ============================================================================

export interface LoadWorkflowPayload {
  workflow: Workflow;
}

export interface SaveSuccessPayload {
  filePath: string;
  timestamp: string; // ISO 8601
}

export interface ExportSuccessPayload {
  exportedFiles: string[];
  timestamp: string; // ISO 8601
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface WorkflowListPayload {
  workflows: Array<{
    id: string;
    name: string;
    description?: string;
    updatedAt: string; // ISO 8601
  }>;
}

export interface InitialStatePayload {
  hasAcceptedTerms: boolean;
}

// ============================================================================
// Workflow Preview Payloads
// ============================================================================

/**
 * Preview mode initialization payload
 * Sent when opening a workflow file in preview mode
 */
export interface PreviewModeInitPayload {
  /** Workflow to display in preview */
  workflow: Workflow;
  /** Whether this is a historical version (git diff "before" side) */
  isHistoricalVersion?: boolean;
  /** Whether the file has uncommitted git changes (for showing "After" badge) */
  hasGitChanges?: boolean;
}

/**
 * Preview update payload
 * Sent when the source JSON file is modified
 */
export interface PreviewUpdatePayload {
  /** Updated workflow to display */
  workflow: Workflow;
}

/**
 * Preview parse error payload
 * Sent when the source JSON cannot be parsed
 */
export interface PreviewParseErrorPayload {
  /** Error message describing the parse failure */
  error: string;
}

/**
 * Prepare workflow load payload
 * Sent before loading a new workflow to show loading state
 */
export interface PrepareWorkflowLoadPayload {
  /** Workflow ID being loaded */
  workflowId: string;
}

// ============================================================================
// Webview → Extension Payloads
// ============================================================================

export interface SaveWorkflowPayload {
  workflow: Workflow;
}

export interface ExportWorkflowPayload {
  workflow: Workflow;
  overwriteExisting?: boolean;
}

export interface ConfirmOverwritePayload {
  confirmed: boolean;
  filePath: string;
}

export interface StateUpdatePayload {
  nodes: WorkflowNode[];
  edges: Connection[];
  selectedNodeId?: string | null;
}

export interface LoadWorkflowRequestPayload {
  workflowId: string;
}

/**
 * Confirm workflow load payload
 * Sent from Webview to Extension after user confirms loading (or no unsaved changes)
 */
export interface ConfirmWorkflowLoadPayload {
  workflowId: string;
}

export interface CancelRefinementPayload {
  requestId: string; // キャンセル対象のリクエストID
}

// ============================================================================
// Run as Slash Command Payloads
// ============================================================================

/**
 * Run workflow as slash command request payload
 * Converts workflow to slash command and runs it in VSCode terminal
 */
export interface RunAsSlashCommandPayload {
  /** Workflow to run */
  workflow: Workflow;
}

/**
 * Run as slash command success payload
 */
export interface RunAsSlashCommandSuccessPayload {
  /** Workflow name that was run */
  workflowName: string;
  /** Terminal name where command is running */
  terminalName: string;
  /** Timestamp of run */
  timestamp: string; // ISO 8601
}

// ============================================================================
// Skill Node Payloads (001-skill-node)
// ============================================================================

export interface SkillReference {
  /** Absolute path to SKILL.md file */
  skillPath: string;
  /** Skill name (from YAML frontmatter) */
  name: string;
  /** Skill description (from YAML frontmatter) */
  description: string;
  /** Skill scope: user, project, or local */
  scope: 'user' | 'project' | 'local';
  /** Validation status */
  validationStatus: 'valid' | 'missing' | 'invalid';
  /** Optional: Allowed tools (from YAML frontmatter) */
  allowedTools?: string;
  /**
   * Source directory for skills
   * - 'claude': from ~/.claude/skills/ (user) or .claude/skills/ (project)
   * - 'copilot': from ~/.copilot/skills/ (user) or .github/skills/ (project)
   * - 'codex': from ~/.codex/skills/ (user) or .codex/skills/ (project)
   * - undefined: for local scope or legacy data
   */
  source?: 'claude' | 'copilot' | 'codex';
}

export interface CreateSkillPayload {
  /** Skill name (lowercase, hyphens, max 64 chars) */
  name: string;
  /** Skill description (max 1024 chars) */
  description: string;
  /** Markdown content for Skill instructions */
  instructions: string;
  /** Optional: Comma-separated allowed tools */
  allowedTools?: string;
  /** Scope: user or project */
  scope: 'user' | 'project';
}

export interface SkillCreationSuccessPayload {
  /** Path to created SKILL.md file */
  skillPath: string;
  /** Skill name */
  name: string;
  /** Skill description */
  description: string;
  /** Scope */
  scope: 'user' | 'project';
  /** Timestamp of creation */
  timestamp: string; // ISO 8601
}

export interface SkillValidationErrorPayload {
  /** Error code for i18n lookup */
  errorCode:
    | 'SKILL_NOT_FOUND'
    | 'INVALID_FRONTMATTER'
    | 'NAME_CONFLICT'
    | 'INVALID_NAME_FORMAT'
    | 'DESCRIPTION_TOO_LONG'
    | 'INSTRUCTIONS_EMPTY'
    | 'FILE_WRITE_ERROR'
    | 'UNKNOWN_ERROR';
  /** Human-readable error message (English fallback) */
  errorMessage: string;
  /** Optional: File path related to error */
  filePath?: string;
  /** Optional: Additional details for debugging */
  details?: string;
}

export interface SkillListLoadedPayload {
  /** Array of available Skills (user + project + local) */
  skills: SkillReference[];
  /** Timestamp of scan */
  timestamp: string; // ISO 8601
  /** Number of user-scope Skills found */
  userCount: number;
  /** Number of project-scope Skills found */
  projectCount: number;
  /** Number of local-scope Skills found (from plugins) */
  localCount: number;
}

export interface ValidateSkillFilePayload {
  /** Path to SKILL.md file to validate */
  skillPath: string;
}

export interface SkillValidationSuccessPayload {
  /** Validated Skill reference */
  skill: SkillReference;
}

// ============================================================================
// AI Workflow Refinement Payloads (001-ai-workflow-refinement)
// ============================================================================

import type { ConversationHistory, ConversationMessage } from './workflow-definition';

/**
 * Claude model selection for AI refinement
 * - sonnet: Claude Sonnet (default, balanced performance)
 * - opus: Claude Opus (highest capability)
 * - haiku: Claude Haiku (fastest, most economical)
 */
export type ClaudeModel = 'sonnet' | 'opus' | 'haiku';

/**
 * AI CLI provider selection
 * - claude-code: Claude Code CLI (default)
 * - copilot: VS Code Language Model API (Copilot)
 * - codex: OpenAI Codex CLI
 */
export type AiCliProvider = 'claude-code' | 'copilot' | 'codex';

/**
 * Copilot model selection (for VS Code Language Model API)
 * This type represents model family strings returned by vscode.lm API.
 * The list is dynamic and fetched at runtime from vscode.lm.selectChatModels().
 */
export type CopilotModel = string;

/**
 * Codex model selection (for OpenAI Codex CLI)
 * Common models include 'o3', 'o4-mini', etc.
 * The list is dynamic and can be configured in ~/.codex/config.toml
 */
export type CodexModel = string;

/**
 * Codex CLI reasoning effort levels
 * Controls how much reasoning effort the model applies
 * Note: Only 'low', 'medium', 'high' are supported across all Codex models
 */
export type CodexReasoningEffort = 'low' | 'medium' | 'high';

/**
 * Information about a Copilot model available via VS Code LM API
 */
export interface CopilotModelInfo {
  /** Model ID (e.g., 'gpt-4o') */
  id: string;
  /** Display name (e.g., 'GPT-4o') */
  name: string;
  /** Model family (e.g., 'gpt-4o') - used for selection */
  family: string;
  /** Vendor (always 'copilot' for Copilot models) */
  vendor: string;
}

/**
 * Payload for listing available Copilot models
 */
export interface CopilotModelsListPayload {
  /** List of available Copilot models */
  models: CopilotModelInfo[];
  /** Whether the LM API is available */
  available: boolean;
  /** Error reason if not available */
  unavailableReason?: string;
}

export interface RefineWorkflowPayload {
  /** ID of the workflow being refined */
  workflowId: string;
  /** User's refinement request (1-5000 characters) */
  userMessage: string;
  /** Current workflow state (full Workflow object) */
  currentWorkflow: Workflow;
  /** Existing conversation history */
  conversationHistory: ConversationHistory;
  /** Whether to include skills in refinement (default: true) */
  useSkills?: boolean;
  /** Optional timeout in milliseconds (default: 60000, min: 10000, max: 120000) */
  timeoutMs?: number;
  /** Target type for refinement (default: 'workflow') */
  targetType?: 'workflow' | 'subAgentFlow';
  /** SubAgentFlow ID (required when targetType is 'subAgentFlow') */
  subAgentFlowId?: string;
  /** Claude model to use (default: 'sonnet') */
  model?: ClaudeModel;
  /** Allowed tools for Claude Code CLI (optional, e.g., ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch']) */
  allowedTools?: string[];
  /** Previous validation errors from failed refinement attempt (for retry with error context) */
  previousValidationErrors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  /** AI CLI provider to use (default: 'claude-code') */
  provider?: AiCliProvider;
  /** Copilot model to use when provider is 'copilot' (default: 'gpt-4o') */
  copilotModel?: CopilotModel;
  /** Codex model to use when provider is 'codex' (default: '' = inherit from CLI config) */
  codexModel?: CodexModel;
  /** Codex reasoning effort level (default: 'low') */
  codexReasoningEffort?: CodexReasoningEffort;
  /** Whether to include Codex Agent node in AI prompt (default: false) */
  useCodex?: boolean;
}

export interface RefinementSuccessPayload {
  /** The refined workflow (full Workflow object) */
  refinedWorkflow: Workflow;
  /** AI's response message */
  aiMessage: ConversationMessage;
  /** Updated conversation history with new messages */
  updatedConversationHistory: ConversationHistory;
  /** Optional: brief summary of changes made (max 500 chars) */
  changesSummary?: string;
  /** Time taken to execute refinement (in milliseconds) */
  executionTimeMs: number;
  /** Response timestamp */
  timestamp: string; // ISO 8601
  /** Whether session was reconnected due to session expiration (fallback occurred) */
  sessionReconnected?: boolean;
}

export interface RefinementFailedPayload {
  /** Structured error information */
  error: {
    /** Error code for i18n lookup */
    code:
      | 'COMMAND_NOT_FOUND'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'ITERATION_LIMIT_REACHED'
      | 'CANCELLED'
      | 'PROHIBITED_NODE_TYPE'
      | 'UNKNOWN_ERROR';
    /** Human-readable error message */
    message: string;
    /** Optional: detailed error information */
    details?: string;
  };
  /** Time taken before error occurred */
  executionTimeMs: number;
  /** Error timestamp */
  timestamp: string; // ISO 8601
  /** Validation errors for VALIDATION_ERROR code (used for retry with error context) */
  validationErrors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export interface ClearConversationPayload {
  /** ID of the workflow to clear conversation for */
  workflowId: string;
}

export interface ConversationClearedPayload {
  /** ID of the workflow that was cleared */
  workflowId: string;
}

export interface RefinementCancelledPayload {
  /** Time taken before cancellation (in milliseconds) */
  executionTimeMs: number;
  /** Cancellation timestamp */
  timestamp: string; // ISO 8601
}

export interface RefinementClarificationPayload {
  /** AI's clarification message asking for more information */
  aiMessage: ConversationMessage;
  /** Updated conversation history with the clarification message */
  updatedConversationHistory: ConversationHistory;
  /** Time taken to execute refinement before clarification */
  executionTimeMs: number;
  /** Response timestamp */
  timestamp: string; // ISO 8601
  /** Whether session was reconnected due to session expiration (fallback occurred) */
  sessionReconnected?: boolean;
}

export interface RefinementProgressPayload {
  /** New text chunk from streaming output */
  chunk: string;
  /** Display text (may include tool usage info) - for streaming display */
  accumulatedText: string;
  /** Explanatory text only (no tool info) - for preserving in chat history */
  explanatoryText?: string;
  /** Content type from Claude streaming response ('tool_use' or 'text') */
  contentType?: 'tool_use' | 'text';
  /** Progress timestamp */
  timestamp: string; // ISO 8601
}

// ============================================================================
// SubAgentFlow Refinement Payloads
// ============================================================================

export interface SubAgentFlowRefinementSuccessPayload {
  /** ID of the SubAgentFlow that was refined */
  subAgentFlowId: string;
  /** The refined inner workflow (nodes and connections only) */
  refinedInnerWorkflow: {
    nodes: Workflow['nodes'];
    connections: Workflow['connections'];
  };
  /** AI's response message */
  aiMessage: ConversationMessage;
  /** Updated conversation history with new messages */
  updatedConversationHistory: ConversationHistory;
  /** Time taken to execute refinement (in milliseconds) */
  executionTimeMs: number;
  /** Response timestamp */
  timestamp: string; // ISO 8601
  /** Whether session was reconnected due to session expiration (fallback occurred) */
  sessionReconnected?: boolean;
}

// ============================================================================
// MCP Node Payloads (001-mcp-node)
// ============================================================================

import type { McpServerReference, McpToolReference } from './mcp-node';

// Re-export for Webview usage
export type { McpServerReference, McpToolReference };

/**
 * Options for filtering MCP servers
 */
export interface ListMcpServersOptions {
  /** Filter by scope (optional) */
  filterByScope?: Array<'user' | 'project' | 'enterprise'>;
}

/**
 * MCP Server list request payload
 */
export interface ListMcpServersPayload {
  /** Request options */
  options?: ListMcpServersOptions;
}

/**
 * MCP Server list result payload
 */
export interface McpServersResultPayload {
  /** Whether the request succeeded */
  success: boolean;
  /** List of MCP servers (if success) */
  servers?: McpServerReference[];
  /** Error information (if failure) */
  error?: {
    code:
      | 'MCP_CLI_NOT_FOUND'
      | 'MCP_CLI_TIMEOUT'
      | 'MCP_SERVER_NOT_FOUND'
      | 'MCP_CONNECTION_FAILED'
      | 'MCP_PARSE_ERROR'
      | 'MCP_UNKNOWN_ERROR'
      | 'MCP_UNSUPPORTED_TRANSPORT'
      | 'MCP_INVALID_CONFIG'
      | 'MCP_CONNECTION_TIMEOUT'
      | 'MCP_CONNECTION_ERROR';
    message: string;
    details?: string;
  };
  /** Request timestamp */
  timestamp: string; // ISO 8601
  /** Execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Get MCP tools request payload
 */
export interface GetMcpToolsPayload {
  /** MCP server identifier */
  serverId: string;
}

/**
 * MCP Tools result payload
 */
export interface McpToolsResultPayload {
  /** Whether the request succeeded */
  success: boolean;
  /** Server identifier */
  serverId: string;
  /** List of MCP tools (if success) */
  tools?: McpToolReference[];
  /** Error information (if failure) */
  error?: {
    code:
      | 'MCP_CLI_NOT_FOUND'
      | 'MCP_CLI_TIMEOUT'
      | 'MCP_SERVER_NOT_FOUND'
      | 'MCP_CONNECTION_FAILED'
      | 'MCP_PARSE_ERROR'
      | 'MCP_UNKNOWN_ERROR'
      | 'MCP_UNSUPPORTED_TRANSPORT'
      | 'MCP_INVALID_CONFIG'
      | 'MCP_CONNECTION_TIMEOUT'
      | 'MCP_CONNECTION_ERROR';
    message: string;
    details?: string;
  };
  /** Request timestamp */
  timestamp: string; // ISO 8601
  /** Execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Get MCP tool schema request payload
 */
export interface GetMcpToolSchemaPayload {
  /** MCP server identifier */
  serverId: string;
  /** Tool name */
  toolName: string;
}

/**
 * MCP Tool schema result payload
 */
export interface McpToolSchemaResultPayload {
  /** Whether the request succeeded */
  success: boolean;
  /** Server identifier */
  serverId: string;
  /** Tool name */
  toolName: string;
  /** Tool schema (if success) */
  schema?: McpToolReference;
  /** Error information (if failure) */
  error?: {
    code:
      | 'MCP_CLI_NOT_FOUND'
      | 'MCP_CLI_TIMEOUT'
      | 'MCP_SERVER_NOT_FOUND'
      | 'MCP_TOOL_NOT_FOUND'
      | 'MCP_PARSE_ERROR'
      | 'MCP_UNKNOWN_ERROR'
      | 'MCP_CONNECTION_FAILED'
      | 'MCP_CONNECTION_TIMEOUT'
      | 'MCP_CONNECTION_ERROR'
      | 'MCP_UNSUPPORTED_TRANSPORT'
      | 'MCP_INVALID_CONFIG';
    message: string;
    details?: string;
  };
  /** Request timestamp */
  timestamp: string; // ISO 8601
  /** Execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Validate MCP node payload
 */
export interface ValidateMcpNodePayload {
  /** MCP server identifier */
  serverId: string;
  /** Tool name */
  toolName: string;
  /** Parameter values to validate */
  parameterValues: Record<string, unknown>;
}

/**
 * MCP node validation result payload
 */
export interface McpNodeValidationResultPayload {
  /** Whether validation succeeded */
  success: boolean;
  /** Validation status */
  validationStatus: 'valid' | 'invalid';
  /** Validation errors (if invalid) */
  errors?: Array<{
    /** Parameter name */
    parameterName: string;
    /** Error code */
    code: 'MISSING_REQUIRED' | 'INVALID_TYPE' | 'VALIDATION_FAILED';
    /** Error message */
    message: string;
  }>;
}

/**
 * Update MCP node payload
 */
export interface UpdateMcpNodePayload {
  /** Node ID */
  nodeId: string;
  /** Updated parameter values */
  parameterValues: Record<string, unknown>;
}

/**
 * MCP error payload
 */
export interface McpErrorPayload {
  /** Error code */
  code:
    | 'MCP_CLI_NOT_FOUND'
    | 'MCP_CLI_TIMEOUT'
    | 'MCP_SERVER_NOT_FOUND'
    | 'MCP_CONNECTION_FAILED'
    | 'MCP_TOOL_NOT_FOUND'
    | 'MCP_PARSE_ERROR'
    | 'MCP_VALIDATION_ERROR'
    | 'MCP_UNKNOWN_ERROR';
  /** Error message */
  message: string;
  /** Optional: detailed error information */
  details?: string;
  /** Request timestamp */
  timestamp: string; // ISO 8601
}

/**
 * Refresh MCP cache request payload
 *
 * Invalidates all in-memory MCP cache (server list, tools, schemas).
 * Useful when MCP servers are added/removed after initial load.
 */
export type RefreshMcpCachePayload = Record<string, never>;

/**
 * MCP cache refreshed result payload
 */
export interface McpCacheRefreshedPayload {
  /** Whether the cache refresh succeeded */
  success: boolean;
  /** Request timestamp */
  timestamp: string; // ISO 8601
}

// ============================================================================
// Extension → Webview Messages
// ============================================================================

export type ExtensionMessage =
  | Message<LoadWorkflowPayload, 'LOAD_WORKFLOW'>
  | Message<SaveSuccessPayload, 'SAVE_SUCCESS'>
  | Message<ExportSuccessPayload, 'EXPORT_SUCCESS'>
  | Message<ErrorPayload, 'ERROR'>
  | Message<WorkflowListPayload, 'WORKFLOW_LIST_LOADED'>
  | Message<InitialStatePayload, 'INITIAL_STATE'>
  | Message<PreviewModeInitPayload, 'PREVIEW_MODE_INIT'>
  | Message<PreviewUpdatePayload, 'PREVIEW_UPDATE'>
  | Message<PreviewParseErrorPayload, 'PREVIEW_PARSE_ERROR'>
  | Message<void, 'SAVE_CANCELLED'>
  | Message<void, 'EXPORT_CANCELLED'>
  | Message<SkillListLoadedPayload, 'SKILL_LIST_LOADED'>
  | Message<SkillCreationSuccessPayload, 'SKILL_CREATION_SUCCESS'>
  | Message<SkillValidationErrorPayload, 'SKILL_CREATION_FAILED'>
  | Message<SkillValidationSuccessPayload, 'SKILL_VALIDATION_SUCCESS'>
  | Message<SkillValidationErrorPayload, 'SKILL_VALIDATION_FAILED'>
  | Message<RefinementSuccessPayload, 'REFINEMENT_SUCCESS'>
  | Message<RefinementFailedPayload, 'REFINEMENT_FAILED'>
  | Message<RefinementCancelledPayload, 'REFINEMENT_CANCELLED'>
  | Message<RefinementClarificationPayload, 'REFINEMENT_CLARIFICATION'>
  | Message<RefinementProgressPayload, 'REFINEMENT_PROGRESS'>
  | Message<ConversationClearedPayload, 'CONVERSATION_CLEARED'>
  | Message<SubAgentFlowRefinementSuccessPayload, 'SUBAGENTFLOW_REFINEMENT_SUCCESS'>
  | Message<McpServersResultPayload, 'MCP_SERVERS_RESULT'>
  | Message<McpToolsResultPayload, 'MCP_TOOLS_RESULT'>
  | Message<McpToolSchemaResultPayload, 'MCP_TOOL_SCHEMA_RESULT'>
  | Message<McpNodeValidationResultPayload, 'MCP_NODE_VALIDATION_RESULT'>
  | Message<McpErrorPayload, 'MCP_ERROR'>
  | Message<McpCacheRefreshedPayload, 'MCP_CACHE_REFRESHED'>
  | Message<ShareWorkflowSuccessPayload, 'SHARE_WORKFLOW_SUCCESS'>
  | Message<SensitiveDataWarningPayload, 'SENSITIVE_DATA_WARNING'>
  | Message<ShareWorkflowFailedPayload, 'SHARE_WORKFLOW_FAILED'>
  | Message<SlackConnectSuccessPayload, 'SLACK_CONNECT_SUCCESS'>
  | Message<SlackErrorPayload, 'SLACK_CONNECT_FAILED'>
  | Message<void, 'SLACK_DISCONNECT_SUCCESS'>
  | Message<SlackErrorPayload, 'SLACK_DISCONNECT_FAILED'>
  | Message<GetOAuthRedirectUriSuccessPayload, 'GET_OAUTH_REDIRECT_URI_SUCCESS'>
  | Message<SlackErrorPayload, 'GET_OAUTH_REDIRECT_URI_FAILED'>
  | Message<ConnectSlackManualSuccessPayload, 'CONNECT_SLACK_MANUAL_SUCCESS'>
  | Message<SlackErrorPayload, 'CONNECT_SLACK_MANUAL_FAILED'>
  | Message<ListSlackWorkspacesSuccessPayload, 'LIST_SLACK_WORKSPACES_SUCCESS'>
  | Message<SlackErrorPayload, 'LIST_SLACK_WORKSPACES_FAILED'>
  | Message<GetSlackChannelsSuccessPayload, 'GET_SLACK_CHANNELS_SUCCESS'>
  | Message<SlackErrorPayload, 'GET_SLACK_CHANNELS_FAILED'>
  | Message<ImportWorkflowSuccessPayload, 'IMPORT_WORKFLOW_SUCCESS'>
  | Message<ImportWorkflowConfirmOverwritePayload, 'IMPORT_WORKFLOW_CONFIRM_OVERWRITE'>
  | Message<ImportWorkflowFailedPayload, 'IMPORT_WORKFLOW_FAILED'>
  | Message<SearchSlackWorkflowsSuccessPayload, 'SEARCH_SLACK_WORKFLOWS_SUCCESS'>
  | Message<SlackErrorPayload, 'SEARCH_SLACK_WORKFLOWS_FAILED'>
  | Message<SlackOAuthInitiatedPayload, 'SLACK_OAUTH_INITIATED'>
  | Message<CopilotModelsListPayload, 'COPILOT_MODELS_LIST'>
  | Message<SlackOAuthSuccessPayload, 'SLACK_OAUTH_SUCCESS'>
  | Message<SlackErrorPayload, 'SLACK_OAUTH_FAILED'>
  | Message<void, 'SLACK_OAUTH_CANCELLED'>
  | Message<GetLastSharedChannelSuccessPayload, 'GET_LAST_SHARED_CHANNEL_SUCCESS'>
  | Message<SlackDescriptionSuccessPayload, 'SLACK_DESCRIPTION_SUCCESS'>
  | Message<SlackDescriptionFailedPayload, 'SLACK_DESCRIPTION_FAILED'>
  | Message<WorkflowNameSuccessPayload, 'WORKFLOW_NAME_SUCCESS'>
  | Message<WorkflowNameFailedPayload, 'WORKFLOW_NAME_FAILED'>
  | Message<void, 'FILE_PICKER_CANCELLED'>
  | Message<RunAsSlashCommandSuccessPayload, 'RUN_AS_SLASH_COMMAND_SUCCESS'>
  | Message<void, 'RUN_AS_SLASH_COMMAND_CANCELLED'>
  | Message<EditorContentUpdatedPayload, 'EDITOR_CONTENT_UPDATED'>
  | Message<ExportForCopilotSuccessPayload, 'EXPORT_FOR_COPILOT_SUCCESS'>
  | Message<void, 'EXPORT_FOR_COPILOT_CANCELLED'>
  | Message<CopilotOperationFailedPayload, 'EXPORT_FOR_COPILOT_FAILED'>
  | Message<RunForCopilotSuccessPayload, 'RUN_FOR_COPILOT_SUCCESS'>
  | Message<void, 'RUN_FOR_COPILOT_CANCELLED'>
  | Message<CopilotOperationFailedPayload, 'RUN_FOR_COPILOT_FAILED'>
  | Message<RunForCopilotCliSuccessPayload, 'RUN_FOR_COPILOT_CLI_SUCCESS'>
  | Message<void, 'RUN_FOR_COPILOT_CLI_CANCELLED'>
  | Message<CopilotOperationFailedPayload, 'RUN_FOR_COPILOT_CLI_FAILED'>
  | Message<ExportForCopilotCliSuccessPayload, 'EXPORT_FOR_COPILOT_CLI_SUCCESS'>
  | Message<void, 'EXPORT_FOR_COPILOT_CLI_CANCELLED'>
  | Message<CopilotOperationFailedPayload, 'EXPORT_FOR_COPILOT_CLI_FAILED'>
  | Message<ExportForCodexCliSuccessPayload, 'EXPORT_FOR_CODEX_CLI_SUCCESS'>
  | Message<void, 'EXPORT_FOR_CODEX_CLI_CANCELLED'>
  | Message<CodexOperationFailedPayload, 'EXPORT_FOR_CODEX_CLI_FAILED'>
  | Message<RunForCodexCliSuccessPayload, 'RUN_FOR_CODEX_CLI_SUCCESS'>
  | Message<void, 'RUN_FOR_CODEX_CLI_CANCELLED'>
  | Message<CodexOperationFailedPayload, 'RUN_FOR_CODEX_CLI_FAILED'>;

// ============================================================================
// AI Slack Description Generation Payloads
// ============================================================================

/**
 * Generate Slack description request payload
 */
export interface GenerateSlackDescriptionPayload {
  /** Serialized workflow JSON for AI analysis */
  workflowJson: string;
  /** Current UI language (en, ja, ko, zh-CN, zh-TW) */
  targetLanguage: string;
  /** Optional timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Slack description generation success payload
 */
export interface SlackDescriptionSuccessPayload {
  /** Generated description (max 500 chars) */
  description: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Timestamp ISO 8601 */
  timestamp: string;
}

/**
 * Slack description generation failed payload
 */
export interface SlackDescriptionFailedPayload {
  error: {
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'CANCELLED' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
  timestamp: string;
}

// ============================================================================
// AI Workflow Name Generation Payloads
// ============================================================================

/**
 * Generate workflow name request payload
 */
export interface GenerateWorkflowNamePayload {
  /** Serialized workflow JSON for AI analysis */
  workflowJson: string;
  /** Current UI language (en, ja, ko, zh-CN, zh-TW) */
  targetLanguage: string;
  /** Optional timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Workflow name generation success payload
 */
export interface WorkflowNameSuccessPayload {
  /** Generated name (max 64 chars, kebab-case) */
  name: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Timestamp ISO 8601 */
  timestamp: string;
}

/**
 * Workflow name generation failed payload
 */
export interface WorkflowNameFailedPayload {
  error: {
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'CANCELLED' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
  timestamp: string;
}

// ============================================================================
// Slack Integration Payloads (001-slack-workflow-sharing)
// ============================================================================

/**
 * Slack channel information
 */
export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount?: number;
  purpose?: string;
  topic?: string;
}

/**
 * Workflow search result
 */
export interface SearchResult {
  messageTs: string;
  channelId: string;
  channelName: string;
  text: string;
  userId: string;
  permalink: string;
  fileId?: string;
  fileName?: string;
  timestamp: string;
}

/**
 * Slack connection request payload
 */
export interface SlackConnectPayload {
  /** Force reconnection (delete existing token and reconnect) */
  forceReconnect?: boolean;
}

/**
 * Slack connection success payload
 */
export interface SlackConnectSuccessPayload {
  workspaceName: string;
}

/**
 * Get OAuth redirect URI success payload
 * @deprecated OAuth flow will be removed in favor of manual token input
 */
export interface GetOAuthRedirectUriSuccessPayload {
  redirectUri: string;
}

/**
 * Manual Slack connection request payload
 */
export interface ConnectSlackManualPayload {
  /** Slack Bot User OAuth Token (xoxb-...) */
  botToken: string;
  /** Slack User OAuth Token (xoxp-...) - Required for secure channel listing */
  userToken: string;
}

/**
 * Manual Slack connection success payload
 */
export interface ConnectSlackManualSuccessPayload {
  /** Workspace ID that was connected */
  workspaceId: string;
  /** Workspace name */
  workspaceName: string;
}

/**
 * Slack error payload (for FAILED messages)
 */
export interface SlackErrorPayload {
  message: string;
}

/**
 * Slack OAuth initiated payload
 *
 * Sent when OAuth flow is started, containing session ID for tracking
 * and authorization URL for browser redirect.
 */
export interface SlackOAuthInitiatedPayload {
  /** Session ID for tracking OAuth flow */
  sessionId: string;
  /** Slack authorization URL to open in browser */
  authorizationUrl: string;
}

/**
 * Slack OAuth success payload
 *
 * Sent when OAuth flow completes successfully.
 */
export interface SlackOAuthSuccessPayload {
  /** Workspace ID (Team ID) */
  workspaceId: string;
  /** Workspace name */
  workspaceName: string;
}

/**
 * Get Slack channels request payload
 */
export interface GetSlackChannelsPayload {
  /** Target workspace ID */
  workspaceId: string;
  /** Include private channels (default: true) */
  includePrivate?: boolean;
  /** Only show channels user is a member of (default: true) */
  onlyMember?: boolean;
}

/**
 * Get Slack channels success payload
 */
export interface GetSlackChannelsSuccessPayload {
  channels: SlackChannel[];
}

/**
 * Slack workspace information (for workspace selection)
 */
export interface SlackWorkspace {
  /** Workspace ID (Team ID) */
  workspaceId: string;
  /** Workspace name */
  workspaceName: string;
  /** Team ID */
  teamId: string;
  /** When the workspace was authorized */
  authorizedAt: string;
  /** Last validation timestamp (optional) */
  lastValidatedAt?: string;
}

/**
 * List Slack workspaces success payload
 */
export interface ListSlackWorkspacesSuccessPayload {
  workspaces: SlackWorkspace[];
}

/**
 * Import workflow from Slack request payload
 */
export interface ImportWorkflowFromSlackPayload {
  /** Workflow ID to import */
  workflowId: string;
  /** Slack file ID */
  fileId: string;
  /** Slack message timestamp */
  messageTs: string;
  /** Slack channel ID */
  channelId: string;
  /** Target workspace ID */
  workspaceId: string;
  /** Workspace name for display in error dialogs (decoded from Base64) */
  workspaceName?: string;
  /** Override existing file without confirmation (default: false) */
  overwriteExisting?: boolean;
}

/**
 * Import workflow success payload
 */
export interface ImportWorkflowSuccessPayload {
  /** Workflow ID that was imported */
  workflowId: string;
  /** Local file path where workflow was saved */
  filePath: string;
  /** Workflow name */
  workflowName: string;
}

/**
 * Import workflow confirm overwrite payload
 */
export interface ImportWorkflowConfirmOverwritePayload {
  /** Workflow ID to import */
  workflowId: string;
  /** Existing file path that will be overwritten */
  existingFilePath: string;
}

/**
 * Import workflow failed payload
 */
export interface ImportWorkflowFailedPayload {
  /** Workflow ID that failed to import */
  workflowId: string;
  /** Error code */
  errorCode:
    | 'NOT_AUTHENTICATED'
    | 'FILE_DOWNLOAD_FAILED'
    | 'INVALID_WORKFLOW_FILE'
    | 'FILE_WRITE_ERROR'
    | 'NETWORK_ERROR'
    | 'WORKSPACE_NOT_CONNECTED'
    | 'UNKNOWN_ERROR';
  /** @deprecated Use messageKey for i18n */
  errorMessage?: string;
  /** i18n message key for translation */
  messageKey: string;
  /** i18n suggested action key for translation */
  suggestedActionKey?: string;
  /** Parameters for message interpolation (e.g., retryAfter seconds) */
  messageParams?: Record<string, string | number>;
  /** Workspace ID that is not connected (for WORKSPACE_NOT_CONNECTED error) */
  workspaceId?: string;
  /** Workspace name for display in error dialogs (decoded from Base64) */
  workspaceName?: string;
}

/**
 * Search Slack workflows success payload
 */
export interface SearchSlackWorkflowsSuccessPayload {
  results: SearchResult[];
}

/**
 * Share workflow to Slack channel payload
 */
export interface ShareWorkflowToSlackPayload {
  /** Target workspace ID */
  workspaceId: string;
  /** Workflow ID to share (for identification purposes) */
  workflowId: string;
  /** Workflow name (for display purposes) */
  workflowName: string;
  /** Complete workflow object (current canvas state) */
  workflow: Workflow;
  /** Target Slack channel ID */
  channelId: string;
  /** Workflow description (optional) */
  description?: string;
  /** Override sensitive data warning (default: false) */
  overrideSensitiveWarning?: boolean;
}

/**
 * Sensitive data finding
 */
export interface SensitiveDataFinding {
  type: string;
  maskedValue: string;
  position: number;
  context?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Slack channel information
 */
export interface SlackChannelInfo {
  id: string;
  name: string;
}

/**
 * Share workflow success payload
 */
export interface ShareWorkflowSuccessPayload {
  workflowId: string;
  channelId: string;
  channelName: string;
  messageTs: string;
  fileId: string;
  permalink: string;
}

/**
 * Sensitive data warning payload
 */
export interface SensitiveDataWarningPayload {
  workflowId: string;
  findings: SensitiveDataFinding[];
}

/**
 * Share workflow failed payload
 */
export interface ShareWorkflowFailedPayload {
  workflowId: string;
  errorCode:
    | 'NOT_AUTHENTICATED'
    | 'CHANNEL_NOT_FOUND'
    | 'FILE_UPLOAD_FAILED'
    | 'MESSAGE_POST_FAILED'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR';
  /** @deprecated Use messageKey for i18n */
  errorMessage?: string;
  /** i18n message key for translation */
  messageKey: string;
  /** i18n suggested action key for translation */
  suggestedActionKey?: string;
  /** Parameters for message interpolation (e.g., retryAfter seconds) */
  messageParams?: Record<string, string | number>;
}

// ============================================================================
// Copilot Integration Payloads (Beta)
// ============================================================================

/**
 * Copilot execution mode selection
 * - vscode: Opens VSCode Copilot Chat panel and sends command
 * - cli: Uses Claude Code terminal with copilot-cli-slash-command skill
 */
export type CopilotExecutionMode = 'vscode' | 'cli';

/**
 * Export workflow for Copilot payload
 */
export interface ExportForCopilotPayload {
  /** Workflow to export */
  workflow: Workflow;
}

/**
 * Export for Copilot success payload
 */
export interface ExportForCopilotSuccessPayload {
  /** Exported file paths */
  exportedFiles: string[];
  /** Timestamp */
  timestamp: string; // ISO 8601
}

/**
 * Run workflow for Copilot payload
 */
export interface RunForCopilotPayload {
  /** Workflow to run */
  workflow: Workflow;
}

/**
 * Run for Copilot success payload
 */
export interface RunForCopilotSuccessPayload {
  /** Workflow name */
  workflowName: string;
  /** Whether Copilot Chat was opened */
  copilotChatOpened: boolean;
  /** Timestamp */
  timestamp: string; // ISO 8601
}

/**
 * Export/Run for Copilot failed payload
 */
export interface CopilotOperationFailedPayload {
  /** Error code */
  errorCode: 'COPILOT_NOT_INSTALLED' | 'EXPORT_FAILED' | 'CHAT_OPEN_FAILED' | 'UNKNOWN_ERROR';
  /** Error message */
  errorMessage: string;
  /** Timestamp */
  timestamp: string; // ISO 8601
}

/**
 * Run workflow for Copilot CLI payload
 * Uses Claude Code terminal with copilot-cli-slash-command skill
 */
export interface RunForCopilotCliPayload {
  /** Workflow to run */
  workflow: Workflow;
}

/**
 * Run for Copilot CLI success payload
 */
export interface RunForCopilotCliSuccessPayload {
  /** Workflow name */
  workflowName: string;
  /** Terminal name where command is running */
  terminalName: string;
  /** Timestamp */
  timestamp: string; // ISO 8601
}

/**
 * Export workflow for Copilot CLI payload (Skills format)
 */
export interface ExportForCopilotCliPayload {
  /** Workflow to export */
  workflow: Workflow;
}

/**
 * Export for Copilot CLI success payload
 */
export interface ExportForCopilotCliSuccessPayload {
  /** Skill name */
  skillName: string;
  /** Skill file path */
  skillPath: string;
  /** Timestamp */
  timestamp: string; // ISO 8601
}

// ============================================================================
// Codex CLI Integration Payloads (Beta)
// ============================================================================

/**
 * Export workflow for Codex CLI payload (Skills format)
 * Exports to .codex/skills/{name}/SKILL.md
 */
export interface ExportForCodexCliPayload {
  /** Workflow to export */
  workflow: Workflow;
}

/**
 * Export for Codex CLI success payload
 */
export interface ExportForCodexCliSuccessPayload {
  /** Skill name */
  skillName: string;
  /** Skill file path */
  skillPath: string;
  /** Timestamp */
  timestamp: string; // ISO 8601
}

/**
 * Run workflow for Codex CLI payload
 * Uses Codex CLI with $skill-name format
 */
export interface RunForCodexCliPayload {
  /** Workflow to run */
  workflow: Workflow;
}

/**
 * Run for Codex CLI success payload
 */
export interface RunForCodexCliSuccessPayload {
  /** Workflow name */
  workflowName: string;
  /** Terminal name where command is running */
  terminalName: string;
  /** Timestamp */
  timestamp: string; // ISO 8601
}

/**
 * Codex operation failed payload
 */
export interface CodexOperationFailedPayload {
  /** Error code */
  errorCode: 'CODEX_NOT_INSTALLED' | 'EXPORT_FAILED' | 'UNKNOWN_ERROR';
  /** Error message */
  errorMessage: string;
  /** Timestamp */
  timestamp: string; // ISO 8601
}

// ============================================================================
// Edit in VSCode Editor Payloads
// ============================================================================

/**
 * Open content in VSCode Editor payload
 * Feature: Edit in VSCode Editor functionality
 */
export interface OpenInEditorPayload {
  /** Unique identifier for this edit session */
  sessionId: string;
  /** Current text content to edit */
  content: string;
  /** Label for the editor tab (optional) */
  label?: string;
  /** Language mode for syntax highlighting (default: 'markdown') */
  language?: 'markdown' | 'plaintext';
}

/**
 * Editor content updated payload (sent when user saves or closes editor)
 * Feature: Edit in VSCode Editor functionality
 */
export interface EditorContentUpdatedPayload {
  /** Session ID matching the original request */
  sessionId: string;
  /** Updated text content */
  content: string;
  /** Whether the user saved (true) or cancelled/closed without saving (false) */
  saved: boolean;
}

// ============================================================================
// Utility Payloads
// ============================================================================

/**
 * Open external URL payload
 */
export interface OpenExternalUrlPayload {
  url: string;
}

/**
 * Set last shared channel payload
 */
export interface SetLastSharedChannelPayload {
  /** Channel ID that was last used for sharing */
  channelId: string;
}

/**
 * Get last shared channel success payload
 */
export interface GetLastSharedChannelSuccessPayload {
  /** Channel ID that was last used for sharing (null if none) */
  channelId: string | null;
}

// ============================================================================
// Webview → Extension Messages
// ============================================================================

export type WebviewMessage =
  | Message<SaveWorkflowPayload, 'SAVE_WORKFLOW'>
  | Message<ExportWorkflowPayload, 'EXPORT_WORKFLOW'>
  | Message<ConfirmOverwritePayload, 'CONFIRM_OVERWRITE'>
  | Message<void, 'LOAD_WORKFLOW_LIST'>
  | Message<LoadWorkflowRequestPayload, 'LOAD_WORKFLOW'>
  | Message<StateUpdatePayload, 'STATE_UPDATE'>
  | Message<void, 'ACCEPT_TERMS'>
  | Message<void, 'CANCEL_TERMS'>
  | Message<void, 'BROWSE_SKILLS'>
  | Message<CreateSkillPayload, 'CREATE_SKILL'>
  | Message<ValidateSkillFilePayload, 'VALIDATE_SKILL_FILE'>
  | Message<RefineWorkflowPayload, 'REFINE_WORKFLOW'>
  | Message<CancelRefinementPayload, 'CANCEL_REFINEMENT'>
  | Message<ClearConversationPayload, 'CLEAR_CONVERSATION'>
  | Message<ListMcpServersPayload, 'LIST_MCP_SERVERS'>
  | Message<GetMcpToolsPayload, 'GET_MCP_TOOLS'>
  | Message<GetMcpToolSchemaPayload, 'GET_MCP_TOOL_SCHEMA'>
  | Message<ValidateMcpNodePayload, 'VALIDATE_MCP_NODE'>
  | Message<UpdateMcpNodePayload, 'UPDATE_MCP_NODE'>
  | Message<RefreshMcpCachePayload, 'REFRESH_MCP_CACHE'>
  | Message<SlackConnectPayload, 'SLACK_CONNECT'>
  | Message<void, 'SLACK_DISCONNECT'>
  | Message<void, 'GET_OAUTH_REDIRECT_URI'> // @deprecated Will be removed in favor of CONNECT_SLACK_MANUAL
  | Message<ConnectSlackManualPayload, 'CONNECT_SLACK_MANUAL'>
  | Message<void, 'SLACK_CONNECT_OAUTH'>
  | Message<void, 'SLACK_CANCEL_OAUTH'>
  | Message<void, 'LIST_SLACK_WORKSPACES'>
  | Message<GetSlackChannelsPayload, 'GET_SLACK_CHANNELS'>
  | Message<ShareWorkflowToSlackPayload, 'SHARE_WORKFLOW_TO_SLACK'>
  | Message<ImportWorkflowFromSlackPayload, 'IMPORT_WORKFLOW_FROM_SLACK'>
  | Message<OpenExternalUrlPayload, 'OPEN_EXTERNAL_URL'>
  | Message<void, 'GET_LAST_SHARED_CHANNEL'>
  | Message<SetLastSharedChannelPayload, 'SET_LAST_SHARED_CHANNEL'>
  | Message<GenerateSlackDescriptionPayload, 'GENERATE_SLACK_DESCRIPTION'>
  | Message<GenerateWorkflowNamePayload, 'GENERATE_WORKFLOW_NAME'>
  | Message<void, 'OPEN_FILE_PICKER'>
  | Message<RunAsSlashCommandPayload, 'RUN_AS_SLASH_COMMAND'>
  | Message<OpenInEditorPayload, 'OPEN_IN_EDITOR'>
  | Message<void, 'WEBVIEW_READY'>
  | Message<ExportForCopilotPayload, 'EXPORT_FOR_COPILOT'>
  | Message<void, 'LIST_COPILOT_MODELS'>
  | Message<RunForCopilotPayload, 'RUN_FOR_COPILOT'>
  | Message<RunForCopilotCliPayload, 'RUN_FOR_COPILOT_CLI'>
  | Message<ExportForCopilotCliPayload, 'EXPORT_FOR_COPILOT_CLI'>
  | Message<ExportForCodexCliPayload, 'EXPORT_FOR_CODEX_CLI'>
  | Message<RunForCodexCliPayload, 'RUN_FOR_CODEX_CLI'>;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  SAVE_FAILED: 'SAVE_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_EXISTS: 'FILE_EXISTS',
  PARSE_ERROR: 'PARSE_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================================================
// Type Guards
// ============================================================================

export function isExtensionMessage(message: unknown): message is ExtensionMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof message.type === 'string'
  );
}

export function isWebviewMessage(message: unknown): message is WebviewMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof message.type === 'string'
  );
}
