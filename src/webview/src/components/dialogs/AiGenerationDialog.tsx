/**
 * AI Generation Dialog Component
 *
 * Modal dialog for AI-assisted workflow generation.
 * Based on: /specs/001-ai-workflow-generation/quickstart.md Phase 5
 */

import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import {
  AIGenerationError,
  cancelWorkflowGeneration,
  generateWorkflow,
} from '../../services/ai-generation-service';
import { useWorkflowStore } from '../../stores/workflow-store';

interface AiGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_GENERATION_TIME_SECONDS = 90;

export function AiGenerationDialog({ isOpen, onClose }: AiGenerationDialogProps) {
  const { t } = useTranslation();
  const descriptionId = useId();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { addGeneratedWorkflow } = useWorkflowStore();

  // Progress timer
  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        // Cap at MAX_GENERATION_TIME_SECONDS to avoid going over 100%
        if (prev >= MAX_GENERATION_TIME_SECONDS) {
          return MAX_GENERATION_TIME_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]);

  // Map error codes to translation keys
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof AIGenerationError) {
      switch (err.code) {
        case 'COMMAND_NOT_FOUND':
          return t('ai.error.commandNotFound');
        case 'TIMEOUT':
          return t('ai.error.timeout');
        case 'PARSE_ERROR':
          return t('ai.error.parseError');
        case 'VALIDATION_ERROR':
          return t('ai.error.validationError');
        default:
          return t('ai.error.unknown');
      }
    }
    if (err instanceof Error) {
      return err.message;
    }
    return t('ai.error.unknown');
  };

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    // Validate description
    if (!description.trim()) {
      setError(t('ai.error.emptyDescription'));
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(t('ai.error.descriptionTooLong', { max: MAX_DESCRIPTION_LENGTH }));
      return;
    }

    // Generate unique request ID
    const requestId = `req-${Date.now()}-${Math.random()}`;
    setCurrentRequestId(requestId);
    setLoading(true);
    setError(null);

    try {
      // Generate workflow via AI (pass requestId for cancellation support)
      const workflow = await generateWorkflow(description, requestId);

      // Add generated workflow to canvas (with auto-positioning to avoid overlap)
      addGeneratedWorkflow(workflow);

      // Show success message
      setShowSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500); // Close after 1.5 seconds
    } catch (err) {
      // Handle cancellation - don't close modal, just reset loading state
      if (err instanceof AIGenerationError && err.code === 'CANCELLED') {
        // Loading state will be reset in finally block
        // Modal remains open for user to try again
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setCurrentRequestId(null);
    }
  };

  const handleClose = () => {
    setDescription('');
    setError(null);
    setLoading(false);
    setCurrentRequestId(null);
    setShowSuccess(false);
    onClose();
  };

  const handleCancel = () => {
    if (loading && currentRequestId) {
      // Send cancellation request to Extension Host
      cancelWorkflowGeneration(currentRequestId);
      // UI will close when GENERATION_CANCELLED message is received
    } else {
      // Not generating, just close the dialog
      handleClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) {
      handleClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  };

  const isDescriptionValid =
    description.trim().length > 0 && description.length <= MAX_DESCRIPTION_LENGTH;

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
        zIndex: 1000,
      }}
      onClick={() => {
        if (!loading) {
          handleClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !loading) {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '6px',
          padding: '24px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--vscode-foreground)' }}>
          {t('ai.dialogTitle')}
        </h2>

        <p style={{ marginBottom: '16px', color: 'var(--vscode-descriptionForeground)' }}>
          {t('ai.dialogDescription')}
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="workflow-description"
            style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--vscode-foreground)',
              fontWeight: 500,
            }}
          >
            {t('ai.descriptionLabel')}
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('ai.descriptionPlaceholder')}
            disabled={loading || showSuccess}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '8px 12px',
              fontSize: '14px',
              lineHeight: '1.5',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div
            style={{
              marginTop: '4px',
              fontSize: '12px',
              color:
                description.length > MAX_DESCRIPTION_LENGTH
                  ? 'var(--vscode-errorForeground)'
                  : 'var(--vscode-descriptionForeground)',
            }}
          >
            {t('ai.characterCount', { count: description.length, max: MAX_DESCRIPTION_LENGTH })}
          </div>
        </div>

        <div
          style={{
            marginBottom: '8px',
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('ai.usageNote')}
        </div>

        <div
          style={{
            marginBottom: '16px',
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('ai.overwriteWarning')}
        </div>

        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
              border: '1px solid var(--vscode-inputValidation-errorBorder)',
              borderRadius: '4px',
              color: 'var(--vscode-errorForeground)',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {showSuccess && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--vscode-inputValidation-infoBackground)',
              border: '1px solid var(--vscode-inputValidation-infoBorder)',
              borderRadius: '4px',
              color: 'var(--vscode-foreground)',
              fontSize: '14px',
            }}
          >
            {t('ai.success')}
          </div>
        )}

        {loading &&
          (() => {
            // Calculate progress using ease-out quad function for smoother UX
            // This makes progress feel faster initially, then slower near completion
            // At 60s (~67% of 90s): ~89% progress, at 90s: 100% progress
            const normalizedTime = elapsedSeconds / MAX_GENERATION_TIME_SECONDS;
            const easedProgress = 1 - (1 - normalizedTime) ** 2;
            const percentage = Math.min(Math.round(easedProgress * 100), 100);

            return (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '16px',
                  backgroundColor: 'var(--vscode-inputValidation-infoBackground)',
                  border: '1px solid var(--vscode-inputValidation-infoBorder)',
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: 'var(--vscode-foreground)',
                    fontWeight: 500,
                  }}
                >
                  {t('ai.generating')}
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--vscode-editor-background)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '8px',
                    border: '1px solid var(--vscode-panel-border)',
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: '100%',
                      backgroundColor: 'var(--vscode-progressBar-background)',
                      transition: 'width 0.5s ease-out',
                    }}
                  />
                </div>

                {/* Progress text */}
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--vscode-descriptionForeground)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{percentage}%</span>
                  <span>
                    {t('ai.progressTime', {
                      elapsed: elapsedSeconds,
                      max: MAX_GENERATION_TIME_SECONDS,
                    })}
                  </span>
                </div>
              </div>
            );
          })()}

        {!showSuccess && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {loading ? t('ai.cancelGenerationButton') : t('ai.cancelButton')}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!isDescriptionValid || loading || showSuccess}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor:
                  isDescriptionValid && !loading && !showSuccess
                    ? 'var(--vscode-button-background)'
                    : 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '4px',
                cursor: isDescriptionValid && !loading && !showSuccess ? 'pointer' : 'not-allowed',
                opacity: isDescriptionValid && !loading && !showSuccess ? 1 : 0.5,
              }}
            >
              {t('ai.generateButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
