/**
 * Skill Node Edit Dialog Component
 *
 * Feature: 001-skill-execution-mode
 * Purpose: Edit Skill node execution mode and execution prompt
 *
 * Based on: McpNodeEditDialog pattern
 */

import * as Dialog from '@radix-ui/react-dialog';
import type { SkillNodeData } from '@shared/types/workflow-definition';
import { VALIDATION_RULES } from '@shared/types/workflow-definition';
import { useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { useWorkflowStore } from '../../stores/workflow-store';

interface SkillNodeEditDialogProps {
  isOpen: boolean;
  nodeId: string;
  onClose: () => void;
}

export function SkillNodeEditDialog({ isOpen, nodeId, onClose }: SkillNodeEditDialogProps) {
  const { t } = useTranslation();
  const { nodes, updateNodeData } = useWorkflowStore();

  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as SkillNodeData | undefined;

  const [executionMode, setExecutionMode] = useState<'load' | 'execute'>(
    nodeData?.executionMode || 'execute'
  );
  const [executionPrompt, setExecutionPrompt] = useState(nodeData?.executionPrompt || '');

  // Reset state when dialog opens with new data
  const handleOpenChange = (open: boolean) => {
    if (open && nodeData) {
      setExecutionMode(nodeData.executionMode || 'execute');
      setExecutionPrompt(nodeData.executionPrompt || '');
    }
    if (!open) {
      onClose();
    }
  };

  const handleSave = () => {
    if (!node || !nodeData) return;

    updateNodeData(nodeId, {
      ...nodeData,
      executionMode,
      executionPrompt: executionMode === 'execute' ? executionPrompt : undefined,
    });

    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            {/* Dialog Header */}
            <Dialog.Title
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'var(--vscode-foreground)',
                marginBottom: '16px',
              }}
            >
              {t('skill.editDialog.title')}
            </Dialog.Title>

            {/* Hidden description for accessibility */}
            <Dialog.Description style={{ display: 'none' }}>
              {t('skill.editDialog.title')}
            </Dialog.Description>

            {/* Skill Info */}
            {nodeData && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--vscode-list-inactiveSelectionBackground)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontSize: '13px', color: 'var(--vscode-disabledForeground)' }}>
                  <strong>Skill:</strong> {nodeData.name}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--vscode-disabledForeground)',
                    marginTop: '4px',
                  }}
                >
                  {nodeData.description}
                </div>
              </div>
            )}

            {/* Execution Mode Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label
                htmlFor="execution-mode-execute"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '12px',
                }}
              >
                {t('property.skill.executionMode')}
              </label>

              {/* Execute Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '4px',
                  border: `1px solid ${executionMode === 'execute' ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
                  backgroundColor:
                    executionMode === 'execute'
                      ? 'var(--vscode-list-activeSelectionBackground)'
                      : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  id="execution-mode-execute"
                  type="radio"
                  name="executionMode"
                  value="execute"
                  checked={executionMode === 'execute'}
                  onChange={() => setExecutionMode('execute')}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--vscode-foreground)',
                    }}
                  >
                    {t('property.skill.executionMode.execute')}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--vscode-descriptionForeground)',
                      marginTop: '4px',
                    }}
                  >
                    {t('property.skill.executionMode.execute.description')}
                  </div>
                </div>
              </label>

              {/* Load Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '4px',
                  border: `1px solid ${executionMode === 'load' ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
                  backgroundColor:
                    executionMode === 'load'
                      ? 'var(--vscode-list-activeSelectionBackground)'
                      : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="executionMode"
                  value="load"
                  checked={executionMode === 'load'}
                  onChange={() => setExecutionMode('load')}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--vscode-foreground)',
                    }}
                  >
                    {t('property.skill.executionMode.load')}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--vscode-descriptionForeground)',
                      marginTop: '4px',
                    }}
                  >
                    {t('property.skill.executionMode.load.description')}
                  </div>
                </div>
              </label>
            </div>

            {/* Execution Prompt (only for execute mode) */}
            {executionMode === 'execute' && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="execution-prompt"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--vscode-foreground)',
                    marginBottom: '8px',
                  }}
                >
                  {t('property.skill.executionPrompt')}
                </label>
                <textarea
                  id="execution-prompt"
                  value={executionPrompt}
                  onChange={(e) => setExecutionPrompt(e.target.value)}
                  placeholder={t('property.skill.executionPrompt.placeholder')}
                  maxLength={VALIDATION_RULES.SKILL.EXECUTION_PROMPT_MAX_LENGTH}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    backgroundColor: 'var(--vscode-input-background)',
                    color: 'var(--vscode-input-foreground)',
                    border: '1px solid var(--vscode-input-border)',
                    borderRadius: '4px',
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--vscode-descriptionForeground)',
                    marginTop: '4px',
                    textAlign: 'right',
                  }}
                >
                  {executionPrompt.length} / {VALIDATION_RULES.SKILL.EXECUTION_PROMPT_MAX_LENGTH}
                </div>
              </div>
            )}

            {/* Dialog Actions */}
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                {t('skill.editDialog.cancelButton')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              >
                {t('skill.editDialog.saveButton')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
