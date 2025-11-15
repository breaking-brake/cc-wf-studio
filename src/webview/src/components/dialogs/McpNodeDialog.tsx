/**
 * MCP Node Creation Dialog Component
 *
 * Feature: 001-mcp-node
 * Purpose: Browse MCP servers, select tools, and create MCP nodes
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.2
 * Task: T025
 */

import type { McpServerReference, McpToolReference } from '@shared/types/messages';
import { NodeType } from '@shared/types/workflow-definition';
import { useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { useWorkflowStore } from '../../stores/workflow-store';
import { McpServerList } from '../mcp/McpServerList';
import { McpToolList } from '../mcp/McpToolList';
import { McpToolSearch } from '../mcp/McpToolSearch';

interface McpNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function McpNodeDialog({ isOpen, onClose }: McpNodeDialogProps) {
  const { t } = useTranslation();
  const [selectedServer, setSelectedServer] = useState<McpServerReference | null>(null);
  const [selectedTool, setSelectedTool] = useState<McpToolReference | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { addNode, nodes } = useWorkflowStore();

  /**
   * Calculate non-overlapping position for new node
   */
  const calculateNonOverlappingPosition = (
    defaultX: number,
    defaultY: number
  ): { x: number; y: number } => {
    const OFFSET_X = 30;
    const OFFSET_Y = 30;
    const NODE_WIDTH = 250;
    const NODE_HEIGHT = 100;

    let newX = defaultX;
    let newY = defaultY;

    for (let i = 0; i < 100; i++) {
      const hasOverlap = nodes.some((node) => {
        const xOverlap =
          Math.abs(node.position.x - newX) < NODE_WIDTH &&
          Math.abs(node.position.y - newY) < NODE_HEIGHT;
        return xOverlap;
      });

      if (!hasOverlap) {
        return { x: newX, y: newY };
      }

      newX += OFFSET_X;
      newY += OFFSET_Y;
    }

    return { x: newX, y: newY };
  };

  if (!isOpen) {
    return null;
  }

  const handleAddTool = () => {
    if (!selectedServer) {
      setError(t('mcp.dialog.error.noServerSelected'));
      return;
    }

    if (!selectedTool) {
      setError(t('mcp.dialog.error.noToolSelected'));
      return;
    }

    // Add MCP node to canvas
    const position = calculateNonOverlappingPosition(300, 250);

    addNode({
      id: `mcp-${Date.now()}`,
      type: NodeType.Mcp,
      position,
      data: {
        serverId: selectedServer.id,
        toolName: selectedTool.name,
        toolDescription: selectedTool.description || '',
        parameters: selectedTool.parameters || [],
        parameterValues: {},
        validationStatus: 'valid',
        outputPorts: 1,
      },
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedServer(null);
    setSelectedTool(null);
    setSearchQuery('');
    setError(null);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '6px',
          padding: '24px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Dialog Header */}
        <h2
          style={{
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('mcp.dialog.title')}
        </h2>

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
              border: '1px solid var(--vscode-inputValidation-errorBorder)',
              borderRadius: '4px',
              color: 'var(--vscode-errorForeground)',
            }}
          >
            {error}
          </div>
        )}

        {/* Two-column layout: Server list on left, Tool list on right */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          {/* Left column: Server selection */}
          <div style={{ flex: '1', minWidth: 0 }}>
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('mcp.dialog.selectServer')}
            </h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <McpServerList
                onServerSelect={(server) => {
                  setSelectedServer(server);
                  setSelectedTool(null);
                  setSearchQuery('');
                  setError(null);
                }}
                selectedServerId={selectedServer?.id}
              />
            </div>
          </div>

          {/* Right column: Tool selection */}
          <div style={{ flex: '1', minWidth: 0 }}>
            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('mcp.dialog.selectTool')}
            </h3>

            {selectedServer ? (
              <>
                <McpToolSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  disabled={!selectedServer}
                />
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <McpToolList
                    serverId={selectedServer.id}
                    onToolSelect={(tool) => {
                      setSelectedTool(tool);
                      setError(null);
                    }}
                    selectedToolName={selectedTool?.name}
                    searchQuery={searchQuery}
                  />
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {t('mcp.dialog.error.noServerSelected')}
              </div>
            )}
          </div>
        </div>

        {/* Dialog Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '20px',
            borderTop: '1px solid var(--vscode-panel-border)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {t('mcp.dialog.cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleAddTool}
            disabled={!selectedServer || !selectedTool}
            style={{
              padding: '8px 16px',
              backgroundColor:
                selectedServer && selectedTool
                  ? 'var(--vscode-button-background)'
                  : 'var(--vscode-button-secondaryBackground)',
              color:
                selectedServer && selectedTool
                  ? 'var(--vscode-button-foreground)'
                  : 'var(--vscode-descriptionForeground)',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedServer && selectedTool ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              opacity: selectedServer && selectedTool ? 1 : 0.6,
            }}
          >
            {t('mcp.dialog.addButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
