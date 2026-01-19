/**
 * VS Code Language Model Service
 *
 * VS Code の Language Model API (vscode.lm) を使用した AI 実行サービス。
 * VS Code 1.89+ と GitHub Copilot 拡張機能が必要。
 *
 * ランタイム検出により、API が利用可能な場合のみ機能する。
 * engines.vscode は 1.80.0 のまま維持し、後方互換性を保つ。
 */

import * as vscode from 'vscode';
import type { CopilotModel, CopilotModelInfo } from '../../shared/types/messages';
import { log } from '../extension';
import type { ClaudeCodeExecutionResult, StreamingProgressCallback } from './claude-code-service';

/** LM API 利用可否チェック結果 */
export interface LmApiAvailability {
  available: boolean;
  reason?: 'VS_CODE_VERSION' | 'COPILOT_NOT_INSTALLED' | 'NO_MODELS_FOUND';
}

// アクティブなリクエストのキャンセレーショントークン管理
const activeRequests = new Map<string, vscode.CancellationTokenSource>();

/**
 * VS Code LM API が利用可能かチェック（ランタイム検出）
 *
 * @returns true if vscode.lm API is available
 */
export function isVsCodeLmApiAvailable(): boolean {
  // Check if vscode.lm exists and has the selectChatModels method
  // This provides runtime detection without requiring minimum VS Code version
  return typeof vscode.lm !== 'undefined' && typeof vscode.lm.selectChatModels === 'function';
}

/**
 * LM API の詳細な利用可否をチェック
 *
 * @returns Availability status with reason if unavailable
 */
export async function checkLmApiAvailability(): Promise<LmApiAvailability> {
  if (!isVsCodeLmApiAvailable()) {
    return { available: false, reason: 'VS_CODE_VERSION' };
  }

  try {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
    if (!models || models.length === 0) {
      return { available: false, reason: 'COPILOT_NOT_INSTALLED' };
    }
    return { available: true };
  } catch (error) {
    log('WARN', 'Failed to check LM API availability', { error });
    return { available: false, reason: 'NO_MODELS_FOUND' };
  }
}

/**
 * List all available Copilot models via VS Code LM API
 *
 * @returns List of available CopilotModelInfo objects
 */
export async function listCopilotModels(): Promise<{
  models: CopilotModelInfo[];
  available: boolean;
  unavailableReason?: string;
}> {
  if (!isVsCodeLmApiAvailable()) {
    return {
      models: [],
      available: false,
      unavailableReason: 'VS Code 1.89+ is required for Copilot provider',
    };
  }

  try {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });

    if (!models || models.length === 0) {
      return {
        models: [],
        available: false,
        unavailableReason: 'GitHub Copilot extension is not installed or no models available',
      };
    }

    // Deduplicate by family AND name (use first occurrence)
    // Some models have different family but same display name (e.g., gpt-4o-mini and copilot-fast both show "GPT-4o mini")
    const seenFamilies = new Set<string>();
    const seenNames = new Set<string>();
    const modelInfos: CopilotModelInfo[] = [];
    for (const model of models) {
      if (!seenFamilies.has(model.family) && !seenNames.has(model.name)) {
        seenFamilies.add(model.family);
        seenNames.add(model.name);
        modelInfos.push({
          id: model.id,
          name: model.name,
          family: model.family,
          vendor: model.vendor,
        });
      }
    }

    log('DEBUG', 'Listed Copilot models (after deduplication)', {
      count: modelInfos.length,
      rawCount: models.length,
      models: modelInfos.map((m) => ({ id: m.id, family: m.family })),
    });

    return {
      models: modelInfos,
      available: true,
    };
  } catch (error) {
    log('ERROR', 'Failed to list Copilot models', { error });
    return {
      models: [],
      available: false,
      unavailableReason: 'Failed to retrieve Copilot models',
    };
  }
}

/**
 * Map CopilotModel to VS Code LM API family selector
 *
 * @param model - CopilotModel selection (now dynamic string)
 * @returns VS Code LM family string or undefined for default
 */
function getCopilotFamily(model?: CopilotModel): string | undefined {
  // CopilotModel is now a dynamic string type, so pass through directly
  // The model value should match the family name from vscode.lm.selectChatModels()
  if (!model || model.trim() === '') return undefined;
  return model;
}

