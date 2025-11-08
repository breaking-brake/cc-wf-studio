/**
 * Skill Node Integration - Extension ↔ Webview Message Contracts
 *
 * Feature: 001-skill-node
 * Purpose: Define all message types for Skill-related operations
 *
 * This file documents the message contracts. Actual implementation will be in:
 * - src/shared/types/messages.ts (add new message types)
 * - src/extension/commands/skill-operations.ts (handle messages)
 * - src/webview/src/services/skill-browser-service.ts (send messages)
 */

// ============================================================================
// Shared Types (to be added to src/shared/types/messages.ts)
// ============================================================================

/**
 * Skill reference data (from Extension to Webview)
 */
export interface SkillReference {
  /** Absolute path to SKILL.md file */
  skillPath: string;

  /** Skill name (from YAML frontmatter) */
  name: string;

  /** Skill description (from YAML frontmatter) */
  description: string;

  /** Skill scope: personal or project */
  scope: 'personal' | 'project';

  /** Validation status */
  validationStatus: 'valid' | 'invalid';

  /** Optional: Allowed tools (from YAML frontmatter) */
  allowedTools?: string;
}

/**
 * Create Skill request payload (from Webview to Extension)
 */
export interface CreateSkillPayload {
  /** Skill name (lowercase, hyphens, max 64 chars) */
  name: string;

  /** Skill description (max 1024 chars) */
  description: string;

  /** Markdown content for Skill instructions */
  instructions: string;

  /** Optional: Comma-separated allowed tools */
  allowedTools?: string;

  /** Scope: personal or project */
  scope: 'personal' | 'project';
}

/**
 * Skill creation success response (from Extension to Webview)
 */
export interface SkillCreationSuccessPayload {
  /** Path to created SKILL.md file */
  skillPath: string;

  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** Scope */
  scope: 'personal' | 'project';

  /** Timestamp of creation */
  timestamp: string; // ISO 8601
}

/**
 * Skill validation error (from Extension to Webview)
 */
export interface SkillValidationErrorPayload {
  /** Error code for i18n lookup */
  errorCode:
    | 'SKILL_NOT_FOUND'
    | 'INVALID_FRONTMATTER'
    | 'NAME_CONFLICT'
    | 'INVALID_NAME_FORMAT'
    | 'DESCRIPTION_TOO_LONG'
    | 'INSTRUCTIONS_EMPTY'
    | 'FILE_WRITE_ERROR'
    | 'UNKNOWN_ERROR';

  /** Human-readable error message (English fallback) */
  errorMessage: string;

  /** Optional: File path related to error */
  filePath?: string;

  /** Optional: Additional details for debugging */
  details?: string;
}

/**
 * Skill list loaded response (from Extension to Webview)
 */
export interface SkillListLoadedPayload {
  /** Array of available Skills (personal + project) */
  skills: SkillReference[];

  /** Timestamp of scan */
  timestamp: string; // ISO 8601

  /** Number of personal Skills found */
  personalCount: number;

  /** Number of project Skills found */
  projectCount: number;
}

/**
 * Validate Skill file request (from Webview to Extension)
 */
export interface ValidateSkillFilePayload {
  /** Path to SKILL.md file to validate */
  skillPath: string;
}

/**
 * Skill validation success response (from Extension to Webview)
 */
export interface SkillValidationSuccessPayload {
  /** Validated Skill reference */
  skill: SkillReference;
}

// ============================================================================
// Webview → Extension Messages
// ============================================================================

/**
 * Request to browse available Skills
 * Triggers scan of ~/.claude/skills/ and .claude/skills/
 */
export interface BrowseSkillsMessage {
  type: 'BROWSE_SKILLS';
  requestId: string;
  payload?: undefined; // No payload needed
}

/**
 * Request to create a new Skill
 */
export interface CreateSkillMessage {
  type: 'CREATE_SKILL';
  requestId: string;
  payload: CreateSkillPayload;
}

/**
 * Request to validate a Skill file
 * Used when loading workflows with Skill nodes
 */
export interface ValidateSkillFileMessage {
  type: 'VALIDATE_SKILL_FILE';
  requestId: string;
  payload: ValidateSkillFilePayload;
}

/**
 * Union type for all Webview → Extension Skill messages
 */
export type WebviewSkillMessage =
  | BrowseSkillsMessage
  | CreateSkillMessage
  | ValidateSkillFileMessage;

// ============================================================================
// Extension → Webview Messages
// ============================================================================

/**
 * Response when Skill list has been loaded
 */
export interface SkillListLoadedMessage {
  type: 'SKILL_LIST_LOADED';
  requestId: string;
  payload: SkillListLoadedPayload;
}

/**
 * Response when Skill creation succeeds
 */
export interface SkillCreationSuccessMessage {
  type: 'SKILL_CREATION_SUCCESS';
  requestId: string;
  payload: SkillCreationSuccessPayload;
}

