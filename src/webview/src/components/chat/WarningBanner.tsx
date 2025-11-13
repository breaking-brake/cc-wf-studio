/**
 * Warning Banner Component
 *
 * Displays a warning message when iteration count reaches 20 or more.
 * Based on: /specs/001-ai-workflow-refinement/spec.md FR-011
 */

import { useTranslation } from '../../i18n/i18n-context';

export function WarningBanner() {
  const { t } = useTranslation();

  return (
    <div
      style={{
        padding: '12px 16px',
        margin: '0 16px 12px 16px',
        borderRadius: '6px',
        backgroundColor: 'var(--vscode-inputValidation-warningBackground)',
        border: '1px solid var(--vscode-inputValidation-warningBorder)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
      }}
    >
      {/* Warning Icon */}
      <div
        style={{
          flexShrink: 0,
          width: '16px',
          height: '16px',
          marginTop: '2px',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Warning"
        >
          <title>Warning</title>
          <path
            d="M8 1L1 14H15L8 1Z"
            stroke="var(--vscode-inputValidation-warningForeground)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M8 6V9"
            stroke="var(--vscode-inputValidation-warningForeground)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle
            cx="8"
            cy="11.5"
            r="0.75"
            fill="var(--vscode-inputValidation-warningForeground)"
          />
        </svg>
      </div>

      {/* Warning Message */}
      <div
        style={{
          flex: 1,
          fontSize: '13px',
          lineHeight: '1.5',
          color: 'var(--vscode-inputValidation-warningForeground)',
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>{t('refinement.warning.title')}</div>
        <div style={{ opacity: 0.9 }}>{t('refinement.warning.message')}</div>
      </div>
    </div>
  );
}
