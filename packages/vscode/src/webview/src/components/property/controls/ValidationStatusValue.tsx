/**
 * Read-only validation-status rendering (icon + localized label), shared by
 * the Skill and MCP summary panels.
 */

import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import type { ControlProps } from '../types';

type Status = 'valid' | 'missing' | 'invalid';

const ICONS: Record<Status, string> = { valid: '✓', missing: '⚠', invalid: '✗' };
const COLORS: Record<Status, string> = {
  valid: 'var(--vscode-testing-iconPassed)',
  missing: 'var(--vscode-editorWarning-foreground)',
  invalid: 'var(--vscode-errorForeground)',
};

export const ValidationStatusValue: React.FC<ControlProps> = ({ value }) => {
  const { t } = useTranslation();
  const status: Status = value === 'valid' || value === 'missing' ? value : 'invalid';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
      <span
        aria-hidden="true"
        style={{ fontSize: '16px', color: COLORS[status], fontWeight: 'bold' }}
      >
        {ICONS[status]}
      </span>
      <span style={{ color: 'var(--vscode-foreground)' }}>
        {status === 'valid'
          ? t('property.validationStatus.valid')
          : status === 'missing'
            ? t('property.validationStatus.missing')
            : t('property.validationStatus.invalid')}
      </span>
    </div>
  );
};
