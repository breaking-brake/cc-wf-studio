/**
 * Claude Code Workflow Studio - Property Overlay Component
 *
 * Property editor for selected nodes (displayed as overlay on canvas)
 * Based on: /specs/001-cc-wf-studio/plan.md
 * Updated: Phase 3.3 - Added resizable width functionality
 * Updated: Added "Edit in Editor" button for textarea fields
 */

import { type SubAgentData, type SubAgentFlowNodeData, VALIDATION_RULES } from '@cc-wf-studio/core';
import { BookOpen } from 'lucide-react';
import type React from 'react';
import type { Node } from 'reactflow';
import { getNodeTypeLabel } from '../constants/node-type-labels';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { ResizeHandle } from './common/ResizeHandle';
import { NODE_PANELS } from './property/node-panels';
import { SchemaPropertyPanel } from './property/SchemaPropertyPanel';

/**
 * PropertyOverlay Props
 */
interface PropertyOverlayProps {
  /** Override selected node ID (for SubAgentFlowDialog local state) */
  overrideSelectedNodeId?: string | null;
  /** Override close handler (for SubAgentFlowDialog local state) */
  onClose?: () => void;
  /**
   * Optional handler invoked when the user requests to view this node in
   * Overview mode. Receives the original node id. The host should switch
   * to overview mode and scroll/centre on this node.
   */
  onShowInOverview?: (nodeId: string) => void;
}

/**
 * PropertyOverlay Component
 */
export const PropertyOverlay: React.FC<PropertyOverlayProps> = ({
  overrideSelectedNodeId,
  onClose,
  onShowInOverview,
}) => {
  const { t } = useTranslation();
  const {
    nodes,
    selectedNodeId: storeSelectedNodeId,
    updateNodeData,
    setNodes,
    closePropertyOverlay,
    subAgentFlows,
  } = useWorkflowStore();
  const { width, handleMouseDown } = useResizablePanel();

  // Use override if provided, otherwise use store value
  const selectedNodeId =
    overrideSelectedNodeId !== undefined ? overrideSelectedNodeId : storeSelectedNodeId;

  // Use override close handler if provided
  const handleClose = onClose || closePropertyOverlay;

  // Find the selected node
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <div
      className="property-panel"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        padding: '16px',
        overflowY: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <ResizeHandle onMouseDown={handleMouseDown} />
      {/* Header with close button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t('property.title')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onShowInOverview && selectedNode && (
            <button
              type="button"
              onClick={() => onShowInOverview(selectedNode.id)}
              title={t('property.showInOverview')}
              aria-label={t('property.showInOverview')}
              style={{
                padding: '4px 6px',
                backgroundColor: 'transparent',
                color: 'var(--vscode-foreground)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'var(--vscode-toolbar-hoverBackground, rgba(255,255,255,0.1))';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <BookOpen size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: 'var(--vscode-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Show content only when a node is selected */}
      {!selectedNode ? null : (
        <>
          {/* Node Type Badge */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-badge-foreground)',
              backgroundColor: 'var(--vscode-badge-background)',
              padding: '4px 8px',
              borderRadius: '3px',
              display: 'inline-block',
              marginBottom: '16px',
            }}
          >
            {getNodeTypeLabel(selectedNode.type)}
          </div>

          {/* Node Name (only for subAgent, askUserQuestion, branch, ifElse, switch, prompt, skill, mcp types) */}
          {/* Note: codex and branchSession use the label field instead of name, handled in their own property editors */}
          {(selectedNode.type === 'subAgent' ||
            selectedNode.type === 'askUserQuestion' ||
            selectedNode.type === 'branch' ||
            selectedNode.type === 'ifElse' ||
            selectedNode.type === 'switch' ||
            selectedNode.type === 'prompt' ||
            selectedNode.type === 'skill' ||
            selectedNode.type === 'mcp') && (
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
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, name: undefined } }
                          : n
                      )
                    );
                  }
                }}
                disabled={
                  selectedNode.type === 'subAgent' &&
                  !!(selectedNode.data as SubAgentData).commandFilePath
                }
                className="nodrag"
                placeholder={t('property.nodeName.placeholder')}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: `1px solid ${
                    selectedNode.data.name &&
                    selectedNode.data.name.trim() !== '' &&
                    !VALIDATION_RULES.NODE.NAME_PATTERN.test(selectedNode.data.name.trim())
                      ? 'var(--vscode-inputValidation-errorBorder)'
                      : 'var(--vscode-input-border)'
                  }`,
                  borderRadius: '2px',
                  fontSize: '13px',
                  ...(selectedNode.type === 'subAgent' &&
                  !!(selectedNode.data as SubAgentData).commandFilePath
                    ? { opacity: 0.6, cursor: 'not-allowed' }
                    : {}),
                }}
              />
              <div
                style={{
                  fontSize: '11px',
                  color:
                    selectedNode.data.name &&
                    selectedNode.data.name.trim() !== '' &&
                    !VALIDATION_RULES.NODE.NAME_PATTERN.test(selectedNode.data.name.trim())
                      ? 'var(--vscode-errorForeground)'
                      : 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                }}
              >
                {selectedNode.data.name &&
                selectedNode.data.name.trim() !== '' &&
                !VALIDATION_RULES.NODE.NAME_PATTERN.test(selectedNode.data.name.trim())
                  ? t('codex.error.nameInvalidPattern')
                  : t('property.nodeName.help')}
              </div>
            </div>
          )}

          {/* Node Name for SubAgentFlowRef (read-only, shows linked Sub-Agent Flow name) */}
          {selectedNode.type === 'subAgentFlow' && (
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="node-name-readonly"
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
              <div
                id="node-name-readonly"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-descriptionForeground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  fontSize: '13px',
                }}
              >
                {(() => {
                  const refData = selectedNode.data as SubAgentFlowNodeData;
                  const linkedFlow = subAgentFlows.find((sf) => sf.id === refData.subAgentFlowId);
                  return linkedFlow?.name || t('node.subAgentFlow.notLinked');
                })()}
              </div>
            </div>
          )}

          {/* Render properties based on node type. Schema-migrated types render
              through the generic panel; the ternary chain shrinks per phase. */}
          {selectedNode.type && NODE_PANELS[selectedNode.type] ? (
            <SchemaPropertyPanel
              node={selectedNode as Node<Record<string, unknown>>}
              config={NODE_PANELS[selectedNode.type]}
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
        </>
      )}
    </div>
  );
};
