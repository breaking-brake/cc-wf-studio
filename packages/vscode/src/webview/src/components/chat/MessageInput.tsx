/**
 * Message Input Component
 *
 * Text input area with send button and character counter for refinement requests.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.2 - Added progress bar during processing
 * Updated: Phase 3.7 - Removed progress bar (moved to message bubble)
 * Updated: Controlled Component - Accept input state from props
 * Updated: Added "Edit in Editor" button for VSCode native editing
 */

import type React from 'react';
import { useId, useState } from 'react';
import { useResponsiveFonts } from '../../contexts/ResponsiveFontContext';
import { useTranslation } from '../../i18n/i18n-context';
import { cancelWorkflowRefinement } from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { EditInEditorButton } from '../common/EditInEditorButton';

const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 1;

/** Input state props for controlled mode */
interface InputStateProps {
  currentInput: string;
  setInput: (input: string) => void;
  isProcessing: boolean;
  currentRequestId: string | null;
  canSend: () => boolean;
}

interface MessageInputProps {
  onSend: (message: string) => void;
  /** Input state (controlled mode). If provided, uses this instead of store. */
  inputState?: InputStateProps;
}

export function MessageInput({ onSend, inputState }: MessageInputProps) {
  const { t } = useTranslation();
  const textareaId = useId();
  const fontSizes = useResponsiveFonts();
  const storeState = useRefinementStore();
  const [isEditingInEditor, setIsEditingInEditor] = useState(false);

  // Use props if provided (controlled mode), otherwise use store (uncontrolled mode)
  const currentInput = inputState?.currentInput ?? storeState.currentInput;
  const setInput = inputState?.setInput ?? storeState.setInput;
  const isProcessing = inputState?.isProcessing ?? storeState.isProcessing;
  const currentRequestId = inputState?.currentRequestId ?? storeState.currentRequestId;
  const canSend = inputState?.canSend ?? storeState.canSend;

  const handleSend = () => {
    if (canSend()) {
      onSend(currentInput);
    }
  };

  const handleCancel = () => {
    if (isProcessing && currentRequestId) {
      // Send cancellation request to Extension Host
      cancelWorkflowRefinement(currentRequestId);
      // UI will update when REFINEMENT_CANCELLED message is received
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const isTooLong = currentInput.length > MAX_MESSAGE_LENGTH;
  const isTooShort = currentInput.trim().length < MIN_MESSAGE_LENGTH;

  return (
    <div
      style={{
        borderTop: '1px solid var(--vscode-panel-border)',
        padding: '16px',
      }}
    >
      <textarea
        id={textareaId}
        value={currentInput}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('refinement.inputPlaceholder')}
        disabled={isProcessing}
        readOnly={isEditingInEditor}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '8px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: `1px solid var(--vscode-input-border)`,
          borderRadius: '4px',
          fontSize: `${fontSizes.base}px`,
          fontFamily: 'var(--vscode-font-family)',
          resize: 'vertical',
          opacity: isEditingInEditor ? 0.5 : 1,
          cursor: isEditingInEditor ? 'not-allowed' : 'text',
        }}
        aria-label={t('refinement.inputPlaceholder')}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}
      >
        {/* Character count and Edit in Editor button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: `${fontSizes.button}px`,
              color: isTooLong
                ? 'var(--vscode-errorForeground)'
                : 'var(--vscode-descriptionForeground)',
            }}
          >
            {currentInput.length}/{MAX_MESSAGE_LENGTH}
          </div>
          <EditInEditorButton
            content={currentInput}
            onContentUpdated={setInput}
            label={t('refinement.inputPlaceholder')}
            language="markdown"
            disabled={isProcessing}
            onEditingStateChange={setIsEditingInEditor}
          />
        </div>

        {/* Send/Cancel button */}
        {isProcessing ? (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {t('refinement.cancelButton')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend() || isTooLong || isTooShort}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: canSend() && !isTooLong && !isTooShort ? 'pointer' : 'not-allowed',
              opacity: canSend() && !isTooLong && !isTooShort ? 1 : 0.5,
            }}
          >
            {t('refinement.sendButton')}
          </button>
        )}
      </div>
    </div>
  );
}
