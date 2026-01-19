/**
 * AI Provider Abstraction Layer
 *
 * Claude Code CLI と VS Code Language Model API を抽象化し、
 * プロバイダー選択に基づいてルーティングする。
 *
 * 注意: Claude CodeとCopilotで別々のモデル設定を使用する（マッピングしない）
 * - Claude Code: ClaudeModel ('sonnet' | 'opus' | 'haiku')
 * - Copilot: CopilotModel ('gpt-4o' | 'gpt-4o-mini' | 'claude-3.5-sonnet')
 */

import type { AiCliProvider, ClaudeModel, CopilotModel } from '../../shared/types/messages';
import { log } from '../extension';
import {
  type ClaudeCodeExecutionResult,
  cancelRefinement,
  executeClaudeCodeCLI,
  executeClaudeCodeCLIStreaming,
  type StreamingProgressCallback,
} from './claude-code-service';
import {
  cancelLmRequest,
  checkLmApiAvailability,
  executeVsCodeLm,
  executeVsCodeLmStreaming,
} from './vscode-lm-service';

/** プロバイダー利用可否チェック結果 */
export interface ProviderAvailability {
  available: boolean;
  reason?: string;
}

/**
 * プロバイダーが利用可能かチェック
 *
 * @param provider - チェックするプロバイダー
 * @returns 利用可否とその理由
 */
export async function isProviderAvailable(provider: AiCliProvider): Promise<ProviderAvailability> {
  if (provider === 'copilot') {
    const availability = await checkLmApiAvailability();
    if (!availability.available) {
      const reasonMap: Record<string, string> = {
        VS_CODE_VERSION: 'VS Code 1.89+ is required for Copilot provider',
        COPILOT_NOT_INSTALLED: 'GitHub Copilot extension is not installed',
        NO_MODELS_FOUND: 'No Copilot models available',
      };
      return {
        available: false,
        reason: availability.reason ? reasonMap[availability.reason] : 'Unknown error',
      };
    }
    return { available: true };
  }

  // claude-code は常に利用可能（CLI が見つからない場合は実行時エラー）
  return { available: true };
}

/**
 * AI を実行（非ストリーミング）
 *
 * @param prompt - プロンプト文字列
 * @param provider - 使用するプロバイダー ('claude-code' | 'copilot')
 * @param timeoutMs - タイムアウト（ミリ秒）
 * @param requestId - リクエストID（キャンセル用）
 * @param workingDirectory - 作業ディレクトリ（claude-code用）
 * @param model - Claude Code用モデル (provider='claude-code'時のみ使用)
 * @param copilotModel - Copilot用モデル (provider='copilot'時のみ使用)
 * @param allowedTools - 許可ツールリスト（claude-code用）
 * @returns 実行結果
 */
export async function executeAi(
  prompt: string,
  provider: AiCliProvider,
  timeoutMs?: number,
  requestId?: string,
  workingDirectory?: string,
  model?: ClaudeModel,
  copilotModel?: CopilotModel,
  allowedTools?: string[]
): Promise<ClaudeCodeExecutionResult> {
  log('INFO', 'executeAi called', {
    provider,
    model,
    copilotModel,
    promptLength: prompt.length,
    requestId,
  });

  if (provider === 'copilot') {
    // Copilot用モデルを直接使用（マッピングなし）
    return executeVsCodeLm(prompt, timeoutMs, requestId, copilotModel);
  }

  // Default: claude-code - Claude Code用モデルを使用
  return executeClaudeCodeCLI(prompt, timeoutMs, requestId, workingDirectory, model, allowedTools);
}

/**
 * AI を実行（ストリーミング）
 *
 * @param prompt - プロンプト文字列
 * @param provider - 使用するプロバイダー ('claude-code' | 'copilot')
 * @param onProgress - ストリーミング進捗コールバック
 * @param timeoutMs - タイムアウト（ミリ秒）
 * @param requestId - リクエストID（キャンセル用）
 * @param workingDirectory - 作業ディレクトリ（claude-code用）
 * @param model - Claude Code用モデル (provider='claude-code'時のみ使用)
 * @param copilotModel - Copilot用モデル (provider='copilot'時のみ使用)
 * @param allowedTools - 許可ツールリスト（claude-code用）
 * @param resumeSessionId - セッション継続用ID（claude-code用、copilotでは無視）
 * @returns 実行結果
 */
export async function executeAiStreaming(
  prompt: string,
  provider: AiCliProvider,
  onProgress: StreamingProgressCallback,
  timeoutMs?: number,
  requestId?: string,
  workingDirectory?: string,
  model?: ClaudeModel,
  copilotModel?: CopilotModel,
  allowedTools?: string[],
  resumeSessionId?: string
): Promise<ClaudeCodeExecutionResult> {
  log('INFO', 'executeAiStreaming called', {
    provider,
    model,
    copilotModel,
    promptLength: prompt.length,
    requestId,
    resumeSessionId: resumeSessionId ? '(present)' : undefined,
  });

  if (provider === 'copilot') {
    // VS Code LM API はセッション継続をサポートしない
    if (resumeSessionId) {
      log('WARN', 'Session resume not supported with Copilot provider, ignoring sessionId');
    }
    // Copilot用モデルを直接使用（マッピングなし）
    return executeVsCodeLmStreaming(prompt, onProgress, timeoutMs, requestId, copilotModel);
  }

  // Default: claude-code - Claude Code用モデルを使用
  return executeClaudeCodeCLIStreaming(
    prompt,
    onProgress,
    timeoutMs,
    requestId,
    workingDirectory,
    model,
    allowedTools,
    resumeSessionId
  );
}

/**
 * AI リクエストをキャンセル
 *
 * @param provider - キャンセル対象のプロバイダー
 * @param requestId - キャンセルするリクエストのID
 * @returns キャンセル結果
 */
export async function cancelAiRequest(
  provider: AiCliProvider,
  requestId: string
): Promise<{ cancelled: boolean; executionTimeMs?: number }> {
  log('INFO', 'cancelAiRequest called', { provider, requestId });

  if (provider === 'copilot') {
    return cancelLmRequest(requestId);
  }
  return cancelRefinement(requestId);
}
