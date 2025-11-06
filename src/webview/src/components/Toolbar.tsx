/**
 * Claude Code Workflow Studio - Toolbar Component
 *
 * Provides Save and Load functionality for workflows
 */

import type { Workflow } from '@shared/types/messages';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { vscode } from '../main';
import { loadWorkflowList, saveWorkflow } from '../services/vscode-bridge';
import {
  deserializeWorkflow,
  serializeWorkflow,
  validateWorkflow,
} from '../services/workflow-service';
import { useWorkflowStore } from '../stores/workflow-store';
import { AiGenerationDialog } from './dialogs/AiGenerationDialog';

interface ToolbarProps {
  onError: (error: { code: string; message: string; details?: unknown }) => void;
  onStartTour: () => void;
}

interface WorkflowListItem {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onError, onStartTour }) => {
  const { t } = useTranslation();
  const { nodes, edges, setNodes, setEdges } = useWorkflowStore();
  const [workflowName, setWorkflowName] = useState('my-workflow');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [showAiDialog, setShowAiDialog] = useState(false);

  const handleSave = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequired'),
      });
      return;
    }

    setIsSaving(true);
    try {
      // Serialize workflow
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        'Created with Workflow Studio'
      );

      // Validate workflow before saving
      validateWorkflow(workflow);

      // Save if validation passes
      await saveWorkflow(workflow);
      console.log('Workflow saved successfully:', workflowName);
    } catch (error) {
      onError({
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : t('toolbar.error.validationFailed'),
        details: error,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Listen for workflow list updates from Extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'WORKFLOW_LIST_LOADED') {
        setWorkflows(message.payload?.workflows || []);
      } else if (message.type === 'LOAD_WORKFLOW') {
        // Load workflow into canvas
        const workflow: Workflow = message.payload?.workflow;
        if (workflow) {
          const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setWorkflowName(workflow.name);
        }
      } else if (message.type === 'EXPORT_SUCCESS') {
        setIsExporting(false);
      } else if (message.type === 'ERROR') {
        // Reset exporting state on any error
        setIsExporting(false);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setNodes, setEdges]);

  // Load workflow list on mount
  useEffect(() => {
    loadWorkflowList().catch((error) => {
      console.error('Failed to load initial workflow list:', error);
    });
  }, []);

  const handleRefreshList = async () => {
    try {
      await loadWorkflowList();
    } catch (error) {
      console.error('Failed to load workflow list:', error);
    }
  };

  const handleLoadWorkflow = () => {
    if (!selectedWorkflowId) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.selectWorkflowToLoad'),
      });
      return;
    }

    // Request to load specific workflow
    vscode.postMessage({
      type: 'LOAD_WORKFLOW',
      payload: { workflowId: selectedWorkflowId },
    });
  };

  const handleExport = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    setIsExporting(true);
    try {
      // Serialize workflow
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        'Created with Workflow Studio'
      );

      // Validate workflow before export
      validateWorkflow(workflow);

      // Request export
      vscode.postMessage({
        type: 'EXPORT_WORKFLOW',
        payload: { workflow },
      });
    } catch (error) {
      onError({
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : t('toolbar.error.validationFailed'),
        details: error,
      });
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        backgroundColor: 'var(--vscode-editor-background)',
      }}
    >
      {/* Workflow Name Input */}
      <input
        type="text"
        value={workflowName}
        onChange={(e) => setWorkflowName(e.target.value)}
        placeholder={t('toolbar.workflowNamePlaceholder')}
        className="nodrag"
        data-tour="workflow-name-input"
        style={{
          flex: 1,
          padding: '4px 8px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '2px',
          fontSize: '13px',
        }}
      />

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        data-tour="save-button"
        style={{
          padding: '4px 12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: 'none',
          borderRadius: '2px',
          cursor: isSaving ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          opacity: isSaving ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {isSaving ? t('toolbar.saving') : t('toolbar.save')}
      </button>

      {/* Export Button */}
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        data-tour="export-button"
        style={{
          padding: '4px 12px',
          backgroundColor: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: 'none',
          borderRadius: '2px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          opacity: isExporting ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {isExporting ? t('toolbar.exporting') : t('toolbar.export')}
      </button>

      {/* Generate with AI Button */}
      <button
        type="button"
        onClick={() => setShowAiDialog(true)}
        data-tour="ai-generate-button"
        style={{
          padding: '4px 12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
          fontSize: '13px',
          whiteSpace: 'nowrap',
        }}
      >
        {t('toolbar.generateWithAI')}
      </button>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: 'var(--vscode-panel-border)',
        }}
      />

      {/* Workflow Selector */}
      <select
        value={selectedWorkflowId}
        onChange={(e) => setSelectedWorkflowId(e.target.value)}
        onFocus={handleRefreshList}
        className="nodrag"
        data-tour="workflow-selector"
        style={{
          padding: '4px 8px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '2px',
          fontSize: '13px',
          minWidth: '150px',
        }}
      >
        <option value="">{t('toolbar.selectWorkflow')}</option>
        {workflows.map((wf) => (
          <option key={wf.id} value={wf.id}>
            {wf.name}
          </option>
        ))}
      </select>

      {/* Load Button */}
      <button
        type="button"
        onClick={handleLoadWorkflow}
        disabled={!selectedWorkflowId}
        data-tour="load-button"
        style={{
          padding: '4px 12px',
          backgroundColor: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: 'none',
          borderRadius: '2px',
          cursor: !selectedWorkflowId ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          opacity: !selectedWorkflowId ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {t('toolbar.load')}
      </button>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '20px',
          backgroundColor: 'var(--vscode-panel-border)',
        }}
      />

      {/* Help Button */}
      <button
        type="button"
        onClick={onStartTour}
        title="Start Tour"
        data-tour="help-button"
        style={{
          padding: '4px 8px',
          backgroundColor: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        ?
      </button>

      {/* AI Generation Dialog */}
      <AiGenerationDialog isOpen={showAiDialog} onClose={() => setShowAiDialog(false)} />
    </div>
  );
};
