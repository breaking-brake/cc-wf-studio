/**
 * Toggle Component
 *
 * A reusable toggle switch component based on radix-ui with OFF/ON labels
 * displayed in the switch background (iOS-style design).
 */

import * as Switch from '@radix-ui/react-switch';
import type React from 'react';

export interface ToggleProps {
  /** Toggle state */
  checked: boolean;
  /** Callback when state changes */
  onChange: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Label for OFF state (default: "OFF") */
  offLabel?: string;
  /** Label for ON state (default: "ON") */
  onLabel?: string;
  /** Accessibility label */
  ariaLabel?: string;
  /** Size variant (default: "medium") */
  size?: 'small' | 'medium';
}

/**
 * Toggle Component
 *
 * A switch with OFF/ON labels displayed in the background.
 * The thumb slides to indicate the current state.
 */
export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  offLabel = 'OFF',
  onLabel = 'ON',
  ariaLabel,
  size = 'medium',
}) => {
  // Size-based dimensions
  const dimensions =
    size === 'small'
      ? { width: 54, height: 26, thumbSize: 18, fontSize: 10, padding: 4 }
      : { width: 64, height: 30, thumbSize: 22, fontSize: 11, padding: 4 };

  const thumbOffset = dimensions.padding;
  const thumbTravel = dimensions.width - dimensions.thumbSize - dimensions.padding * 2;

  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        all: 'unset',
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        // ON: green (testing passed icon color), OFF: muted gray
        backgroundColor: checked
          ? 'var(--vscode-testing-iconPassed)'
          : 'var(--vscode-titleBar-inactiveBackground)',
        borderRadius: `${dimensions.height / 2}px`,
        position: 'relative',
        border: checked ? 'none' : '1px solid var(--vscode-input-border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        boxSizing: 'border-box',
        transition: 'background-color 100ms',
      }}
    >
      {/* Label on opposite side of thumb */}
      <span
        style={{
          position: 'absolute',
          // OFF: thumb is left, so label on right / ON: thumb is right, so label on left
          left: checked ? `${dimensions.padding + 4}px` : 'auto',
          right: checked ? 'auto' : `${dimensions.padding + 4}px`,
          fontSize: `${dimensions.fontSize}px`,
          fontWeight: 600,
          // ON: white text on green / OFF: dark text on gray for light theme compatibility
          color: checked ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
          pointerEvents: 'none',
          transition: 'left 100ms, right 100ms, color 100ms',
          userSelect: 'none',
          zIndex: 0,
        }}
      >
        {checked ? onLabel : offLabel}
      </span>

      {/* Thumb (slider) */}
      <Switch.Thumb
        style={{
          all: 'unset',
          display: 'block',
          position: 'absolute',
          width: `${dimensions.thumbSize}px`,
          height: `${dimensions.thumbSize}px`,
          // ON: editor background on green / OFF: input background on gray for contrast
          backgroundColor: checked
            ? 'var(--vscode-editor-background)'
            : 'var(--vscode-input-background)',
          borderRadius: '50%',
          border: '1px solid var(--vscode-input-border)',
          transition: 'transform 100ms, background-color 100ms',
          transform: checked ? `translateX(${thumbTravel}px)` : `translateX(${thumbOffset}px)`,
          willChange: 'transform',
          left: 0,
          zIndex: 1,
          boxSizing: 'border-box',
        }}
      />
    </Switch.Root>
  );
};

export default Toggle;
