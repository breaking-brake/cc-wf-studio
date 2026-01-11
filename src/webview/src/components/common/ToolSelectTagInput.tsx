/**
 * ToolSelectTagInput Component
 *
 * A React-Select style tool selection component for Hooks configuration.
 * Tags and input are in the same container, typing filters the dropdown.
 * Used for matcher patterns in Hooks configuration (e.g., "Bash", "Edit", "Write").
 */

import * as Popover from '@radix-ui/react-popover';
import { Check, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { HOOKS_MATCHER_TOOLS } from '../../stores/refinement-store';

interface ToolSelectTagInputProps {
  /** Selected tools array */
  selectedTools: string[];
  /** Callback when tools change */
  onChange: (tools: string[]) => void;
  /** Disable the input */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * ToolSelectTagInput - React-Select style tool selector
 *
 * Features:
 * - Tags and input in the same container
 * - Click anywhere to focus input
 * - Type to filter and open dropdown
 * - Click outside or Esc to close
 */
export function ToolSelectTagInput({
  selectedTools,
  onChange,
  disabled = false,
  className,
}: ToolSelectTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTools = HOOKS_MATCHER_TOOLS.filter(
    (tool) => tool.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTools.includes(tool)
  );

  const handleToggleTool = useCallback(
    (tool: string) => {
      if (selectedTools.includes(tool)) {
        onChange(selectedTools.filter((t) => t !== tool));
      } else {
        onChange([...selectedTools, tool]);
        setInputValue('');
      }
    },
    [selectedTools, onChange]
  );

  const handleRemoveTag = useCallback(
    (tool: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(selectedTools.filter((t) => t !== tool));
    },
    [selectedTools, onChange]
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
      // Skip if IME is composing (e.g., Japanese/Chinese/Korean input)
      if (e.nativeEvent.isComposing) {
        return;
      }

      // Stop arrow key propagation to prevent parent menu navigation
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
        e.stopPropagation();
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlightedIndex(0);
        inputRef.current?.blur();
      } else if (e.key === 'Backspace' && inputValue === '' && selectedTools.length > 0) {
        // Remove last tag when backspace on empty input
        onChange(selectedTools.slice(0, -1));
      } else if (e.key === 'Tab' && filteredTools.length > 0) {
        // Tab/Shift+Tab navigates through options
        e.preventDefault();
        setIsOpen(true);
        if (e.shiftKey) {
          setHighlightedIndex((prev) => (prev - 1 + filteredTools.length) % filteredTools.length);
        } else {
          setHighlightedIndex((prev) => (prev + 1) % filteredTools.length);
        }
      } else if (e.key === 'ArrowDown' && filteredTools.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev + 1) % filteredTools.length);
      } else if (e.key === 'ArrowUp' && filteredTools.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => (prev - 1 + filteredTools.length) % filteredTools.length);
      } else if (e.key === 'Enter' && filteredTools.length > 0 && isOpen) {
        // Enter confirms the highlighted option
        e.preventDefault();
        handleToggleTool(filteredTools[highlightedIndex]);
        setHighlightedIndex(0);
      }
    },
    [inputValue, selectedTools, onChange, filteredTools, handleToggleTool, isOpen, highlightedIndex]
  );

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Anchor asChild>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Input inside handles keyboard */}
        <div
          className={className}
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
          {/* Selected Tags */}
          {selectedTools.map((tool) => (
            <span
              key={tool}
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
              {tool}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveTag(tool, e)}
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
                  aria-label={`Remove ${tool}`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}

          {/* Input Field */}
          {!disabled && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={selectedTools.length === 0 ? 'Select tools...' : ''}
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
          {filteredTools.length > 0 ? (
            filteredTools.map((tool, index) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: Mouse-only dropdown item
              <div
                key={tool}
                onClick={() => {
                  handleToggleTool(tool);
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
                  {selectedTools.includes(tool) && <Check size={12} />}
                </div>
                <span style={{ fontFamily: 'monospace' }}>{tool}</span>
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
              {inputValue ? 'No matching tools' : 'All tools selected'}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
