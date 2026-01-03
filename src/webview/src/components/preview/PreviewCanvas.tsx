/**
 * Claude Code Workflow Studio - Preview Canvas Component
 *
 * Read-only visual representation of a workflow
 * Used in preview mode to display workflow JSON files
 */

import type {
  PreviewModeInitPayload,
  PreviewParseErrorPayload,
  Workflow,
} from '@shared/types/messages';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  type DefaultEdgeOptions,
  type EdgeTypes,
  type NodeTypes,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTranslation } from '../../i18n/i18n-context';
import { vscode } from '../../main';
import { deserializeWorkflow } from '../../services/workflow-service';
import { DeletableEdge } from '../edges/DeletableEdge';
import { AskUserQuestionNodeComponent } from '../nodes/AskUserQuestionNode';
import { BranchNodeComponent } from '../nodes/BranchNode';
import { EndNode } from '../nodes/EndNode';
import { IfElseNodeComponent } from '../nodes/IfElseNode';
import { McpNodeComponent } from '../nodes/McpNode/McpNode';
import { PromptNode } from '../nodes/PromptNode';
import { SkillNodeComponent } from '../nodes/SkillNode';
import { StartNode } from '../nodes/StartNode';
import { SubAgentFlowNodeComponent } from '../nodes/SubAgentFlowNode';
import { SubAgentNodeComponent } from '../nodes/SubAgentNode';
import { SwitchNodeComponent } from '../nodes/SwitchNode';

/**
 * Node types registration for React Flow
 */
const nodeTypes: NodeTypes = {
  subAgent: SubAgentNodeComponent,
  askUserQuestion: AskUserQuestionNodeComponent,
  branch: BranchNodeComponent,
  ifElse: IfElseNodeComponent,
  switch: SwitchNodeComponent,
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  skill: SkillNodeComponent,
  mcp: McpNodeComponent,
  subAgentFlow: SubAgentFlowNodeComponent,
};

/**
 * Default edge options
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
  style: { stroke: 'var(--vscode-foreground)', strokeWidth: 2 },
};

/**
 * Edge types - reuse existing edge component but in read-only mode
 */
const edgeTypes: EdgeTypes = {
  default: DeletableEdge,
};

/**
 * PreviewCanvas Component Props
 */
interface PreviewCanvasProps {
  /** Workflow to preview (null if none loaded yet) */
  workflow: Workflow | null;
  /** Parse error message (if any) */
  parseError: string | null;
  /** Whether this is a historical version (git diff "before" side) */
  isHistoricalVersion: boolean;
  /** Whether the file has uncommitted git changes (for showing "After" badge) */
  hasGitChanges: boolean;
}

/**
 * Inner component that uses React Flow hooks
 */
const PreviewCanvasInner: React.FC<PreviewCanvasProps> = ({
  workflow,
  parseError,
  isHistoricalVersion,
  hasGitChanges,
}) => {
  const { t } = useTranslation();

  // Deserialize workflow to React Flow format
  const { nodes, edges } = useMemo(() => {
    if (!workflow) {
      return { nodes: [], edges: [] };
    }
    return deserializeWorkflow(workflow);
  }, [workflow]);

  // Handle Edit button click - open workflow in main editor
  const handleOpenInEditor = () => {
    vscode.postMessage({
      type: 'OPEN_WORKFLOW_IN_EDITOR',
    });
  };

  // Show error state
  if (parseError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--vscode-editor-background)',
          color: 'var(--vscode-errorForeground)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{t('preview.parseError')}</h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>{parseError}</p>
      </div>
    );
  }

  // Show empty state
  if (!workflow) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--vscode-editor-background)',
          color: 'var(--vscode-foreground)',
          opacity: 0.6,
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <p style={{ margin: 0, fontSize: '14px' }}>{t('preview.loading')}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        border: '1px solid var(--vscode-panel-border)',
        boxSizing: 'border-box',
      }}
    >
      {/* Floating tags - left side */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Preview tag */}
        <span
          style={{
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: 'var(--vscode-badge-background)',
            color: 'var(--vscode-badge-foreground)',
            borderRadius: '4px',
          }}
        >
          {t('preview.label')}
        </span>
        {/* Before badge for git diff */}
        {isHistoricalVersion && (
          <span
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--vscode-badge-background)',
              color: 'var(--vscode-badge-foreground)',
              borderRadius: '4px',
            }}
          >
            {t('preview.versionBefore')}
          </span>
        )}
        {/* After badge for git diff (current version with changes) */}
        {!isHistoricalVersion && hasGitChanges && (
          <span
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--vscode-badge-background)',
              color: 'var(--vscode-badge-foreground)',
              borderRadius: '4px',
            }}
          >
            {t('preview.versionAfter')}
          </span>
        )}
      </div>

      {/* Floating Edit button - right side (hidden for historical version) */}
      {!isHistoricalVersion && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={handleOpenInEditor}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('preview.openInEditor')}
          </button>
        </div>
      )}

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        // Read-only settings
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        // Allow pan and zoom for navigation
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        // Disable interactive features
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
      >
        <Background />
      </ReactFlow>
    </div>
  );
};

/**
 * PreviewCanvas Component Props (external)
 */
interface PreviewCanvasExternalProps {
  /** Initial workflow from App.tsx (for first render) */
  initialWorkflow: Workflow | null;
  /** Initial historical version flag from App.tsx */
  initialIsHistoricalVersion: boolean;
  /** Initial git changes flag from App.tsx */
  initialHasGitChanges: boolean;
}

/**
 * PreviewCanvas Component with ReactFlowProvider wrapper
 */
export const PreviewCanvas: React.FC<PreviewCanvasExternalProps> = ({
  initialWorkflow,
  initialIsHistoricalVersion,
  initialHasGitChanges,
}) => {
  const [workflow, setWorkflow] = useState<Workflow | null>(initialWorkflow);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isHistoricalVersion, setIsHistoricalVersion] = useState<boolean>(
    initialIsHistoricalVersion
  );
  const [hasGitChanges, setHasGitChanges] = useState<boolean>(initialHasGitChanges);

  // Listen for preview messages from Extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'PREVIEW_MODE_INIT') {
        const payload = message.payload as PreviewModeInitPayload;
        setWorkflow(payload.workflow);
        setIsHistoricalVersion(payload.isHistoricalVersion ?? false);
        setHasGitChanges(payload.hasGitChanges ?? false);
        setParseError(null);
      } else if (message.type === 'PREVIEW_UPDATE') {
        const payload = message.payload as { workflow: Workflow };
        setWorkflow(payload.workflow);
        setParseError(null);
      } else if (message.type === 'PREVIEW_PARSE_ERROR') {
        const payload = message.payload as PreviewParseErrorPayload;
        setParseError(payload.error);
      }
    };

    window.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  return (
    <ReactFlowProvider>
      <PreviewCanvasInner
        workflow={workflow}
        parseError={parseError}
        isHistoricalVersion={isHistoricalVersion}
        hasGitChanges={hasGitChanges}
      />
    </ReactFlowProvider>
  );
};

export default PreviewCanvas;
