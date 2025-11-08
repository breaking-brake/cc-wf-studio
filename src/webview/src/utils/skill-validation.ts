/**
 * Skill Validation Utilities
 *
 * Feature: 001-skill-node
 * Purpose: Validate CreateSkillPayload before submission
 *
 * Based on: specs/001-skill-node/data-model.md Section "CreateSkillPayload Validation"
 */

export interface SkillValidationErrors {
  name?: string;
  description?: string;
  instructions?: string;
  scope?: string;
}

/**
 * Validate Skill name format
 *
 * Rules:
 * - Pattern: ^[a-z0-9-]+$ (lowercase letters, numbers, hyphens only)
 * - Length: 1-64 characters
 *
 * @param name - Skill name to validate
 * @returns Error message or null if valid
 */
export function validateSkillName(name: string): string | null {
  // Empty check
  if (!name || name.trim().length === 0) {
    return 'skill.validation.nameRequired';
  }

  // Length check
  if (name.length > 64) {
    return 'skill.validation.nameTooLong';
  }

  // Pattern check (lowercase, numbers, hyphens only)
  const pattern = /^[a-z0-9-]+$/;
  if (!pattern.test(name)) {
    return 'skill.validation.nameInvalidFormat';
  }

  return null;
}

/**
 * Validate Skill description
 *
 * Rules:
 * - Length: 1-1024 characters
 *
 * @param description - Skill description to validate
 * @returns Error message or null if valid
 */
export function validateSkillDescription(description: string): string | null {
  // Empty check
  if (!description || description.trim().length === 0) {
    return 'skill.validation.descriptionRequired';
  }

  // Length check
  if (description.length > 1024) {
    return 'skill.validation.descriptionTooLong';
  }

  return null;
}

/**
 * Validate Skill instructions
 *
 * Rules:
 * - Length: ≥1 character
 *
 * @param instructions - Skill instructions (markdown) to validate
 * @returns Error message or null if valid
 */
export function validateSkillInstructions(instructions: string): string | null {
  // Empty check
  if (!instructions || instructions.trim().length === 0) {
    return 'skill.validation.instructionsRequired';
  }

  return null;
}

/**
 * Validate Skill scope selection
 *
 * Rules:
 * - Must be either 'personal' or 'project'
 *
 * @param scope - Skill scope to validate
 * @returns Error message or null if valid
 */
export function validateSkillScope(scope: 'personal' | 'project' | ''): string | null {
  if (!scope || (scope !== 'personal' && scope !== 'project')) {
    return 'skill.validation.scopeRequired';
  }

  return null;
}

/**
 * Validate all CreateSkillPayload fields
 *
 * @param payload - Skill creation payload
 * @returns Object with validation errors (empty if all valid)
 */
export function validateCreateSkillPayload(payload: {
  name: string;
  description: string;
  instructions: string;
  scope: 'personal' | 'project' | '';
}): SkillValidationErrors {
  const errors: SkillValidationErrors = {};

  const nameError = validateSkillName(payload.name);
  if (nameError) {
    errors.name = nameError;
  }

  const descriptionError = validateSkillDescription(payload.description);
  if (descriptionError) {
    errors.description = descriptionError;
  }

  const instructionsError = validateSkillInstructions(payload.instructions);
  if (instructionsError) {
    errors.instructions = instructionsError;
  }

  const scopeError = validateSkillScope(payload.scope);
  if (scopeError) {
    errors.scope = scopeError;
  }

  return errors;
}
