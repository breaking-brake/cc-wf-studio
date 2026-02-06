/**
 * Skill Browser Dialog Component
 *
 * Feature: 001-skill-node
 * Purpose: Browse and select Claude Code Skills to add to workflow
 *
 * Based on: specs/001-skill-node/design.md Section 6.2
 */

import * as Dialog from '@radix-ui/react-dialog';
import type { SkillReference } from '@shared/types/messages';
import { NodeType, VALIDATION_RULES } from '@shared/types/workflow-definition';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { browseSkills, createSkill } from '../../services/skill-browser-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import { AIProviderBadge, type AIProviderType } from '../common/AIProviderBadge';
import { type CreateSkillFormData, SkillCreationDialog } from './SkillCreationDialog';

type SourceType = 'claude' | 'copilot' | 'codex';

interface GroupedSkills {
  source: SourceType;
  skills: SkillReference[];
}

/**
 * Groups skills by their source (claude/copilot/codex).
 * Skills without a source are treated as 'claude' for backward compatibility.
 */
function groupSkillsBySource(skills: SkillReference[]): GroupedSkills[] {
  const sourceOrder: SourceType[] = ['claude', 'copilot', 'codex'];
  const groups = new Map<SourceType, SkillReference[]>();

  // Initialize all groups
  for (const source of sourceOrder) {
    groups.set(source, []);
  }

  // Group skills by source (undefined source → 'claude')
  for (const skill of skills) {
    const source = (skill.source as SourceType) || 'claude';
    groups.get(source)?.push(skill);
  }

  // Return only non-empty groups in order
  return sourceOrder
    .map((source) => ({ source, skills: groups.get(source) ?? [] }))
    .filter((group) => group.skills.length > 0);
}

interface SkillBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'user' | 'project' | 'local';