/**
 * Response when Skill creation fails
 */
export interface SkillCreationFailedMessage {
  type: 'SKILL_CREATION_FAILED';
  requestId: string;
  payload: SkillValidationErrorPayload;
}

/**
 * Response when Skill validation succeeds
 */
export interface SkillValidationSuccessMessage {
  type: 'SKILL_VALIDATION_SUCCESS';
  requestId: string;
  payload: SkillValidationSuccessPayload;
}

/**
 * Response when Skill validation fails
 */
export interface SkillValidationFailedMessage {
  type: 'SKILL_VALIDATION_FAILED';
  requestId: string;
  payload: SkillValidationErrorPayload;
}

/**
 * Union type for all Extension → Webview Skill messages
 */
export type ExtensionSkillMessage =
  | SkillListLoadedMessage
  | SkillCreationSuccessMessage
  | SkillCreationFailedMessage
  | SkillValidationSuccessMessage
  | SkillValidationFailedMessage;

// ============================================================================
// Message Flow Examples
// ============================================================================

/**
 * Example 1: Browse Skills
 *
 * Webview → Extension:
 * {
 *   type: 'BROWSE_SKILLS',
 *   requestId: 'browse-123'
 * }
 *
 * Extension → Webview (Success):
 * {
 *   type: 'SKILL_LIST_LOADED',
 *   requestId: 'browse-123',
 *   payload: {
 *     skills: [
 *       {
 *         skillPath: '/Users/alice/.claude/skills/pdf-filler/SKILL.md',
 *         name: 'pdf-filler',
 *         description: 'Fills PDF forms',
 *         scope: 'personal',
 *         validationStatus: 'valid',
 *         allowedTools: 'Read, Write'
 *       },
 *       {
 *         skillPath: '/workspace/myproject/.claude/skills/code-reviewer/SKILL.md',
 *         name: 'code-reviewer',
 *         description: 'Reviews code',
 *         scope: 'project',
 *         validationStatus: 'valid'
 *       }
 *     ],
 *     timestamp: '2025-11-08T12:34:56.789Z',
 *     personalCount: 1,
 *     projectCount: 1
 *   }
 * }
 *
 * Extension → Webview (Error - no Skills found):
 * {
 *   type: 'SKILL_LIST_LOADED',
 *   requestId: 'browse-123',
 *   payload: {
 *     skills: [],
 *     timestamp: '2025-11-08T12:34:56.789Z',
 *     personalCount: 0,
 *     projectCount: 0
 *   }
 * }
 */

/**
 * Example 2: Create Skill
 *
 * Webview → Extension:
 * {
 *   type: 'CREATE_SKILL',
 *   requestId: 'create-456',
 *   payload: {
 *     name: 'test-generator',
 *     description: 'Generates unit tests for TypeScript code',
 *     instructions: '# Test Generator\n\nAnalyze TypeScript code...',
 *     allowedTools: 'Read, Write',
 *     scope: 'project'
 *   }
 * }
 *
 * Extension → Webview (Success):
 * {
 *   type: 'SKILL_CREATION_SUCCESS',
 *   requestId: 'create-456',
 *   payload: {
 *     skillPath: '/workspace/myproject/.claude/skills/test-generator/SKILL.md',
 *     name: 'test-generator',
 *     description: 'Generates unit tests for TypeScript code',
 *     scope: 'project',
 *     timestamp: '2025-11-08T12:35:00.123Z'
 *   }
 * }
 *
 * Extension → Webview (Error - Name Conflict):
 * {
 *   type: 'SKILL_CREATION_FAILED',
 *   requestId: 'create-456',
 *   payload: {
 *     errorCode: 'NAME_CONFLICT',
 *     errorMessage: 'A Skill with this name already exists in .claude/skills/',
 *     filePath: '/workspace/myproject/.claude/skills/test-generator/',
 *     details: 'Choose a different name or delete the existing Skill directory.'
 *   }
 * }
 *
 * Extension → Webview (Error - Invalid Name):
 * {
 *   type: 'SKILL_CREATION_FAILED',
 *   requestId: 'create-456',
 *   payload: {
 *     errorCode: 'INVALID_NAME_FORMAT',
 *     errorMessage: 'Skill name must be lowercase, use hyphens only (max 64 chars)',
 *     details: 'Provided name: "Test Generator" (contains spaces and uppercase)'
 *   }
 * }
 */

