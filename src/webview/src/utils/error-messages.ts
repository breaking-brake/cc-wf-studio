/**
 * Error message mapping utilities
 *
 * Maps error codes to user-friendly error messages and retry eligibility.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md Phase 3.8
 */

import type { WebviewTranslationKeys } from '../i18n/translation-keys';

type ErrorCode =
  | 'COMMAND_NOT_FOUND'
  | 'MODEL_NOT_SUPPORTED'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PROHIBITED_NODE_TYPE'
  | 'UNKNOWN_ERROR';

interface ErrorMessageInfo {
  /** i18n key for error message */
  messageKey: keyof WebviewTranslationKeys;
  /** Whether this error is retryable (show retry button) */
  isRetryable: boolean;
}

/**
 * Error code to message mapping
 *
 * Retryable errors: TIMEOUT, PARSE_ERROR, VALIDATION_ERROR, UNKNOWN_ERROR
 * Non-retryable errors: COMMAND_NOT_FOUND
 */
const ERROR_MESSAGE_MAP: Record<ErrorCode, ErrorMessageInfo> = {
  COMMAND_NOT_FOUND: {
    messageKey: 'refinement.error.commandNotFound',
    isRetryable: false,
  },
  MODEL_NOT_SUPPORTED: {
    messageKey: 'refinement.error.modelNotSupported',
    isRetryable: false,
  },
  TIMEOUT: {
    messageKey: 'refinement.error.timeout',
    isRetryable: true,
  },
  PARSE_ERROR: {
    messageKey: 'refinement.error.parseError',
    isRetryable: true,
  },
  VALIDATION_ERROR: {
    messageKey: 'refinement.error.validationError',
    isRetryable: true,
  },
  PROHIBITED_NODE_TYPE: {
    messageKey: 'refinement.error.prohibitedNodeType',
    isRetryable: false,
  },
  UNKNOWN_ERROR: {
    messageKey: 'refinement.error.unknown',
    isRetryable: true,
  },
};

/**
 * Get error message info for a given error code
 *
 * @param errorCode - Error code from refinement service
 * @returns Error message info (i18n key and retry eligibility)
 */
export function getErrorMessageInfo(errorCode: ErrorCode): ErrorMessageInfo {
  return ERROR_MESSAGE_MAP[errorCode];
}

/**
 * Check if error is retryable
 *
 * @param errorCode - Error code from refinement service
 * @returns True if error is retryable (show retry button)
 */
export function isRetryableError(errorCode: ErrorCode): boolean {
  return ERROR_MESSAGE_MAP[errorCode].isRetryable;
}
