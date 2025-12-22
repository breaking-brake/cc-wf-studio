/**
 * Slack Share Dialog Component
 *
 * Dialog for sharing workflow to Slack channels.
 * Includes channel selection, description input, and sensitive data warning handling.
 *
 * Based on specs/001-slack-workflow-sharing/plan.md
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';
import type {
  SensitiveDataFinding,
  SlackChannel,
  SlackWorkspace,
} from '../../services/slack-integration-service';
import {
  cancelSlackDescriptionGeneration,
  generateSlackDescription,
  getLastSharedChannel,
  getSlackChannels,
  listSlackWorkspaces,
  SlackError,
  setLastSharedChannel,
  shareWorkflowToSlack,
} from '../../services/slack-integration-service';
import { serializeWorkflow } from '../../services/workflow-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import { AiGenerateButton } from '../common/AiGenerateButton';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';
import { SlackManualTokenDialog } from './SlackManualTokenDialog';

interface SlackShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
}

export function SlackShareDialog({ isOpen, onClose, workflowId }: SlackShareDialogProps) {
  const { t, locale } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

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
  const { nodes, edges, activeWorkflow, workflowName, subAgentFlows } = useWorkflowStore();

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
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationRequestIdRef = useRef<string | null>(null);

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

  // Handle AI description generation
  const handleGenerateDescription = useCallback(async () => {
    const currentRequestId = `gen-${Date.now()}`;
    generationRequestIdRef.current = currentRequestId;
    setIsGeneratingDescription(true);
    setGenerationError(null);

    try {
      // Serialize current workflow state
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName || 'Untitled Workflow',
        'Created with Workflow Studio',
        activeWorkflow?.conversationHistory,
        subAgentFlows
      );
      const workflowJson = JSON.stringify(workflow, null, 2);

      // Determine target language from locale
      // Map locale to supported languages (en, ja, ko, zh-CN, zh-TW)
      let targetLanguage = locale;
      if (locale.startsWith('zh-')) {
        // Keep zh-CN or zh-TW as is
        targetLanguage = locale === 'zh-TW' || locale === 'zh-HK' ? 'zh-TW' : 'zh-CN';
      } else {
        // For other locales, use the language code
        targetLanguage = locale.split('-')[0];
      }

      // Generate description with AI (pass requestId for cancellation support)
      const generatedDescription = await generateSlackDescription(
        workflowJson,
        targetLanguage,
        30000,
        currentRequestId
      );

      // Only update if not cancelled
      if (generationRequestIdRef.current === currentRequestId) {
        setDescription(generatedDescription);
      }
    } catch {
      // Only show error if not cancelled
      if (generationRequestIdRef.current === currentRequestId) {
        setGenerationError(t('slack.description.generateFailed'));
      }
    } finally {
      // Only reset state if not cancelled
      if (generationRequestIdRef.current === currentRequestId) {
        setIsGeneratingDescription(false);
        generationRequestIdRef.current = null;
      }
    }
  }, [nodes, edges, workflowName, activeWorkflow?.conversationHistory, locale, t, subAgentFlows]);

  // Handle cancel AI description generation
  const handleCancelGeneration = useCallback(() => {
    const requestId = generationRequestIdRef.current;
    if (requestId) {
      cancelSlackDescriptionGeneration(requestId);
    }
    generationRequestIdRef.current = null;
    setIsGeneratingDescription(false);
    setGenerationError(null);
  }, []);

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
        activeWorkflow?.conversationHistory,
        subAgentFlows
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
        'Created with Workflow Studio',
        activeWorkflow?.conversationHistory,
        subAgentFlows
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
      setError(formatSlackError(err));
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
        </div>

        {/* Description Input */}
        <div style={{ marginBottom: '0' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label
              htmlFor="description-input"
              style={{
                fontSize: '13px',
                color: 'var(--vscode-foreground)',
                fontWeight: 500,
              }}
            >
              {t('description')} ({t('optional')})
            </label>
            <AiGenerateButton
              isGenerating={isGeneratingDescription}
              onGenerate={handleGenerateDescription}
              onCancel={handleCancelGeneration}
              generateTooltip={t('slack.description.generateWithAI')}
              cancelTooltip={t('cancel')}
              disabled={loading}
            />
          </div>
          {generationError && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--vscode-errorForeground)',
                marginBottom: '8px',
              }}
            >
              {generationError}
            </div>
          )}
          <textarea
            id="description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading || isGeneratingDescription}
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
