/**
 * Claude Code Workflow Studio - Workflow Definition Types
 *
 * Based on: /specs/001-cc-wf-studio/data-model.md
 */

// ============================================================================
// Core Enums
// ============================================================================

export enum NodeType {
  SubAgent = 'subAgent',
  AskUserQuestion = 'askUserQuestion',
  Branch = 'branch', // Legacy: 後方互換性のため維持
  IfElse = 'ifElse', // New: 2分岐専用
  Switch = 'switch', // New: 多分岐専用
  Start = 'start',
  End = 'end',
  Prompt = 'prompt',
  Skill = 'skill', // New: Claude Code Skill integration
  Mcp = 'mcp', // New: MCP (Model Context Protocol) tool integration
  SubAgentFlow = 'subAgentFlow', // New: Sub-Agent Flow reference node
}

// ============================================================================
// Base Types
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface WorkflowMetadata {
  tags?: string[];
  author?: string;
  [key: string]: unknown;
}

/**
 * Slash Command export options
 *
 * Options that affect how the workflow is exported as a Slash Command (.md file)
 */
export interface SlashCommandOptions {
  /** If true, exports with context: fork for isolated sub-agent execution (Claude Code v2.1.0+) */
  contextFork?: boolean;
}

// ============================================================================
// Node Data Types
// ============================================================================

export interface SubAgentData {
  description: string;
  prompt: string;
  tools?: string;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan';
  outputPorts: number;
}

// Color codes for SubAgent color property
export const SUB_AGENT_COLORS = {
  red: '#C33531',
  blue: '#475DE3',
  green: '#54A254',
  yellow: '#BC8D2E',
  purple: '#892CE2',
  orange: '#D2602A',
  pink: '#C33476',
  cyan: '#4E8FAF',
} as const;

export interface QuestionOption {
  id?: string; // Unique identifier for the option (optional for backward compatibility)
  label: string;
  description: string;
}

export interface AskUserQuestionData {
  questionText: string;
  options: QuestionOption[]; // Empty array when useAiSuggestions is true
  multiSelect?: boolean; // If true, user can select multiple options (default: false)
  useAiSuggestions?: boolean; // If true, AI will suggest options dynamically (default: false)
  outputPorts: number; // 2-4 for single select, 1 for multi-select or AI suggestions
}

export interface StartNodeData {
  label?: string;
}

export interface EndNodeData {
  label?: string;
}

export interface PromptNodeData {
  label?: string;
  prompt: string;
  variables?: Record<string, string>;
}

export interface BranchCondition {
  id?: string; // Unique identifier for the branch
  label: string; // Branch label (e.g., "Success", "Error")
  condition: string; // Natural language condition (e.g., "前の処理が成功した場合")
}

export interface BranchNodeData {
  branchType: 'conditional' | 'switch'; // 2-way (true/false) or multi-way (switch)
  branches: BranchCondition[]; // 2 for conditional, 2-N for switch
  outputPorts: number; // Number of output ports (2 for conditional, 2-N for switch)
}

// Condition type alias for IfElse (same structure as BranchCondition)
export type IfElseCondition = BranchCondition;

// Switch condition extends BranchCondition with isDefault flag
export interface SwitchCondition extends BranchCondition {
  /** If true, this is the default branch (must be last, cannot be deleted or edited) */
  isDefault?: boolean;
}

export interface IfElseNodeData {
  evaluationTarget?: string; // Natural language description of what to evaluate (e.g., "前のステップの実行結果")
  branches: IfElseCondition[]; // Fixed: exactly 2 branches (True/False, Yes/No, etc.)
  outputPorts: 2; // Fixed: 2 output ports
}

export interface SwitchNodeData {
  evaluationTarget?: string; // Natural language description of what to evaluate (e.g., "HTTPステータスコード")
  branches: SwitchCondition[]; // Variable: 2-N branches
  outputPorts: number; // Variable: 2-N output ports
}

