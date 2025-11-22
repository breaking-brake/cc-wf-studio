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
import type { SensitiveDataFinding, SlackChannel } from '../../services/slack-integration-service';
import { getSlackChannels, shareWorkflowToSlack } from '../../services/slack-integration-service';

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
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [sensitiveDataWarning, setSensitiveDataWarning] = useState<SensitiveDataFinding[] | null>(
    null
  );

  // Load channels when dialog opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadChannels = async () => {
      setLoadingChannels(true);
      setError(null);

      try {
        const channelList = await getSlackChannels();
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
  }, [isOpen, t]);

  // Auto-focus dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  const handleShare = async () => {
    if (!selectedChannelId) {
      setError(t('slack.share.selectChannelPlaceholder'));
      return;
    }

    setLoading(true);
    setError(null);
    setSensitiveDataWarning(null);

    try {
      const result = await shareWorkflowToSlack({
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
    if (!selectedChannelId) {
      return;
    }

    setLoading(true);
    setError(null);
    setSensitiveDataWarning(null);

    try {
      const result = await shareWorkflowToSlack({
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
            disabled={loading || loadingChannels || !selectedChannelId}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '2px',
              cursor: loading || loadingChannels || !selectedChannelId ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              opacity: loading || loadingChannels || !selectedChannelId ? 0.5 : 1,
            }}
          >
            {loading ? t('slack.share.sharing') : t('slack.share.title')}
          </button>
        </div>
      </div>
    </div>
  );
}