/**
 * Example 3: Validate Skill File
 *
 * Webview → Extension:
 * {
 *   type: 'VALIDATE_SKILL_FILE',
 *   requestId: 'validate-789',
 *   payload: {
 *     skillPath: '/Users/alice/.claude/skills/pdf-filler/SKILL.md'
 *   }
 * }
 *
 * Extension → Webview (Success):
 * {
 *   type: 'SKILL_VALIDATION_SUCCESS',
 *   requestId: 'validate-789',
 *   payload: {
 *     skill: {
 *       skillPath: '/Users/alice/.claude/skills/pdf-filler/SKILL.md',
 *       name: 'pdf-filler',
 *       description: 'Fills PDF forms',
 *       scope: 'personal',
 *       validationStatus: 'valid',
 *       allowedTools: 'Read, Write'
 *     }
 *   }
 * }
 *
 * Extension → Webview (Error - File Not Found):
 * {
 *   type: 'SKILL_VALIDATION_FAILED',
 *   requestId: 'validate-789',
 *   payload: {
 *     errorCode: 'SKILL_NOT_FOUND',
 *     errorMessage: 'SKILL.md file not found at specified path',
 *     filePath: '/Users/alice/.claude/skills/pdf-filler/SKILL.md',
 *     details: 'File may have been deleted or moved.'
 *   }
 * }
 *
 * Extension → Webview (Error - Invalid Frontmatter):
 * {
 *   type: 'SKILL_VALIDATION_FAILED',
 *   requestId: 'validate-789',
 *   payload: {
 *     errorCode: 'INVALID_FRONTMATTER',
 *     errorMessage: 'Invalid YAML frontmatter: missing required field "description"',
 *     filePath: '/Users/alice/.claude/skills/pdf-filler/SKILL.md',
 *     details: 'YAML frontmatter must include both "name:" and "description:" fields.'
 *   }
 * }
 */

// ============================================================================
// Error Code Mapping for i18n
// ============================================================================

/**
 * Error codes should map to translation keys in i18n files:
 *
 * en.ts:
 * {
 *   skill: {
 *     errors: {
 *       SKILL_NOT_FOUND: 'SKILL.md file not found at {filePath}',
 *       INVALID_FRONTMATTER: 'Invalid YAML frontmatter: {details}',
 *       NAME_CONFLICT: 'A Skill with this name already exists',
 *       INVALID_NAME_FORMAT: 'Skill name must be lowercase, use hyphens only',
 *       DESCRIPTION_TOO_LONG: 'Description must be 1024 characters or less',
 *       INSTRUCTIONS_EMPTY: 'Instructions cannot be empty',
 *       FILE_WRITE_ERROR: 'Failed to write SKILL.md file: {details}',
 *       UNKNOWN_ERROR: 'An unexpected error occurred: {details}'
 *     }
 *   }
 * }
 *
 * ja.ts:
 * {
 *   skill: {
 *     errors: {
 *       SKILL_NOT_FOUND: 'SKILL.mdファイルが見つかりません: {filePath}',
 *       INVALID_FRONTMATTER: 'YAML frontmatterが無効です: {details}',
 *       NAME_CONFLICT: 'この名前のスキルは既に存在します',
 *       INVALID_NAME_FORMAT: 'スキル名は小文字とハイフンのみを使用してください',
 *       DESCRIPTION_TOO_LONG: '説明文は1024文字以内で入力してください',
 *       INSTRUCTIONS_EMPTY: '指示内容を入力してください',
 *       FILE_WRITE_ERROR: 'SKILL.mdファイルの書き込みに失敗しました: {details}',
 *       UNKNOWN_ERROR: '予期しないエラーが発生しました: {details}'
 *     }
 *   }
 * }
 */

// ============================================================================
// Integration Points
// ============================================================================

/**
 * Implementation Checklist:
 *
 * 1. Update src/shared/types/messages.ts:
 *    - Add SkillReference, CreateSkillPayload, SkillListLoadedPayload, etc.
 *    - Add WebviewSkillMessage to WebviewMessage union type
 *    - Add ExtensionSkillMessage to ExtensionMessage union type
 *
 * 2. Create src/extension/commands/skill-operations.ts:
 *    - Export handleBrowseSkills(webview, requestId)
 *    - Export handleCreateSkill(payload, webview, requestId)
 *    - Export handleValidateSkillFile(payload, webview, requestId)
 *    - Register message handlers in extension.ts
 *
 * 3. Create src/extension/services/skill-service.ts:
 *    - Export scanSkills(baseDir: string): Promise<SkillReference[]>
 *    - Export createSkill(payload: CreateSkillPayload): Promise<string>
 *    - Export validateSkillFile(skillPath: string): Promise<SkillMetadata>
 *
 * 4. Create src/extension/services/yaml-parser.ts:
 *    - Export parseSkillFrontmatter(content: string): SkillMetadata | null
 *
 * 5. Create src/webview/src/services/skill-browser-service.ts:
 *    - Export browseSkills(): Promise<SkillReference[]>
 *    - Export createSkill(payload: CreateSkillPayload): Promise<SkillCreationSuccessPayload>
 *    - Export validateSkillFile(skillPath: string): Promise<SkillReference>
 *
 * 6. Update i18n files (en.ts, ja.ts, ko.ts, zh-CN.ts, zh-TW.ts):
 *    - Add skill.errors translation keys
 *    - Add skill.browser, skill.creation dialog strings
 */
