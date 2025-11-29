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
  checkBotChannelMembership,
  getLastSharedChannel,
  getSlackChannels,
  listSlackWorkspaces,
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Get current canvas state for workflow generation
  const { nodes, edges, activeWorkflow, workflowName } = useWorkflowStore();

  // State management
  const [loading, setLoading] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<SlackWorkspace | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [sensitiveDataWarning, setSensitiveDataWarning] = useState<SensitiveDataFinding[] | null>(
    null
  );
  const [isManualTokenDialogOpen, setIsManualTokenDialogOpen] = useState(false);
  const [botMembershipStatus, setBotMembershipStatus] = useState<
    'checking' | 'member' | 'not_member' | null
  >(null);

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

          // Check bot membership for the initial channel
          setBotMembershipStatus('checking');
          const isMember = await checkBotChannelMembership(workspace.workspaceId, initialChannelId);
          setBotMembershipStatus(isMember ? 'member' : 'not_member');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('slack.error.networkError'));
      } finally {
        setLoadingChannels(false);
      }
    };

    loadChannels();
  }, [workspace, t]);

  // Check bot membership when channel selection changes
  const handleChannelChange = async (channelId: string) => {
    setSelectedChannelId(channelId);

    if (!workspace || !channelId) {
      setBotMembershipStatus(null);
      return;
    }

    setBotMembershipStatus('checking');
    const isMember = await checkBotChannelMembership(workspace.workspaceId, channelId);
    setBotMembershipStatus(isMember ? 'member' : 'not_member');
  };

  // Auto-focus dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

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
        'Created with Workflow Studio',
        activeWorkflow?.conversationHistory
      );

      const result = await shareWorkflowToSlack({
        workspaceId: workspace.workspaceId,
        workflowId,
        workflowName,
        workflow,
        channelId: selectedChannelId,
        description: description || undefined,
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
      setError(err instanceof Error ? err.message : t('slack.share.failed'));
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
        'Created with Workflow Studio',
        activeWorkflow?.conversationHistory
      );

      const result = await shareWorkflowToSlack({
        workspaceId: workspace.workspaceId,
        workflowId,
        workflowName,
        workflow,
        channelId: selectedChannelId,
        description: description || undefined,
        overrideSensitiveWarning: true,
      });

      if (result.success) {
        // Save last shared channel for next time
        setLastSharedChannel(selectedChannelId);
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.share.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedChannelId('');
    setDescription('');
    setError(null);
    setSensitiveDataWarning(null);
    setLoading(false);
    setBotMembershipStatus(null);
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
        role="presentation"
      >
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick is only used to stop event propagation, not for click actions */}
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
      role="presentation"
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick is only used to stop event propagation, not for click actions */}
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

          {/* Bot membership status indicator */}
          {botMembershipStatus === 'checking' && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid var(--vscode-progressBar-background)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'bot-membership-spinner 1s linear infinite',
                  flexShrink: 0,
                }}
              />
              <span>{t('slack.share.checkingBotMembership')}</span>
              <style>
                {`
                  @keyframes bot-membership-spinner {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}

          {/* Bot not in channel warning */}
          {botMembershipStatus === 'not_member' && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor:
                  'var(--vscode-inputValidation-warningBackground, var(--vscode-editorWarning-background, rgba(255, 140, 0, 0.1)))',
                border:
                  '1px solid var(--vscode-inputValidation-warningBorder, var(--vscode-editorWarning-foreground, #ff8c00))',
                borderRadius: '2px',
                fontSize: '12px',
                color: 'var(--vscode-inputValidation-warningForeground, var(--vscode-foreground))',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ whiteSpace: 'pre-line' }}>
                  {t('slack.share.botNotInChannelMessage')}
                </span>
                <code
                  style={{
                    display: 'block',
                    padding: '6px 8px',
                    backgroundColor: 'var(--vscode-textCodeBlock-background)',
                    border:
                      '1px solid var(--vscode-widget-border, var(--vscode-contrastBorder, transparent))',
                    borderRadius: '3px',
                    fontFamily: 'var(--vscode-editor-font-family, monospace)',
                    fontSize: '12px',
                    userSelect: 'all',
                    cursor: 'text',
                  }}
                >
                  /invite @Claude Code Workflow Studio
                </code>
              </div>
            </div>
          )}

          {/* Help message when no channels available */}
          {!loadingChannels && channels.length === 0 && workspace && (
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
        <div style={{ marginBottom: '0' }}>
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
                loading || loadingWorkspace || loadingChannels || !workspace || !selectedChannelId
                  ? 'not-allowed'
                  : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              opacity:
                loading || loadingWorkspace || loadingChannels || !workspace || !selectedChannelId
                  ? 0.5
                  : 1,
            }}
          >
            {loading ? t('slack.share.sharing') : t('slack.share.button')}
          </button>
        </div>
      </div>

      {/* Manual Token Dialog */}
      <SlackManualTokenDialog
        isOpen={isManualTokenDialogOpen}
        onClose={handleManualTokenClose}
        onSuccess={handleManualTokenSuccess}
      />
    </div>
  );
}