export function SkillBrowserDialog({ isOpen, onClose }: SkillBrowserDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSkills, setUserSkills] = useState<SkillReference[]>([]);
  const [projectSkills, setProjectSkills] = useState<SkillReference[]>([]);
  const [localSkills, setLocalSkills] = useState<SkillReference[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillReference | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('user');
  const [isSkillCreationOpen, setIsSkillCreationOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  // Settings step state
  const [showSettingsStep, setShowSettingsStep] = useState(false);
  const [pendingExecutionMode, setPendingExecutionMode] = useState<'load' | 'execute'>('execute');
  const [pendingExecutionPrompt, setPendingExecutionPrompt] = useState('');

  const { addNode, nodes } = useWorkflowStore();

  /**
   * 既存のノードと重ならない位置を計算する
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

  // Load Skills when dialog opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadSkills = async () => {
      setLoading(true);
      setError(null);
      setSelectedSkill(null);

      try {
        const skills = await browseSkills();
        const user = skills.filter((s) => s.scope === 'user');
        const project = skills.filter((s) => s.scope === 'project');
        const local = skills.filter((s) => s.scope === 'local');

        setUserSkills(user);
        setProjectSkills(project);
        setLocalSkills(local);

        // Switch to tab with skills if current tab is empty
        if (user.length === 0) {
          if (project.length > 0) {
            setActiveTab('project');
          } else if (local.length > 0) {
            setActiveTab('local');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('skill.error.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadSkills();
  }, [isOpen, t]);

  /**
   * Handle refresh button click
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const skills = await browseSkills();
      const user = skills.filter((s) => s.scope === 'user');
      const project = skills.filter((s) => s.scope === 'project');
      const local = skills.filter((s) => s.scope === 'local');

      setUserSkills(user);
      setProjectSkills(project);
      setLocalSkills(local);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('skill.error.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleGoToSettings = () => {
    if (!selectedSkill) {
      setError(t('skill.error.noSelection'));
      return;
    }
    setPendingExecutionMode('execute');
    setPendingExecutionPrompt('');
    setShowSettingsStep(true);
  };

  const handleBackToList = () => {
    setShowSettingsStep(false);
  };

  const handleAddSkillWithSettings = () => {
    if (!selectedSkill) return;

    const position = calculateNonOverlappingPosition(300, 250);

    addNode({
      id: `skill-${Date.now()}`,
      type: NodeType.Skill,
      position,
      data: {
        name: selectedSkill.name,
        description: selectedSkill.description,
        skillPath: selectedSkill.skillPath,
        scope: selectedSkill.scope,
        validationStatus: selectedSkill.validationStatus,
        allowedTools: selectedSkill.allowedTools,
        outputPorts: 1,
        source: selectedSkill.source,
        executionMode: pendingExecutionMode,
        executionPrompt:
          pendingExecutionMode === 'execute' ? pendingExecutionPrompt || undefined : undefined,
      },
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedSkill(null);
    setError(null);
    setLoading(false);
    setFilterText('');
    setShowSettingsStep(false);
    onClose();
  };

  const handleSkillCreate = async (formData: CreateSkillFormData) => {
    await createSkill({
      name: formData.name,
      description: formData.description,
      instructions: formData.instructions,
      allowedTools: formData.allowedTools,
      scope: formData.scope as 'user' | 'project',
    });
    // Refresh skill list after creation
    const skills = await browseSkills();
    const user = skills.filter((s) => s.scope === 'user');
    const project = skills.filter((s) => s.scope === 'project');
    const local = skills.filter((s) => s.scope === 'local');
    setUserSkills(user);
    setProjectSkills(project);
    setLocalSkills(local);
  };

  // Compute filtered skills for ALL tabs simultaneously
  const filterLower = filterText.toLowerCase().trim();

  const filteredUserSkills = filterLower
    ? userSkills.filter((skill) => skill.name.toLowerCase().includes(filterLower))
    : userSkills;

  const filteredProjectSkills = filterLower
    ? projectSkills.filter((skill) => skill.name.toLowerCase().includes(filterLower))
    : projectSkills;

  const filteredLocalSkills = filterLower
    ? localSkills.filter((skill) => skill.name.toLowerCase().includes(filterLower))
    : localSkills;

  // Get skills for current tab (for list rendering)
  const currentSkills =
    activeTab === 'user'
      ? filteredUserSkills
      : activeTab === 'project'
        ? filteredProjectSkills
        : filteredLocalSkills;

  // Clear selection when selected skill is filtered out
  useEffect(() => {
    if (selectedSkill && !currentSkills.some((s) => s.skillPath === selectedSkill.skillPath)) {
      setSelectedSkill(null);
    }
  }, [currentSkills, selectedSkill]);

  // Group current skills by source
  const groupedSkills = useMemo(() => groupSkillsBySource(currentSkills), [currentSkills]);

  // Scroll to section by source
  const scrollToSection = (source: SourceType) => {
    const element = document.getElementById(`skill-section-${source}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
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
              {t('skill.browser.title')}
            </Dialog.Title>
            <Dialog.Description
              style={{
                margin: '0 0 20px 0',
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                lineHeight: '1.5',
              }}
            >
              {t('skill.browser.description')}
            </Dialog.Description>

            {!showSettingsStep && (
              <>
                {/* Filter Input */}
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder={t('skill.browser.filterPlaceholder')}
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '13px',
                      backgroundColor: 'var(--vscode-input-background)',
                      color: 'var(--vscode-input-foreground)',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      outline: 'none',
                    }}
                  />
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
                    onClick={() => setActiveTab('user')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      background: 'none',
                      border: 'none',
                      borderBottom:
                        activeTab === 'user' ? '2px solid var(--vscode-focusBorder)' : 'none',
                      color:
                        activeTab === 'user'
                          ? 'var(--vscode-foreground)'
                          : 'var(--vscode-descriptionForeground)',
                      cursor: 'pointer',
                      fontWeight: activeTab === 'user' ? 600 : 400,
                    }}
                  >
                    {t('skill.browser.userTab')} ({filteredUserSkills.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('project')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      background: 'none',
                      border: 'none',
                      borderBottom:
                        activeTab === 'project' ? '2px solid var(--vscode-focusBorder)' : 'none',
                      color:
                        activeTab === 'project'
                          ? 'var(--vscode-foreground)'
                          : 'var(--vscode-descriptionForeground)',
                      cursor: 'pointer',
                      fontWeight: activeTab === 'project' ? 600 : 400,
                    }}
                  >
                    {t('skill.browser.projectTab')} ({filteredProjectSkills.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('local')}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      background: 'none',
                      border: 'none',
                      borderBottom:
                        activeTab === 'local' ? '2px solid var(--vscode-focusBorder)' : 'none',
                      color:
                        activeTab === 'local'
                          ? 'var(--vscode-foreground)'
                          : 'var(--vscode-descriptionForeground)',
                      cursor: 'pointer',
                      fontWeight: activeTab === 'local' ? 600 : 400,
                    }}
                  >
                    {t('skill.browser.localTab')} ({filteredLocalSkills.length})
                  </button>
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
                  {activeTab === 'user' && t('skill.browser.userDescription')}
                  {activeTab === 'project' && t('skill.browser.projectDescription')}
                  {activeTab === 'local' && t('skill.browser.localDescription')}
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: '1px solid var(--vscode-panel-border)',
                    borderRadius: '4px',
                    cursor: refreshing || loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{refreshing ? t('skill.refreshing') : t('skill.action.refresh')}</span>
                </button>

                {/* Loading State */}
                {loading && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--vscode-descriptionForeground)',
                    }}
                  >
                    {t('skill.browser.loading')}
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

                {/* Jump Navigation */}
                {!loading && !error && groupedSkills.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    {groupedSkills.map((group) => (
                      <button
                        key={group.source}
                        type="button"
                        onClick={() => scrollToSection(group.source)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          backgroundColor: 'var(--vscode-button-secondaryBackground)',
                          color: 'var(--vscode-button-secondaryForeground)',
                          border: '1px solid var(--vscode-panel-border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <AIProviderBadge provider={group.source as AIProviderType} size="small" />
                        <span>({group.skills.length})</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Skills List */}
                {!loading && !error && currentSkills.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--vscode-descriptionForeground)',
                    }}
                  >
                    {t('skill.browser.noSkills')}
                  </div>
                )}

                {!loading && !error && currentSkills.length > 0 && (
                  <div
                    style={{
                      border: '1px solid var(--vscode-panel-border)',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto',
                    }}
                  >
                    {groupedSkills.map((group) => (
                      <div key={group.source} id={`skill-section-${group.source}`}>
                        {/* Section Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px',
                            backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
                            borderBottom: '1px solid var(--vscode-panel-border)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          <AIProviderBadge
                            provider={group.source as AIProviderType}
                            size="medium"
                          />
                          <span
                            style={{
                              fontSize: '12px',
                              color: 'var(--vscode-descriptionForeground)',
                            }}
                          >
                            ({group.skills.length})
                          </span>
                        </div>

                        {/* Skills in this group */}
                        {group.skills.map((skill) => (
                          <div
                            key={skill.skillPath}
                            onClick={() => setSelectedSkill(skill)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedSkill(skill);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            style={{
                              padding: '12px',
                              borderBottom: '1px solid var(--vscode-panel-border)',
                              cursor: 'pointer',
                              backgroundColor:
                                selectedSkill?.skillPath === skill.skillPath
                                  ? 'var(--vscode-list-activeSelectionBackground)'
                                  : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (selectedSkill?.skillPath !== skill.skillPath) {
                                e.currentTarget.style.backgroundColor =
                                  'var(--vscode-list-hoverBackground)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedSkill?.skillPath !== skill.skillPath) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '4px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: 'var(--vscode-foreground)',
                                  }}
                                >
                                  {skill.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    backgroundColor:
                                      skill.scope === 'user'
                                        ? 'var(--vscode-badge-background)'
                                        : skill.scope === 'local'
                                          ? 'var(--vscode-terminal-ansiBlue)'
                                          : 'var(--vscode-button-secondaryBackground)',
                                    color:
                                      skill.scope === 'user'
                                        ? 'var(--vscode-badge-foreground)'
                                        : skill.scope === 'local'
                                          ? 'var(--vscode-editor-background)'
                                          : 'var(--vscode-button-secondaryForeground)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {skill.scope === 'user'
                                    ? t('skill.browser.userTab')
                                    : skill.scope === 'local'
                                      ? t('skill.browser.localTab')
                                      : t('skill.browser.projectTab')}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '11px',
                                  color:
                                    skill.validationStatus === 'valid'
                                      ? 'var(--vscode-testing-iconPassed)'
                                      : skill.validationStatus === 'missing'
                                        ? 'var(--vscode-editorWarning-foreground)'
                                        : 'var(--vscode-errorForeground)',
                                }}
                              >
                                {skill.validationStatus === 'valid'
                                  ? '✓'
                                  : skill.validationStatus === 'missing'
                                    ? '⚠'
                                    : '✗'}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'var(--vscode-descriptionForeground)',
                                marginBottom: '4px',
                              }}
                            >
                              {skill.description}
                            </div>
                            {skill.allowedTools && (
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--vscode-descriptionForeground)',
                                }}
                              >
                                {skill.allowedTools}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Create New Skill Button */}
                {!loading && (
                  <button
                    type="button"
                    onClick={() => setIsSkillCreationOpen(true)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginTop: '16px',
                      fontSize: '13px',
                      border: '1px solid var(--vscode-button-border)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      cursor: 'pointer',
                      textAlign: 'center',
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
                    + Create New Skill
                  </button>
                )}

                {/* Actions - Browse Step */}
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
                    onClick={handleClose}
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
                    {t('skill.browser.cancelButton')}
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToSettings}
                    disabled={!selectedSkill || loading}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: selectedSkill
                        ? 'var(--vscode-button-background)'
                        : 'var(--vscode-button-secondaryBackground)',
                      color: selectedSkill
                        ? 'var(--vscode-button-foreground)'
                        : 'var(--vscode-descriptionForeground)',
                      cursor: selectedSkill ? 'pointer' : 'not-allowed',
                      opacity: selectedSkill ? 1 : 0.5,
                    }}
                  >
                    {t('skill.browser.configureButton')}
                  </button>
                </div>
              </>
            )}

            {/* Settings Step */}
            {showSettingsStep && selectedSkill && (
              <>
                {/* Selected Skill Info */}
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '12px',
                    backgroundColor: 'var(--vscode-list-inactiveSelectionBackground)',
                    border: '1px solid var(--vscode-panel-border)',
                    borderRadius: '4px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--vscode-foreground)',
                      marginBottom: '4px',
                    }}
                  >
                    {selectedSkill.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--vscode-descriptionForeground)',
                    }}
                  >
                    {selectedSkill.description}
                  </div>
                </div>

                {/* Execution Mode Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label
                    htmlFor="browser-execution-mode-execute"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--vscode-foreground)',
                      marginBottom: '12px',
                    }}
                  >
                    {t('property.skill.executionMode')}
                  </label>

                  {/* Execute Option */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '4px',
                      border: `1px solid ${pendingExecutionMode === 'execute' ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
                      backgroundColor:
                        pendingExecutionMode === 'execute'
                          ? 'var(--vscode-list-activeSelectionBackground)'
                          : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      id="browser-execution-mode-execute"
                      type="radio"
                      name="browserExecutionMode"
                      value="execute"
                      checked={pendingExecutionMode === 'execute'}
                      onChange={() => setPendingExecutionMode('execute')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('property.skill.executionMode.execute')}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--vscode-descriptionForeground)',
                          marginTop: '4px',
                        }}
                      >
                        {t('property.skill.executionMode.execute.description')}
                      </div>
                    </div>
                  </label>

                  {/* Load Option */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px',
                      borderRadius: '4px',
                      border: `1px solid ${pendingExecutionMode === 'load' ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
                      backgroundColor:
                        pendingExecutionMode === 'load'
                          ? 'var(--vscode-list-activeSelectionBackground)'
                          : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="browserExecutionMode"
                      value="load"
                      checked={pendingExecutionMode === 'load'}
                      onChange={() => setPendingExecutionMode('load')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--vscode-foreground)',
                        }}
                      >
                        {t('property.skill.executionMode.load')}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--vscode-descriptionForeground)',
                          marginTop: '4px',
                        }}
                      >
                        {t('property.skill.executionMode.load.description')}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Execution Prompt (only for execute mode) */}
                {pendingExecutionMode === 'execute' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      htmlFor="browser-execution-prompt"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--vscode-foreground)',
                        marginBottom: '8px',
                      }}
                    >
                      {t('property.skill.executionPrompt')}
                    </label>
                    <textarea
                      id="browser-execution-prompt"
                      value={pendingExecutionPrompt}
                      onChange={(e) => setPendingExecutionPrompt(e.target.value)}
                      placeholder={t('property.skill.executionPrompt.placeholder')}
                      maxLength={VALIDATION_RULES.SKILL.EXECUTION_PROMPT_MAX_LENGTH}
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        backgroundColor: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        border: '1px solid var(--vscode-input-border)',
                        borderRadius: '4px',
                        resize: 'vertical',
                        outline: 'none',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--vscode-descriptionForeground)',
                        marginTop: '4px',
                        textAlign: 'right',
                      }}
                    >
                      {pendingExecutionPrompt.length} /{' '}
                      {VALIDATION_RULES.SKILL.EXECUTION_PROMPT_MAX_LENGTH}
                    </div>
                  </div>
                )}

                {/* Actions - Settings Step */}
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
                    onClick={handleBackToList}
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
                    {t('skill.browser.backToList')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSkillWithSettings}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: 'var(--vscode-button-background)',
                      color: 'var(--vscode-button-foreground)',
                      cursor: 'pointer',
                    }}
                  >
                    {t('skill.browser.addButton')}
                  </button>
                </div>
              </>
            )}

            {/* Skill Creation Dialog - nested dialog */}
            <SkillCreationDialog
              isOpen={isSkillCreationOpen}
              onClose={() => setIsSkillCreationOpen(false)}
              onSubmit={handleSkillCreate}
            />
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
