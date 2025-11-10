/**
 * Skill Creation Dialog Component
 *
 * Feature: 001-skill-node
 * Purpose: Create new Claude Code Skills from the visual editor
 *
 * Based on: specs/001-skill-node/tasks.md T022
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';
import {
  type SkillValidationErrors,
  validateCreateSkillPayload,
} from '../../utils/skill-validation';

interface SkillCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateSkillFormData) => Promise<void>;
}

export interface CreateSkillFormData {
  name: string;
  description: string;
  instructions: string;
  allowedTools?: string;
  scope: 'personal' | 'project' | '';
}

export function SkillCreationDialog({ isOpen, onClose, onSubmit }: SkillCreationDialogProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const descriptionId = useId();
  const instructionsId = useId();
  const allowedToolsId = useId();
  const [formData, setFormData] = useState<CreateSkillFormData>({
    name: '',
    description: '',
    instructions: '',
    allowedTools: '',
    scope: '',
  });
  const [errors, setErrors] = useState<SkillValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        instructions: '',
        allowedTools: '',
        scope: '',
      });
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  const handleSubmit = useCallback(async () => {
    // Validate all fields
    const validationErrors = validateCreateSkillPayload(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clear validation errors
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      handleClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('skill.creation.error.unknown'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, handleClose, t]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: Close dialog
      if (e.key === 'Escape') {
        handleClose();
      }

      // Ctrl/Cmd + Enter: Submit form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, handleSubmit]);

  if (!isOpen) {
    return null;
  }

  const handleFieldChange = (field: keyof CreateSkillFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field as keyof SkillValidationErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof SkillValidationErrors];
        return newErrors;
      });
    }
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
          {t('skill.creation.title')}
        </h2>
        <p
          style={{
            margin: '0 0 20px 0',
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground)',
            lineHeight: '1.5',
          }}
        >
          {t('skill.creation.description')}
        </p>

        {/* Submit Error */}
        {submitError && (
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
            {submitError}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Skill Name */}
          <div>
            <label
              htmlFor="skill-name"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('skill.creation.nameLabel')} *
            </label>
            <input
              id={nameId}
              type="text"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="my-skill"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                backgroundColor: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: `1px solid ${errors.name ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'}`,
                borderRadius: '4px',
                outline: 'none',
              }}
            />
            {errors.name && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--vscode-inputValidation-errorForeground)',
                }}
              >
                {t(errors.name as unknown as keyof WebviewTranslationKeys)}
              </p>
            )}
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              {t('skill.creation.nameHint')}
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="skill-description"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('skill.creation.descriptionLabel')} *
            </label>
            <textarea
              id={descriptionId}
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder={t('skill.creation.descriptionPlaceholder')}
              disabled={isSubmitting}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                backgroundColor: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: `1px solid ${errors.description ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'}`,
                borderRadius: '4px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            {errors.description && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--vscode-inputValidation-errorForeground)',
                }}
              >
                {t(errors.description as unknown as keyof WebviewTranslationKeys)}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label
              htmlFor="skill-instructions"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('skill.creation.instructionsLabel')} *
            </label>
            <textarea
              id={instructionsId}
              value={formData.instructions}
              onChange={(e) => handleFieldChange('instructions', e.target.value)}
              placeholder={t('skill.creation.instructionsPlaceholder')}
              disabled={isSubmitting}
              rows={8}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                backgroundColor: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: `1px solid ${errors.instructions ? 'var(--vscode-inputValidation-errorBorder)' : 'var(--vscode-input-border)'}`,
                borderRadius: '4px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'var(--vscode-editor-font-family)',
              }}
            />
            {errors.instructions && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--vscode-inputValidation-errorForeground)',
                }}
              >
                {t(errors.instructions as unknown as keyof WebviewTranslationKeys)}
              </p>
            )}
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              {t('skill.creation.instructionsHint')}
            </p>
          </div>

          {/* Allowed Tools */}
          <div>
            <label
              htmlFor="skill-allowed-tools"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('skill.creation.allowedToolsLabel')}
            </label>
            <input
              id={allowedToolsId}
              type="text"
              value={formData.allowedTools}
              onChange={(e) => handleFieldChange('allowedTools', e.target.value)}
              placeholder="Read, Grep, Glob, Bash"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                backgroundColor: 'var(--vscode-input-background)',
                color: 'var(--vscode-input-foreground)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '4px',
                outline: 'none',
              }}
            />
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '11px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              {t('skill.creation.allowedToolsHint')}
            </p>
          </div>

          {/* Scope */}
          <div>
            <div
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('skill.creation.scopeLabel')} *
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: 'var(--vscode-foreground)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="scope"
                  value="personal"
                  checked={formData.scope === 'personal'}
                  onChange={(e) => handleFieldChange('scope', e.target.value)}
                  disabled={isSubmitting}
                  style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                />
                {t('skill.creation.scopePersonal')}
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: 'var(--vscode-foreground)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="scope"
                  value="project"
                  checked={formData.scope === 'project'}
                  onChange={(e) => handleFieldChange('scope', e.target.value)}
                  disabled={isSubmitting}
                  style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                />
                {t('skill.creation.scopeProject')}
              </label>
            </div>
            {errors.scope && (
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: 'var(--vscode-inputValidation-errorForeground)',
                }}
              >
                {t(errors.scope as unknown as keyof WebviewTranslationKeys)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '24px',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '4px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {t('skill.creation.cancelButton')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? t('skill.creation.creatingButton') : t('skill.creation.createButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
