/**
 * Slack Share Dialog Component
 *
 * Dialog for sharing workflow to Slack channels.
 * Includes channel selection, description input, and sensitive data warning handling.
 *
 * Based on specs/001-slack-workflow-sharing/plan.md
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type {
  SensitiveDataFinding,
  SlackChannel,
  SlackWorkspace,
} from '../../services/slack-integration-service';
import {
  connectToSlack,
  getOAuthRedirectUri,
  getSlackChannels,
  listSlackWorkspaces,
  reconnectToSlack,
  shareWorkflowToSlack,
} from '../../services/slack-integration-service';

interface SlackShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

export function SlackShareDialog({
  isOpen,
  onClose,
  workflowId,
  workflowName,
}: SlackShareDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // State management
  const [loading, setLoading] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<SlackWorkspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [sensitiveDataWarning, setSensitiveDataWarning] = useState<SensitiveDataFinding[] | null>(
    null
  );

  // Load workspaces and redirect URI when dialog opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadWorkspaces = async () => {
      setLoadingWorkspaces(true);
      setError(null);

      try {
        const workspaceList = await listSlackWorkspaces();
        setWorkspaces(workspaceList);

        // Auto-select first workspace if available
        if (workspaceList.length > 0) {
          setSelectedWorkspaceId(workspaceList[0].workspaceId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('slack.error.networkError'));
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    const loadRedirectUri = async () => {
      try {
        console.log('[SlackShareDialog] Fetching OAuth redirect URI...');
        const result = await getOAuthRedirectUri();
        console.log('[SlackShareDialog] Received redirect URI:', result.redirectUri);
        setRedirectUri(result.redirectUri);
      } catch (err) {
        // Silently fail - redirect URI is optional for development
        console.error('[SlackShareDialog] Failed to get redirect URI:', err);
      }
    };

    loadWorkspaces();
    loadRedirectUri();
  }, [isOpen, t]);

  // Load channels when workspace is selected
  useEffect(() => {
    if (!selectedWorkspaceId) {
      setChannels([]);
      setSelectedChannelId('');
      return;
    }

    const loadChannels = async () => {
      setLoadingChannels(true);
      setError(null);

      try {
        const channelList = await getSlackChannels(selectedWorkspaceId);
        setChannels(channelList);

        // Auto-select first channel if available
        if (channelList.length > 0) {
          setSelectedChannelId(channelList[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('slack.error.networkError'));
      } finally {
        setLoadingChannels(false);
      }
    };

    loadChannels();
  }, [selectedWorkspaceId, t]);

  // Auto-focus dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  const handleConnectToSlack = async () => {
    setConnecting(true);
    setError(null);

    try {
      await connectToSlack();

      // Reload workspaces
      setLoadingWorkspaces(true);
      const workspaceList = await listSlackWorkspaces();
      setWorkspaces(workspaceList);

      // Reset workspace selection to trigger channel reload
      setSelectedWorkspaceId('');

      // Auto-select first workspace after a brief delay to ensure state update
      if (workspaceList.length > 0) {
        setTimeout(() => {
          setSelectedWorkspaceId(workspaceList[0].workspaceId);
        }, 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.connect.failed'));
    } finally {
      setConnecting(false);
      setLoadingWorkspaces(false);
    }
  };

  const handleReconnectToSlack = async () => {
    setConnecting(true);
    setError(null);

    try {
      await reconnectToSlack();

      // Reload workspaces
      setLoadingWorkspaces(true);
      const workspaceList = await listSlackWorkspaces();
      setWorkspaces(workspaceList);

      // Reset workspace selection to trigger channel reload
      setSelectedWorkspaceId('');

      // Auto-select first workspace after a brief delay to ensure state update
      if (workspaceList.length > 0) {
        setTimeout(() => {
          setSelectedWorkspaceId(workspaceList[0].workspaceId);
        }, 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.reconnect.failed'));
    } finally {
      setConnecting(false);
      setLoadingWorkspaces(false);
    }
  };

  const handleShare = async () => {
    if (!selectedWorkspaceId) {
      setError(t('slack.share.selectWorkspacePlaceholder'));
      return;
    }

    if (!selectedChannelId) {
      setError(t('slack.share.selectChannelPlaceholder'));
      return;
    }

    setLoading(true);
    setError(null);
    setSensitiveDataWarning(null);

    try {
      const result = await shareWorkflowToSlack({
        workspaceId: selectedWorkspaceId,
        workflowId,
        workflowName,
        channelId: selectedChannelId,
        description: description || undefined,
        overrideSensitiveWarning: false,
      });

      if (result.success) {
        // Success - close dialog
        handleClose();
        // TODO: Show success notification
      } else if (result.sensitiveDataWarning) {
        // Show sensitive data warning
        setSensitiveDataWarning(result.sensitiveDataWarning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.share.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleShareOverride = async () => {
    if (!selectedWorkspaceId || !selectedChannelId) {
      return;
    }

    setLoading(true);
    setError(null);
    setSensitiveDataWarning(null);

    try {
      const result = await shareWorkflowToSlack({
        workspaceId: selectedWorkspaceId,
        workflowId,
        workflowName,
        channelId: selectedChannelId,
        description: description || undefined,
        overrideSensitiveWarning: true,
      });

      if (result.success) {
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.share.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedWorkspaceId('');
    setSelectedChannelId('');
    setDescription('');
    setError(null);
    setSensitiveDataWarning(null);
    setLoading(false);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  // Sensitive data warning dialog
  if (sensitiveDataWarning) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleClose();
          }
        }}
      >
        <div
          ref={dialogRef}
          tabIndex={-1}
          style={{
            backgroundColor: 'var(--vscode-editor-background)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '4px',
            padding: '24px',
            minWidth: '500px',
            maxWidth: '700px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            outline: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Warning Title */}
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--vscode-errorForeground)',
              marginBottom: '16px',
            }}
          >
            {t('slack.sensitiveData.warning.title')}
          </div>

          {/* Warning Message */}
          <div
            style={{
              fontSize: '13px',
              color: 'var(--vscode-descriptionForeground)',
              marginBottom: '16px',
            }}
          >
            {t('slack.sensitiveData.warning.message')}
          </div>

          {/* Findings List */}
          <div
            style={{
              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '2px',
              padding: '12px',
              marginBottom: '24px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {sensitiveDataWarning.map((finding, index) => (
              <div
                key={`${finding.type}-${finding.position}`}
                style={{
                  marginBottom: index < sensitiveDataWarning.length - 1 ? '8px' : '0',
                  fontSize: '12px',
                }}
              >
                <div
                  style={{
                    color: 'var(--vscode-foreground)',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                >
                  {finding.type} ({finding.severity})
                </div>
                <div
                  style={{
                    color: 'var(--vscode-descriptionForeground)',
                    fontFamily: 'monospace',
                  }}
                >
                  {finding.maskedValue}
                </div>
              </div>
            ))}
          </div>

          {/* Warning Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: '6px 16px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {t('slack.sensitiveData.warning.cancel')}
            </button>
            <button
              type="button"
              onClick={handleShareOverride}
              disabled={loading}
              style={{
                padding: '6px 16px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? t('slack.share.sharing') : t('slack.sensitiveData.warning.continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main share dialog
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          padding: '24px',
          minWidth: '500px',
          maxWidth: '700px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          outline: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div
          id={titleId}
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
          }}
        >
          {t('slack.share.title')}
        </div>

        {/* Workflow Name */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '24px',
          }}
        >
          {workflowName}
        </div>

        {/* Workspace Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="workspace-select"
            style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--vscode-foreground)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            {t('slack.share.selectWorkspace')}
          </label>
          <select
            id="workspace-select"
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            disabled={loadingWorkspaces || loading}
            style={{
              width: '100%',
              padding: '6px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '13px',
              cursor: loadingWorkspaces || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingWorkspaces ? (
              <option value="">{t('loading')}...</option>
            ) : workspaces.length === 0 ? (
              <option value="">{t('slack.error.noWorkspaces')}</option>
            ) : (
              workspaces.map((workspace) => (
                <option key={workspace.workspaceId} value={workspace.workspaceId}>
                  {workspace.workspaceName}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Connect to Slack Button (shown when no workspaces) */}
        {!loadingWorkspaces && workspaces.length === 0 && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '12px',
              }}
            >
              {t('slack.connect.description')}
            </div>
            <button
              type="button"
              onClick={handleConnectToSlack}
              disabled={connecting}
              style={{
                width: '100%',
                padding: '8px 16px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '2px',
                cursor: connecting ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                opacity: connecting ? 0.5 : 1,
              }}
            >
              {connecting ? t('slack.connect.connecting') : t('slack.connect.button')}
            </button>

            {/* Redirect URI display (development only) */}
            {redirectUri && (
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--vscode-foreground)',
                    marginBottom: '4px',
                  }}
                >
                  OAuth Redirect URL (for Slack App settings):
                </div>
                <input
                  type="text"
                  readOnly
                  value={redirectUri}
                  onClick={(e) => e.currentTarget.select()}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '2px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    cursor: 'text',
                  }}
                />
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    marginTop: '4px',
                  }}
                >
                  Click to select and copy this URL. Add it to Slack App → OAuth & Permissions →
                  Redirect URLs
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reconnect Button (shown when workspaces exist) */}
        {!loadingWorkspaces && workspaces.length > 0 && (
          <div
            style={{
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '8px',
              }}
            >
              {t('slack.reconnect.description')}
            </div>
            <button
              type="button"
              onClick={handleReconnectToSlack}
              disabled={connecting}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '2px',
                cursor: connecting ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: connecting ? 0.5 : 1,
              }}
            >
              {connecting ? t('slack.reconnect.reconnecting') : t('slack.reconnect.button')}
            </button>

            {/* Redirect URI display (development only) */}
            {redirectUri && (
              <div style={{ marginTop: '12px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--vscode-foreground)',
                    marginBottom: '4px',
                  }}
                >
                  OAuth Redirect URL (for Slack App settings):
                </div>
                <input
                  type="text"
                  readOnly
                  value={redirectUri}
                  onClick={(e) => e.currentTarget.select()}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '2px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    cursor: 'text',
                  }}
                />
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    marginTop: '4px',
                  }}
                >
                  Click to select and copy this URL. Add it to Slack App → OAuth & Permissions →
                  Redirect URLs
                </div>
              </div>
            )}
          </div>
        )}

        {/* Channel Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="channel-select"
            style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--vscode-foreground)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            {t('slack.share.selectChannel')}
          </label>
          <select
            id="channel-select"
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            disabled={loadingChannels || loading}
            style={{
              width: '100%',
              padding: '6px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '13px',
              cursor: loadingChannels || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loadingChannels ? (
              <option value="">{t('loading')}...</option>
            ) : channels.length === 0 ? (
              <option value="">{t('slack.error.noChannels')}</option>
            ) : (
              channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.isPrivate ? '🔒' : '#'} {channel.name}
                </option>
              ))
            )}
          </select>

          {/* Help message when no channels available */}
          {!loadingChannels && channels.length === 0 && selectedWorkspaceId && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: 'var(--vscode-textBlockQuote-background)',
                border: '1px solid var(--vscode-textBlockQuote-border)',
                borderRadius: '2px',
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              💡 {t('slack.error.noChannelsHelp')}
            </div>
          )}
        </div>

        {/* Description Input */}
        <div style={{ marginBottom: '24px' }}>
          <label
            htmlFor="description-input"
            style={{
              display: 'block',
              fontSize: '13px',
              color: 'var(--vscode-foreground)',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            {t('description')} ({t('optional')})
          </label>
          <textarea
            id="description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            maxLength={500}
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
            placeholder={t('slack.share.descriptionPlaceholder')}
          />
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '4px',
              textAlign: 'right',
            }}
          >
            {description.length} / 500
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
              border: '1px solid var(--vscode-inputValidation-errorBorder)',
              borderRadius: '2px',
              marginBottom: '16px',
              fontSize: '12px',
              color: 'var(--vscode-errorForeground)',
            }}
          >
            {error}
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={
              loading ||
              loadingWorkspaces ||
              loadingChannels ||
              !selectedWorkspaceId ||
              !selectedChannelId
            }
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '2px',
              cursor:
                loading ||
                loadingWorkspaces ||
                loadingChannels ||
                !selectedWorkspaceId ||
                !selectedChannelId
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              opacity:
                loading ||
                loadingWorkspaces ||
                loadingChannels ||
                !selectedWorkspaceId ||
                !selectedChannelId
                  ? 0.5
                  : 1,
            }}
          >
            {loading ? t('slack.share.sharing') : t('slack.share.title')}
          </button>
        </div>
      </div>
    </div>
  );
}
