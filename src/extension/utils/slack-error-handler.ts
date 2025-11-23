/**
 * Slack Error Handler Utility
 *
 * Provides unified error handling for Slack API operations.
 * Maps Slack API errors to user-friendly messages.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/slack-api-contracts.md
 */

/**
 * Slack error information
 */
export interface SlackErrorInfo {
  /** Error code (for programmatic handling) */
  code: string;
  /** User-friendly error message */
  message: string;
  /** Whether error is recoverable */
  recoverable: boolean;
  /** Suggested action for user */
  suggestedAction?: string;
  /** Retry after seconds (for rate limiting) */
  retryAfter?: number;
}

/**
 * Error code mappings
 */
const ERROR_MAPPINGS: Record<string, Omit<SlackErrorInfo, 'code' | 'retryAfter'>> = {
  invalid_auth: {
    message: 'Slackトークンが無効です',
    recoverable: true,
    suggestedAction: '再度Slackに接続してください',
  },
  missing_scope: {
    message: '必要な権限がありません',
    recoverable: true,
    suggestedAction: 'Slackアプリに必要な権限を追加し、再度接続してください',
  },
  rate_limited: {
    message: 'Slack APIのレート制限に達しました',
    recoverable: true,
    suggestedAction: 'しばらく待ってから再試行してください',
  },
  channel_not_found: {
    message: 'チャンネルが見つかりません',
    recoverable: false,
    suggestedAction: 'チャンネルIDを確認してください',
  },
  not_in_channel: {
    message: 'Botがチャンネルに参加していません',
    recoverable: true,
    suggestedAction: 'Slackアプリをチャンネルに招待してください',
  },
  file_too_large: {
    message: 'ファイルサイズが大きすぎます',
    recoverable: false,
    suggestedAction: 'ワークフローファイルのサイズを1MB未満に削減してください',
  },
  invalid_file_type: {
    message: 'サポートされていないファイルタイプです',
    recoverable: false,
    suggestedAction: 'JSON形式のワークフローファイルのみサポートされています',
  },
  internal_error: {
    message: 'Slack内部エラーが発生しました',
    recoverable: true,
    suggestedAction: 'しばらく待ってから再試行してください',
  },
  not_authed: {
    message: '認証情報が提供されていません',
    recoverable: true,
    suggestedAction: 'Slackに接続してください',
  },
  invalid_code: {
    message: '認証コードが無効または期限切れです',
    recoverable: true,
    suggestedAction: '再度認証を開始してください',
  },
  bad_client_secret: {
    message: 'クライアントシークレットが無効です',
    recoverable: false,
    suggestedAction: 'Slackアプリの設定を確認してください',
  },
  invalid_grant_type: {
    message: '無効な認証タイプです',
    recoverable: false,
    suggestedAction: 'Slackアプリの設定を確認してください',
  },
  account_inactive: {
    message: 'アカウントが無効化されています',
    recoverable: false,
    suggestedAction: 'Slackアカウントの状態を確認してください',
  },
  invalid_query: {
    message: '無効な検索クエリです',
    recoverable: false,
    suggestedAction: '検索キーワードを確認してください',
  },
  msg_too_long: {
    message: 'メッセージが長すぎます',
    recoverable: false,
    suggestedAction: 'ワークフローの説明を短くするか、ファイルサイズを削減してください',
  },
};

/**
 * Handles Slack API errors
 *
 * @param error - Error from Slack API call
 * @returns Structured error information
 */
export function handleSlackError(error: unknown): SlackErrorInfo {
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
      message: `Slack APIエラー: ${errorCode}`,
      recoverable: false,
      suggestedAction: 'エラーが継続する場合は、サポートにお問い合わせください',
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
      message: 'ネットワークエラーが発生しました',
      recoverable: true,
      suggestedAction: 'インターネット接続を確認してください',
    };
  }

  // Unknown error
  return {
    code: 'UNKNOWN_ERROR',
    message: '不明なエラーが発生しました',
    recoverable: false,
    suggestedAction: 'エラーが継続する場合は、サポートにお問い合わせください',
  };
}

/**
 * Formats error for user display
 *
 * @param errorInfo - Error information
 * @returns Formatted error message
 */
export function formatErrorMessage(errorInfo: SlackErrorInfo): string {
  let message = errorInfo.message;

  if (errorInfo.suggestedAction) {
    message += `\n\n${errorInfo.suggestedAction}`;
  }

  if (errorInfo.retryAfter) {
    message += `\n\n${errorInfo.retryAfter}秒後に再試行してください。`;
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
