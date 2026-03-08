/**
 * SelectTagInput Component
 *
 * A generic React-Select style multi-selection component.
 * Tags and input are in the same container, typing filters the dropdown.
 * Reusable for any list of options (skills, tools, etc.).
 */

import * as Popover from '@radix-ui/react-popover';
import { Check, Lock, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectTagInputProps {
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  lockedValues?: string[];
}

export function SelectTagInput({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  lockedValues = [],
}: SelectTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedValues.includes(opt.value)
  );

  const handleToggle = useCallback(
    (value: string) => {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((v) => v !== value));
      } else {
        onChange([...selectedValues, value]);
        setInputValue('');
      }
    },
    [selectedValues, onChange]
  );

  const handleRemoveTag = useCallback(
    (value: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (lockedValues.includes(value)) return;
      onChange(selectedValues.filter((v) => v !== value));
    },
    [selectedValues, onChange, lockedValues]
  );

  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
      setIsOpen(true);
    }
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHighlightedIndex(0);
    setIsOpen(true);
  }, []);

  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
        e.stopPropagation();
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlightedIndex(0);
        inputRef.current?.blur();
      } else if (e.key === 'Backspace' && inputValue === '' && selectedValues.length > 0) {
        // Find the last non-locked value to remove
        const lastRemovable = [...selectedValues].reverse().find((v) => !lockedValues.includes(v));
        if (lastRemovable) {
          onChange(selectedValues.filter((v) => v !== lastRemovable));
        }
      } else if (e.key === 'Tab' && filteredOptions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        if (e.shiftKey) {
          setHighlightedIndex(
            (prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length
          );
        } else {
          setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        }
      } else if (e.key === 'ArrowDown' && filteredOptions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      } else if (e.key === 'ArrowUp' && filteredOptions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      } else if (e.key === 'Enter' && filteredOptions.length > 0 && isOpen) {
        e.preventDefault();
        handleToggle(filteredOptions[highlightedIndex].value);
        setHighlightedIndex(0);
      }
    },
    [
      inputValue,
      selectedValues,
      onChange,
      filteredOptions,
      handleToggle,
      isOpen,
      highlightedIndex,
      lockedValues,
    ]
  );

  const getLabel = useCallback(
    (value: string) => options.find((o) => o.value === value)?.label ?? value,
    [options]
  );

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Anchor asChild>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Input inside handles keyboard */}
        <div
          onClick={handleContainerClick}
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
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {selectedValues.map((value) => {
            const isLocked = lockedValues.includes(value);
            return (
              <span
                key={value}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '1px 6px',
                  backgroundColor: 'var(--vscode-badge-background)',
                  color: 'var(--vscode-badge-foreground)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  whiteSpace: 'nowrap',
                }}
              >
                {getLabel(value)}
                {!disabled && !isLocked && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTag(value, e)}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
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
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                    }}
                    aria-label={`Remove ${getLabel(value)}`}
                  >
                    <X size={12} />
                  </button>
                )}
                {isLocked && (
                  <Lock
                    size={10}
                    style={{ marginLeft: '2px', opacity: 0.6 }}
                    aria-label="Required"
                  />
                )}
              </span>
            );
          })}

          {!disabled && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={selectedValues.length === 0 ? placeholder : ''}
              style={{
                flex: 1,
                minWidth: '60px',
                padding: '2px 4px',
                backgroundColor: 'transparent',
                color: 'var(--vscode-input-foreground)',
                border: 'none',
                outline: 'none',
                fontSize: '11px',
              }}
            />
          )}
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          onPointerDownOutside={() => setIsOpen(false)}
          onEscapeKeyDown={() => setIsOpen(false)}
          style={{
            backgroundColor: 'var(--vscode-dropdown-background)',
            border: '1px solid var(--vscode-dropdown-border)',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 10002,
            minWidth: '150px',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: Mouse-only dropdown item
              <div
                key={opt.value}
                onClick={() => {
                  handleToggle(opt.value);
                  setHighlightedIndex(0);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  color: 'var(--vscode-foreground)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '2px',
                  backgroundColor:
                    index === highlightedIndex
                      ? 'var(--vscode-list-activeSelectionBackground)'
                      : 'transparent',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedValues.includes(opt.value) && <Check size={12} />}
                </div>
                <span>{opt.label}</span>
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '8px 12px',
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
                textAlign: 'center',
              }}
            >
              {inputValue ? 'No matching items' : 'All items selected'}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
