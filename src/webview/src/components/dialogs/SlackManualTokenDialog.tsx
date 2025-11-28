/**
 * Slack Connection Dialog Component
 *
 * Dialog for connecting to Slack workspace with two options:
 * - OAuth: One-click authentication via browser
 * - Manual Token: Enter Bot Token manually
 *
 * Based on specs/001-slack-workflow-sharing OAuth implementation plan
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import {
  cancelSlackOAuth,
  connectSlackManual,
  connectSlackOAuth,
  disconnectFromSlack,
  listSlackWorkspaces,
  openExternalUrl,
} from '../../services/slack-integration-service';

interface SlackManualTokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthTab = 'oauth' | 'manual';
type OAuthStatus = 'idle' | 'initiated' | 'polling' | 'success' | 'cancelled' | 'failed';

export function SlackManualTokenDialog({
  isOpen,
  onClose,
  onSuccess,
}: SlackManualTokenDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Tab state
  const [activeTab, setActiveTab] = useState<AuthTab>('oauth');

  // OAuth state
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>('idle');
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Manual token state
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasStoredToken, setHasStoredToken] = useState(false);

  // Cancel OAuth handler - defined before useEffect that uses it
  const handleCancelOAuth = useCallback(() => {
    cancelSlackOAuth();
    setOauthStatus('cancelled');
  }, []);

  // Reset state and check token existence when dialog opens
  useEffect(() => {
    if (isOpen) {
      setBotToken('');
      setError(null);
      setOauthError(null);
      setOauthStatus('idle');
      setActiveTab('oauth');

      // Check if token is already stored
      listSlackWorkspaces()
        .then((workspaces) => {
          setHasStoredToken(workspaces.length > 0);
        })
        .catch(() => {
          setHasStoredToken(false);
        });
    }
  }, [isOpen]);

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (oauthStatus === 'polling') {
          handleCancelOAuth();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, oauthStatus, handleCancelOAuth]);

  // Focus dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // Cancel OAuth polling when dialog is closed (by any means)
  useEffect(() => {
    if (!isOpen && (oauthStatus === 'polling' || oauthStatus === 'initiated')) {
      cancelSlackOAuth();
    }
  }, [isOpen, oauthStatus]);

  // OAuth authentication handler
  const handleOAuthConnect = async () => {
    setOauthError(null);
    setOauthStatus('idle');

    try {
      await connectSlackOAuth((status) => {
        setOauthStatus(status);
      });

      // Success - close dialog and notify parent
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        setOauthStatus('cancelled');
        setOauthError(t('slack.oauth.cancelled'));
      } else {
        setOauthStatus('failed');
        setOauthError(err instanceof Error ? err.message : t('slack.error.networkError'));
      }
    }
  };

  // Manual token connection handler
  const handleConnect = async () => {
    if (!botToken.trim()) {
      setError(t('slack.manualToken.error.tokenRequired'));
      return;
    }

    if (!botToken.startsWith('xoxb-')) {
      setError(t('slack.manualToken.error.invalidTokenFormat'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await connectSlackManual(botToken);

      // Success - close dialog and notify parent
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.error.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async () => {
    setLoading(true);
    setError(null);
    setShowDeleteConfirm(false);

    try {
      await disconnectFromSlack();
      setHasStoredToken(false);

      // Success - close dialog and notify parent
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('slack.error.networkError'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const isOAuthLoading = oauthStatus === 'initiated' || oauthStatus === 'polling';

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
      onClick={() => {
        if (isOAuthLoading) {
          // Cancel OAuth and close dialog when clicking outside during loading
          handleCancelOAuth();
        }
        onClose();
      }}
      role="presentation"
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick is only used to stop event propagation, not for click actions */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          padding: '24px',
          minWidth: '500px',
          maxWidth: '600px',
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
            marginBottom: '16px',
          }}
        >
          {t('slack.connect.title')}
        </div>

        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--vscode-panel-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            disabled={loading || isOAuthLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color:
                activeTab === 'oauth'
                  ? 'var(--vscode-foreground)'
                  : 'var(--vscode-descriptionForeground)',
              border: 'none',
              borderBottom:
                activeTab === 'oauth'
                  ? '2px solid var(--vscode-focusBorder)'
                  : '2px solid transparent',
              cursor: loading || isOAuthLoading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'oauth' ? 600 : 400,
              opacity: loading || isOAuthLoading ? 0.5 : 1,
            }}
          >
            {t('slack.connect.tab.oauth')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            disabled={loading || isOAuthLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color:
                activeTab === 'manual'
                  ? 'var(--vscode-foreground)'
                  : 'var(--vscode-descriptionForeground)',
              border: 'none',
              borderBottom:
                activeTab === 'manual'
                  ? '2px solid var(--vscode-focusBorder)'
                  : '2px solid transparent',
              cursor: loading || isOAuthLoading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === 'manual' ? 600 : 400,
              opacity: loading || isOAuthLoading ? 0.5 : 1,
            }}
          >
            {t('slack.connect.tab.manual')}
          </button>
        </div>

        {/* OAuth Tab Content */}
        {activeTab === 'oauth' && (
          <div>
            {/* Review Notice */}
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
                lineHeight: '1.6',
              }}
            >
              {t('slack.oauth.reviewNotice.message')}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '12px',
                whiteSpace: 'pre-line',
              }}
            >
              {t('slack.oauth.description')}
            </div>

            {/* Privacy Policy Link */}
            <div
              style={{
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => openExternalUrl('https://cc-wf-studio.com/privacy')}
                style={{
                  fontSize: '12px',
                  color: 'var(--vscode-textLink-foreground)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {t('slack.oauth.privacyPolicy')}
              </button>
            </div>

            {/* OAuth Status Display */}
            {isOAuthLoading && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--vscode-foreground)',
                    marginBottom: '8px',
                  }}
                >
                  {oauthStatus === 'initiated'
                    ? t('slack.oauth.status.initiated')
                    : t('slack.oauth.status.polling')}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  {t('slack.oauth.status.waitingHint')}
                </div>
              </div>
            )}

            {/* OAuth Error */}
            {oauthError && (
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
                {oauthError}
              </div>
            )}

            {/* OAuth Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {/* Delete Token Button (left side) */}
              {hasStoredToken && !isOAuthLoading && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: 'var(--vscode-errorForeground)',
                    border: '1px solid var(--vscode-errorForeground)',
                    borderRadius: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {t('slack.manualToken.deleteButton')}
                </button>
              )}

              {/* Right side buttons */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                {isOAuthLoading ? (
                  <button
                    type="button"
                    onClick={handleCancelOAuth}
                    style={{
                      padding: '6px 16px',
                      backgroundColor: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    {t('cancel')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: 'var(--vscode-button-secondaryBackground)',
                        color: 'var(--vscode-button-secondaryForeground)',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleOAuthConnect}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: 'var(--vscode-button-background)',
                        color: 'var(--vscode-button-foreground)',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {t('slack.oauth.connectButton')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Token Tab Content */}
        {activeTab === 'manual' && (
          <div>
            {/* Description */}
            <div
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '16px',
              }}
            >
              {t('slack.manualToken.description')}
            </div>

            {/* How to Get Bot Token Box */}
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '8px',
                }}
              >
                {t('slack.manualToken.howToGet.title')}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  lineHeight: '1.6',
                }}
              >
                <div>1. {t('slack.manualToken.howToGet.step1')}</div>
                <div>2. {t('slack.manualToken.howToGet.step2')}</div>
                <div>3. {t('slack.manualToken.howToGet.step3')}</div>
                <div>4. {t('slack.manualToken.howToGet.step4')}</div>
                <div>5. {t('slack.manualToken.howToGet.step5')}</div>
              </div>
            </div>

            {/* Security & Privacy Box */}
            <div
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '8px',
                }}
              >
                {t('slack.manualToken.security.title')}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ marginBottom: '8px', fontStyle: 'italic' }}>
                  {t('slack.manualToken.security.notice')}
                </div>
                <div>• {t('slack.manualToken.security.storage')}</div>
                <div>• {t('slack.manualToken.security.transmission')}</div>
                <div>• {t('slack.manualToken.security.deletion')}</div>
                <div>• {t('slack.manualToken.security.sharing')}</div>
              </div>
            </div>

            {/* Bot Token Input */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="bot-token"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: 'var(--vscode-foreground)',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                {t('slack.manualToken.botToken.label')}
              </label>
              <input
                id="bot-token"
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="xoxb-..."
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                }}
              />
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
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {/* Delete Token Button (left side) */}
              {hasStoredToken && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    color: 'var(--vscode-errorForeground)',
                    border: '1px solid var(--vscode-errorForeground)',
                    borderRadius: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {t('slack.manualToken.deleteButton')}
                </button>
              )}

              {/* Right side buttons */}
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={onClose}
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
                  onClick={handleConnect}
                  disabled={loading || !botToken.trim()}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: loading || !botToken.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    opacity: loading || !botToken.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? t('slack.manualToken.connecting') : t('slack.manualToken.connect')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
            }}
            onClick={() => setShowDeleteConfirm(false)}
            role="presentation"
          >
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick is only used to stop event propagation */}
            <div
              style={{
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                padding: '20px',
                minWidth: '400px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '12px',
                }}
              >
                {t('slack.manualToken.deleteConfirm.title')}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginBottom: '16px',
                }}
              >
                {t('slack.manualToken.deleteConfirm.message')}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {t('slack.manualToken.deleteConfirm.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteToken}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: 'var(--vscode-errorForeground)',
                    color: 'var(--vscode-editor-background)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {t('slack.manualToken.deleteConfirm.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