export interface SkillNodeData {
  /** Skill name (extracted from SKILL.md frontmatter) */
  name: string;
  /** Skill description (extracted from SKILL.md frontmatter) */
  description: string;
  /** Path to SKILL.md file (absolute for user/local, relative for project) */
  skillPath: string;
  /** Skill scope: user, project, or local */
  scope: 'user' | 'project' | 'local';
  /** Optional: Allowed tools (extracted from SKILL.md frontmatter) */
  allowedTools?: string;
  /** Validation status (checked when workflow loads) */
  validationStatus: 'valid' | 'missing' | 'invalid';
  /** Number of output ports (always 1 for Skill nodes) */
  outputPorts: 1;
}

/**
 * Tool parameter schema definition (from MCP)
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
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    enum?: (string | number)[];
  };
  /** For array types: schema of array items */
  items?: ToolParameter;
  /** For object types: schema of nested properties */
  properties?: Record<string, ToolParameter>;
}

// ============================================================================
// Sub-Agent Flow Types
// ============================================================================

/**
 * Sub-Agent Flow definition
 *
 * Represents a reusable sub-agent flow that can be referenced from the main workflow.
 * Sub-Agent Flows are stored in the same workflow file under the `subAgentFlows` array.
 * At runtime, Sub-Agent Flows are executed as Sub-Agents.
 */
export interface SubAgentFlow {
  /** Unique identifier for the sub-agent flow */
  id: string;
  /** Display name of the sub-agent flow */
  name: string;
  /** Optional description of the sub-agent flow's purpose */
  description?: string;
  /** Nodes within the sub-agent flow (must include Start and End nodes) */
  nodes: WorkflowNode[];
  /** Connections between nodes within the sub-agent flow */
  connections: Connection[];
  /** Optional conversation history for AI-assisted refinement */
  conversationHistory?: ConversationHistory;
}

/**
 * SubAgentFlow node data
 *
 * References and executes a sub-agent flow defined in the same workflow file.
 */
export interface SubAgentFlowNodeData {
  /** ID of the sub-agent flow to execute */
  subAgentFlowId: string;
  /** Display label for the node */
  label: string;
  /** Optional description */
  description?: string;
  /** Number of output ports (fixed at 1 for SubAgentFlow nodes) */
  outputPorts: 1;
  /** Model to use for this sub-agent flow execution */
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  /** Comma-separated list of allowed tools */
  tools?: string;
  /** Visual color for the node */
  color?: keyof typeof SUB_AGENT_COLORS;
}

export interface McpNodeData {
  /** MCP server identifier (from 'claude mcp list') */
  serverId: string;
  /** Tool function name from the MCP server (optional for aiToolSelection mode) */
  toolName?: string;
  /** Human-readable description of the tool's functionality (optional for aiToolSelection mode) */
  toolDescription?: string;
  /** Array of parameter schemas for this tool (immutable, from MCP definition; optional for aiToolSelection mode) */
  parameters?: ToolParameter[];
  /** User-configured values for the tool's parameters (optional for aiToolSelection mode) */
  parameterValues?: Record<string, unknown>;
  /** Validation status (computed during workflow load) */
  validationStatus: 'valid' | 'missing' | 'invalid';
  /** Number of output ports (fixed at 1 for MCP nodes) */
  outputPorts: 1;

  // AI Mode fields (optional, for backwards compatibility)

  /** Configuration mode (defaults to 'manualParameterConfig' if undefined) */
  mode?: 'manualParameterConfig' | 'aiParameterConfig' | 'aiToolSelection';
  /** AI Parameter Configuration Mode configuration (only if mode === 'aiParameterConfig') */
  aiParameterConfig?: {
    description: string;
    timestamp: string;
  };
  /** AI Tool Selection Mode configuration (only if mode === 'aiToolSelection') */
  aiToolSelectionConfig?: {
    taskDescription: string;
    availableTools: string[];
    timestamp: string;
  };
  /** Preserved manual parameter configuration (stores data when switching away from manual parameter config mode) */
  preservedManualParameterConfig?: {
    parameterValues: Record<string, unknown>;
  };
}

// ============================================================================
// Node Types
// ============================================================================

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  position: Position;
}

