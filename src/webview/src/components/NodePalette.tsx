/**
 * Claude Code Workflow Studio - Node Palette Component
 *
 * Draggable node templates for Sub-Agent and AskUserQuestion nodes
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type { SubAgentFlow } from '@shared/types/workflow-definition';
import { NodeType } from '@shared/types/workflow-definition';
import type React from 'react';
import { useState } from 'react';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltip } from './common/StyledTooltip';
import { McpNodeDialog } from './dialogs/McpNodeDialog';
import { SkillBrowserDialog } from './dialogs/SkillBrowserDialog';

/**
 * NodePalette Component
 */
/**
 * Generate unique Sub-Agent Flow ID
 */
function generateSubAgentFlowId(): string {
  return `subagentflow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const NodePalette: React.FC = () => {
  const { t } = useTranslation();
  const isCompact = useIsCompactMode();
  const {
    addNode,
    nodes,
    subAgentFlows,
    addSubAgentFlow,
    setActiveSubAgentFlowId,
    activeSubAgentFlowId,
  } = useWorkflowStore();

  // サブエージェントフロー編集中はネスト不可のノードを非活性にする
  const isEditingSubAgentFlow = activeSubAgentFlowId !== null;
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
          { label: t('default.case1'), condition: t('default.case1Condition'), isDefault: false },
          { label: t('default.case2'), condition: t('default.case2Condition'), isDefault: false },
          {
            label: t('default.defaultBranch'),
            condition: t('default.defaultBranchCondition'),
            isDefault: true,
          },
        ],
        outputPorts: 3,
      },
    };
    addNode(newNode);
  };

  // Feature: 089-subworkflow - Create new Sub-Agent Flow and enter edit mode
  const handleAddSubAgentFlowRef = () => {
    const timestamp = Date.now();
    const newSubAgentFlow: SubAgentFlow = {
      id: generateSubAgentFlowId(),
      name: `subagentflow-${subAgentFlows.length + 1}`,
      description: '',
      nodes: [
        {
          id: `start-${timestamp}`,
          type: NodeType.Start,
          name: 'Start',
          position: { x: 100, y: 200 },
          data: { label: 'Start' },
        },
        {
          id: `end-${timestamp + 1}`,
          type: NodeType.End,
          name: 'End',
          position: { x: 600, y: 200 },
          data: { label: 'End' },
        },
      ],
      connections: [],
    };

    // Add the new Sub-Agent Flow
    addSubAgentFlow(newSubAgentFlow);

    // Immediately enter edit mode for the new Sub-Agent Flow
    setActiveSubAgentFlowId(newSubAgentFlow.id);
  };

  return (
    <div
      className="node-palette"
      style={{
        width: isCompact ? '100px' : '200px',
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderRight: '1px solid var(--vscode-panel-border)',
        padding: isCompact ? '8px' : '16px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: isCompact ? '11px' : '13px',
          fontWeight: 600,
          color: 'var(--vscode-foreground)',
          marginBottom: isCompact ? '8px' : '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {t('palette.title')}
      </div>

      {/* Section: Basic Nodes */}
      <div
        style={{
          fontSize: isCompact ? '10px' : '11px',
          fontWeight: 600,
          color: 'var(--vscode-descriptionForeground)',
          marginBottom: isCompact ? '4px' : '8px',
          marginTop: isCompact ? '4px' : '8px',
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
          padding: isCompact ? '8px' : '12px',
          marginBottom: isCompact ? '8px' : '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '13px',
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
        {!isCompact && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-button-foreground)',
              opacity: 0.8,
            }}
          >
            {t('node.prompt.description')}
          </div>
        )}
      </button>

      {/* Sub-Agent Node Button */}
      {isEditingSubAgentFlow ? (
        <StyledTooltip content={t('palette.nestedNotAllowed')} side="right">
          <button
            type="button"
            onClick={handleAddSubAgent}
            disabled={isEditingSubAgentFlow}
            data-tour="add-subagent-button"
            style={{
              width: '100%',
              padding: isCompact ? '8px' : '12px',
              marginBottom: isCompact ? '8px' : '12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '4px',
              cursor: 'not-allowed',
              fontSize: isCompact ? '11px' : '13px',
              fontWeight: 500,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              opacity: 0.5,
            }}
          >
            <div style={{ fontWeight: 600 }}>{t('node.subAgent.title')}</div>
            {!isCompact && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-button-foreground)',
                  opacity: 0.8,
                }}
              >
                {t('node.subAgent.description')}
              </div>
            )}
          </button>
        </StyledTooltip>
      ) : (
        <button
          type="button"
          onClick={handleAddSubAgent}
          data-tour="add-subagent-button"
          style={{
            width: '100%',
            padding: isCompact ? '8px' : '12px',
            marginBottom: isCompact ? '8px' : '12px',
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: '1px solid var(--vscode-button-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: isCompact ? '11px' : '13px',
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
          {!isCompact && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--vscode-button-foreground)',
                opacity: 0.8,
              }}
            >
              {t('node.subAgent.description')}
            </div>
          )}
        </button>
      )}

      {/* Sub-Agent Flow Ref Node Button (Feature: 089-subworkflow) */}
      {isEditingSubAgentFlow ? (
        <StyledTooltip content={t('palette.nestedNotAllowed')} side="right">
          <button
            type="button"
            onClick={handleAddSubAgentFlowRef}
            disabled={isEditingSubAgentFlow}
            data-tour="add-subagentflow-button"
            style={{
              width: '100%',
              padding: isCompact ? '8px' : '12px',
              marginBottom: isCompact ? '8px' : '12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '4px',
              cursor: 'not-allowed',
              fontSize: isCompact ? '11px' : '13px',
              fontWeight: 500,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              opacity: 0.5,
            }}
          >
            <div style={{ fontWeight: 600 }}>{t('node.subAgentFlow.title')} β</div>
            {!isCompact && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-button-foreground)',
                  opacity: 0.8,
                }}
              >
                {t('node.subAgentFlow.description')}
              </div>
            )}
          </button>
        </StyledTooltip>
      ) : (
        <button
          type="button"
          onClick={handleAddSubAgentFlowRef}
          data-tour="add-subagentflow-button"
          style={{
            width: '100%',
            padding: isCompact ? '8px' : '12px',
            marginBottom: isCompact ? '8px' : '12px',
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: '1px solid var(--vscode-button-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: isCompact ? '11px' : '13px',
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
          <div style={{ fontWeight: 600 }}>{t('node.subAgentFlow.title')} β</div>
          {!isCompact && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--vscode-button-foreground)',
                opacity: 0.8,
              }}
            >
              {t('node.subAgentFlow.description')}
            </div>
          )}
        </button>
      )}

      {/* Skill Node Button */}
      <button
        type="button"
        onClick={() => setIsSkillBrowserOpen(true)}
        data-tour="add-skill-button"
        style={{
          width: '100%',
          padding: isCompact ? '8px' : '12px',
          marginBottom: isCompact ? '8px' : '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '13px',
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
        {!isCompact && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-button-foreground)',
              opacity: 0.8,
            }}
          >
            {t('node.skill.description')}
          </div>
        )}
      </button>

      {/* MCP Tool Node Button (Feature: 001-mcp-node) */}
      <button
        type="button"
        onClick={() => setIsMcpDialogOpen(true)}
        data-tour="add-mcp-button"
        style={{
          width: '100%',
          padding: isCompact ? '8px' : '12px',
          marginBottom: isCompact ? '8px' : '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '13px',
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
        {!isCompact && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-button-foreground)',
              opacity: 0.8,
            }}
          >
            {t('node.mcp.description')}
          </div>
        )}
      </button>

      {/* Section: Control Flow */}
      <div
        style={{
          fontSize: isCompact ? '10px' : '11px',
          fontWeight: 600,
          color: 'var(--vscode-descriptionForeground)',
          marginBottom: isCompact ? '4px' : '8px',
          marginTop: isCompact ? '8px' : '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {t('palette.controlFlow')}
      </div>

      {/* IfElse Node Button */}
      <button
        type="button"
        data-tour="add-ifelse-button"
        onClick={handleAddIfElse}
        style={{
          width: '100%',
          padding: isCompact ? '8px' : '12px',
          marginBottom: isCompact ? '8px' : '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '13px',
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
        {!isCompact && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-button-foreground)',
              opacity: 0.8,
            }}
          >
            {t('node.ifElse.description')}
          </div>
        )}
      </button>

      {/* Switch Node Button */}
      <button
        type="button"
        data-tour="add-switch-button"
        onClick={handleAddSwitch}
        style={{
          width: '100%',
          padding: isCompact ? '8px' : '12px',
          marginBottom: isCompact ? '8px' : '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '13px',
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
        {!isCompact && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-button-foreground)',
              opacity: 0.8,
            }}
          >
            {t('node.switch.description')}
          </div>
        )}
      </button>

      {/* AskUserQuestion Node Button */}
      {isEditingSubAgentFlow ? (
        <StyledTooltip content={t('palette.nestedNotAllowed')} side="right">
          <button
            type="button"
            onClick={handleAddAskUserQuestion}
            disabled={isEditingSubAgentFlow}
            data-tour="add-askuserquestion-button"
            style={{
              width: '100%',
              padding: isCompact ? '8px' : '12px',
              marginBottom: isCompact ? '8px' : '12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '4px',
              cursor: 'not-allowed',
              fontSize: isCompact ? '11px' : '13px',
              fontWeight: 500,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              opacity: 0.5,
            }}
          >
            <div style={{ fontWeight: 600 }}>{t('node.askUserQuestion.title')}</div>
            {!isCompact && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-button-foreground)',
                  opacity: 0.8,
                }}
              >
                {t('node.askUserQuestion.description')}
              </div>
            )}
          </button>
        </StyledTooltip>
      ) : (
        <button
          type="button"
          onClick={handleAddAskUserQuestion}
          data-tour="add-askuserquestion-button"
          style={{
            width: '100%',
            padding: isCompact ? '8px' : '12px',
            marginBottom: isCompact ? '8px' : '12px',
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: '1px solid var(--vscode-button-border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: isCompact ? '11px' : '13px',
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
          {!isCompact && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--vscode-button-foreground)',
                opacity: 0.8,
              }}
            >
              {t('node.askUserQuestion.description')}
            </div>
          )}
        </button>
      )}

      {/* End Node Button */}
      <button
        type="button"
        onClick={handleAddEndNode}
        data-tour="add-end-button"
        style={{
          width: '100%',
          padding: isCompact ? '8px' : '12px',
          marginBottom: isCompact ? '8px' : '12px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '13px',
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
        {!isCompact && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-button-foreground)',
              opacity: 0.8,
            }}
          >
            {t('node.end.description')}
          </div>
        )}
      </button>

      {/* Branch Node Button (Legacy) */}
      <button
        type="button"
        onClick={handleAddBranch}
        style={{
          width: '100%',
          padding: isCompact ? '8px' : '12px',
          marginBottom: isCompact ? '8px' : '12px',
          backgroundColor: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '13px',
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
          {t('node.branch.title')}{' '}
          <span style={{ fontSize: isCompact ? '9px' : '10px' }}>(Legacy)</span>
        </div>
        {!isCompact && (
          <>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--vscode-button-secondaryForeground)',
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
          </>
        )}
      </button>

      {/* Instructions - hidden in compact mode */}
      {!isCompact && (
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
      )}

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
