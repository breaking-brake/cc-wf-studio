/**
 * Iteration Counter Component
 *
 * Displays current iteration count and warns when approaching limit.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 */

import { useTranslation } from '../../i18n/i18n-context';
import { useRefinementStore } from '../../stores/refinement-store';

export function IterationCounter() {
  const { t } = useTranslation();
  const { conversationHistory, isApproachingLimit } = useRefinementStore();

  if (!conversationHistory) {
    return null;
  }

  const { currentIteration, maxIterations } = conversationHistory;
  const isApproaching = isApproachingLimit();
  const isAtLimit = currentIteration >= maxIterations;

  return (
    <div
      style={{
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: isAtLimit
          ? 'var(--vscode-errorBackground)'
          : isApproaching
            ? 'var(--vscode-warningBackground)'
            : 'var(--vscode-badge-background)',
        color: isAtLimit
          ? 'var(--vscode-errorForeground)'
          : isApproaching
            ? 'var(--vscode-warningForeground)'
            : 'var(--vscode-badge-foreground)',
      }}
      title={
        isAtLimit
          ? t('refinement.limitReached')
          : isApproaching
            ? t('refinement.approachingLimit')
            : undefined
      }
    >
      {t('refinement.iterationCounter', {
        current: currentIteration,
        max: maxIterations,
      })}
    </div>
  );
}