export interface SubAgentNode extends BaseNode {
  type: NodeType.SubAgent;
  data: SubAgentData;
}

export interface AskUserQuestionNode extends BaseNode {
  type: NodeType.AskUserQuestion;
  data: AskUserQuestionData;
}

export interface StartNode extends BaseNode {
  type: NodeType.Start;
  data: StartNodeData;
}

export interface EndNode extends BaseNode {
  type: NodeType.End;
  data: EndNodeData;
}

export interface PromptNode extends BaseNode {
  type: NodeType.Prompt;
  data: PromptNodeData;
}

export interface BranchNode extends BaseNode {
  type: NodeType.Branch;
  data: BranchNodeData;
}

export interface IfElseNode extends BaseNode {
  type: NodeType.IfElse;
  data: IfElseNodeData;
}

export interface SwitchNode extends BaseNode {
  type: NodeType.Switch;
  data: SwitchNodeData;
}

export interface SkillNode extends BaseNode {
  type: NodeType.Skill;
  data: SkillNodeData;
}

export interface McpNode extends BaseNode {
  type: NodeType.Mcp;
  data: McpNodeData;
}

export interface SubAgentFlowNode extends BaseNode {
  type: NodeType.SubAgentFlow;
  data: SubAgentFlowNodeData;
}

export type WorkflowNode =
  | SubAgentNode
  | AskUserQuestionNode
  | BranchNode // Legacy: kept for backward compatibility
  | IfElseNode
  | SwitchNode
  | StartNode
  | EndNode
  | PromptNode
  | SkillNode
  | McpNode
  | SubAgentFlowNode;

// ============================================================================
// Connection Type
// ============================================================================

export interface Connection {
  id: string;
  from: string; // Node ID
  to: string; // Node ID
  fromPort: string; // Handle ID
  toPort: string; // Handle ID
  condition?: string; // Option label for AskUserQuestion branches
}

// ============================================================================
// Conversation Types (for AI-assisted workflow refinement)
// ============================================================================

/**
 * Individual conversation message
 *
 * Represents a single message in the conversation history.
 * Based on: /specs/001-ai-workflow-refinement/data-model.md
 */
export interface ConversationMessage {
  /** Message ID (UUID v4) */
  id: string;
  /** Message sender type */
  sender: 'user' | 'ai';
  /** Message content (1-5000 characters) */
  content: string;
  /** Message timestamp (ISO 8601) */
  timestamp: string;
  /** Optional reference to workflow snapshot */
  workflowSnapshotId?: string;
  /** Optional i18n translation key (if set, content is used as fallback) */
  translationKey?: string;
  /** Loading state flag (for AI messages during processing) */
  isLoading?: boolean;
  /** Error state flag (for AI messages that failed) */
  isError?: boolean;
  /** Error code (for AI messages that failed) */
  errorCode?:
    | 'COMMAND_NOT_FOUND'
    | 'TIMEOUT'
    | 'PARSE_ERROR'
    | 'VALIDATION_ERROR'
    | 'PROHIBITED_NODE_TYPE'
    | 'UNKNOWN_ERROR';
  /** Tool execution information (e.g., "Bash: npm run build") */
  toolInfo?: string | null;
}

/**
 * Conversation history for workflow refinement
 *
 * Stores the entire conversation history associated with a workflow.
 * Based on: /specs/001-ai-workflow-refinement/data-model.md
 */
export interface ConversationHistory {
  /** Schema version (for future migrations) */
  schemaVersion: '1.0.0';
  /** Array of conversation messages */
  messages: ConversationMessage[];
  /** Current iteration count (0-20) */
  currentIteration: number;
  /** Maximum iteration count (fixed at 20) */
  maxIterations: 20;
  /** Conversation start timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** Claude Code CLI session ID for context continuation (optional) */
  sessionId?: string;
}

