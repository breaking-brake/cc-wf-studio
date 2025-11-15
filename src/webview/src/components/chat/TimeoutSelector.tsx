/**
 * Timeout Selector Component
 *
 * Allows users to select AI refinement timeout duration from preset values
 */

import { useTranslation } from '../../i18n/i18n-context';
import { useRefinementStore } from '../../stores/refinement-store';

const TIMEOUT_PRESETS = [
  { seconds: 30, label: '30s' },
  { seconds: 60, label: '60s' },
  { seconds: 90, label: '90s' },
  { seconds: 120, label: '2min' },
  { seconds: 180, label: '3min' },
  { seconds: 240, label: '4min' },
  { seconds: 300, label: '5min' },
];

export function TimeoutSelector() {
  const { t } = useTranslation();
  const { timeoutSeconds, setTimeoutSeconds, isProcessing } = useRefinementStore();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <label
        htmlFor="timeout-selector"
        style={{
          fontSize: '11px',
          color: 'var(--vscode-foreground)',
          opacity: isProcessing ? 0.5 : 1,
        }}
      >
        {t('refinement.timeout.label')}:
      </label>
      <select
        id="timeout-selector"
        value={timeoutSeconds}
        onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
        disabled={isProcessing}
        style={{
          padding: '2px 4px',
          fontSize: '11px',
          backgroundColor: 'var(--vscode-dropdown-background)',
          color: 'var(--vscode-dropdown-foreground)',
          border: '1px solid var(--vscode-dropdown-border)',
          borderRadius: '2px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          opacity: isProcessing ? 0.5 : 1,
        }}
        aria-label={t('refinement.timeout.ariaLabel')}
      >
        {TIMEOUT_PRESETS.map((preset) => (
          <option key={preset.seconds} value={preset.seconds}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
