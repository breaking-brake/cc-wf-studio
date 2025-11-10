/**
 * Skill Browser Dialog Component
 *
 * Feature: 001-skill-node
 * Purpose: Browse and select Claude Code Skills to add to workflow
 *
 * Based on: specs/001-skill-node/design.md Section 6.2
 */

import type { SkillReference } from '@shared/types/messages';
import { NodeType } from '@shared/types/workflow-definition';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { browseSkills, createSkill } from '../../services/skill-browser-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import { type CreateSkillFormData, SkillCreationDialog } from './SkillCreationDialog';

interface SkillBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'personal' | 'project';

export function SkillBrowserDialog({ isOpen, onClose }: SkillBrowserDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalSkills, setPersonalSkills] = useState<SkillReference[]>([]);
  const [projectSkills, setProjectSkills] = useState<SkillReference[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillReference | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [isSkillCreationOpen, setIsSkillCreationOpen] = useState(false);

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
        const personal = skills.filter((s) => s.scope === 'personal');
        const project = skills.filter((s) => s.scope === 'project');

        setPersonalSkills(personal);
        setProjectSkills(project);

        // Switch to project tab if no personal skills
        if (personal.length === 0 && project.length > 0) {
          setActiveTab('project');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('skill.error.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadSkills();
  }, [isOpen, t]);

  if (!isOpen) {
    return null;
  }

  const handleAddSkill = () => {
    if (!selectedSkill) {
      setError(t('skill.error.noSelection'));
      return;
    }

    // Add Skill node to canvas
    const position = calculateNonOverlappingPosition(300, 250);

    // For project Skills, skillPath is already relative from Extension
    // For personal Skills, skillPath is absolute
    // No conversion needed here - Extension already provides the correct format
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
      },
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedSkill(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleSkillCreate = async (formData: CreateSkillFormData) => {
    await createSkill({
      name: formData.name,
      description: formData.description,
      instructions: formData.instructions,
      allowedTools: formData.allowedTools,
      scope: formData.scope as 'personal' | 'project',
    });
    // Refresh skill list after creation
    const skills = await browseSkills();
    const personal = skills.filter((s) => s.scope === 'personal');
    const project = skills.filter((s) => s.scope === 'project');
    setPersonalSkills(personal);
    setProjectSkills(project);
  };

  const currentSkills = activeTab === 'personal' ? personalSkills : projectSkills;

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
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <h2
          style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
          }}
        >
          {t('skill.browser.title')}
        </h2>
        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground)',
            lineHeight: '1.5',
          }}
        >
          {t('skill.browser.description')}
        </p>

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
            onClick={() => setActiveTab('personal')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              background: 'none',
              border: 'none',
              borderBottom:
                activeTab === 'personal' ? '2px solid var(--vscode-focusBorder)' : 'none',
              color:
                activeTab === 'personal'
                  ? 'var(--vscode-foreground)'
                  : 'var(--vscode-descriptionForeground)',
              cursor: 'pointer',
              fontWeight: activeTab === 'personal' ? 600 : 400,
            }}
          >
            {t('skill.browser.personalTab')} ({personalSkills.length})
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
            {t('skill.browser.projectTab')} ({projectSkills.length})
          </button>
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
            {currentSkills.map((skill) => (
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
                    e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
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
                          skill.scope === 'personal'
                            ? 'var(--vscode-badge-background)'
                            : 'var(--vscode-button-secondaryBackground)',
                        color:
                          skill.scope === 'personal'
                            ? 'var(--vscode-badge-foreground)'
                            : 'var(--vscode-button-secondaryForeground)',
                        fontWeight: 500,
                      }}
                    >
                      {skill.scope === 'personal'
                        ? t('skill.browser.personalTab')
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
                    🔧 {skill.allowedTools}
                  </div>
                )}
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
              e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
            }}
          >
            + Create New Skill
          </button>
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
            onClick={handleAddSkill}
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
            {t('skill.browser.selectButton')}
          </button>
        </div>
      </div>

      {/* Skill Creation Dialog */}
      <SkillCreationDialog
        isOpen={isSkillCreationOpen}
        onClose={() => setIsSkillCreationOpen(false)}
        onSubmit={handleSkillCreate}
      />
    </div>
  );
}