// ============================================================================
// Workflow Type
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  /**
   * スキーマバージョン (省略可能)
   *
   * ワークフローファイル形式のバージョンを示します。
   * - 省略時: "1.0.0" (既存形式、新規ノードタイプ非対応)
   * - "1.1.0": Start/End/Promptノードをサポート
   * - "1.2.0": SubWorkflowノードをサポート
   *
   * @default "1.0.0"
   */
  schemaVersion?: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: WorkflowMetadata;
  /** Optional conversation history for AI-assisted workflow refinement */
  conversationHistory?: ConversationHistory;
  /** Optional sub-agent flows defined within this workflow */
  subAgentFlows?: SubAgentFlow[];
  /** Optional Slash Command export options */
  slashCommandOptions?: SlashCommandOptions;
}

// ============================================================================
// Validation Rules (for reference)
// ============================================================================

export const VALIDATION_RULES = {
  WORKFLOW: {
    MAX_NODES: 50,
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 100,
    NAME_PATTERN: /^[a-z0-9_-]+$/, // Lowercase only (for cross-platform file system compatibility)
    VERSION_PATTERN: /^\d+\.\d+\.\d+$/,
  },
  NODE: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 50,
    NAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  SUB_AGENT: {
    DESCRIPTION_MIN_LENGTH: 1,
    DESCRIPTION_MAX_LENGTH: 200,
    PROMPT_MIN_LENGTH: 1,
    PROMPT_MAX_LENGTH: 10000,
    OUTPUT_PORTS: 1,
  },
  ASK_USER_QUESTION: {
    QUESTION_MIN_LENGTH: 1,
    QUESTION_MAX_LENGTH: 500,
    OPTIONS_MIN_COUNT: 2,
    OPTIONS_MAX_COUNT: 4,
    OPTION_LABEL_MIN_LENGTH: 1,
    OPTION_LABEL_MAX_LENGTH: 50,
    OPTION_DESCRIPTION_MIN_LENGTH: 1,
    OPTION_DESCRIPTION_MAX_LENGTH: 200,
  },
  BRANCH: {
    CONDITION_MIN_LENGTH: 1,
    CONDITION_MAX_LENGTH: 500,
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    MIN_BRANCHES: 2,
    MAX_BRANCHES: 10,
  },
  IF_ELSE: {
    CONDITION_MIN_LENGTH: 1,
    CONDITION_MAX_LENGTH: 500,
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    BRANCHES: 2, // Fixed: exactly 2 branches
    OUTPUT_PORTS: 2, // Fixed: 2 output ports
  },
  SWITCH: {
    CONDITION_MIN_LENGTH: 1,
    CONDITION_MAX_LENGTH: 500,
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    MIN_BRANCHES: 2,
    MAX_BRANCHES: 10,
  },
  SKILL: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 64,
    NAME_PATTERN: /^[a-z0-9-]+$/, // Lowercase, numbers, hyphens only
    DESCRIPTION_MIN_LENGTH: 1,
    DESCRIPTION_MAX_LENGTH: 1024,
    OUTPUT_PORTS: 1, // Fixed: 1 output port
  },
  MCP: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 64,
    NAME_PATTERN: /^[a-z0-9-]+$/, // Lowercase, numbers, hyphens only (same as workflow-mcp-node.schema.json)
    SERVER_ID_MIN_LENGTH: 1,
    SERVER_ID_MAX_LENGTH: 100,
    TOOL_NAME_MIN_LENGTH: 1,
    TOOL_NAME_MAX_LENGTH: 200,
    TOOL_DESCRIPTION_MAX_LENGTH: 2048,
    OUTPUT_PORTS: 1, // Fixed: 1 output port
  },
  SUB_AGENT_FLOW: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 50,
    NAME_PATTERN: /^[a-z0-9_-]+$/, // Lowercase only (for cross-platform file system compatibility)
    DESCRIPTION_MAX_LENGTH: 200,
    MAX_NODES: 30, // Smaller than main workflow
    // Node-specific validation (for SubAgentFlow reference nodes)
    LABEL_MIN_LENGTH: 1,
    LABEL_MAX_LENGTH: 50,
    OUTPUT_PORTS: 1, // Fixed: 1 output port
  },
} as const;
