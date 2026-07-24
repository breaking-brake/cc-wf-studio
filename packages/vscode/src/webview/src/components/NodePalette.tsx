/**
 * Claude Code Workflow Studio - Node Palette Component
 *
 * Draggable node templates for Sub-Agent and AskUserQuestion nodes
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type { BuiltInSubAgentType, SubAgentFlow } from '@cc-wf-studio/core';
import { BUILT_IN_SUB_AGENTS, generateBranchId, NodeType } from '@cc-wf-studio/core';
import type { CommandReference } from '@shared/types/messages';
import {
  Bot,
  GitBranch,
  GitBranchPlus,
  GitFork,
  MessageSquare,
  PanelLeftClose,
  Plug,
  ShieldQuestion,
  Square,
  SquareDashed,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../i18n/translation-keys';
import { createSubAgent } from '../services/command-browser-service';
import { useRefinementStore } from '../stores/refinement-store';
import { useWorkflowStore } from '../stores/workflow-store';
import { createDefaultNode } from '../utils/node-defaults';
import { BetaBadge } from './common/BetaBadge';
import { CodexNodeDialog } from './dialogs/CodexNodeDialog';
import { McpNodeDialog } from './dialogs/McpNodeDialog';
import { SkillBrowserDialog } from './dialogs/SkillBrowserDialog';
import { SubAgentCreationDialog } from './dialogs/SubAgentCreationDialog';
import type { SubAgentFormData } from './dialogs/SubAgentFormDialog';

/**
 * NodePalette Component Props
 */
interface NodePaletteProps {
  onCollapse?: () => void;
}

/**
 * Generate unique Sub-Agent Flow ID
 */
