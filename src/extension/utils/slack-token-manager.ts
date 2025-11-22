/**
 * Slack Token Manager
 *
 * Manages Slack OAuth tokens using VSCode Secret Storage.
 * Provides encrypted storage for access tokens and workspace information.
 *
 * Based on specs/001-slack-workflow-sharing/data-model.md
 */

import type { ExtensionContext } from 'vscode';
import type { SlackWorkspaceConnection } from '../types/slack-integration-types';

/**
 * Secret storage keys
 */
const SECRET_KEYS = {
  /** OAuth access token key */
  ACCESS_TOKEN: 'slack-oauth-access-token',
  /** Workspace connection data key */
  WORKSPACE_DATA: 'slack-workspace-connection',
} as const;

/**
 * Slack Token Manager
 *
 * Handles secure storage and retrieval of Slack authentication tokens.
 */
export class SlackTokenManager {
  constructor(private readonly context: ExtensionContext) {}

  /**
   * Stores Slack workspace connection
   *
   * @param connection - Workspace connection details
   */
  async storeConnection(connection: SlackWorkspaceConnection): Promise<void> {
    // Store access token separately (more sensitive)
    await this.context.secrets.store(SECRET_KEYS.ACCESS_TOKEN, connection.accessToken);

    // Store workspace metadata (without token)
    const workspaceData = {
      workspaceId: connection.workspaceId,
      workspaceName: connection.workspaceName,
      teamId: connection.teamId,
      tokenScope: connection.tokenScope,
      userId: connection.userId,
      authorizedAt: connection.authorizedAt.toISOString(),
      lastValidatedAt: connection.lastValidatedAt?.toISOString(),
    };

    await this.context.secrets.store(SECRET_KEYS.WORKSPACE_DATA, JSON.stringify(workspaceData));
  }

  /**
   * Retrieves Slack workspace connection
   *
   * @returns Workspace connection if exists, null otherwise
   */
  async getConnection(): Promise<SlackWorkspaceConnection | null> {
    const accessToken = await this.context.secrets.get(SECRET_KEYS.ACCESS_TOKEN);
    const workspaceDataJson = await this.context.secrets.get(SECRET_KEYS.WORKSPACE_DATA);

    if (!accessToken || !workspaceDataJson) {
      return null;
    }

    try {
      const workspaceData = JSON.parse(workspaceDataJson);

      return {
        workspaceId: workspaceData.workspaceId,
        workspaceName: workspaceData.workspaceName,
        teamId: workspaceData.teamId,
        accessToken,
        tokenScope: workspaceData.tokenScope,
        userId: workspaceData.userId,
        authorizedAt: new Date(workspaceData.authorizedAt),
        lastValidatedAt: workspaceData.lastValidatedAt
          ? new Date(workspaceData.lastValidatedAt)
          : undefined,
      };
    } catch (_error) {
      // Invalid JSON, clear corrupted data
      await this.clearConnection();
      return null;
    }
  }

  /**
   * Gets access token only
   *
   * @returns Access token if exists, null otherwise
   */
  async getAccessToken(): Promise<string | null> {
    return (await this.context.secrets.get(SECRET_KEYS.ACCESS_TOKEN)) || null;
  }

  /**
   * Updates last validated timestamp
   *
   * @param timestamp - Validation timestamp (default: now)
   */
  async updateLastValidated(timestamp: Date = new Date()): Promise<void> {
    const workspaceDataJson = await this.context.secrets.get(SECRET_KEYS.WORKSPACE_DATA);

    if (!workspaceDataJson) {
      return;
    }

    try {
      const workspaceData = JSON.parse(workspaceDataJson);
      workspaceData.lastValidatedAt = timestamp.toISOString();

      await this.context.secrets.store(SECRET_KEYS.WORKSPACE_DATA, JSON.stringify(workspaceData));
    } catch (_error) {
      // Invalid JSON, ignore update
    }
  }

  /**
   * Checks if workspace is connected
   *
   * @returns True if connected, false otherwise
   */
  async isConnected(): Promise<boolean> {
    const accessToken = await this.context.secrets.get(SECRET_KEYS.ACCESS_TOKEN);
    return !!accessToken;
  }

  /**
   * Gets workspace ID only
   *
   * @returns Workspace ID if exists, null otherwise
   */
  async getWorkspaceId(): Promise<string | null> {
    const workspaceDataJson = await this.context.secrets.get(SECRET_KEYS.WORKSPACE_DATA);

    if (!workspaceDataJson) {
      return null;
    }

    try {
      const workspaceData = JSON.parse(workspaceDataJson);
      return workspaceData.workspaceId || null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Gets workspace name only
   *
   * @returns Workspace name if exists, null otherwise
   */
  async getWorkspaceName(): Promise<string | null> {
    const workspaceDataJson = await this.context.secrets.get(SECRET_KEYS.WORKSPACE_DATA);

    if (!workspaceDataJson) {
      return null;
    }

    try {
      const workspaceData = JSON.parse(workspaceDataJson);
      return workspaceData.workspaceName || null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Clears workspace connection (logout)
   */
  async clearConnection(): Promise<void> {
    await this.context.secrets.delete(SECRET_KEYS.ACCESS_TOKEN);
    await this.context.secrets.delete(SECRET_KEYS.WORKSPACE_DATA);
  }

  /**
   * Validates token format
   *
   * Checks if token follows Slack token format (xoxb- or xoxp- prefix).
   *
   * @param token - Token to validate
   * @returns True if valid format, false otherwise
   */
  static validateTokenFormat(token: string): boolean {
    // Slack tokens start with xoxb- (bot) or xoxp- (user)
    // Minimum length: 40 characters
    return /^xox[bp]-[A-Za-z0-9-]{36,}$/.test(token);
  }

  /**
   * Validates token scopes
   *
   * Checks if token has required scopes for Slack integration.
   *
   * @param scopes - Token scopes
   * @returns True if all required scopes present, false otherwise
   */
  static validateTokenScopes(scopes: string[]): boolean {
    const requiredScopes = ['chat:write', 'files:write', 'channels:read', 'search:read'];

    return requiredScopes.every((required) => scopes.includes(required));
  }

  /**
   * Gets missing scopes
   *
   * @param scopes - Current token scopes
   * @returns Array of missing required scopes
   */
  static getMissingScopes(scopes: string[]): string[] {
    const requiredScopes = ['chat:write', 'files:write', 'channels:read', 'search:read'];

    return requiredScopes.filter((required) => !scopes.includes(required));
  }
}
