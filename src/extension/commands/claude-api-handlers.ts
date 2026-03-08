/**
 * Claude Code Workflow Studio - Claude API Upload Handlers
 *
 * Handles Upload to Claude API integration
 */

import * as vscode from 'vscode';
import * as path from 'node:path';
import type {
  DeleteCustomSkillFailedPayload,
  DeleteCustomSkillPayload,
  ExecuteSkillProgressPayload,
  ExecuteUploadedSkillFailedPayload,
  ExecuteUploadedSkillPayload,
  ExecuteUploadedSkillSuccessPayload,
  GetMcpServerTypesPayload,
  GetMcpServerTypesResultPayload,
  GetSkillVersionDetailsFailedPayload,
  GetSkillVersionDetailsPayload,
  GetSavedMcpServerUrlsResultPayload,
  LookupMcpRegistryPayload,
  LookupMcpRegistryResultPayload,
  ListCustomSkillsFailedPayload,
  SaveMcpServerUrlsPayload,
  StoreAnthropicApiKeyPayload,
  UploadDependentSkillFailedPayload,
  UploadDependentSkillPayload,
  UploadDependentSkillSuccessPayload,
  UploadToClaudeApiFailedPayload,
  UploadToClaudeApiPayload,
  UploadToClaudeApiSuccessPayload,
} from '../../shared/types/messages';
import {
  deleteCustomSkill,
  executeUploadedSkillStreaming,
  getSkillVersionDetails,
  listCustomSkills,
  parseSkillDescription,
  uploadSkillFile,
  uploadWorkflow,
} from '../services/claude-api-upload-service';
import { getMcpServerConfig } from '../services/mcp-config-reader';
import type { AnthropicApiKeyManager } from '../utils/anthropic-api-key-manager';

/**
 * Handle Upload to Claude API request
 */
