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
import { useRefinementStore } from '../stores/refinement-store';
import { createWorkflowFromCanvas, useWorkflowStore } from '../stores/workflow-store';
import { ProcessingOverlay } from './common/ProcessingOverlay';

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
  const { nodes, edges, setNodes, setEdges, activeWorkflow, setActiveWorkflow } =
    useWorkflowStore();
  const { openChat, initConversation, loadConversationHistory, isProcessing } =
    useRefinementStore();
  const [workflowName, setWorkflowName] = useState('my-workflow');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');

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
      // Phase 5 (T024): Serialize workflow with conversation history
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        'Created with Workflow Studio',
        activeWorkflow?.conversationHistory
      );

      // Validate workflow before saving
      validateWorkflow(workflow);

      // Save if validation passes
      await saveWorkflow(workflow);
      console.log('Workflow saved successfully:', workflowName);
    } catch (error) {
      // Translate error messages
      let errorMessage = t('toolbar.error.validationFailed');
      if (error instanceof Error) {
        if (error.message.includes('at least one End node')) {
          errorMessage = t('toolbar.error.missingEndNode');
        } else {
          errorMessage = error.message;
        }
      }

      onError({
        code: 'VALIDATION_ERROR',
        message: errorMessage,
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
        // Phase 5 (T025): Load workflow into canvas and set as active workflow
        const workflow: Workflow = message.payload?.workflow;
        if (workflow) {
          const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setWorkflowName(workflow.name);
          // Set as active workflow to preserve conversation history
          setActiveWorkflow(workflow);
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
  }, [setNodes, setEdges, setActiveWorkflow]);

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
      // Translate error messages
      let errorMessage = t('toolbar.error.validationFailed');
      if (error instanceof Error) {
        if (error.message.includes('at least one End node')) {
          errorMessage = t('toolbar.error.missingEndNode');
        } else {
          errorMessage = error.message;
        }
      }

      onError({
        code: 'VALIDATION_ERROR',
        message: errorMessage,
        details: error,
      });
      setIsExporting(false);
    }
  };

  // Phase 3.13: Always enable refinement, generate workflow from current canvas state
  const handleOpenRefinementChat = () => {
    let workflow = activeWorkflow;

    // If no active workflow exists, create one from current canvas state
    if (!workflow) {
      workflow = createWorkflowFromCanvas(nodes, edges);
      setActiveWorkflow(workflow);
    }

    // Load conversation history if exists, otherwise initialize
    if (workflow.conversationHistory) {
      loadConversationHistory(workflow.conversationHistory);
    } else {
      initConversation();
    }

    openChat();
  };

  return (
    <div
      style={{
        position: 'relative',
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

      {/* Refine with AI Button - Phase 3.14: Unified AI generation/refinement */}
      <button
        type="button"
        onClick={handleOpenRefinementChat}
        data-tour="ai-refine-button"
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
        {t('toolbar.refineWithAI')}
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

      {/* Processing Overlay (Phase 3.10) */}
      <ProcessingOverlay isVisible={isProcessing} />
    </div>
  );
};
