/**
 * TermsOfUseDialog Component
 *
 * Terms of Use dialog for first-time users
 */

import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';

interface TermsOfUseDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * Terms of Use Dialog Component
 */
export const TermsOfUseDialog: React.FC<TermsOfUseDialogProps> = ({
  isOpen,
  onAccept,
  onCancel,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [agreed, setAgreed] = useState(false);

  // ダイアログが開いたときに自動的にフォーカス
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // ダイアログが閉じたときに状態をリセット
  useEffect(() => {
    if (!isOpen) {
      setAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onCancel();
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
          padding: '32px',
          minWidth: '500px',
          maxWidth: '600px',
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
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '20px',
          }}
        >
          {t('terms.title')}
        </div>

        {/* Content */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '24px',
            lineHeight: '1.6',
          }}
        >
          {/* Introduction */}
          <p style={{ marginBottom: '16px' }}>{t('terms.introduction')}</p>

          {/* Prohibited Uses */}
          <p style={{ marginBottom: '8px', fontWeight: 500 }}>{t('terms.prohibitedUse')}</p>
          <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
            <li style={{ marginBottom: '4px' }}>{t('terms.cyberAttack')}</li>
            <li style={{ marginBottom: '4px' }}>{t('terms.malware')}</li>
            <li style={{ marginBottom: '4px' }}>{t('terms.personalDataTheft')}</li>
            <li style={{ marginBottom: '4px' }}>{t('terms.otherIllegalActs')}</li>
          </ul>

          {/* Liability */}
          <p style={{ marginBottom: '16px', fontWeight: 500 }}>{t('terms.liability')}</p>
        </div>

        {/* Checkbox */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setAgreed(!agreed)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setAgreed(!agreed);
            }
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginRight: '8px',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: '13px',
              color: 'var(--vscode-foreground)',
            }}
          >
            {t('terms.agree')}
          </span>
        </div>

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
            onClick={onCancel}
            style={{
              padding: '8px 20px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--vscode-button-secondaryHoverBackground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
            }}
          >
            {t('terms.cancelButton')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={!agreed}
            style={{
              padding: '8px 20px',
              backgroundColor: agreed
                ? 'var(--vscode-button-background)'
                : 'var(--vscode-button-secondaryBackground)',
              color: agreed
                ? 'var(--vscode-button-foreground)'
                : 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: agreed ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              fontWeight: 500,
              opacity: agreed ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (agreed) {
                e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
              }
            }}
            onMouseLeave={(e) => {
              if (agreed) {
                e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
              }
            }}
          >
            {t('terms.agreeButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUseDialog;
