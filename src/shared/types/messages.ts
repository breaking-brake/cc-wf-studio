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
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
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
  | Message<GenerationFailedPayload, 'GENERATION_FAILED'>;

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
  | Message<GenerateWorkflowPayload, 'GENERATE_WORKFLOW'>;

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
