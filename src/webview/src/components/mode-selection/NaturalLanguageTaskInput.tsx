/**
 * Natural Language Task Input Component
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Text area for entering task description in Full Natural Language Mode
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T014
 */

import { useTranslation } from '../../i18n/i18n-context';

interface NaturalLanguageTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  showValidation?: boolean;
}

export function NaturalLanguageTaskInput({
  value,
  onChange,
  showValidation = false,
}: NaturalLanguageTaskInputProps) {
  const { t } = useTranslation();

  const charCount = value.length;
  const isValid = charCount > 0;
  const showError = showValidation && !isValid;

  return (
    <div>
      {/* Label */}
      <label
        htmlFor="nl-task-input"
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: 'var(--vscode-foreground)',
        }}
      >
        {t('mcp.naturalLanguage.taskDescription.label')}
      </label>

      {/* Text Area */}
      <textarea
        id="nl-task-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('mcp.naturalLanguage.taskDescription.placeholder')}
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
          {t('mcp.error.taskDescRequired')}
        </div>
      )}
    </div>
  );
}