function generateSubAgentFlowId(): string {
  return `subagentflow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onCollapse }) => {
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
  // Codex Beta が有効かどうか
  const isCodexEnabled = useRefinementStore((state) => state.isCodexEnabled);
  const [isSkillBrowserOpen, setIsSkillBrowserOpen] = useState(false);
  const [isMcpDialogOpen, setIsMcpDialogOpen] = useState(false);
  const [isCodexDialogOpen, setIsCodexDialogOpen] = useState(false);
  const [isSubAgentDialogOpen, setIsSubAgentDialogOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const paletteFilter = filterText.trim().toLowerCase();

  /** Case-insensitive match against the palette title and localized description */
  const matchesFilter = (
    titleKey: keyof WebviewTranslationKeys,
    descKey: keyof WebviewTranslationKeys
  ): boolean =>
    paletteFilter === '' ||
    t(titleKey).toLowerCase().includes(paletteFilter) ||
    t(descKey).toLowerCase().includes(paletteFilter);

  const showPrompt = matchesFilter('node.prompt.title', 'node.prompt.description');
  const showSubAgent =
    !isEditingSubAgentFlow && matchesFilter('node.subAgent.title', 'node.subAgent.description');
  const showSubAgentFlow =
    !isEditingSubAgentFlow &&
    matchesFilter('node.subAgentFlow.title', 'node.subAgentFlow.description');
  const showSkill = matchesFilter('node.skill.title', 'node.skill.description');
  const showMcp = matchesFilter('node.mcp.title', 'node.mcp.description');
  const showCodex = isCodexEnabled && matchesFilter('node.codex.title', 'node.codex.description');
  const showGroup = matchesFilter('node.group.title', 'node.group.description');
  const showIfElse = matchesFilter('node.ifElse.title', 'node.ifElse.description');
  const showSwitch = matchesFilter('node.switch.title', 'node.switch.description');
  const showAskUserQuestion =
    !isEditingSubAgentFlow &&
    matchesFilter('node.askUserQuestion.title', 'node.askUserQuestion.description');
  const showBranchSession =
    !isEditingSubAgentFlow &&
    matchesFilter('node.branchSession.title', 'node.branchSession.description');
  const showEnd = matchesFilter('node.end.title', 'node.end.description');
  const showBranch =
    !isEditingSubAgentFlow && matchesFilter('node.branch.title', 'node.branch.description');

  const showBasicSection = showPrompt || showSubAgent || showSubAgentFlow || showSkill || showMcp;
  const showControlFlowSection =
    showIfElse || showSwitch || showAskUserQuestion || showBranchSession || showEnd || showBranch;
  const noFilterResults =
    paletteFilter !== '' &&
    !showBasicSection &&
    !showCodex &&
    !showGroup &&
    !showControlFlowSection;

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

  const handleAddGroup = () => {
    const position = calculateNonOverlappingPosition(200, 100);
    const newNode = {
      id: `group-${Date.now()}`,
      type: 'group' as const,
      position,
      // Place group below edge SVG layer (z-index: 0) so edges inside groups remain clickable.
      // React Flow adds +1000 to selected nodes, so -1001 keeps selected groups at -1 (still below edges).
      zIndex: -1001,
      data: {
        label: 'Group',
      },
      style: { width: 400, height: 300 },
    };
    addNode(newNode);
  };

  const handleAddSubAgent = () => {
    setIsSubAgentDialogOpen(true);
  };

  const handleCreateNewSubAgent = async (formData: SubAgentFormData) => {
    // Write .claude/agents/{name}.md immediately
    const result = await createSubAgent({
      description: formData.description,
      agentDefinition: formData.agentDefinition,
      prompt: formData.prompt,
      agentType: formData.agentType,
      model: formData.agentType === 'claudeCode' ? formData.model : undefined,
      tools: formData.agentType === 'claudeCode' ? formData.tools || undefined : undefined,
      memory:
        formData.agentType === 'claudeCode'
          ? (formData.memory as 'user' | 'project' | 'local' | '' | undefined) || undefined
          : undefined,
    });

    const position = calculateNonOverlappingPosition(250, 100);
    const newNode = {
      id: `agent-${Date.now()}`,
      type: 'subAgent' as const,
      position,
      data: {
        description: formData.description,
        agentDefinition: formData.agentDefinition,
        prompt: formData.prompt,
        agentType: formData.agentType,
        model: formData.agentType === 'claudeCode' ? formData.model : undefined,
        tools: formData.agentType === 'claudeCode' ? formData.tools || undefined : undefined,
        memory:
          formData.agentType === 'claudeCode'
            ? (formData.memory as 'user' | 'project' | 'local' | undefined) || undefined
            : undefined,
        color: formData.agentType === 'claudeCode' ? formData.color : undefined,
        outputPorts: 1,
        commandFilePath: result.filePath,
        commandScope: 'project' as const,
      },
    };
    addNode(newNode);
  };

  const handleSelectBuiltInPreset = (type: BuiltInSubAgentType, formData: SubAgentFormData) => {
    const preset = BUILT_IN_SUB_AGENTS.find((p) => p.type === type);
    if (!preset) return;

    const position = calculateNonOverlappingPosition(250, 100);
    const newNode = {
      id: `agent-${Date.now()}`,
      type: 'subAgent' as const,
      name: preset.displayName,
      position,
      data: {
        description: formData.description,
        agentDefinition: formData.agentDefinition,
        prompt: formData.prompt,
        agentType: 'claudeCode' as const,
        builtInType: type,
        model: preset.model,
        outputPorts: 1,
      },
    };
    addNode(newNode);
  };

  const handleSelectCommand = (command: CommandReference, formData: SubAgentFormData) => {
    const position = calculateNonOverlappingPosition(250, 100);

    const newNode = {
      id: `agent-${Date.now()}`,
      type: 'subAgent' as const,
      position,
      data: {
        description: formData.description,
        agentDefinition: formData.agentDefinition,
        prompt: formData.prompt,
        model: formData.model,
        tools: formData.tools || undefined,
        memory: formData.memory || undefined,
        color: formData.color,
        outputPorts: 1,
        commandFilePath: command.commandPath,
        commandScope: command.scope,
        pluginName: command.pluginName,
      },
    };
    addNode(newNode);
  };

  const handleAddAskUserQuestion = () => {
    const position = calculateNonOverlappingPosition(250, 300);
    addNode(createDefaultNode('askUserQuestion', position, t));
  };

  const handleAddPromptNode = () => {
    const position = calculateNonOverlappingPosition(350, 200);
    addNode(createDefaultNode('prompt', position, t));
  };

  const handleAddBranchSessionNode = () => {
    const position = calculateNonOverlappingPosition(350, 200);
    addNode(createDefaultNode('branchSession', position, t));
  };

  const handleAddEndNode = () => {
    const position = calculateNonOverlappingPosition(600, 200);
    addNode(createDefaultNode('end', position, t));
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
          {
            id: generateBranchId(),
            label: t('default.branchTrue'),
            condition: t('default.branchTrueCondition'),
          },
          {
            id: generateBranchId(),
            label: t('default.branchFalse'),
            condition: t('default.branchFalseCondition'),
          },
        ],
        outputPorts: 2,
      },
    };
    addNode(newNode);
  };

  const handleAddIfElse = () => {
    const position = calculateNonOverlappingPosition(250, 250);
    addNode(createDefaultNode('ifElse', position, t));
  };

  const handleAddSwitch = () => {
    const position = calculateNonOverlappingPosition(250, 280);
    addNode(createDefaultNode('switch', position, t));
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
          id: `end_${timestamp + 1}`,
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isCompact ? '8px' : '16px',
        }}
      >
        <div
          style={{
            fontSize: isCompact ? '11px' : '13px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t('palette.title')}
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            style={{
              width: '20px',
              height: '20px',
              padding: '2px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--vscode-foreground)',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.opacity = '0.7';
            }}
          >
            <PanelLeftClose size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter input */}
      <div style={{ position: 'relative', marginBottom: isCompact ? '8px' : '12px' }}>
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              if (filterText !== '') {
                setFilterText('');
              } else {
                e.currentTarget.blur();
              }
            }
          }}
          placeholder={t('palette.filter.placeholder')}
          aria-label={t('palette.filter.placeholder')}
          style={{
            width: '100%',
            height: '24px',
            padding: filterText !== '' ? '0 24px 0 6px' : '0 6px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border, transparent)',
            borderRadius: '4px',
            outline: 'none',
            fontSize: '12px',
            boxSizing: 'border-box',
          }}
        />
        {filterText !== '' && (
          <button
            type="button"
            onClick={() => setFilterText('')}
            aria-label={t('palette.filter.clear')}
            title={t('palette.filter.clear')}
            style={{
              position: 'absolute',
              right: '2px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              padding: 0,
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: 'var(--vscode-foreground)',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Section: Basic Nodes */}
      {showBasicSection && (
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
      )}

      {/* Prompt Node Button */}
      {showPrompt && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <MessageSquare size={14} />
            {t('node.prompt.title')}
          </div>
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
      )}

      {/* Sub-Agent Node Button - hidden in SubAgentFlow edit mode */}
      {showSubAgent && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Bot size={14} />
            {t('node.subAgent.title')}
          </div>
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

      {/* Sub-Agent Flow Ref Node Button (Feature: 089-subworkflow) - hidden in SubAgentFlow edit mode */}
      {showSubAgentFlow && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Bot size={14} />
            {t('node.subAgentFlow.title')}
          </div>
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
      {showSkill && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Zap size={14} />
            {t('node.skill.title')}
          </div>
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
      )}

      {/* MCP Tool Node Button (Feature: 001-mcp-node) */}
      {showMcp && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Plug size={14} />
            {t('node.mcp.title')}
          </div>
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
      )}

      {/* Section: Special Nodes - only shown when Codex Beta is enabled */}
      {showCodex && (
        <>
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
            {t('palette.specialNodes')}
          </div>

          {/* Codex Agent Node Button (Feature: 518-codex-agent-node) */}
          <button
            type="button"
            onClick={() => setIsCodexDialogOpen(true)}
            data-tour="add-codex-button"
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              <Terminal size={14} />
              {t('node.codex.title')}
              <BetaBadge style={{ borderRadius: '3px' }} />
            </div>
            {!isCompact && (
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-button-foreground)',
                  opacity: 0.8,
                }}
              >
                {t('node.codex.description')}
              </div>
            )}
          </button>
        </>
      )}

      {/* Section: Layout */}
      {showGroup && (
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
          {t('palette.layout')}
        </div>
      )}

      {/* Group Node Button */}
      {showGroup && (
        <button
          type="button"
          onClick={handleAddGroup}
          data-tour="add-group-button"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <SquareDashed size={14} />
            {t('node.group.title')}
          </div>
          {!isCompact && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--vscode-button-foreground)',
                opacity: 0.8,
              }}
            >
              {t('node.group.description')}
            </div>
          )}
        </button>
      )}

      {/* Section: Control Flow */}
      {showControlFlowSection && (
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
      )}

      {/* IfElse Node Button */}
      {showIfElse && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <GitBranch size={14} />
            {t('node.ifElse.title')}
          </div>
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
      )}

      {/* Switch Node Button */}
      {showSwitch && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <GitFork size={14} />
            {t('node.switch.title')}
          </div>
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
      )}

      {/* AskUserQuestion Node Button - hidden in SubAgentFlow edit mode */}
      {showAskUserQuestion && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <ShieldQuestion size={14} />
            {t('node.askUserQuestion.title')}
          </div>
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

      {/* Branch Session Node Button - hidden in SubAgentFlow edit mode (Claude Code only) */}
      {showBranchSession && (
        <button
          type="button"
          onClick={handleAddBranchSessionNode}
          data-tour="add-branch-session-button"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <GitBranchPlus size={14} />
            {t('node.branchSession.title')}
          </div>
          {!isCompact && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--vscode-button-foreground)',
                opacity: 0.8,
              }}
            >
              {t('node.branchSession.description')}
            </div>
          )}
        </button>
      )}

      {/* End Node Button */}
      {showEnd && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Square size={14} />
            {t('node.end.title')}
          </div>
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
      )}

      {/* Branch Node Button (Legacy) - hidden in SubAgentFlow edit mode */}
      {showBranch && (
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <GitBranch size={14} />
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
      )}

      {/* Empty state when the filter matches nothing */}
      {noFilterResults && (
        <div
          style={{
            padding: isCompact ? '8px' : '12px',
            fontSize: isCompact ? '11px' : '12px',
            color: 'var(--vscode-descriptionForeground)',
            textAlign: 'center',
          }}
        >
          {t('palette.filter.noResults')}
        </div>
      )}

      {/* Instructions - hidden in compact mode, SubAgentFlow edit mode, and while filtering */}
      {!isCompact && !isEditingSubAgentFlow && paletteFilter === '' && (
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

      {/* Codex Node Dialog (Feature: 518-codex-agent-node) */}
      <CodexNodeDialog isOpen={isCodexDialogOpen} onClose={() => setIsCodexDialogOpen(false)} />

      {/* Sub-Agent Creation Dialog (Feature: 636) */}
      <SubAgentCreationDialog
        isOpen={isSubAgentDialogOpen}
        onClose={() => setIsSubAgentDialogOpen(false)}
        onCreateWithForm={handleCreateNewSubAgent}
        onSelectCommand={handleSelectCommand}
        onSelectBuiltInPreset={handleSelectBuiltInPreset}
      />
    </div>
  );
};
