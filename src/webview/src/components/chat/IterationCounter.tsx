/**
 * Iteration Counter Component
 *
 * Displays current iteration count.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Removed hard limit - warning now shown separately via WarningBanner
 */

import { useTranslation } from '../../i18n/i18n-context';
import { useRefinementStore } from '../../stores/refinement-store';

export function IterationCounter() {
  const { t } = useTranslation();
  const { conversationHistory } = useRefinementStore();

  if (!conversationHistory) {
    return null;
  }

  const { currentIteration } = conversationHistory;

  return (
    <div
      style={{
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
      }}
      title={t('refinement.iterationCounter.tooltip')}
    >
      {t('refinement.iterationCounter', {
        current: currentIteration,
      })}
    </div>
  );
}
