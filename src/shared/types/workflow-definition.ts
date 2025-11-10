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

// ============================================================================
// Node Data Types
// ============================================================================

export interface SubAgentData {
  description: string;
  prompt: string;
  tools?: string;
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  outputPorts: number;
}

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

// Condition type aliases for IfElse and Switch (same structure as BranchCondition)
export type IfElseCondition = BranchCondition;
export type SwitchCondition = BranchCondition;

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
  /** Path to SKILL.md file (absolute for personal, relative for project) */
  skillPath: string;
  /** Skill scope: personal or project */
  scope: 'personal' | 'project';
  /** Optional: Allowed tools (extracted from SKILL.md frontmatter) */
  allowedTools?: string;
  /** Validation status (checked when workflow loads) */
  validationStatus: 'valid' | 'missing' | 'invalid';
  /** Number of output ports (always 1 for Skill nodes) */
  outputPorts: 1;
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

export type WorkflowNode =
  | SubAgentNode
  | AskUserQuestionNode
  | BranchNode // Legacy: kept for backward compatibility
  | IfElseNode
  | SwitchNode
  | StartNode
  | EndNode
  | PromptNode
  | SkillNode;

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
   *
   * @default "1.0.0"
   */
  schemaVersion?: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: WorkflowMetadata;
}

// ============================================================================
// Validation Rules (for reference)
// ============================================================================

export const VALIDATION_RULES = {
  WORKFLOW: {
    MAX_NODES: 50,
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 100,
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
} as const;
