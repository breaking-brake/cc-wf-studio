/**
 * EditableNameField Component
 *
 * A reusable component for displaying and editing names with ellipsis truncation.
 * Click to edit, with optional AI generation button.
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AiGenerateButton } from './AiGenerateButton';

interface EditableNameFieldProps {
  /** Current value of the name */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Placeholder text when value is empty */
  placeholder: string;
  /** Whether the field is disabled (e.g., during AI generation) */
  disabled?: boolean;
  /** Validation error message (if any) */
  error?: string | null;
  /** AI generation props (optional) */
  aiGeneration?: {
    isGenerating: boolean;
    onGenerate: () => void;
    onCancel: () => void;
    generateTooltip: string;
    cancelTooltip: string;
  };
  /** Minimum width for the field */
  minWidth?: string;
  /** data-tour attribute for guided tours */
  dataTour?: string;
}

export const EditableNameField: React.FC<EditableNameFieldProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  error = null,
  aiGeneration,
  minWidth = '120px',
  dataTour,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = useCallback(() => {
    if (!disabled) {
      setIsEditing(true);
    }
  }, [disabled]);

  const handleFinishEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only stop propagation for Enter/Escape to prevent parent handlers
    // Allow other keys (like Ctrl+C/V) to work normally
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.stopPropagation();
      setIsEditing(false);
    }
  }, []);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const borderColor = error
    ? '1px solid var(--vscode-inputValidation-errorBorder)'
    : '1px solid var(--vscode-input-border)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth }}>
      <div style={{ position: 'relative' }}>
        {isEditing ? (
          // Edit mode: Show input field
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="nodrag"
            data-tour={dataTour}
            style={{
              width: '100%',
              padding: '4px 44px 4px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: borderColor,
              borderRadius: '2px',
              fontSize: '13px',
              opacity: disabled ? 0.7 : 1,
              boxSizing: 'border-box',
            }}
          />
        ) : (
          // Display mode: Show text with ellipsis
          <div
            onClick={handleStartEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleStartEditing();
              }
            }}
            role="button"
            tabIndex={0}
            data-tour={dataTour}
            style={{
              width: '100%',
              padding: '4px 44px 4px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: value
                ? 'var(--vscode-input-foreground)'
                : 'var(--vscode-input-placeholderForeground)',
              border: borderColor,
              borderRadius: '2px',
              fontSize: '13px',
              opacity: disabled ? 0.7 : 1,
              boxSizing: 'border-box',
              cursor: disabled ? 'not-allowed' : 'text',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value || placeholder}
          </div>
        )}
        {/* AI Generate / Cancel Button (positioned inside input/display) */}
        {aiGeneration && (
          <div
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <AiGenerateButton
              isGenerating={aiGeneration.isGenerating}
              onGenerate={aiGeneration.onGenerate}
              onCancel={aiGeneration.onCancel}
              generateTooltip={aiGeneration.generateTooltip}
              cancelTooltip={aiGeneration.cancelTooltip}
            />
          </div>
        )}
      </div>
      {error && (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--vscode-inputValidation-errorForeground)',
            marginTop: '4px',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};
