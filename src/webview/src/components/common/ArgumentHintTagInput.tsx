/**
 * ArgumentHintInput Component
 *
 * A simple text input for configuring Slash Command argument hints.
 * Includes an example with explanation to help users understand the syntax.
 *
 * Example syntax: add [tagId] | remove [tagId] | list
 */

import { memo } from 'react';
import { useTranslation } from '../../i18n/i18n-context';

/**
 * Stop arrow key propagation to prevent Radix UI menu navigation
 */
const stopArrowKeyPropagation = (e: React.KeyboardEvent) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.stopPropagation();
  }
};

interface ArgumentHintInputProps {
  /** Current argument hint value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Disable the input */
  disabled?: boolean;
}

export const ArgumentHintTagInput = memo(function ArgumentHintInput({
  value,
  onChange,
  disabled = false,
}: ArgumentHintInputProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        backgroundColor: 'var(--vscode-editor-background)',
        borderRadius: '4px',
        minWidth: '320px',
      }}
    >
      {/* Text Input */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={stopArrowKeyPropagation}
        placeholder="add [tagId] | remove [tagId] | list"
        disabled={disabled}
        style={{
          padding: '6px 8px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '2px',
          fontSize: '12px',
          fontFamily: 'monospace',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      />

      {/* Example Hint */}
      <div
        style={{
          fontSize: '11px',
        }}
      >
        <div
          style={{
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '6px',
          }}
        >
          {t('argumentHint.example')}
        </div>
        <span
          style={{
            display: 'block',
            fontFamily: 'monospace',
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
          }}
        >
          add [tagId] | remove [tagId] | list
        </span>
        <div
          style={{
            color: 'var(--vscode-descriptionForeground)',
            lineHeight: '1.5',
          }}
        >
          <div>
            → <span style={{ fontFamily: 'monospace' }}>/command add myTag123</span> ...{' '}
            {t('argumentHint.exampleAdd')}
          </div>
          <div>
            → <span style={{ fontFamily: 'monospace' }}>/command remove myTag123</span> ...{' '}
            {t('argumentHint.exampleRemove')}
          </div>
          <div>
            → <span style={{ fontFamily: 'monospace' }}>/command list</span> ...{' '}
            {t('argumentHint.exampleList')}
          </div>
        </div>
      </div>
    </div>
  );
});
