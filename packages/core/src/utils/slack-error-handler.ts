/**
 * Slack Error Handler Utility
 *
 * Provides unified error handling for Slack API operations.
 * Maps Slack API errors to i18n translation keys.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/slack-api-contracts.md
 */

/**
 * Slack error information with i18n keys
 */
export interface SlackErrorInfo {
  /** Error code (for programmatic handling) */
  code: string;
  /** i18n message key for translation */
  messageKey: string;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** i18n suggested action key for translation */
  suggestedActionKey?: string;
  /** Retry after seconds (for rate limiting) */
  retryAfter?: number;
  /** Workspace ID (for WORKSPACE_NOT_CONNECTED errors) */
  workspaceId?: string;
}

/**
 * Error code mappings with i18n keys
 */
const ERROR_MAPPINGS: Record<string, Omit<SlackErrorInfo, 'code' | 'retryAfter'>> = {
  invalid_auth: {
    messageKey: 'slack.error.invalidAuth',
    recoverable: true,
    suggestedActionKey: 'slack.error.action.reconnect',
  },
  missing_scope: {
    messageKey: 'slack.error.missingScope',
    recoverable: true,
    suggestedActionKey: 'slack.error.action.addPermission',
  },
  rate_limited: {
    messageKey: 'slack.error.rateLimited',
    recoverable: true,
    suggestedActionKey: 'slack.error.action.waitAndRetry',
  },
  channel_not_found: {
    messageKey: 'slack.error.channelNotFound',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.checkChannelId',
  },
  not_in_channel: {
    messageKey: 'slack.error.notInChannel',
    recoverable: true,
    suggestedActionKey: 'slack.error.action.inviteBot',
  },
  file_too_large: {
    messageKey: 'slack.error.fileTooLarge',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.reduceFileSize',
  },
  invalid_file_type: {
    messageKey: 'slack.error.invalidFileType',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.useJsonFormat',
  },
  internal_error: {
    messageKey: 'slack.error.internalError',
    recoverable: true,
    suggestedActionKey: 'slack.error.action.waitAndRetry',
  },
  not_authed: {
    messageKey: 'slack.error.notAuthed',
    recoverable: true,
    suggestedActionKey: 'slack.error.action.connect',
  },
  invalid_code: {
    messageKey: 'slack.error.invalidCode',
    recoverable: true,
    suggestedActionKey: 'slack.error.action.restartAuth',
  },
  bad_client_secret: {
    messageKey: 'slack.error.badClientSecret',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.checkAppSettings',
  },
  invalid_grant_type: {
    messageKey: 'slack.error.invalidGrantType',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.checkAppSettings',
  },
  account_inactive: {
    messageKey: 'slack.error.accountInactive',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.checkAccountStatus',
  },
  invalid_query: {
    messageKey: 'slack.error.invalidQuery',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.checkSearchKeyword',
  },
  msg_too_long: {
    messageKey: 'slack.error.msgTooLong',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.reduceDescription',
  },
};

/**
 * Handles Slack API errors
 *
 * @param error - Error from Slack API call
 * @returns Structured error information with i18n keys
 */
export function handleSlackError(error: unknown): SlackErrorInfo {
  // Check for WORKSPACE_NOT_CONNECTED custom error
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'WORKSPACE_NOT_CONNECTED'
  ) {
    const workspaceError = error as { code: string; workspaceId?: string; message?: string };
    return {
      code: 'WORKSPACE_NOT_CONNECTED',
      messageKey: 'slack.error.workspaceNotConnected',
      recoverable: true,
      suggestedActionKey: 'slack.error.action.connectAndImport',
      workspaceId: workspaceError.workspaceId,
    };
  }

  // Check if it's a Slack Web API error (property-based check instead of instanceof)
  // This works even when @slack/web-api is an external dependency
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object'
  ) {
    // Type assertion for Slack Web API error structure
    const slackError = error as { data: { error?: string; retryAfter?: number } };
    const errorCode = slackError.data.error || 'unknown_error';

    // Get error mapping
    const mapping = ERROR_MAPPINGS[errorCode] || {
      messageKey: 'slack.error.unknownApiError',
      recoverable: false,
      suggestedActionKey: 'slack.error.action.contactSupport',
    };

    // Extract retry-after for rate limiting
    const retryAfter = slackError.data.retryAfter ? Number(slackError.data.retryAfter) : undefined;

    return {
      code: errorCode,
      ...mapping,
      retryAfter,
    };
  }

  // Network or other errors
  if (error instanceof Error) {
    return {
      code: 'NETWORK_ERROR',
      messageKey: 'slack.error.networkError',
      recoverable: true,
      suggestedActionKey: 'slack.error.action.checkConnection',
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN_ERROR',
    messageKey: 'slack.error.unknownError',
    recoverable: false,
    suggestedActionKey: 'slack.error.action.contactSupport',
  };
}

/**
 * Formats error for user display (deprecated - use i18n on Webview side)
 *
 * @param errorInfo - Error information
 * @returns Formatted error message key (for debugging purposes)
 * @deprecated Use messageKey and suggestedActionKey for i18n translation on Webview side
 */
export function formatErrorMessage(errorInfo: SlackErrorInfo): string {
  // Return messageKey for debugging - actual translation happens on Webview side
  let message = errorInfo.messageKey;

  if (errorInfo.suggestedActionKey) {
    message += ` | ${errorInfo.suggestedActionKey}`;
  }

  if (errorInfo.retryAfter) {
    message += ` | retryAfter: ${errorInfo.retryAfter}`;
  }

  return message;
}

/**
 * Checks if error is recoverable
 *
 * @param error - Error from Slack API call
 * @returns True if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const errorInfo = handleSlackError(error);
  return errorInfo.recoverable;
}

/**
 * Checks if error is authentication-related
 *
 * @param error - Error from Slack API call
 * @returns True if authentication error
 */
export function isAuthenticationError(error: unknown): boolean {
  const errorInfo = handleSlackError(error);
  return ['invalid_auth', 'not_authed', 'account_inactive'].includes(errorInfo.code);
}

/**
 * Checks if error is permission-related
 *
 * @param error - Error from Slack API call
 * @returns True if permission error
 */
export function isPermissionError(error: unknown): boolean {
  const errorInfo = handleSlackError(error);
  return ['missing_scope', 'not_in_channel'].includes(errorInfo.code);
}

/**
 * Checks if error is rate limiting
 *
 * @param error - Error from Slack API call
 * @returns True if rate limiting error
 */
export function isRateLimitError(error: unknown): boolean {
  const errorInfo = handleSlackError(error);
  return errorInfo.code === 'rate_limited';
}

/**
 * Gets retry delay for exponential backoff
 *
 * @param attempt - Retry attempt number (1-indexed)
 * @param maxDelay - Maximum delay in seconds (default: 60)
 * @returns Delay in seconds
 */
export function getRetryDelay(attempt: number, maxDelay = 60): number {
  // Exponential backoff: 2^attempt seconds, capped at maxDelay
  const delay = Math.min(2 ** attempt, maxDelay);
  // Add jitter (random 0-20%)
  const jitter = delay * 0.2 * Math.random();
  return delay + jitter;
}
