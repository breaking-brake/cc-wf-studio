/**
 * Claude Code Workflow Studio - Node Palette Component
 *
 * Draggable node templates for Sub-Agent and AskUserQuestion nodes
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type React from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';

/**
 * NodePalette Component
 */
export const NodePalette: React.FC = () => {
  const { t } = useTranslation();
  const { addNode } = useWorkflowStore();

  const handleAddSubAgent = () => {
    const newNode = {
      id: `agent-${Date.now()}`,
      type: 'subAgent' as const,
      position: { x: 250, y: 100 },
      data: {
        description: t('default.newSubAgent'),
        prompt: t('default.enterPrompt'),
        model: 'sonnet' as const,
        outputPorts: 1,
      },
    };
    addNode(newNode);
  };

  const handleAddAskUserQuestion = () => {
    const newNode = {
      id: `question-${Date.now()}`,
      type: 'askUserQuestion' as const,
      position: { x: 250, y: 300 },
      data: {
        questionText: t('default.newQuestion'),
        options: [
          { label: `${t('default.option')} 1`, description: t('default.firstOption') },
          { label: `${t('default.option')} 2`, description: t('default.secondOption') },
        ],
        outputPorts: 2,
      },
    };
    addNode(newNode);
  };

  const handleAddPromptNode = () => {
    const newNode = {
      id: `prompt-${Date.now()}`,
      type: 'prompt' as const,
      position: { x: 350, y: 200 },
      data: {
        label: t('default.newPrompt'),
        prompt: t('default.promptTemplate'),
        variables: {},
      },
    };
    addNode(newNode);
  };

  const handleAddBranch = () => {
    const newNode = {
      id: `branch-${Date.now()}`,
      type: 'branch' as const,
      position: { x: 250, y: 250 },
      data: {
        branchType: 'conditional' as const,
        branches: [
          { label: t('default.branchTrue'), condition: t('default.branchTrueCondition') },
          { label: t('default.branchFalse'), condition: t('default.branchFalseCondition') },
        ],
        outputPorts: 2,
      },
    };
    addNode(newNode);
  };

  return (
    <div
      className="node-palette"
      style={{
        width: '200px',
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderRight: '1px solid var(--vscode-panel-border)',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--vscode-foreground)',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {t('palette.title')}
      </div>

      {/* Section: Basic Nodes */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--vscode-descriptionForeground)',
          marginBottom: '8px',
          marginTop: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {t('palette.basicNodes')}
      </div>

      {/* Prompt Node Button */}
      <button
        type="button"
        onClick={handleAddPromptNode}
        data-tour="add-prompt-button"
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <div style={{ fontWeight: 600 }}>{t('node.prompt.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('node.prompt.description')}
        </div>
      </button>

      {/* Sub-Agent Node Button */}
      <button
        type="button"
        onClick={handleAddSubAgent}
        data-tour="add-subagent-button"
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <div style={{ fontWeight: 600 }}>{t('node.subAgent.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('node.subAgent.description')}
        </div>
      </button>

      {/* Section: Control Flow */}
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--vscode-descriptionForeground)',
          marginBottom: '8px',
          marginTop: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {t('palette.controlFlow')}
      </div>

      {/* Branch Node Button */}
      <button
        type="button"
        onClick={handleAddBranch}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <div style={{ fontWeight: 600 }}>{t('node.branch.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('node.branch.description')}
        </div>
      </button>

      {/* AskUserQuestion Node Button */}
      <button
        type="button"
        onClick={handleAddAskUserQuestion}
        data-tour="add-askuserquestion-button"
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <div style={{ fontWeight: 600 }}>{t('node.askUserQuestion.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('node.askUserQuestion.description')}
        </div>
      </button>

      {/* Instructions */}
      <div
        style={{
          marginTop: '24px',
          padding: '12px',
          backgroundColor: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-textBlockQuote-border)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          lineHeight: '1.5',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>{t('palette.quickStart')}</div>
        <ul style={{ margin: 0, paddingLeft: '16px' }}>
          <li>{t('palette.instruction.addNode')}</li>
          <li>{t('palette.instruction.dragNode')}</li>
          <li>{t('palette.instruction.connectNodes')}</li>
          <li>{t('palette.instruction.editProperties')}</li>
        </ul>
      </div>
    </div>
  );
};
