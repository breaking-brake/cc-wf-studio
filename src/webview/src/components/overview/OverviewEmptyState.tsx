/**
 * Empty state shown in Overview mode when the workflow has no instructional nodes
 * (only Start and End, or nothing at all).
 */

import { FileText } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../../i18n/i18n-context';

export const OverviewEmptyState: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '32px',
        textAlign: 'center',
        color: 'var(--vscode-descriptionForeground)',
      }}
    >
      <FileText size={48} strokeWidth={1.2} style={{ marginBottom: '16px', opacity: 0.6 }} />
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--vscode-foreground)',
        }}
      >
        {t('overview.emptyState.title')}
      </h3>
      <p style={{ margin: 0, fontSize: '12px', maxWidth: '320px', lineHeight: 1.5 }}>
        {t('overview.emptyState.description')}
      </p>
    </div>
  );
};