export async function handleUploadToClaudeApi(
  webview: vscode.Webview,
  payload: UploadToClaudeApiPayload,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    const apiKey = await apiKeyManager.getApiKey();
    if (!apiKey) {
      const failedPayload: UploadToClaudeApiFailedPayload = {
        errorCode: 'API_KEY_NOT_SET',
        errorMessage: 'Anthropic API key is not configured',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'UPLOAD_TO_CLAUDE_API_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    const result = await uploadWorkflow(apiKey, workflow);

    const successPayload: UploadToClaudeApiSuccessPayload = {
      skillId: result.skillId,
      version: result.version,
      isNewVersion: result.isNewVersion,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'UPLOAD_TO_CLAUDE_API_SUCCESS',
      requestId,
      payload: successPayload,
    });

    const action = result.isNewVersion ? 'Updated' : 'Uploaded';
    vscode.window.showInformationMessage(
      `${action} skill to Claude API: ${workflow.name} (${result.skillId})`
    );
  } catch (error) {
    const failedPayload: UploadToClaudeApiFailedPayload = {
      errorCode: 'UPLOAD_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'UPLOAD_TO_CLAUDE_API_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Store Anthropic API Key request
 */
export async function handleStoreAnthropicApiKey(
  webview: vscode.Webview,
  payload: StoreAnthropicApiKeyPayload,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  try {
    await apiKeyManager.storeApiKey(payload.apiKey);
    webview.postMessage({
      type: 'STORE_ANTHROPIC_API_KEY_SUCCESS',
      requestId,
    });
  } catch (error) {
    webview.postMessage({
      type: 'UPLOAD_TO_CLAUDE_API_FAILED',
      requestId,
      payload: {
        errorCode: 'STORE_KEY_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Failed to store API key',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Handle Check Anthropic API Key request
 */
export async function handleCheckAnthropicApiKey(
  webview: vscode.Webview,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  const hasApiKey = await apiKeyManager.hasApiKey();
  webview.postMessage({
    type: 'CHECK_ANTHROPIC_API_KEY_RESULT',
    requestId,
    payload: { hasApiKey },
  });
}

/**
 * Handle Clear Anthropic API Key request
 */
export async function handleClearAnthropicApiKey(
  webview: vscode.Webview,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  await apiKeyManager.clearApiKey();
  webview.postMessage({
    type: 'CLEAR_ANTHROPIC_API_KEY_SUCCESS',
    requestId,
  });
}

/**
 * Handle List Custom Skills request
 */
export async function handleListCustomSkills(
  webview: vscode.Webview,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  try {
    const apiKey = await apiKeyManager.getApiKey();
    if (!apiKey) {
      const failedPayload: ListCustomSkillsFailedPayload = {
        errorCode: 'API_KEY_NOT_SET',
        errorMessage: 'Anthropic API key is not configured',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'LIST_CUSTOM_SKILLS_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    const skills = await listCustomSkills(apiKey);
    webview.postMessage({
      type: 'LIST_CUSTOM_SKILLS_SUCCESS',
      requestId,
      payload: { skills },
    });
  } catch (error) {
    const failedPayload: ListCustomSkillsFailedPayload = {
      errorCode: 'LIST_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'LIST_CUSTOM_SKILLS_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Delete Custom Skill request
 */
export async function handleDeleteCustomSkill(
  webview: vscode.Webview,
  payload: DeleteCustomSkillPayload,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  try {
    const apiKey = await apiKeyManager.getApiKey();
    if (!apiKey) {
      const failedPayload: DeleteCustomSkillFailedPayload = {
        errorCode: 'API_KEY_NOT_SET',
        errorMessage: 'Anthropic API key is not configured',
      };
      webview.postMessage({
        type: 'DELETE_CUSTOM_SKILL_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    await deleteCustomSkill(apiKey, payload.skillId);
    webview.postMessage({
      type: 'DELETE_CUSTOM_SKILL_SUCCESS',
      requestId,
      payload: { skillId: payload.skillId },
    });
  } catch (error) {
    const failedPayload: DeleteCustomSkillFailedPayload = {
      errorCode: 'DELETE_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
    webview.postMessage({
      type: 'DELETE_CUSTOM_SKILL_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Execute Uploaded Skill request (streaming)
 */
export async function handleExecuteUploadedSkill(
  webview: vscode.Webview,
  payload: ExecuteUploadedSkillPayload,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  try {
    const apiKey = await apiKeyManager.getApiKey();
    if (!apiKey) {
      const failedPayload: ExecuteUploadedSkillFailedPayload = {
        errorCode: 'API_KEY_NOT_SET',
        errorMessage: 'Anthropic API key is not configured',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXECUTE_UPLOADED_SKILL_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    let accumulatedText = '';
    const result = await executeUploadedSkillStreaming(
      apiKey,
      payload.skillId,
      payload.prompt,
      payload.model,
      (chunk: string) => {
        accumulatedText += chunk;
        const progressPayload: ExecuteSkillProgressPayload = {
          chunk,
          accumulatedText,
          timestamp: new Date().toISOString(),
        };
        webview.postMessage({
          type: 'EXECUTE_SKILL_PROGRESS',
          requestId,
          payload: progressPayload,
        });
      },
      payload.conversationHistory,
      payload.containerId,
      payload.mcpServers,
      payload.additionalSkillIds
    );

    const successPayload: ExecuteUploadedSkillSuccessPayload = {
      responseText: result.responseText,
      stopReason: result.stopReason,
      timestamp: new Date().toISOString(),
      containerId: result.containerId,
      usage: result.usage,
    };

    webview.postMessage({
      type: 'EXECUTE_UPLOADED_SKILL_SUCCESS',
      requestId,
      payload: successPayload,
    });
  } catch (error) {
    const failedPayload: ExecuteUploadedSkillFailedPayload = {
      errorCode: 'EXECUTION_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXECUTE_UPLOADED_SKILL_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Get Skill Version Details request
 */
export async function handleGetSkillVersionDetails(
  webview: vscode.Webview,
  payload: GetSkillVersionDetailsPayload,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  try {
    const apiKey = await apiKeyManager.getApiKey();
    if (!apiKey) {
      const failedPayload: GetSkillVersionDetailsFailedPayload = {
        errorCode: 'API_KEY_NOT_SET',
        errorMessage: 'Anthropic API key is not configured',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'GET_SKILL_VERSION_DETAILS_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    const details = await getSkillVersionDetails(apiKey, payload.skillId, payload.version);
    const parsed = parseSkillDescription(details.description);

    webview.postMessage({
      type: 'GET_SKILL_VERSION_DETAILS_SUCCESS',
      requestId,
      payload: {
        skillId: details.skillId,
        version: details.version,
        name: details.name,
        description: details.description,
        mcpServerIds: parsed.mcpServerIds,
        dependentSkillNames: parsed.dependentSkillNames,
      },
    });
  } catch (error) {
    const failedPayload: GetSkillVersionDetailsFailedPayload = {
      errorCode: 'GET_DETAILS_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'GET_SKILL_VERSION_DETAILS_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

const MCP_SERVER_URLS_KEY = 'mcp-server-urls';

/**
 * Handle Get Saved MCP Server URLs request
 */
export async function handleGetSavedMcpServerUrls(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  requestId?: string
): Promise<void> {
  const urls = context.globalState.get<Record<string, string>>(MCP_SERVER_URLS_KEY, {});
  const resultPayload: GetSavedMcpServerUrlsResultPayload = { urls };
  webview.postMessage({
    type: 'GET_SAVED_MCP_SERVER_URLS_RESULT',
    requestId,
    payload: resultPayload,
  });
}

/**
 * Handle Save MCP Server URLs request
 */
export async function handleSaveMcpServerUrls(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  payload: SaveMcpServerUrlsPayload,
  requestId?: string
): Promise<void> {
  const existing = context.globalState.get<Record<string, string>>(MCP_SERVER_URLS_KEY, {});
  const merged = { ...existing, ...payload.urls };
  await context.globalState.update(MCP_SERVER_URLS_KEY, merged);
  webview.postMessage({
    type: 'SAVE_MCP_SERVER_URLS_SUCCESS',
    requestId,
  });
}

/**
 * Handle Lookup MCP Registry request
 */
export async function handleLookupMcpRegistry(
  webview: vscode.Webview,
  payload: LookupMcpRegistryPayload,
  requestId?: string
): Promise<void> {
  const urls: Record<string, string> = {};

  await Promise.all(
    payload.serverIds.map(async (serverId) => {
      try {
        const response = await fetch(
          `https://registry.modelcontextprotocol.io/v0/servers/${encodeURIComponent(serverId)}`
        );
        if (response.ok) {
          const data = (await response.json()) as {
            remotes?: Array<{ type?: string; url?: string }>;
          };
          if (data.remotes && data.remotes.length > 0 && data.remotes[0].url) {
            urls[serverId] = data.remotes[0].url;
          }
        }
      } catch {
        // Server not found or network error — skip
      }
    })
  );

  const resultPayload: LookupMcpRegistryResultPayload = { urls };
  webview.postMessage({
    type: 'LOOKUP_MCP_REGISTRY_RESULT',
    requestId,
    payload: resultPayload,
  });
}

/**
 * Handle Upload Dependent Skill request
 */
export async function handleUploadDependentSkill(
  webview: vscode.Webview,
  payload: UploadDependentSkillPayload,
  apiKeyManager: AnthropicApiKeyManager,
  requestId?: string
): Promise<void> {
  try {
    const apiKey = await apiKeyManager.getApiKey();
    if (!apiKey) {
      const failedPayload: UploadDependentSkillFailedPayload = {
        skillName: payload.skillName,
        errorCode: 'API_KEY_NOT_SET',
        errorMessage: 'Anthropic API key is not configured',
      };
      webview.postMessage({
        type: 'UPLOAD_DEPENDENT_SKILL_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Resolve relative paths against workspace root
    let absolutePath = payload.skillPath;
    if (!path.isAbsolute(absolutePath)) {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspacePath) {
        absolutePath = path.join(workspacePath, absolutePath);
      }
    }

    const result = await uploadSkillFile(apiKey, payload.skillName, absolutePath);

    const successPayload: UploadDependentSkillSuccessPayload = {
      skillName: payload.skillName,
      skillId: result.skillId,
      version: result.version,
      isNewVersion: result.isNewVersion,
    };

    webview.postMessage({
      type: 'UPLOAD_DEPENDENT_SKILL_SUCCESS',
      requestId,
      payload: successPayload,
    });
  } catch (error) {
    const failedPayload: UploadDependentSkillFailedPayload = {
      skillName: payload.skillName,
      errorCode: 'UPLOAD_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
    webview.postMessage({
      type: 'UPLOAD_DEPENDENT_SKILL_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Get MCP Server Types request
 */
export async function handleGetMcpServerTypes(
  webview: vscode.Webview,
  payload: GetMcpServerTypesPayload,
  requestId?: string
): Promise<void> {
  const serverTypes: Record<string, 'stdio' | 'http' | 'sse' | null> = {};
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  for (const serverId of payload.serverIds) {
    const config = getMcpServerConfig(serverId, workspacePath);
    serverTypes[serverId] = config?.type ?? null;
  }

  const resultPayload: GetMcpServerTypesResultPayload = { serverTypes };
  webview.postMessage({
    type: 'GET_MCP_SERVER_TYPES_RESULT',
    requestId,
    payload: resultPayload,
  });
}
