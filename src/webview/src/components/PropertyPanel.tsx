/**
 * Claude Code Workflow Studio - Property Panel Component
 *
 * Property editor for selected nodes
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type {
  AskUserQuestionData,
  BranchNodeData,
  IfElseNodeData,
  SkillNodeData,
  SubAgentData,
  SwitchNodeData,
} from '@shared/types/workflow-definition';
import type React from 'react';
import type { Node } from 'reactflow';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import type { PromptNodeData } from '../types/node-types';
import { extractVariables } from '../utils/template-utils';

/**
 * PropertyPanel Component
 */
export const PropertyPanel: React.FC = () => {
  const { t } = useTranslation();
  const { nodes, selectedNodeId, updateNodeData, setNodes } = useWorkflowStore();

  // Find the selected node
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div
        className="property-panel"
        style={{
          width: '300px',
          height: '100%',
          backgroundColor: 'var(--vscode-sideBar-background)',
          borderLeft: '1px solid var(--vscode-panel-border)',
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground)',
            textAlign: 'center',
            marginTop: '24px',
          }}
        >
          {t('property.noSelection')}
        </div>
      </div>
    );
  }

  return (
    <div
      className="property-panel"
      style={{
        width: '300px',
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderLeft: '1px solid var(--vscode-panel-border)',
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
        {t('property.title')}
      </div>

      {/* Node Type Badge */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          backgroundColor: 'var(--vscode-badge-background)',
          padding: '4px 8px',
          borderRadius: '3px',
          display: 'inline-block',
          marginBottom: '16px',
        }}
      >
        {selectedNode.type === 'subAgent'
          ? t('property.nodeType.subAgent')
          : selectedNode.type === 'askUserQuestion'
            ? t('property.nodeType.askUserQuestion')
            : selectedNode.type === 'branch'
              ? t('property.nodeType.branch')
              : selectedNode.type === 'ifElse'
                ? t('property.nodeType.ifElse')
                : selectedNode.type === 'switch'
                  ? t('property.nodeType.switch')
                  : selectedNode.type === 'prompt'
                    ? t('property.nodeType.prompt')
                    : selectedNode.type === 'start'
                      ? t('property.nodeType.start')
                      : selectedNode.type === 'end'
                        ? t('property.nodeType.end')
                        : selectedNode.type === 'skill'
                          ? t('property.nodeType.skill')
                          : t('property.nodeType.unknown')}
      </div>

      {/* Node Name (only for subAgent, askUserQuestion, branch, ifElse, switch, prompt, and skill types) */}
      {(selectedNode.type === 'subAgent' ||
        selectedNode.type === 'askUserQuestion' ||
        selectedNode.type === 'branch' ||
        selectedNode.type === 'ifElse' ||
        selectedNode.type === 'switch' ||
        selectedNode.type === 'prompt' ||
        selectedNode.type === 'skill') && (
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="node-name-input"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            {t('property.nodeName')}
          </label>
          <input
            id="node-name-input"
            type="text"
            value={selectedNode.data.name ?? selectedNode.id}
            onChange={(e) => {
              const newName = e.target.value;
              setNodes(
                nodes.map((n) =>
                  n.id === selectedNode.id ? { ...n, data: { ...n.data, name: newName } } : n
                )
              );
            }}
            onBlur={(e) => {
              // 入力欄が空の場合は、node IDに戻す（空の名前を防ぐ）
              const currentName = e.target.value.trim();
              if (!currentName) {
                setNodes(
                  nodes.map((n) =>
                    n.id === selectedNode.id ? { ...n, data: { ...n.data, name: undefined } } : n
                  )
                );
              }
            }}
            className="nodrag"
            placeholder={t('property.nodeName.placeholder')}
            style={{
              width: '100%',
              padding: '6px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '13px',
            }}
          />
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '4px',
            }}
          >
            {t('property.nodeName.help')}
          </div>
        </div>
      )}

      {/* Render properties based on node type */}
      {selectedNode.type === 'subAgent' ? (
        <SubAgentProperties
          node={selectedNode as Node<SubAgentData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'askUserQuestion' ? (
        <AskUserQuestionProperties
          node={selectedNode as Node<AskUserQuestionData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'branch' ? (
        <BranchProperties
          node={selectedNode as Node<BranchNodeData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'ifElse' ? (
        <IfElseProperties
          node={selectedNode as Node<IfElseNodeData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'switch' ? (
        <SwitchProperties
          node={selectedNode as Node<SwitchNodeData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'prompt' ? (
        <PromptProperties
          node={selectedNode as Node<PromptNodeData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'skill' ? (
        <SkillProperties
          node={selectedNode as Node<SkillNodeData>}
          updateNodeData={updateNodeData}
        />
      ) : selectedNode.type === 'start' || selectedNode.type === 'end' ? (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--vscode-textBlockQuote-background)',
            border: '1px solid var(--vscode-textBlockQuote-border)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {selectedNode.type === 'start'
            ? t('property.startNodeDescription')
            : t('property.endNodeDescription')}
        </div>
      ) : (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--vscode-errorBackground)',
            border: '1px solid var(--vscode-errorBorder)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--vscode-errorForeground)',
          }}
        >
          {t('property.unknownNodeType')} {selectedNode.type}
        </div>
      )}
    </div>
  );
};

/**
 * Sub-Agent Properties Editor
 */
const SubAgentProperties: React.FC<{
  node: Node<SubAgentData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const { t } = useTranslation();
  const data = node.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Description */}
      <div>
        <label
          htmlFor="description-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.description')}
        </label>
        <input
          id="description-input"
          type="text"
          value={data.description}
          onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Prompt */}
      <div>
        <label
          htmlFor="prompt-textarea"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.prompt')}
        </label>
        <textarea
          id="prompt-textarea"
          value={data.prompt}
          onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
          className="nodrag"
          rows={6}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            fontFamily: 'var(--vscode-editor-font-family)',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Model */}
      <div>
        <label
          htmlFor="model-select"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.model')}
        </label>
        <select
          id="model-select"
          value={data.model || 'sonnet'}
          onChange={(e) =>
            updateNodeData(node.id, { model: e.target.value as 'sonnet' | 'opus' | 'haiku' })
          }
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        >
          <option value="sonnet">Sonnet</option>
          <option value="opus">Opus</option>
          <option value="haiku">Haiku</option>
        </select>
      </div>

      {/* Tools */}
      <div>
        <label
          htmlFor="tools-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.tools')}
        </label>
        <input
          id="tools-input"
          type="text"
          value={data.tools || ''}
          onChange={(e) => updateNodeData(node.id, { tools: e.target.value })}
          placeholder={t('property.tools.placeholder')}
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          {t('property.tools.help')}
        </div>
      </div>
    </div>
  );
};

/**
 * AskUserQuestion Properties Editor
 */
/**
 * Generate a unique ID for an option
 */
const generateOptionId = (): string => {
  return `opt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const AskUserQuestionProperties: React.FC<{
  node: Node<AskUserQuestionData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const { t } = useTranslation();
  const data = node.data;

  // Ensure all options have IDs (for backward compatibility)
  const normalizedOptions = data.options.map((opt) => ({
    ...opt,
    id: opt.id || generateOptionId(),
  }));

  // Update data if any option was missing an ID
  if (normalizedOptions.some((opt, i) => opt.id !== data.options[i].id)) {
    updateNodeData(node.id, { options: normalizedOptions });
  }

  const handleAddOption = () => {
    const newOptions = [
      ...normalizedOptions,
      {
        id: generateOptionId(),
        label: `${t('default.option')} ${normalizedOptions.length + 1}`,
        description: t('default.newOption'),
      },
    ];
    updateNodeData(node.id, {
      options: newOptions,
      outputPorts: newOptions.length,
    });
  };

  const handleRemoveOption = (index: number) => {
    if (normalizedOptions.length <= 2) return; // Minimum 2 options
    const newOptions = normalizedOptions.filter((_, i) => i !== index);
    updateNodeData(node.id, {
      options: newOptions,
      outputPorts: newOptions.length,
    });
  };

  const handleUpdateOption = (index: number, field: 'label' | 'description', value: string) => {
    const newOptions = normalizedOptions.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt
    );
    updateNodeData(node.id, { options: newOptions });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Question Text */}
      <div>
        <label
          htmlFor="question-text-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.questionText')}
        </label>
        <textarea
          id="question-text-input"
          value={data.questionText}
          onChange={(e) => updateNodeData(node.id, { questionText: e.target.value })}
          className="nodrag"
          rows={3}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Multi-Select Toggle */}
      <div>
        <label
          htmlFor="multi-select-checkbox"
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            cursor: 'pointer',
            gap: '8px',
          }}
        >
          <input
            id="multi-select-checkbox"
            type="checkbox"
            checked={data.multiSelect || false}
            onChange={(e) => {
              const isMultiSelect = e.target.checked;
              updateNodeData(node.id, {
                multiSelect: isMultiSelect,
                outputPorts: isMultiSelect ? 1 : normalizedOptions.length,
              });
            }}
            className="nodrag"
            style={{
              cursor: 'pointer',
            }}
          />
          <span>{t('property.multiSelect')}</span>
        </label>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
            marginLeft: '24px',
          }}
        >
          {data.multiSelect
            ? t('property.multiSelect.enabled')
            : t('property.multiSelect.disabled')}
        </div>
      </div>

      {/* AI Suggestions Toggle */}
      <div>
        <label
          htmlFor="ai-suggestions-checkbox"
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            cursor: 'pointer',
            gap: '8px',
          }}
        >
          <input
            id="ai-suggestions-checkbox"
            type="checkbox"
            checked={data.useAiSuggestions || false}
            onChange={(e) => {
              const useAiSuggestions = e.target.checked;
              updateNodeData(node.id, {
                useAiSuggestions,
                outputPorts: 1, // AI suggestions always use single output
                options: useAiSuggestions ? [] : normalizedOptions, // Clear options when AI mode enabled
              });
            }}
            className="nodrag"
            style={{
              cursor: 'pointer',
            }}
          />
          <span>{t('property.aiSuggestions')}</span>
        </label>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
            marginLeft: '24px',
          }}
        >
          {data.useAiSuggestions
            ? t('property.aiSuggestions.enabled')
            : t('property.aiSuggestions.disabled')}
        </div>
      </div>

      {/* Options */}
      {!data.useAiSuggestions && (
        <div>
          <div
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            {t('property.optionsCount').replace('{count}', normalizedOptions.length.toString())}
          </div>

          {normalizedOptions.map((option, index) => (
            <div
              key={option.id}
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600 }}>
                  {t('property.optionNumber').replace('{number}', (index + 1).toString())}
                </span>
                {normalizedOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="nodrag"
                    style={{
                      padding: '2px 6px',
                      fontSize: '10px',
                      backgroundColor: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('property.remove')}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={option.label}
                onChange={(e) => handleUpdateOption(index, 'label', e.target.value)}
                placeholder={t('property.optionLabel.placeholder')}
                className="nodrag"
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  marginBottom: '6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
              <input
                type="text"
                value={option.description}
                onChange={(e) => handleUpdateOption(index, 'description', e.target.value)}
                placeholder={t('property.optionDescription.placeholder')}
                className="nodrag"
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
            </div>
          ))}

          {normalizedOptions.length < 4 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="nodrag"
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: '1px solid var(--vscode-button-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {t('property.addOption')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Prompt Properties Editor
 */
const PromptProperties: React.FC<{
  node: Node<PromptNodeData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const { t } = useTranslation();
  const data = node.data;

  // プロンプトから変数を抽出
  const variables = extractVariables(data.prompt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Label */}
      <div>
        <label
          htmlFor="label-input"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.label')}
        </label>
        <input
          id="label-input"
          type="text"
          value={data.label || ''}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
          className="nodrag"
          placeholder={t('property.label.placeholder')}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Prompt Template */}
      <div>
        <label
          htmlFor="prompt-textarea"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.promptTemplate')}
        </label>
        <textarea
          id="prompt-textarea"
          value={data.prompt}
          onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
          className="nodrag"
          rows={8}
          placeholder={t('property.promptTemplate.placeholder')}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            fontFamily: 'var(--vscode-editor-font-family)',
            resize: 'vertical',
          }}
        />
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          {t('property.promptTemplate.help')}
        </div>
      </div>

      {/* Detected Variables */}
      {variables.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            {t('property.detectedVariables').replace('{count}', variables.length.toString())}
          </div>
          <div
            style={{
              padding: '8px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
            }}
          >
            {variables.map((varName) => (
              <div
                key={varName}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                • {`{{${varName}}}`}
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '4px',
            }}
          >
            {t('property.variablesSubstituted')}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Branch Properties Editor
 */
const BranchProperties: React.FC<{
  node: Node<BranchNodeData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const { t } = useTranslation();
  const data = node.data;

  // Ensure all branches have IDs (for backward compatibility)
  const normalizedBranches = data.branches.map((branch) => ({
    ...branch,
    id: branch.id || generateBranchId(),
  }));

  // Update data if any branch was missing an ID
  if (normalizedBranches.some((branch, i) => branch.id !== data.branches[i].id)) {
    updateNodeData(node.id, { branches: normalizedBranches });
  }

  const handleAddBranch = () => {
    const branchNumber = normalizedBranches.length + 1;
    const newBranches = [
      ...normalizedBranches,
      {
        id: generateBranchId(),
        label: `Case ${branchNumber}`,
        condition: `${t('default.conditionPrefix')}${branchNumber}${t('default.conditionSuffix')}`,
      },
    ];
    updateNodeData(node.id, {
      branches: newBranches,
      outputPorts: newBranches.length,
    });
  };

  const handleRemoveBranch = (index: number) => {
    if (normalizedBranches.length <= 2) return; // Minimum 2 branches
    const newBranches = normalizedBranches.filter((_, i) => i !== index);
    updateNodeData(node.id, {
      branches: newBranches,
      outputPorts: newBranches.length,
    });
  };

  const handleUpdateBranch = (index: number, field: 'label' | 'condition', value: string) => {
    const newBranches = normalizedBranches.map((branch, i) =>
      i === index ? { ...branch, [field]: value } : branch
    );
    updateNodeData(node.id, { branches: newBranches });
  };

  const handleChangeBranchType = (newType: 'conditional' | 'switch') => {
    if (newType === 'conditional' && normalizedBranches.length > 2) {
      // Trim to 2 branches for conditional
      updateNodeData(node.id, {
        branchType: newType,
        branches: normalizedBranches.slice(0, 2),
        outputPorts: 2,
      });
    } else {
      updateNodeData(node.id, { branchType: newType });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Branch Type */}
      <div>
        <label
          htmlFor="branch-type-select"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.branchType')}
        </label>
        <select
          id="branch-type-select"
          value={data.branchType}
          onChange={(e) => handleChangeBranchType(e.target.value as 'conditional' | 'switch')}
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        >
          <option value="conditional">{t('property.conditional')}</option>
          <option value="switch">{t('property.switch')}</option>
        </select>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          {data.branchType === 'conditional'
            ? t('property.branchType.conditional.help')
            : t('property.branchType.switch.help')}
        </div>
      </div>

      {/* Branches */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
            }}
          >
            {t('property.branchesCount').replace('{count}', normalizedBranches.length.toString())}
          </div>
          {(data.branchType === 'switch' || normalizedBranches.length < 2) && (
            <button
              type="button"
              onClick={handleAddBranch}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: '1px solid var(--vscode-button-border)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              {t('property.addBranch')}
            </button>
          )}
        </div>

        {normalizedBranches.map((branch, index) => (
          <div
            key={branch.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {t('property.branchNumber').replace('{number}', (index + 1).toString())}
              </span>
              {normalizedBranches.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveBranch(index)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  {t('property.remove')}
                </button>
              )}
            </div>

            {/* Label */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor={`branch-label-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                {t('property.branchLabel')}
              </label>
              <input
                id={`branch-label-${index}`}
                type="text"
                value={branch.label}
                onChange={(e) => handleUpdateBranch(index, 'label', e.target.value)}
                className="nodrag"
                placeholder={t('property.branchLabel.placeholder')}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
            </div>

            {/* Condition */}
            <div>
              <label
                htmlFor={`branch-condition-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                {t('property.branchCondition')}
              </label>
              <textarea
                id={`branch-condition-${index}`}
                value={branch.condition}
                onChange={(e) => handleUpdateBranch(index, 'condition', e.target.value)}
                className="nodrag"
                rows={2}
                placeholder={t('property.branchCondition.placeholder')}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        ))}

        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '8px',
          }}
        >
          {t('property.minimumBranches')}
        </div>
      </div>
    </div>
  );
};

/**
 * Generate unique branch ID
 */
function generateBranchId(): string {
  return `branch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * IfElse Properties Editor (2-way branch, fixed)
 */
const IfElseProperties: React.FC<{
  node: Node<IfElseNodeData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const { t } = useTranslation();
  const data = node.data;

  // Ensure exactly 2 branches with IDs
  const normalizedBranches = data.branches?.slice(0, 2).map((branch, index) => ({
    ...branch,
    id: branch.id || `ifelse_${index}_${Date.now()}`,
  })) || [
    {
      id: `ifelse_0_${Date.now()}`,
      label: t('default.branchTrue'),
      condition: t('default.branchTrueCondition'),
    },
    {
      id: `ifelse_1_${Date.now()}`,
      label: t('default.branchFalse'),
      condition: t('default.branchFalseCondition'),
    },
  ];

  // Update data if branches changed
  if (JSON.stringify(normalizedBranches) !== JSON.stringify(data.branches)) {
    updateNodeData(node.id, { branches: normalizedBranches, outputPorts: 2 });
  }

  const handleUpdateBranch = (index: number, field: 'label' | 'condition', value: string) => {
    const newBranches = normalizedBranches.map((branch, i) =>
      i === index ? { ...branch, [field]: value } : branch
    );
    updateNodeData(node.id, { branches: newBranches, outputPorts: 2 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Info: Fixed 2 branches */}
      <div
        style={{
          padding: '8px',
          backgroundColor: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-textBlockQuote-border)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        {t('property.branchType.conditional.help')}
      </div>

      {/* Evaluation Target */}
      <div>
        <label
          htmlFor="ifelse-evaluation-target"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.evaluationTarget')}
        </label>
        <input
          id="ifelse-evaluation-target"
          type="text"
          value={data.evaluationTarget || ''}
          onChange={(e) => updateNodeData(node.id, { evaluationTarget: e.target.value })}
          className="nodrag"
          placeholder={t('property.evaluationTarget.placeholder')}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          {t('property.evaluationTarget.help')}
        </div>
      </div>

      {/* Branches (Fixed at 2) */}
      <div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
          }}
        >
          {t('property.branchesCount').replace('{count}', '2')}
        </div>

        {normalizedBranches.map((branch, index) => (
          <div
            key={branch.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '8px',
              }}
            >
              {t('property.branchNumber').replace('{number}', (index + 1).toString())}
            </div>

            {/* Label */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor={`ifelse-label-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                {t('property.branchLabel')}
              </label>
              <input
                id={`ifelse-label-${index}`}
                type="text"
                value={branch.label}
                onChange={(e) => handleUpdateBranch(index, 'label', e.target.value)}
                className="nodrag"
                placeholder={t('property.branchLabel.placeholder')}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
            </div>

            {/* Condition */}
            <div>
              <label
                htmlFor={`ifelse-condition-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                {t('property.branchCondition')}
              </label>
              <textarea
                id={`ifelse-condition-${index}`}
                value={branch.condition}
                onChange={(e) => handleUpdateBranch(index, 'condition', e.target.value)}
                className="nodrag"
                rows={2}
                placeholder={t('property.branchCondition.placeholder')}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Switch Properties Editor (Multi-way branch, 2-N)
 */
const SwitchProperties: React.FC<{
  node: Node<SwitchNodeData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node, updateNodeData }) => {
  const { t } = useTranslation();
  const data = node.data;

  // Ensure all branches have IDs (for backward compatibility)
  const normalizedBranches = data.branches.map((branch) => ({
    ...branch,
    id: branch.id || generateBranchId(),
  }));

  // Update data if any branch was missing an ID
  if (normalizedBranches.some((branch, i) => branch.id !== data.branches[i].id)) {
    updateNodeData(node.id, { branches: normalizedBranches });
  }

  const handleAddBranch = () => {
    if (normalizedBranches.length >= 10) return; // Maximum 10 branches
    const branchNumber = normalizedBranches.length + 1;
    const newBranches = [
      ...normalizedBranches,
      {
        id: generateBranchId(),
        label: `Case ${branchNumber}`,
        condition: `${t('default.conditionPrefix')}${branchNumber}${t('default.conditionSuffix')}`,
      },
    ];
    updateNodeData(node.id, {
      branches: newBranches,
      outputPorts: newBranches.length,
    });
  };

  const handleRemoveBranch = (index: number) => {
    if (normalizedBranches.length <= 2) return; // Minimum 2 branches
    const newBranches = normalizedBranches.filter((_, i) => i !== index);
    updateNodeData(node.id, {
      branches: newBranches,
      outputPorts: newBranches.length,
    });
  };

  const handleUpdateBranch = (index: number, field: 'label' | 'condition', value: string) => {
    const newBranches = normalizedBranches.map((branch, i) =>
      i === index ? { ...branch, [field]: value } : branch
    );
    updateNodeData(node.id, { branches: newBranches });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Info: Multi-way branch */}
      <div
        style={{
          padding: '8px',
          backgroundColor: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-textBlockQuote-border)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
        }}
      >
        {t('property.branchType.switch.help')}
      </div>

      {/* Evaluation Target */}
      <div>
        <label
          htmlFor="switch-evaluation-target"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.evaluationTarget')}
        </label>
        <input
          id="switch-evaluation-target"
          type="text"
          value={data.evaluationTarget || ''}
          onChange={(e) => updateNodeData(node.id, { evaluationTarget: e.target.value })}
          className="nodrag"
          placeholder={t('property.evaluationTarget.placeholder')}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
          }}
        />
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '4px',
          }}
        >
          {t('property.evaluationTarget.help')}
        </div>
      </div>

      {/* Branches */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
            }}
          >
            {t('property.branchesCount').replace('{count}', normalizedBranches.length.toString())}
          </div>
          {normalizedBranches.length < 10 && (
            <button
              type="button"
              onClick={handleAddBranch}
              className="nodrag"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: '1px solid var(--vscode-button-border)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              {t('property.addBranch')}
            </button>
          )}
        </div>

        {normalizedBranches.map((branch, index) => (
          <div
            key={branch.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {t('property.branchNumber').replace('{number}', (index + 1).toString())}
              </span>
              {normalizedBranches.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveBranch(index)}
                  className="nodrag"
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  {t('property.remove')}
                </button>
              )}
            </div>

            {/* Label */}
            <div style={{ marginBottom: '8px' }}>
              <label
                htmlFor={`switch-label-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                {t('property.branchLabel')}
              </label>
              <input
                id={`switch-label-${index}`}
                type="text"
                value={branch.label}
                onChange={(e) => handleUpdateBranch(index, 'label', e.target.value)}
                className="nodrag"
                placeholder={t('property.branchLabel.placeholder')}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                }}
              />
            </div>

            {/* Condition */}
            <div>
              <label
                htmlFor={`switch-condition-${index}`}
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  marginBottom: '4px',
                }}
              >
                {t('property.branchCondition')}
              </label>
              <textarea
                id={`switch-condition-${index}`}
                value={branch.condition}
                onChange={(e) => handleUpdateBranch(index, 'condition', e.target.value)}
                className="nodrag"
                rows={2}
                placeholder={t('property.branchCondition.placeholder')}
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '12px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        ))}

        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            marginTop: '8px',
          }}
        >
          {t('property.minimumBranches')}
        </div>
      </div>
    </div>
  );
};

/**
 * Skill Properties Editor
 *
 * Feature: 001-skill-node
 * Displays read-only properties for Skill nodes
 */
const SkillProperties: React.FC<{
  node: Node<SkillNodeData>;
  updateNodeData: (nodeId: string, data: Partial<unknown>) => void;
}> = ({ node }) => {
  const { t } = useTranslation();
  const data = node.data;

  // Get validation status icon and color
  const getValidationIcon = (status: 'valid' | 'missing' | 'invalid'): string => {
    switch (status) {
      case 'valid':
        return '✓';
      case 'missing':
        return '⚠';
      case 'invalid':
        return '✗';
    }
  };

  const getValidationColor = (status: 'valid' | 'missing' | 'invalid'): string => {
    switch (status) {
      case 'valid':
        return 'var(--vscode-testing-iconPassed)';
      case 'missing':
        return 'var(--vscode-editorWarning-foreground)';
      case 'invalid':
        return 'var(--vscode-errorForeground)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Description (Read-only) */}
      <div>
        <label
          htmlFor="skill-description"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.description')}
        </label>
        <div
          id="skill-description"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-descriptionForeground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            lineHeight: '1.4',
          }}
        >
          {data.description}
        </div>
      </div>

      {/* Skill Path (Read-only) */}
      <div>
        <label
          htmlFor="skill-path"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.skillPath')}
        </label>
        <div
          id="skill-path"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-descriptionForeground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            fontSize: '11px',
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          {data.skillPath}
        </div>
      </div>

      {/* Scope (Read-only) */}
      <div>
        <label
          htmlFor="skill-scope"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.scope')}
        </label>
        <div
          id="skill-scope"
          style={{
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
            backgroundColor:
              data.scope === 'personal'
                ? 'var(--vscode-badge-background)'
                : 'var(--vscode-button-secondaryBackground)',
            padding: '4px 8px',
            borderRadius: '3px',
            display: 'inline-block',
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.3px',
          }}
        >
          {data.scope === 'personal' ? t('property.scope.personal') : t('property.scope.project')}
        </div>
      </div>

      {/* Validation Status (Read-only) */}
      <div>
        <label
          htmlFor="skill-validation-status"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {t('property.validationStatus')}
        </label>
        <div
          id="skill-validation-status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              color: getValidationColor(data.validationStatus),
              fontWeight: 'bold',
            }}
          >
            {getValidationIcon(data.validationStatus)}
          </span>
          <span style={{ color: 'var(--vscode-foreground)' }}>
            {data.validationStatus === 'valid'
              ? t('property.validationStatus.valid')
              : data.validationStatus === 'missing'
                ? t('property.validationStatus.missing')
                : t('property.validationStatus.invalid')}
          </span>
        </div>
      </div>

      {/* Allowed Tools (Read-only, optional) */}
      {data.allowedTools && (
        <div>
          <label
            htmlFor="skill-allowed-tools"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              marginBottom: '6px',
            }}
          >
            {t('property.allowedTools')}
          </label>
          <div
            id="skill-allowed-tools"
            style={{
              width: '100%',
              padding: '6px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-descriptionForeground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            🔧 {data.allowedTools}
          </div>
        </div>
      )}

      {/* Info Note */}
      <div
        style={{
          padding: '12px',
          backgroundColor: 'var(--vscode-textBlockQuote-background)',
          border: '1px solid var(--vscode-textBlockQuote-border)',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          lineHeight: '1.5',
        }}
      >
        💡 Skill properties are read-only and loaded from SKILL.md file. To modify, edit the source
        file directly.
      </div>
    </div>
  );
};
