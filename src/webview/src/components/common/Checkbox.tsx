/**
 * Checkbox Component
 *
 * VSCode theme-compatible checkbox component.
 * Uses VSCode color variables for consistent styling across themes.
 */

import type React from 'react';

interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Callback when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Whether the checkbox is disabled */
  disabled?: boolean;
  /** Label text to display next to the checkbox */
  label?: string;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
}

/**
 * VSCode-styled Checkbox Component
 *
 * Provides a custom checkbox that matches VSCode's theme colors.
 * Uses CSS variables for theme compatibility (light/dark modes).
 */
export function Checkbox({ checked, onChange, disabled = false, label, ariaLabel }: CheckboxProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: '11px',
        color: 'var(--vscode-foreground)',
        userSelect: 'none',
      }}
    >
      <div
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '3px',
          border: `1px solid ${
            disabled
              ? 'var(--vscode-input-border)'
              : checked
                ? 'var(--vscode-focusBorder)'
                : 'var(--vscode-input-border)'
          }`,
          backgroundColor: checked
            ? 'var(--vscode-inputOption-activeBackground)'
            : 'var(--vscode-input-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              color: 'var(--vscode-inputOption-activeForeground)',
            }}
            aria-hidden="true"
          >
            <title>Checkmark</title>
            <path
              d="M2 6L5 9L10 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && <span>{label}</span>}
    </div>
  );
}
