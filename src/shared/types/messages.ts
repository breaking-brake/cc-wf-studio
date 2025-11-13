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
  isFirstLaunch: boolean;
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

export interface CancelGenerationPayload {
  requestId: string; // キャンセル対象のリクエストID
}

export interface CancelRefinementPayload {
  requestId: string; // キャンセル対象のリクエストID
}

// ============================================================================
// AI Generation Payloads (001-ai-workflow-generation)
// ============================================================================

export interface GenerateWorkflowPayload {
  userDescription: string; // Max 2000 characters
  timeoutMs?: number; // Optional, defaults to 30000
}

export interface GenerationSuccessPayload {
  workflow: Workflow;
  executionTimeMs: number;
  timestamp: string; // ISO 8601
}

export interface GenerationFailedPayload {
  error: {
    code:
      | 'COMMAND_NOT_FOUND'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'CANCELLED'
      | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
  timestamp: string; // ISO 8601
}

export interface GenerationCancelledPayload {
  executionTimeMs: number;
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
  /** Skill scope: personal or project */
  scope: 'personal' | 'project';
  /** Validation status */
  validationStatus: 'valid' | 'missing' | 'invalid';
  /** Optional: Allowed tools (from YAML frontmatter) */
  allowedTools?: string;
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
  /** Scope: personal or project */
  scope: 'personal' | 'project';
}

export interface SkillCreationSuccessPayload {
  /** Path to created SKILL.md file */
  skillPath: string;
  /** Skill name */
  name: string;
  /** Skill description */
  description: string;
  /** Scope */
  scope: 'personal' | 'project';
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
  /** Array of available Skills (personal + project) */
  skills: SkillReference[];
  /** Timestamp of scan */
  timestamp: string; // ISO 8601
  /** Number of personal Skills found */
  personalCount: number;
  /** Number of project Skills found */
  projectCount: number;
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
  | Message<void, 'SAVE_CANCELLED'>
  | Message<void, 'EXPORT_CANCELLED'>
  | Message<GenerationSuccessPayload, 'GENERATION_SUCCESS'>
  | Message<GenerationFailedPayload, 'GENERATION_FAILED'>
  | Message<GenerationCancelledPayload, 'GENERATION_CANCELLED'>
  | Message<SkillListLoadedPayload, 'SKILL_LIST_LOADED'>
  | Message<SkillCreationSuccessPayload, 'SKILL_CREATION_SUCCESS'>
  | Message<SkillValidationErrorPayload, 'SKILL_CREATION_FAILED'>
  | Message<SkillValidationSuccessPayload, 'SKILL_VALIDATION_SUCCESS'>
  | Message<SkillValidationErrorPayload, 'SKILL_VALIDATION_FAILED'>
  | Message<RefinementSuccessPayload, 'REFINEMENT_SUCCESS'>
  | Message<RefinementFailedPayload, 'REFINEMENT_FAILED'>
  | Message<RefinementCancelledPayload, 'REFINEMENT_CANCELLED'>
  | Message<RefinementClarificationPayload, 'REFINEMENT_CLARIFICATION'>
  | Message<ConversationClearedPayload, 'CONVERSATION_CLEARED'>;

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
  | Message<GenerateWorkflowPayload, 'GENERATE_WORKFLOW'>
  | Message<CancelGenerationPayload, 'CANCEL_GENERATION'>
  | Message<void, 'BROWSE_SKILLS'>
  | Message<CreateSkillPayload, 'CREATE_SKILL'>
  | Message<ValidateSkillFilePayload, 'VALIDATE_SKILL_FILE'>
  | Message<RefineWorkflowPayload, 'REFINE_WORKFLOW'>
  | Message<CancelRefinementPayload, 'CANCEL_REFINEMENT'>
  | Message<ClearConversationPayload, 'CLEAR_CONVERSATION'>;

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