/**
 * Select a Copilot model from available models
 *
 * @param model - Optional CopilotModel to prefer
 * @returns Selected LanguageModelChat or null if not available
 */
export async function selectCopilotModel(
  model?: CopilotModel
): Promise<vscode.LanguageModelChat | null> {
  if (!isVsCodeLmApiAvailable()) {
    log('WARN', 'VS Code LM API not available');
    return null;
  }

  try {
    const selector: vscode.LanguageModelChatSelector = { vendor: 'copilot' };
    const family = getCopilotFamily(model);
    if (family) {
      selector.family = family;
    }

    log('DEBUG', 'Selecting Copilot model', { selector, model });
    const models = await vscode.lm.selectChatModels(selector);

    if (!models || models.length === 0) {
      // If specific family not found, try without family filter
      if (family) {
        log('WARN', `Copilot model family '${family}' not found, falling back to default`);
        const fallbackModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        return fallbackModels.length > 0 ? fallbackModels[0] : null;
      }
      return null;
    }

    log('DEBUG', 'Selected Copilot model', {
      id: models[0].id,
      name: models[0].name,
      family: models[0].family,
      vendor: models[0].vendor,
    });

    return models[0];
  } catch (error) {
    log('ERROR', 'Failed to select Copilot model', { error, model });
    return null;
  }
}

/**
 * VS Code LM API でプロンプトを実行（ストリーミング）
 *
 * @param prompt - プロンプト文字列
 * @param onProgress - ストリーミング進捗コールバック
 * @param timeoutMs - タイムアウト（ミリ秒、デフォルト: 120000）
 * @param requestId - リクエストID（キャンセル用）
 * @param copilotModel - 使用するCopilotモデル
 * @returns 実行結果
 */
export async function executeVsCodeLmStreaming(
  prompt: string,
  onProgress: StreamingProgressCallback,
  timeoutMs = 120000,
  requestId?: string,
  copilotModel?: CopilotModel
): Promise<ClaudeCodeExecutionResult> {
  const startTime = Date.now();

  log('INFO', 'Starting VS Code LM execution', {
    promptLength: prompt.length,
    timeoutMs,
    requestId,
    copilotModel,
  });

  // Create cancellation token source
  const cts = new vscode.CancellationTokenSource();
  if (requestId) {
    activeRequests.set(requestId, cts);
    log('DEBUG', `Registered active LM request for requestId: ${requestId}`);
  }

  // Set up timeout (only if timeoutMs > 0; 0 means "unlimited")
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      log('WARN', 'VS Code LM request timed out', { timeoutMs, requestId });
      cts.cancel();
    }, timeoutMs);
  }

  try {
    const model = await selectCopilotModel(copilotModel);
    if (!model) {
      if (timeoutId) clearTimeout(timeoutId);
      return {
        success: false,
        error: {
          code: 'COMMAND_NOT_FOUND',
          message:
            'Copilot is not available. Please ensure GitHub Copilot extension is installed and VS Code is 1.89+.',
        },
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Build messages array with user prompt
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];

    // Send request to model
    log('DEBUG', 'Sending request to Copilot model', {
      modelId: model.id,
      messageCount: messages.length,
    });

    const response = await model.sendRequest(messages, {}, cts.token);

    // Process streaming response
    let accumulatedText = '';
    for await (const fragment of response.text) {
      if (cts.token.isCancellationRequested) {
        log('INFO', 'VS Code LM request cancelled during streaming', { requestId });
        break;
      }

      accumulatedText += fragment;
      // Call progress callback with same text for both display and explanatory
      // (VS Code LM API doesn't have tool_use concept like Claude CLI)
      onProgress(fragment, accumulatedText, accumulatedText, 'text');
    }

    if (timeoutId) clearTimeout(timeoutId);

    const executionTimeMs = Date.now() - startTime;

    log('INFO', 'VS Code LM execution succeeded', {
      executionTimeMs,
      outputLength: accumulatedText.length,
      requestId,
    });

    return {
      success: true,
      output: accumulatedText,
      executionTimeMs,
    };
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    const executionTimeMs = Date.now() - startTime;

    // Handle cancellation
    if (cts.token.isCancellationRequested) {
      log('INFO', 'VS Code LM request was cancelled', { requestId, executionTimeMs });
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request was cancelled or timed out.',
        },
        executionTimeMs,
      };
    }

    // Log error details
    log('ERROR', 'VS Code LM execution failed', {
      error,
      requestId,
      executionTimeMs,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Parse error message for HTTP API errors (these come as regular Error, not LanguageModelError)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const httpErrorInfo = parseHttpErrorMessage(errorMessage);

    if (httpErrorInfo) {
      log('INFO', 'Parsed HTTP error from LM API', httpErrorInfo);

      if (
        httpErrorInfo.code === 'model_not_supported' ||
        httpErrorInfo.code === 'model_not_found'
      ) {
        // Model is not enabled/supported
        return {
          success: false,
          error: {
            code: 'MODEL_NOT_SUPPORTED',
            message: `Model "${copilotModel}" is not supported or access is not enabled.`,
            details: httpErrorInfo.message,
          },
          executionTimeMs,
        };
      }
    }

    // Handle LanguageModelError specifically
    if (error instanceof vscode.LanguageModelError) {
      // Map LanguageModelError codes to our error codes
      // See: https://code.visualstudio.com/api/references/vscode-api#LanguageModelError
      let errorCode: ClaudeCodeExecutionResult['error'] extends { code: infer C } ? C : never =
        'UNKNOWN_ERROR';
      let message = error.message;

      // Check for common error scenarios
      if (error.code === 'Blocked') {
        message = 'AI access was blocked. Please check your Copilot subscription.';
      } else if (error.code === 'NoPermissions') {
        message =
          'AI access denied. Please click "Allow" in the permission dialog that appeared, then try again.';
      } else if (error.code === 'NotFound') {
        errorCode = 'COMMAND_NOT_FOUND';
        message = 'Copilot model not found. Please ensure GitHub Copilot is installed.';
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message,
          details: `LanguageModelError: ${error.code} - ${error.cause || ''}`,
        },
        executionTimeMs,
      };
    }

    // Unknown error
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        details: error instanceof Error ? error.stack : String(error),
      },
      executionTimeMs,
    };
  } finally {
    // Clean up
    if (requestId) {
      activeRequests.delete(requestId);
      log('DEBUG', `Removed active LM request for requestId: ${requestId}`);
    }
    cts.dispose();
  }
}

