/**
 * Claude Code Workflow Studio - Edit In Editor Button Component
 *
 * Button that opens text content in VSCode's native editor for enhanced editing.
 * Feature: Edit in VSCode Editor functionality
 */

import { FileEdit } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { openInEditor } from '../../services/vscode-bridge';

interface EditInEditorButtonProps {
  /** Current text content to edit */
  content: string;
  /** Callback when user saves content in editor */
  onContentUpdated: (newContent: string) => void;
  /** Label for the editor tab (optional) */
  label?: string;
  /** Language mode for syntax highlighting (default: 'markdown') */
  language?: 'markdown' | 'plaintext';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Callback when editing state changes (true = editor is open) */
  onEditingStateChange?: (isEditing: boolean) => void;
  /** Additional CSS styles */
  style?: React.CSSProperties;
}

/**
 * EditInEditorButton Component
 *
 * Opens the provided content in VSCode's native editor, allowing users
 * to leverage their full editor customizations (vim keybindings, themes, etc.)
 */
export function EditInEditorButton({
  content,
  onContentUpdated,
  label,
  language = 'markdown',
  disabled = false,
  onEditingStateChange,
  style,
}: EditInEditorButtonProps) {
  const { t } = useTranslation();
  const [isOpening, setIsOpening] = useState(false);

  // Notify parent when editing state changes
  useEffect(() => {
    onEditingStateChange?.(isOpening);
  }, [isOpening, onEditingStateChange]);

  const handleClick = async () => {
    if (isOpening) return;

    setIsOpening(true);
    try {
      const result = await openInEditor(content, label, language);
      if (result.saved) {
        onContentUpdated(result.content);
      }
    } catch (error) {
      // Error is handled by the extension host, which shows an error message
      console.error('Failed to open editor:', error);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isOpening}
      title={t('editor.openInEditor.tooltip')}
      className="nodrag"
      style={{
        padding: '4px 8px',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        border: '1px solid var(--vscode-button-border)',
        borderRadius: '3px',
        fontSize: '11px',
        cursor: disabled || isOpening ? 'not-allowed' : 'pointer',
        opacity: disabled || isOpening ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...style,
      }}
    >
      <FileEdit size={12} />
      {t('editor.openInEditor')}
    </button>
  );
}
