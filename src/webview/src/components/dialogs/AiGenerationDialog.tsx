/**
 * AI Generation Dialog Component
 *
 * Modal dialog for AI-assisted workflow generation.
 * Based on: /specs/001-ai-workflow-generation/quickstart.md Phase 5
 */

import React, { useState } from 'react';
import { generateWorkflow, AIGenerationError } from '../../services/ai-generation-service';
import { useWorkflowStore } from '../../stores/workflow-store';

interface AiGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_DESCRIPTION_LENGTH = 2000;

export function AiGenerationDialog({ isOpen, onClose }: AiGenerationDialogProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addGeneratedWorkflow } = useWorkflowStore();

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    // Validate description
    if (!description.trim()) {
      setError('Please enter a workflow description');
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate workflow via AI
      const workflow = await generateWorkflow(description);

      // Add generated workflow to canvas (with auto-positioning to avoid overlap)
      addGeneratedWorkflow(workflow);

      // Close dialog
      handleClose();
    } catch (err) {
      if (err instanceof AIGenerationError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDescription('');
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleGenerate();
    }
  };

  const isDescriptionValid = description.trim().length > 0 && description.length <= MAX_DESCRIPTION_LENGTH;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '6px',
          padding: '24px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--vscode-foreground)' }}>
          Generate Workflow with AI
        </h2>

        <p style={{ marginBottom: '16px', color: 'var(--vscode-descriptionForeground)' }}>
          Describe the workflow you want to create in natural language. The AI will generate a complete
          workflow with nodes and connections.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="workflow-description"
            style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--vscode-foreground)',
              fontWeight: 500,
            }}
          >
            Workflow Description
          </label>
          <textarea
            id="workflow-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Example: Create a code review workflow that scans code, asks user for priority level, and generates fix suggestions"
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '8px 12px',
              fontSize: '14px',
              lineHeight: '1.5',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '4px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div
            style={{
              marginTop: '4px',
              fontSize: '12px',
              color:
                description.length > MAX_DESCRIPTION_LENGTH
                  ? 'var(--vscode-errorForeground)'
                  : 'var(--vscode-descriptionForeground)',
            }}
          >
            {description.length} / {MAX_DESCRIPTION_LENGTH} characters
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
              border: '1px solid var(--vscode-inputValidation-errorBorder)',
              borderRadius: '4px',
              color: 'var(--vscode-errorForeground)',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--vscode-inputValidation-infoBackground)',
              border: '1px solid var(--vscode-inputValidation-infoBorder)',
              borderRadius: '4px',
              color: 'var(--vscode-foreground)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div className="spinner" style={{ width: '16px', height: '16px' }} />
            Generating workflow... This may take up to 30 seconds.
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!isDescriptionValid || loading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: isDescriptionValid && !loading
                ? 'var(--vscode-button-background)'
                : 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: isDescriptionValid && !loading ? 'pointer' : 'not-allowed',
              opacity: isDescriptionValid && !loading ? 1 : 0.5,
            }}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
