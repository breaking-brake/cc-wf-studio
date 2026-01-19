/**
 * Slack Connection Dialog Component
 *
 * Dialog for connecting to Slack workspace with two options:
 * - OAuth: One-click authentication via browser
 * - Manual Token: Enter User Token manually
 *
 * Based on specs/001-slack-workflow-sharing OAuth implementation plan
 */

import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import {
  cancelSlackOAuth,
  connectSlackManual,
  connectSlackOAuth,
  disconnectFromSlack,
  listSlackWorkspaces,
} from '../../services/slack-integration-service';
import { openExternalUrl } from '../../services/vscode-bridge';
import { ConfirmDialog } from './ConfirmDialog';

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

  // Tab state
  const [activeTab, setActiveTab] = useState<AuthTab>('oauth');

  // OAuth state
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus>('idle');
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Manual token state
  const [userToken, setUserToken] = useState('');
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
      setUserToken('');
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
    if (!userToken.trim()) {
      setError(t('slack.manualToken.error.userTokenRequired'));
      return;
    }

    if (!userToken.startsWith('xoxp-')) {
      setError(t('slack.manualToken.error.invalidUserTokenFormat'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Bot Token is no longer required, pass empty string for backward compatibility
      await connectSlackManual('', userToken);

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

  const handleClose = () => {
    if (oauthStatus === 'polling' || oauthStatus === 'initiated') {
      handleCancelOAuth();
    }
    onClose();
  };

  const isOAuthLoading = oauthStatus === 'initiated' || oauthStatus === 'polling';

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
            zIndex: 10000,
          }}
        >
          <Dialog.Content
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
          >
            {/* Title */}
            <Dialog.Title
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                marginBottom: '16px',
              }}
            >
              {t('slack.connect.title')}
            </Dialog.Title>

            {/* Hidden description for accessibility */}
            <Dialog.Description style={{ display: 'none' }}>
              {t('slack.connect.title')}
            </Dialog.Description>

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
                    whiteSpace: 'pre-line',
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

                {/* Links */}
                <ul
                  style={{
                    listStyle: 'disc',
                    paddingLeft: '20px',
                    marginBottom: '16px',
                    fontSize: '12px',
                  }}
                >
                  <li>
                    <button
                      type="button"
                      onClick={() => openExternalUrl('https://cc-wf-studio.com/terms')}
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-textLink-foreground)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {t('slack.oauth.termsOfService')}
                    </button>
                  </li>
                  <li>
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
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        openExternalUrl(
                          'https://github.com/breaking-brake/cc-wf-studio/issues/new/choose'
                        )
                      }
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-textLink-foreground)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {t('slack.oauth.supportPage')}
                    </button>
                  </li>
                </ul>

                {/* OAuth Status Display */}
                {isOAuthLoading && (
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
                      border: '1px solid var(--vscode-panel-border)',
                      borderRadius: '4px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        color: 'var(--vscode-foreground)',
                        marginBottom: '8px',
                      }}
                    >
                      {/* Spinner */}
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid var(--vscode-progressBar-background)',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'oauth-spinner 1s linear infinite',
                          flexShrink: 0,
                        }}
                      />
                      <span>
                        {oauthStatus === 'initiated'
                          ? t('slack.oauth.status.initiated')
                          : t('slack.oauth.status.polling')}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-descriptionForeground)',
                        textAlign: 'center',
                      }}
                    >
                      {t('slack.oauth.status.waitingHint')}
                    </div>
                    <style>
                      {`
                        @keyframes oauth-spinner {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}
                    </style>
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

                {/* How to Get User Token Box */}
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
                    <div>
                      2. {t('slack.manualToken.howToGet.step2')}
                      <ul style={{ margin: '4px 0 4px 20px', paddingLeft: '0', listStyle: 'disc' }}>
                        <li>chat:write ({t('slack.scopes.chatWrite.reason')})</li>
                        <li>files:read ({t('slack.scopes.filesRead.reason')})</li>
                        <li>files:write ({t('slack.scopes.filesWrite.reason')})</li>
                        <li>channels:read ({t('slack.scopes.channelsRead.reason')})</li>
                        <li>groups:read ({t('slack.scopes.groupsRead.reason')})</li>
                      </ul>
                    </div>
                    <div>3. {t('slack.manualToken.howToGet.step3')}</div>
                    <div>4. {t('slack.manualToken.howToGet.step4')}</div>
                  </div>
                </div>

                {/* Links */}
                <ul
                  style={{
                    listStyle: 'disc',
                    paddingLeft: '20px',
                    marginBottom: '16px',
                    fontSize: '12px',
                  }}
                >
                  <li>
                    <button
                      type="button"
                      onClick={() => openExternalUrl('https://cc-wf-studio.com/terms')}
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-textLink-foreground)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {t('slack.oauth.termsOfService')}
                    </button>
                  </li>
                  <li>
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
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        openExternalUrl(
                          'https://github.com/breaking-brake/cc-wf-studio/issues/new/choose'
                        )
                      }
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-textLink-foreground)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      {t('slack.oauth.supportPage')}
                    </button>
                  </li>
                </ul>

                {/* User Token Input */}
                <div style={{ marginBottom: '16px' }}>
                  <label
                    htmlFor="user-token"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      color: 'var(--vscode-foreground)',
                      marginBottom: '8px',
                      fontWeight: 500,
                    }}
                  >
                    {t('slack.manualToken.userToken.label')}
                  </label>
                  <input
                    id="user-token"
                    type="password"
                    value={userToken}
                    onChange={(e) => setUserToken(e.target.value)}
                    placeholder="xoxp-..."
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
                      disabled={loading || !userToken.trim()}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: 'var(--vscode-button-background)',
                        color: 'var(--vscode-button-foreground)',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: loading || !userToken.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        opacity: loading || !userToken.trim() ? 0.5 : 1,
                      }}
                    >
                      {loading ? t('slack.manualToken.connecting') : t('slack.manualToken.connect')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>

      {/* Delete Confirmation Dialog - using ConfirmDialog component with z-index 10001 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('slack.manualToken.deleteConfirm.title')}
        message={t('slack.manualToken.deleteConfirm.message')}
        confirmLabel={t('slack.manualToken.deleteConfirm.confirm')}
        cancelLabel={t('slack.manualToken.deleteConfirm.cancel')}
        onConfirm={handleDeleteToken}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Dialog.Root>
  );
}
