/**
 * SKILL.md File Generator
 *
 * Feature: 001-skill-node
 * Purpose: Generate SKILL.md file content from CreateSkillPayload
 *
 * Based on: specs/001-skill-node/tasks.md T025
 */

import type { CreateSkillPayload } from '../../shared/types/messages';

/**
 * Generate SKILL.md file content
 *
 * Format:
 * ```markdown
 * ---
 * name: [name]
 * description: [description]
 * allowed-tools: [allowedTools] (if provided)
 * ---
 *
 * [instructions]
 * ```
 *
 * @param payload - Skill creation payload
 * @returns SKILL.md file content string
 *
 * @example
 * ```typescript
 * const content = generateSkillFileContent({
 *   name: 'test-generator',
 *   description: 'Generates unit tests',
 *   instructions: '# Test Generator\n\nGenerates tests...',
 *   allowedTools: 'Read, Write',
 *   scope: 'project',
 * });
 * // Returns:
 * // ---
 * // name: test-generator
 * // description: Generates unit tests
 * // allowed-tools: Read, Write
 * // ---
 * //
 * // # Test Generator
 * //
 * // Generates tests...
 * ```
 */
export function generateSkillFileContent(payload: CreateSkillPayload): string {
  const frontmatter: string[] = [
    '---',
    `name: ${payload.name}`,
    `description: ${payload.description}`,
  ];

  // Add allowed-tools if provided
  if (payload.allowedTools && payload.allowedTools.trim().length > 0) {
    frontmatter.push(`allowed-tools: ${payload.allowedTools.trim()}`);
  }

  frontmatter.push('---');

  // Combine frontmatter and instructions
  const content = [...frontmatter, '', payload.instructions].join('\n');

  return content;
}
