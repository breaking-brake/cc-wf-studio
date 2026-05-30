/**
 * Claude Code Workflow Studio - AI Generate Button Component
 *
 * Reusable button for AI generation with loading and cancel states.
 * Shows Sparkles icon normally, Loader2 + X when generating.
 */

import { Loader2, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { StyledTooltip } from './StyledTooltip';

interface AiGenerateButtonProps {
  /** Whether AI generation is in progress */
  isGenerating: boolean;
  /** Callback when generate button is clicked */
  onGenerate: () => void;
  /** Callback when cancel button is clicked */
  onCancel: () => void;
  /** Tooltip text for generate button */
  generateTooltip: string;
  /** Tooltip text for cancel button */
  cancelTooltip: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Icon size (default: 14) */
  size?: number;
}

/**
 * AiGenerateButton Component
 *
 * A reusable AI generation trigger button with:
 * - Normal state: Sparkles icon
 * - Generating state: Loader2 (spinning) + X (cancel) icons
 */
export const AiGenerateButton: React.FC<AiGenerateButtonProps> = ({
  isGenerating,
  onGenerate,
  onCancel,
  generateTooltip,
  cancelTooltip,
  disabled = false,
  size = 14,
}) => {
  const buttonStyle: React.CSSProperties = {
    padding: '2px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    opacity: disabled ? 0.6 : 1,
  };

  const iconStyle: React.CSSProperties = {
    color: 'var(--vscode-foreground)',
  };

  const loaderStyle: React.CSSProperties = {
    color: 'var(--vscode-foreground)',
    animation: 'spin 1s linear infinite',
  };

  if (isGenerating) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Loader2 size={size} style={loaderStyle} />
        <StyledTooltip content={cancelTooltip}>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            aria-label={cancelTooltip}
            style={buttonStyle}
          >
            <X size={size} style={iconStyle} />
          </button>
        </StyledTooltip>
      </div>
    );
  }

  return (
    <StyledTooltip content={generateTooltip}>
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        aria-label={generateTooltip}
        style={buttonStyle}
      >
        <Sparkles size={size} style={iconStyle} />
      </button>
    </StyledTooltip>
  );
};
