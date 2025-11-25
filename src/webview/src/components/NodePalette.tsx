/**
 * Claude Code Workflow Studio - Node Palette Component
 *
 * Draggable node templates for Sub-Agent and AskUserQuestion nodes
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { McpNodeDialog } from './dialogs/McpNodeDialog';
import { SkillBrowserDialog } from './dialogs/SkillBrowserDialog';

/**
 * NodePalette Component
 */
export const NodePalette: React.FC = () => {
  const { t } = useTranslation();
  const { addNode, nodes } = useWorkflowStore();
  const [isSkillBrowserOpen, setIsSkillBrowserOpen] = useState(false);
  const [isMcpDialogOpen, setIsMcpDialogOpen] = useState(false);

  /**
   * 既存のノードと重ならない位置を計算する
   * @param defaultX デフォルトのX座標
   * @param defaultY デフォルトのY座標
   * @returns 重複しない位置 {x, y}
   */
  const calculateNonOverlappingPosition = (
    defaultX: number,
    defaultY: number
  ): { x: number; y: number } => {
    let newX = defaultX;
    let newY = defaultY;
    const OVERLAP_THRESHOLD = 50; // 50px以内なら重複と判定
    const OFFSET_X = 100; // 重複時の右オフセット
    const OFFSET_Y = 80; // 重複時の下オフセット
    const MAX_ATTEMPTS = 20; // 最大試行回数

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // 現在の位置と重複するノードがあるかチェック
      const hasOverlap = nodes.some((node) => {
        const dx = Math.abs(node.position.x - newX);
        const dy = Math.abs(node.position.y - newY);
        return dx < OVERLAP_THRESHOLD && dy < OVERLAP_THRESHOLD;
      });

      if (!hasOverlap) {
        // 重複がなければこの位置を返す
        return { x: newX, y: newY };
      }

      // 重複があれば斜め下にオフセット
      newX += OFFSET_X;
      newY += OFFSET_Y;
    }

    // 最大試行回数に達した場合でも最後の位置を返す
    return { x: newX, y: newY };
  };

  const handleAddSubAgent = () => {
    const position = calculateNonOverlappingPosition(250, 100);
    const newNode = {
      id: `agent-${Date.now()}`,
      type: 'subAgent' as const,
      position,
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
    const position = calculateNonOverlappingPosition(250, 300);
    const newNode = {
      id: `question-${Date.now()}`,
      type: 'askUserQuestion' as const,
      position,
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
    const position = calculateNonOverlappingPosition(350, 200);
    const newNode = {
      id: `prompt-${Date.now()}`,
      type: 'prompt' as const,
      position,
      data: {
        label: t('default.newPrompt'),
        prompt: t('default.prompt'),
        variables: {},
      },
    };
    addNode(newNode);
  };

  const handleAddEndNode = () => {
    const position = calculateNonOverlappingPosition(600, 200);
    const newNode = {
      id: `end-${Date.now()}`,
      type: 'end' as const,
      position,
      data: {
        label: 'End',
      },
    };
    addNode(newNode);
  };

  const handleAddBranch = () => {
    const position = calculateNonOverlappingPosition(250, 250);
    const newNode = {
      id: `branch-${Date.now()}`,
      type: 'branch' as const,
      position,
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

  const handleAddIfElse = () => {
    const position = calculateNonOverlappingPosition(250, 250);
    const newNode = {
      id: `ifelse-${Date.now()}`,
      type: 'ifElse' as const,
      position,
      data: {
        evaluationTarget: '',
        branches: [
          { label: t('default.branchTrue'), condition: t('default.branchTrueCondition') },
          { label: t('default.branchFalse'), condition: t('default.branchFalseCondition') },
        ],
        outputPorts: 2 as const,
      },
    };
    addNode(newNode);
  };

  const handleAddSwitch = () => {
    const position = calculateNonOverlappingPosition(250, 280);
    const newNode = {
      id: `switch-${Date.now()}`,
      type: 'switch' as const,
      position,
      data: {
        evaluationTarget: '',
        branches: [
          { label: t('default.case1'), condition: t('default.case1Condition') },
          { label: t('default.case2'), condition: t('default.case2Condition') },
          { label: t('default.case3'), condition: t('default.case3Condition') },
        ],
        outputPorts: 3,
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
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
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
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.subAgent.description')}
        </div>
      </button>

      {/* Skill Node Button */}
      <button
        type="button"
        onClick={() => setIsSkillBrowserOpen(true)}
        data-tour="add-skill-button"
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
        <div style={{ fontWeight: 600 }}>{t('node.skill.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.skill.description')}
        </div>
      </button>

      {/* MCP Tool Node Button (Feature: 001-mcp-node) */}
      <button
        type="button"
        onClick={() => setIsMcpDialogOpen(true)}
        data-tour="add-mcp-button"
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
        <div style={{ fontWeight: 600 }}>{t('node.mcp.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.mcp.description')}
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

      {/* IfElse Node Button */}
      <button
        type="button"
        onClick={handleAddIfElse}
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
        <div style={{ fontWeight: 600 }}>{t('node.ifElse.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.ifElse.description')}
        </div>
      </button>

      {/* Switch Node Button */}
      <button
        type="button"
        onClick={handleAddSwitch}
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
        <div style={{ fontWeight: 600 }}>{t('node.switch.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.switch.description')}
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
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.askUserQuestion.description')}
        </div>
      </button>

      {/* End Node Button */}
      <button
        type="button"
        onClick={handleAddEndNode}
        data-tour="add-end-button"
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
        <div style={{ fontWeight: 600 }}>{t('node.end.title')}</div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.end.description')}
        </div>
      </button>

      {/* Branch Node Button (Legacy) */}
      <button
        type="button"
        onClick={handleAddBranch}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: '12px',
          backgroundColor: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          opacity: 0.7,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {t('node.branch.title')} <span style={{ fontSize: '10px' }}>(Legacy)</span>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-button-foreground)',
            opacity: 0.8,
          }}
        >
          {t('node.branch.description')}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--vscode-editorWarning-foreground)',
            marginTop: '4px',
            fontStyle: 'italic',
          }}
        >
          ⚠️ {t('node.branch.deprecationNotice')}
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

      {/* Skill Browser Dialog */}
      <SkillBrowserDialog
        isOpen={isSkillBrowserOpen}
        onClose={() => setIsSkillBrowserOpen(false)}
      />

      {/* MCP Node Dialog (Feature: 001-mcp-node) */}
      <McpNodeDialog isOpen={isMcpDialogOpen} onClose={() => setIsMcpDialogOpen(false)} />
    </div>
  );
};
