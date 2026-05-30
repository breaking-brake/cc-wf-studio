/**
 * Slack Share Dialog Component
 *
 * Dialog for sharing workflow to Slack channels.
 * Includes channel selection and sensitive data warning handling.
 * Description is taken from the DescriptionPanel (workflowDescription in store).
 *
 * Based on specs/001-slack-workflow-sharing/plan.md
 */

import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';
import type {
  SensitiveDataFinding,
  SlackChannel,
  SlackWorkspace,
} from '../../services/slack-integration-service';
import {
  getLastSharedChannel,
  getSlackChannels,
  listSlackWorkspaces,
  SlackError,
  setLastSharedChannel,
  shareWorkflowToSlack,
} from '../../services/slack-integration-service';
import { serializeWorkflow } from '../../services/workflow-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';
import { SlackManualTokenDialog } from './SlackManualTokenDialog';

interface SlackShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
}

export function SlackShareDialog({ isOpen, onClose, workflowId }: SlackShareDialogProps) {
  const { t } = useTranslation();

  /**
   * Format error message from SlackError with i18n support
   * Note: suggestedAction is intentionally not appended here since the UI
   * already shows relevant warnings (e.g., bot not in channel warning)
   */
  const formatSlackError = (err: unknown): string => {
    if (err instanceof SlackError) {
      // Use type assertion since messageKey comes from Extension Host
      let message = t(err.messageKey as keyof WebviewTranslationKeys);
      // Interpolate parameters (e.g., {seconds} for rate limiting)
      if (err.messageParams) {
        for (const [key, value] of Object.entries(err.messageParams)) {
          message = message.replace(`{${key}}`, String(value));
        }
      }
      return message;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return t('slack.share.failed');
  };

  // Get current canvas state for workflow generation
  const { nodes, edges, activeWorkflow, workflowName, workflowDescription, subAgentFlows } =
    useWorkflowStore();

  // State management
  const [loading, setLoading] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<SlackWorkspace | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [sensitiveDataWarning, setSensitiveDataWarning] = useState<SensitiveDataFinding[] | null>(
    null
  );
  const [isManualTokenDialogOpen, setIsManualTokenDialogOpen] = useState(false);

  // Load workspace when dialog opens (single workspace only)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadWorkspace = async () => {
      setLoadingWorkspace(true);
      setError(null);

      try {
        const workspaceList = await listSlackWorkspaces();

        // Only use the first workspace (single workspace support)
        if (workspaceList.length > 0) {
          setWorkspace(workspaceList[0]);
        } else {
          setWorkspace(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('slack.error.networkError'));
      } finally {
        setLoadingWorkspace(false);
      }
    };

    loadWorkspace();
  }, [isOpen, t]);

  // Load channels when workspace is loaded
  useEffect(() => {
    if (!workspace) {
      setChannels([]);
      setSelectedChannelId('');
      return;
    }

    const loadChannels = async () => {
      setLoadingChannels(true);
      setError(null);

      try {
        // Load channels and last shared channel in parallel
        const [channelList, lastChannelId] = await Promise.all([
          getSlackChannels(workspace.workspaceId),
          getLastSharedChannel(),
        ]);
        setChannels(channelList);

        // Prefer last shared channel if it exists in the list
        if (channelList.length > 0) {
          const lastChannelExists =
            lastChannelId && channelList.some((ch) => ch.id === lastChannelId);
          const initialChannelId = lastChannelExists ? lastChannelId : channelList[0].id;
          setSelectedChannelId(initialChannelId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('slack.error.networkError'));
      } finally {
        setLoadingChannels(false);
      }
    };

    loadChannels();
  }, [workspace, t]);

  // Handle channel selection change
  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
  };

  const handleOpenManualTokenDialog = () => {
    setIsManualTokenDialogOpen(true);
  };

  const handleManualTokenSuccess = async () => {
    setIsManualTokenDialogOpen(false);
    setError(null);

    // Reload workspace after successful connection (single workspace only)
    setLoadingWorkspace(true);
    try {
      const workspaceList = await listSlackWorkspaces();

      // Only use the first workspace
      if (workspaceList.length > 0) {
        setWorkspace(workspaceList[0]);
      } else {
        setWorkspace(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.error.networkError'));
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const handleManualTokenClose = () => {
    setIsManualTokenDialogOpen(false);
  };

  const handleShare = async () => {
    if (!workspace) {
      setError(t('slack.error.noWorkspaces'));
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
      // Generate workflow from current canvas state
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        activeWorkflow?.conversationHistory,
        subAgentFlows
      );

      const result = await shareWorkflowToSlack({
        workspaceId: workspace.workspaceId,
        workflowId,
        workflowName,
        workflow,
        channelId: selectedChannelId,
        description: workflowDescription || undefined,
        overrideSensitiveWarning: false,
      });

      if (result.success) {
        // Save last shared channel for next time
        setLastSharedChannel(selectedChannelId);
        // Success - close dialog
        handleClose();
      } else if (result.sensitiveDataWarning) {
        // Show sensitive data warning
        setSensitiveDataWarning(result.sensitiveDataWarning);
      }
    } catch (err) {
      setError(formatSlackError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleShareOverride = async () => {
    if (!workspace || !selectedChannelId) {
      return;
    }

    setLoading(true);
    setError(null);
    setSensitiveDataWarning(null);

    try {
      // Generate workflow from current canvas state
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        activeWorkflow?.conversationHistory,
        subAgentFlows
      );

      const result = await shareWorkflowToSlack({
        workspaceId: workspace.workspaceId,
        workflowId,
        workflowName,
        workflow,
        channelId: selectedChannelId,
        description: workflowDescription || undefined,
        overrideSensitiveWarning: true,
      });

      if (result.success) {
        // Save last shared channel for next time
        setLastSharedChannel(selectedChannelId);
        handleClose();
      }
    } catch (err) {
      setError(formatSlackError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedChannelId('');
    setError(null);
    setSensitiveDataWarning(null);
    setLoading(false);
    onClose();
  };

  // Sensitive data warning dialog
  if (sensitiveDataWarning) {
    return (
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <Dialog.Content
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
            >
              {/* Warning Title */}
              <Dialog.Title
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--vscode-errorForeground)',
                  marginBottom: '16px',
                }}
              >
                {t('slack.sensitiveData.warning.title')}
              </Dialog.Title>

              {/* Warning Message */}
              <Dialog.Description
                style={{
                  fontSize: '13px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginBottom: '16px',
                }}
              >
                {t('slack.sensitiveData.warning.message')}
              </Dialog.Description>

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
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  // Main share dialog
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
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
          >
            {/* Title */}
            <Dialog.Title
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                marginBottom: '8px',
              }}
            >
              {t('slack.share.title')}
            </Dialog.Title>

            {/* Workflow Name */}
            <Dialog.Description
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '24px',
              }}
            >
              {workflowName}
            </Dialog.Description>

            {/* Connection Status Section */}
            {!loadingWorkspace && !workspace && (
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
                  onClick={handleOpenManualTokenDialog}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {t('slack.connect.button')}
                </button>
              </div>
            )}

            {!loadingWorkspace && workspace && (
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: 'var(--vscode-testing-iconPassed)' }}>✓</span>
                  <span>
                    Connected to{' '}
                    <strong style={{ color: 'var(--vscode-foreground)' }}>
                      {workspace.workspaceName}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenManualTokenDialog}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {t('slack.reconnect.button')}
                </button>
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
                onChange={(e) => handleChannelChange(e.target.value)}
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

            {/* Progress Bar - shown when sharing to Slack */}
            {loading && (
              <div style={{ marginBottom: '16px' }}>
                <IndeterminateProgressBar label={t('slack.share.sharing')} />
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
                  loading || loadingWorkspace || loadingChannels || !workspace || !selectedChannelId
                }
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor:
                    loading ||
                    loadingWorkspace ||
                    loadingChannels ||
                    !workspace ||
                    !selectedChannelId
                      ? 'not-allowed'
                      : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  opacity:
                    loading ||
                    loadingWorkspace ||
                    loadingChannels ||
                    !workspace ||
                    !selectedChannelId
                      ? 0.5
                      : 1,
                }}
              >
                {loading ? t('slack.share.sharing') : t('slack.share.button')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>

      {/* Manual Token Dialog */}
      <SlackManualTokenDialog
        isOpen={isManualTokenDialogOpen}
        onClose={handleManualTokenClose}
        onSuccess={handleManualTokenSuccess}
      />
    </Dialog.Root>
  );
}
