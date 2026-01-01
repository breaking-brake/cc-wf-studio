/**
 * AI Tool Selection Input Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Text area for entering task description in AI Tool Selection Mode
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T014, T047
 */

import { useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';
import {
  useDebouncedValidation,
  validateTaskDescription,
} from '../../utils/natural-language-validator';
import { EditInEditorButton } from '../common/EditInEditorButton';

interface AiToolSelectionInputProps {
  value: string;
  onChange: (value: string) => void;
  showValidation?: boolean;
}

/**
 * AI Tool Selection Input Component
 *
 * Text area input for entering natural language task description
 * when using AI Tool Selection Mode.
 *
 * Includes real-time validation with debouncing (300ms delay).
 * Validation: Required input (≥1 character after trim).
 *
 * @param props - Component props
 * @param props.value - Current task description value
 * @param props.onChange - Callback when value changes
 * @param props.showValidation - Whether to show validation errors (default: false)
 */
export function AiToolSelectionInput({
  value,
  onChange,
  showValidation = false,
}: AiToolSelectionInputProps) {
  const { t } = useTranslation();
  const [isEditingInEditor, setIsEditingInEditor] = useState(false);

  // Real-time debounced validation (300ms delay)
  const debouncedError = useDebouncedValidation(value, validateTaskDescription, 300);

  // Determine if error should be shown
  const showError = showValidation && debouncedError !== null;
  const errorMessage = debouncedError ? t(debouncedError as keyof WebviewTranslationKeys) : '';

  return (
    <div>
      {/* Label with Edit in Editor button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <label
          htmlFor="nl-task-input"
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('mcp.naturalLanguage.taskDescription.label')}
        </label>
        <EditInEditorButton
          content={value}
          onContentUpdated={onChange}
          label={t('mcp.naturalLanguage.taskDescription.label')}
          language="plaintext"
          onEditingStateChange={setIsEditingInEditor}
        />
      </div>

      {/* Text Area */}
      <textarea
        id="nl-task-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('mcp.naturalLanguage.taskDescription.placeholder')}
        readOnly={isEditingInEditor}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '12px',
          fontSize: '13px',
          fontFamily: 'var(--vscode-font-family)',
          color: 'var(--vscode-input-foreground)',
          backgroundColor: 'var(--vscode-input-background)',
          border: `1px solid ${
            showError ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'
          }`,
          borderRadius: '4px',
          resize: 'vertical',
          outline: 'none',
          opacity: isEditingInEditor ? 0.5 : 1,
          cursor: isEditingInEditor ? 'not-allowed' : 'text',
        }}
        onFocus={(e) => {
          if (!showError) {
            e.currentTarget.style.borderColor = 'var(--vscode-focusBorder)';
          }
        }}
        onBlur={(e) => {
          if (!showError) {
            e.currentTarget.style.borderColor = 'var(--vscode-input-border)';
          }
        }}
      />

      {/* Error Message */}
      {showError && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: 'var(--vscode-errorForeground)',
            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
            border: '1px solid var(--vscode-inputValidation-errorBorder)',
            borderRadius: '4px',
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