/**
 * VS Code LM API でプロンプトを実行（非ストリーミング）
 *
 * @param prompt - プロンプト文字列
 * @param timeoutMs - タイムアウト（ミリ秒、デフォルト: 120000）
 * @param requestId - リクエストID（キャンセル用）
 * @param copilotModel - 使用するCopilotモデル
 * @returns 実行結果
 */
export async function executeVsCodeLm(
  prompt: string,
  timeoutMs = 120000,
  requestId?: string,
  copilotModel?: CopilotModel
): Promise<ClaudeCodeExecutionResult> {
  // Callback captures accumulated text but we don't need it since streaming version returns it
  const onProgress: StreamingProgressCallback = () => {
    // No-op: we use the return value from executeVsCodeLmStreaming instead
  };
  return executeVsCodeLmStreaming(prompt, onProgress, timeoutMs, requestId, copilotModel);
}

/**
 * VS Code LM リクエストをキャンセル
 *
 * @param requestId - キャンセルするリクエストのID
 * @returns キャンセル結果
 */
export async function cancelLmRequest(requestId: string): Promise<{
  cancelled: boolean;
  executionTimeMs?: number;
}> {
  const cts = activeRequests.get(requestId);
  if (!cts) {
    log('WARN', `No active LM request found for requestId: ${requestId}`);
    return { cancelled: false };
  }

  log('INFO', `Cancelling LM request for requestId: ${requestId}`);
  cts.cancel();
  activeRequests.delete(requestId);

  return { cancelled: true };
}

/**
 * Parse HTTP error message from LM API response
 *
 * Error messages look like:
 * "Request Failed: 400 {\"error\":{\"message\":\"The requested model is not supported.\",\"code\":\"model_not_supported\",...}}"
 *
 * @param errorMessage - The error message to parse
 * @returns Parsed error info or null if not parseable
 */
function parseHttpErrorMessage(
  errorMessage: string
): { code: string; message: string; type?: string } | null {
  try {
    // Look for JSON in the error message
    const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.error && typeof parsed.error === 'object') {
      return {
        code: parsed.error.code || 'unknown',
        message: parsed.error.message || errorMessage,
        type: parsed.error.type,
      };
    }
    return null;
  } catch {
    return null;
  }
}
