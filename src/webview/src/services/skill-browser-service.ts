/**
 * Skill Browser Service - Webview to Extension Communication
 *
 * Feature: 001-skill-node
 * Purpose: Request Skill operations from Extension Host
 *
 * Based on: specs/001-skill-node/contracts/skill-messages.ts
 */

import type {
  CreateSkillPayload,
  SkillCreationSuccessPayload,
  SkillReference,
} from '../../../shared/types/messages';

// VSCode API bridge (injected by Extension Host)
declare const vscode: {
  postMessage: (message: unknown) => void;
};

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Browse available Skills (personal + project)
 *
 * Sends BROWSE_SKILLS message to Extension Host and waits for SKILL_LIST_LOADED response.
 *
 * @returns Promise resolving to array of available Skills
 * @throws Error if request times out or Extension returns error
 *
 * @example
 * ```typescript
 * const skills = await browseSkills();
 * console.log(`Found ${skills.length} Skills`);
 * ```
 */
export async function browseSkills(): Promise<SkillReference[]> {
  return new Promise((resolve, reject) => {
    const requestId = `browse-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return; // Not our response
      }

      if (message.type === 'SKILL_LIST_LOADED') {
        window.removeEventListener('message', handler);
        resolve(message.payload.skills);
      } else if (message.type === 'SKILL_VALIDATION_FAILED') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload.errorMessage));
      }
    };

    window.addEventListener('message', handler);

    // Send request to Extension Host
    vscode.postMessage({
      type: 'BROWSE_SKILLS',
      requestId,
    });

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: BROWSE_SKILLS took longer than 10 seconds'));
    }, REQUEST_TIMEOUT);
  });
}

/**
 * Create a new Skill
 *
 * Sends CREATE_SKILL message to Extension Host and waits for success/failure response.
 *
 * @param payload - Skill creation parameters
 * @returns Promise resolving to created Skill information
 * @throws Error if validation fails or request times out
 *
 * @example
 * ```typescript
 * const result = await createSkill({
 *   name: 'my-new-skill',
 *   description: 'Does something useful',
 *   instructions: '# Instructions\n...',
 *   scope: 'personal',
 * });
 * console.log(`Created Skill at ${result.skillPath}`);
 * ```
 */
export async function createSkill(
  payload: CreateSkillPayload
): Promise<SkillCreationSuccessPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `create-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return; // Not our response
      }

      if (message.type === 'SKILL_CREATION_SUCCESS') {
        window.removeEventListener('message', handler);
        resolve(message.payload);
      } else if (message.type === 'SKILL_CREATION_FAILED') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload.errorMessage));
      }
    };

    window.addEventListener('message', handler);

    // Send request to Extension Host
    vscode.postMessage({
      type: 'CREATE_SKILL',
      requestId,
      payload,
    });

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: CREATE_SKILL took longer than 10 seconds'));
    }, REQUEST_TIMEOUT);
  });
}

/**
 * Validate a SKILL.md file
 *
 * Sends VALIDATE_SKILL_FILE message to Extension Host and waits for validation result.
 *
 * @param skillPath - Absolute path to SKILL.md file
 * @returns Promise resolving to validated Skill reference
 * @throws Error if file not found, invalid, or request times out
 *
 * @example
 * ```typescript
 * const skill = await validateSkillFile('/Users/alice/.claude/skills/my-skill/SKILL.md');
 * console.log(`Skill "${skill.name}" is valid`);
 * ```
 */
export async function validateSkillFile(skillPath: string): Promise<SkillReference> {
  return new Promise((resolve, reject) => {
    const requestId = `validate-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return; // Not our response
      }

      if (message.type === 'SKILL_VALIDATION_SUCCESS') {
        window.removeEventListener('message', handler);
        resolve(message.payload.skill);
      } else if (message.type === 'SKILL_VALIDATION_FAILED') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload.errorMessage));
      }
    };

    window.addEventListener('message', handler);

    // Send request to Extension Host
    vscode.postMessage({
      type: 'VALIDATE_SKILL_FILE',
      requestId,
      payload: { skillPath },
    });

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: VALIDATE_SKILL_FILE took longer than 10 seconds'));
    }, REQUEST_TIMEOUT);
  });
}
