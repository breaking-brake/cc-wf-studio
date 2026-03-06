/**
 * Anthropic API Key Manager
 *
 * Manages Anthropic API keys using VSCode Secret Storage.
 * Simplified version of SlackTokenManager for single API key storage.
 */

import type { ExtensionContext } from 'vscode';

const SECRET_KEY = 'anthropic-api-key';

export class AnthropicApiKeyManager {
  constructor(private readonly context: ExtensionContext) {}

  async storeApiKey(apiKey: string): Promise<void> {
    await this.context.secrets.store(SECRET_KEY, apiKey);
  }

  async getApiKey(): Promise<string | null> {
    return (await this.context.secrets.get(SECRET_KEY)) || null;
  }

  async hasApiKey(): Promise<boolean> {
    const key = await this.context.secrets.get(SECRET_KEY);
    return !!key;
  }

  async clearApiKey(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEY);
  }

  static validateApiKeyFormat(apiKey: string): boolean {
    return apiKey.startsWith('sk-ant-');
  }
}
