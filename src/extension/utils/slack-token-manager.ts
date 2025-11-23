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
  /** OAuth access token key (legacy - single workspace) */
  ACCESS_TOKEN: 'slack-oauth-access-token',
  /** Workspace connection data key (legacy - single workspace) */
  WORKSPACE_DATA: 'slack-workspace-connection',
  /** Workspace list key (stores array of workspace IDs) */
  WORKSPACE_LIST: 'slack-workspace-list',
} as const;

/**
 * Generates workspace-specific secret key
 */
function getWorkspaceSecretKey(workspaceId: string, type: 'token' | 'data'): string {
  return type === 'token' ? `slack-oauth-${workspaceId}` : `slack-workspace-${workspaceId}`;
}

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
    const { workspaceId } = connection;

    // Store access token for this workspace
    const tokenKey = getWorkspaceSecretKey(workspaceId, 'token');
    await this.context.secrets.store(tokenKey, connection.accessToken);

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

    const dataKey = getWorkspaceSecretKey(workspaceId, 'data');
    await this.context.secrets.store(dataKey, JSON.stringify(workspaceData));

    // Add to workspace list
    await this.addToWorkspaceList(workspaceId);
  }

  /**
   * Stores Slack workspace connection from manual token input
   *
   * This is a simplified version of storeConnection() for manual token input.
   * It does not require full OAuth flow metadata.
   *
   * @param workspaceId - Workspace ID (Team ID)
   * @param workspaceName - Workspace name
   * @param teamId - Team ID (same as workspaceId)
   * @param accessToken - Bot User OAuth Token (xoxb-...)
   * @param userId - User ID who authorized this connection
   */
  async storeManualConnection(
    workspaceId: string,
    workspaceName: string,
    teamId: string,
    accessToken: string,
    userId: string
  ): Promise<void> {
    // Validate token format (Bot Token only)
    if (!SlackTokenManager.validateTokenFormat(accessToken)) {
      throw new Error('Invalid token format. Bot Token (xoxb-...) is required.');
    }

    // Store access token for this workspace
    const tokenKey = getWorkspaceSecretKey(workspaceId, 'token');
    await this.context.secrets.store(tokenKey, accessToken);

    // Store workspace metadata (without token)
    const workspaceData = {
      workspaceId,
      workspaceName,
      teamId,
      tokenScope: [], // No scope information from manual input
      userId,
      authorizedAt: new Date().toISOString(),
      lastValidatedAt: undefined, // Will be set after first validation
    };

    const dataKey = getWorkspaceSecretKey(workspaceId, 'data');
    await this.context.secrets.store(dataKey, JSON.stringify(workspaceData));

    // Add to workspace list
    await this.addToWorkspaceList(workspaceId);
  }

  /**
   * Adds workspace ID to the workspace list
   *
   * @param workspaceId - Workspace ID to add
   */
  private async addToWorkspaceList(workspaceId: string): Promise<void> {
    const listJson = await this.context.secrets.get(SECRET_KEYS.WORKSPACE_LIST);
    let workspaceIds: string[] = [];

    if (listJson) {
      try {
        workspaceIds = JSON.parse(listJson);
      } catch (_error) {
        // Invalid JSON, start fresh
        workspaceIds = [];
      }
    }

    // Add if not already in list
    if (!workspaceIds.includes(workspaceId)) {
      workspaceIds.push(workspaceId);
      await this.context.secrets.store(SECRET_KEYS.WORKSPACE_LIST, JSON.stringify(workspaceIds));
    }
  }

  /**
   * Removes workspace ID from the workspace list
   *
   * @param workspaceId - Workspace ID to remove
   */
  private async removeFromWorkspaceList(workspaceId: string): Promise<void> {
    const listJson = await this.context.secrets.get(SECRET_KEYS.WORKSPACE_LIST);

    if (!listJson) {
      return;
    }

    try {
      let workspaceIds: string[] = JSON.parse(listJson);
      workspaceIds = workspaceIds.filter((id) => id !== workspaceId);
      await this.context.secrets.store(SECRET_KEYS.WORKSPACE_LIST, JSON.stringify(workspaceIds));
    } catch (_error) {
      // Invalid JSON, ignore
    }
  }

  /**
   * Retrieves all connected Slack workspaces
   *
   * @returns Array of workspace connections
   */
  async getWorkspaces(): Promise<SlackWorkspaceConnection[]> {
    const listJson = await this.context.secrets.get(SECRET_KEYS.WORKSPACE_LIST);

    if (!listJson) {
      return [];
    }

    try {
      const workspaceIds: string[] = JSON.parse(listJson);
      const connections: SlackWorkspaceConnection[] = [];

      for (const workspaceId of workspaceIds) {
        const connection = await this.getConnectionByWorkspaceId(workspaceId);
        if (connection) {
          connections.push(connection);
        }
      }

      return connections;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Retrieves Slack workspace connection by workspace ID
   *
   * @param workspaceId - Workspace ID
   * @returns Workspace connection if exists, null otherwise
   */
  async getConnectionByWorkspaceId(workspaceId: string): Promise<SlackWorkspaceConnection | null> {
    const tokenKey = getWorkspaceSecretKey(workspaceId, 'token');
    const dataKey = getWorkspaceSecretKey(workspaceId, 'data');

    const accessToken = await this.context.secrets.get(tokenKey);
    const workspaceDataJson = await this.context.secrets.get(dataKey);

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
      await this.clearConnectionByWorkspaceId(workspaceId);
      return null;
    }
  }

  /**
   * Retrieves Slack workspace connection (legacy - returns first workspace)
   *
   * @deprecated Use getWorkspaces() or getConnectionByWorkspaceId() instead
   * @returns Workspace connection if exists, null otherwise
   */
  async getConnection(): Promise<SlackWorkspaceConnection | null> {
    const workspaces = await this.getWorkspaces();
    return workspaces.length > 0 ? workspaces[0] : null;
  }

  /**
   * Gets access token for specific workspace
   *
   * @param workspaceId - Workspace ID
   * @returns Access token if exists, null otherwise
   */
  async getAccessTokenByWorkspaceId(workspaceId: string): Promise<string | null> {
    const tokenKey = getWorkspaceSecretKey(workspaceId, 'token');
    return (await this.context.secrets.get(tokenKey)) || null;
  }

  /**
   * Gets access token only (legacy - returns token for first workspace)
   *
   * @deprecated Use getAccessTokenByWorkspaceId() instead
   * @returns Access token if exists, null otherwise
   */
  async getAccessToken(): Promise<string | null> {
    const connection = await this.getConnection();
    return connection?.accessToken || null;
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
   * Clears specific workspace connection
   *
   * @param workspaceId - Workspace ID to clear
   */
  async clearConnectionByWorkspaceId(workspaceId: string): Promise<void> {
    const tokenKey = getWorkspaceSecretKey(workspaceId, 'token');
    const dataKey = getWorkspaceSecretKey(workspaceId, 'data');

    await this.context.secrets.delete(tokenKey);
    await this.context.secrets.delete(dataKey);

    // Remove from workspace list
    await this.removeFromWorkspaceList(workspaceId);
  }

  /**
   * Clears all workspace connections (logout from all workspaces)
   */
  async clearConnection(): Promise<void> {
    const workspaces = await this.getWorkspaces();

    for (const workspace of workspaces) {
      await this.clearConnectionByWorkspaceId(workspace.workspaceId);
    }

    // Clear workspace list
    await this.context.secrets.delete(SECRET_KEYS.WORKSPACE_LIST);
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
    const requiredScopes = ['channels:read', 'chat:write', 'files:write', 'groups:read'];

    return requiredScopes.every((required) => scopes.includes(required));
  }

  /**
   * Gets missing scopes
   *
   * @param scopes - Current token scopes
   * @returns Array of missing required scopes
   */
  static getMissingScopes(scopes: string[]): string[] {
    const requiredScopes = ['channels:read', 'chat:write', 'files:write', 'groups:read'];

    return requiredScopes.filter((required) => !scopes.includes(required));
  }
}
