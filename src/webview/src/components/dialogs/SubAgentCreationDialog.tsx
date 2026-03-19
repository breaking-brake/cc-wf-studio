/**
 * Sub-Agent Creation Dialog
 *
 * Feature: 636 - Browse existing agents or create new Sub-Agent nodes.
 * UX aligned with SkillBrowserDialog: browse-first with inline create option.
 */

import * as Dialog from '@radix-ui/react-dialog';
import type { CommandReference } from '@shared/types/messages';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { browseCommands } from '../../services/command-browser-service';
import { type SubAgentFormData, SubAgentFormDialog } from './SubAgentFormDialog';

const Z_INDEX = {
  DIALOG_BASE: 9999,
} as const;

interface SubAgentCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWithForm: (data: SubAgentFormData) => Promise<void>;
  onSelectCommand: (command: CommandReference) => void;
}

type Tab = 'user' | 'project' | 'local';

export const SubAgentCreationDialog: React.FC<SubAgentCreationDialogProps> = ({
  isOpen,
  onClose,
  onCreateWithForm,
  onSelectCommand,
}) => {
  const { t } = useTranslation();
  const [commands, setCommands] = useState<CommandReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('project');
  const [filter, setFilter] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandReference | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  // Load commands when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setCommands([]);
    setError(null);
    setFilter('');
    setSelectedCommand(null);

    const load = async () => {
      setLoading(true);
      try {
        const result = await browseCommands();
        setCommands(result);
      } catch {
        setError(t('subAgent.dialog.loadFailed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, t]);

  const handleCreateNew = useCallback(() => {
    setIsFormDialogOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: SubAgentFormData) => {
      await onCreateWithForm(data);
      setIsFormDialogOpen(false);
      onClose();
    },
    [onCreateWithForm, onClose]
  );

  const handleAdd = useCallback(() => {
    if (selectedCommand) {
      onSelectCommand(selectedCommand);
      onClose();
    }
  }, [selectedCommand, onSelectCommand, onClose]);

  const filteredCommands = useMemo(() => {
    const tabCommands = commands.filter((c) => c.scope === activeTab);
    if (!filter) return tabCommands;
    const lowerFilter = filter.toLowerCase();
    return tabCommands.filter((c) => {
      const displayName = c.pluginName ? `${c.pluginName}:${c.name}` : c.name;
      return (
        displayName.toLowerCase().includes(lowerFilter) ||
        c.description.toLowerCase().includes(lowerFilter)
      );
    });
  }, [commands, activeTab, filter]);

  const userCount = useMemo(() => commands.filter((c) => c.scope === 'user').length, [commands]);
  const projectCount = useMemo(
    () => commands.filter((c) => c.scope === 'project').length,
    [commands]
  );
  const localCount = useMemo(() => commands.filter((c) => c.scope === 'local').length, [commands]);

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '13px',
    background: 'none',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--vscode-focusBorder)' : 'none',
    color: isActive ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)',
    cursor: 'pointer',
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: Z_INDEX.DIALOG_BASE,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              color: 'var(--vscode-foreground)',
              borderRadius: '6px',
              border: '1px solid var(--vscode-panel-border)',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            {/* Header */}
            <Dialog.Title
              style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('subAgent.dialog.title')}
            </Dialog.Title>
            <Dialog.Description
              style={{
                margin: '0 0 20px 0',
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                lineHeight: '1.5',
              }}
            >
              {t('subAgent.dialog.description')}
            </Dialog.Description>

            {/* Filter Input + Create New Button */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={t('subAgent.dialog.filterPlaceholder')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              {!loading && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    border: '1px solid var(--vscode-button-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--vscode-button-secondaryHoverBackground)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'var(--vscode-button-secondaryBackground)';
                  }}
                >
                  + {t('subAgent.dialog.createNew')}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--vscode-panel-border)',
              }}
            >
              <button
                type="button"
                style={tabStyle(activeTab === 'project')}
                onClick={() => setActiveTab('project')}
              >
                {t('subAgent.dialog.projectTab')} ({projectCount})
              </button>
              <button
                type="button"
                style={tabStyle(activeTab === 'user')}
                onClick={() => setActiveTab('user')}
              >
                {t('subAgent.dialog.userTab')} ({userCount})
              </button>
              {localCount > 0 && (
                <button
                  type="button"
                  style={tabStyle(activeTab === 'local')}
                  onClick={() => setActiveTab('local')}
                >
                  Plugin ({localCount})
                </button>
              )}
            </div>

            {/* Scope Description */}
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: 'var(--vscode-textBlockQuote-background)',
                borderLeft: '3px solid var(--vscode-textBlockQuote-border)',
                borderRadius: '0 4px 4px 0',
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
                lineHeight: '1.5',
              }}
            >
              {activeTab === 'user' && t('subAgent.dialog.userDescription')}
              {activeTab === 'project' && t('subAgent.dialog.projectDescription')}
              {activeTab === 'local' &&
                'Agents provided by installed Claude Code plugins. These agents are read-only and managed by their respective plugins.'}
            </div>

            {/* Loading State */}
            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {t('subAgent.dialog.loading')}
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                  border: '1px solid var(--vscode-inputValidation-errorBorder)',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: 'var(--vscode-inputValidation-errorForeground)',
                }}
              >
                {error}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && filteredCommands.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {t('subAgent.dialog.noCommands')}
              </div>
            )}

            {/* Agent list */}
            {!loading && !error && filteredCommands.length > 0 && (
              <div
                style={{
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  maxHeight: '400px',
                  overflow: 'auto',
                }}
              >
                {filteredCommands.map((cmd) => {
                  const isSelected = selectedCommand?.commandPath === cmd.commandPath;
                  return (
                    <div
                      key={cmd.commandPath}
                      onClick={() => setSelectedCommand(cmd)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCommand(cmd);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid var(--vscode-panel-border)',
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--vscode-list-activeSelectionBackground)'
                          : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor =
                            'var(--vscode-list-hoverBackground)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: isSelected
                              ? 'var(--vscode-list-activeSelectionForeground)'
                              : 'var(--vscode-foreground)',
                          }}
                        >
                          {cmd.pluginName ? `${cmd.pluginName}:${cmd.name}` : cmd.name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor:
                              cmd.scope === 'local'
                                ? 'var(--vscode-terminal-ansiGreen)'
                                : cmd.scope === 'user'
                                  ? 'var(--vscode-badge-background)'
                                  : 'var(--vscode-button-secondaryBackground)',
                            color:
                              cmd.scope === 'local'
                                ? '#ffffff'
                                : cmd.scope === 'user'
                                  ? 'var(--vscode-badge-foreground)'
                                  : 'var(--vscode-button-secondaryForeground)',
                            fontWeight: 500,
                          }}
                        >
                          {cmd.scope === 'local'
                            ? 'Claude Code'
                            : cmd.scope === 'user'
                              ? t('subAgent.dialog.userTab')
                              : t('subAgent.dialog.projectTab')}
                        </span>
                      </div>
                      {cmd.description && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: isSelected
                              ? 'var(--vscode-list-activeSelectionForeground)'
                              : 'var(--vscode-descriptionForeground)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '20px',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: '1px solid var(--vscode-button-border)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  cursor: 'pointer',
                }}
              >
                {t('subAgent.dialog.cancelButton')}
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedCommand}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: selectedCommand
                    ? 'var(--vscode-button-background)'
                    : 'var(--vscode-button-secondaryBackground)',
                  color: selectedCommand
                    ? 'var(--vscode-button-foreground)'
                    : 'var(--vscode-descriptionForeground)',
                  cursor: selectedCommand ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  opacity: selectedCommand ? 1 : 0.5,
                }}
              >
                {t('subAgent.dialog.addButton')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>

      {/* Nested Form Dialog */}
      <SubAgentFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSubmit={handleFormSubmit}
      />
    </Dialog.Root>
  );
};
