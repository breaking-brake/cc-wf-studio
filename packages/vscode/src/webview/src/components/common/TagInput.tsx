/**
 * TagInput Component
 *
 * A reusable tag input component for entering multiple values as tags.
 * Enter to add a tag, × to remove, Backspace to remove the last tag when input is empty.
 * Used for matcher patterns in Hooks configuration (e.g., "Bash", "Edit", "Write").
 */

import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface TagInputProps {
  /** Current tags array */
  tags: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Add nodrag class for React Flow compatibility */
  className?: string;
}

/**
 * TagInput - A tag-based input component
 *
 * Features:
 * - Enter to add a new tag
 * - × button to remove individual tags
 * - Backspace to remove last tag when input is empty
 * - IME composition support (Japanese/Chinese/Korean input)
 * - Duplicate prevention
 * - Whitespace trimming
 */
export function TagInput({
  tags,
  onChange,
  placeholder = 'Type and press Enter',
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Prevent duplicates
    if (tags.includes(trimmed)) {
      setInputValue('');
      return;
    }

    onChange([...tags, trimmed]);
    setInputValue('');
  }, [inputValue, tags, onChange]);

  const handleRemoveTag = useCallback(
    (indexToRemove: number) => {
      onChange(tags.filter((_, index) => index !== indexToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Stop arrow key propagation to prevent parent menu navigation
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.stopPropagation();
        return;
      }

      // Skip if IME is composing
      if (e.nativeEvent.isComposing) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        // Remove last tag when input is empty
        handleRemoveTag(tags.length - 1);
      }
    },
    [handleAddTag, handleRemoveTag, inputValue, tags.length]
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 4px',
        minHeight: '24px',
        backgroundColor: 'var(--vscode-input-background)',
        border: '1px solid var(--vscode-input-border)',
        borderRadius: '2px',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Tags */}
      {tags.map((tag, index) => (
        <span
          key={tag}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '1px 6px',
            backgroundColor: 'var(--vscode-badge-background)',
            color: 'var(--vscode-badge-foreground)',
            borderRadius: '10px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemoveTag(index);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                marginLeft: '2px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--vscode-badge-foreground)',
                opacity: 0.7,
                transition: 'opacity 100ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              aria-label={`Remove ${tag}`}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {/* Input field */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: '60px',
          padding: '2px 4px',
          backgroundColor: 'transparent',
          color: 'var(--vscode-input-foreground)',
          border: 'none',
          outline: 'none',
          fontSize: '11px',
          fontFamily: 'monospace',
        }}
      />
    </div>
  );
}
