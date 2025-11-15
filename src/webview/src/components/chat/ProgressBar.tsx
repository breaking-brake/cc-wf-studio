/**
 * Progress Bar Component
 *
 * Reusable progress bar for AI processing indication.
 * Used in message bubbles during AI refinement.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md Phase 3.7 (T074)
 */

import { useEffect, useState } from 'react';

interface ProgressBarProps {
  /** Show progress bar */
  isProcessing: boolean;
  /** Label text above progress bar (optional) */
  label?: string;
  /** Maximum processing time in seconds (from timeout setting) */
  maxSeconds: number;
}

export function ProgressBar({ isProcessing, label, maxSeconds }: ProgressBarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Progress timer - same logic as MessageInput
  useEffect(() => {
    if (!isProcessing) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= maxSeconds) {
          return maxSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, maxSeconds]);

  if (!isProcessing) {
    return null;
  }

  // Calculate progress percentage with ease-out function (max 95%)
  const normalizedTime = elapsedSeconds / maxSeconds;
  const easedProgress = 1 - (1 - normalizedTime) ** 2;
  const progressPercentage = Math.min(Math.round(easedProgress * 95), 95);

  return (
    <div
      style={{
        marginTop: '8px',
      }}
    >
      {label && (
        <div
          style={{
            marginBottom: '6px',
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            fontStyle: 'italic',
          }}
        >
          {label}
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'var(--vscode-editor-background)',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '4px',
          border: '1px solid var(--vscode-panel-border)',
        }}
      >
        <div
          style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: 'var(--vscode-progressBar-background)',
            transition: 'width 0.5s ease-out',
          }}
        />
      </div>

      {/* Progress text */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--vscode-descriptionForeground)',
          opacity: 0.7,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{progressPercentage}%</span>
        <span>
          {elapsedSeconds}s / {maxSeconds}s
        </span>
      </div>
    </div>
  );
}
