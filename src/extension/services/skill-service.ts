/**
 * Skill Service - File I/O Operations for Skills
 *
 * Feature: 001-skill-node
 * Purpose: Scan, validate, and create SKILL.md files
 *
 * Based on: specs/001-skill-node/research.md Section 2
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { SkillReference, CreateSkillPayload } from '../../shared/types/messages';
import { parseSkillFrontmatter, type SkillMetadata } from './yaml-parser';
import { getPersonalSkillsDir, getProjectSkillsDir } from '../utils/path-utils';

/**
 * Scan a Skills directory and return available Skills
 *
 * @param baseDir - Base directory to scan (e.g., ~/.claude/skills/)
 * @param scope - Skill scope ('personal' or 'project')
 * @returns Array of Skill references
 *
 * @example
 * ```typescript
 * const personalSkills = await scanSkills('/Users/alice/.claude/skills', 'personal');
 * // [{ name: 'my-skill', description: '...', scope: 'personal', ... }]
 * ```
 */
export async function scanSkills(
  baseDir: string,
  scope: 'personal' | 'project'
): Promise<SkillReference[]> {
  const skills: SkillReference[] = [];

  try {
    const subdirs = await fs.readdir(baseDir, { withFileTypes: true });

    for (const dirent of subdirs) {
      if (!dirent.isDirectory()) {
        continue; // Skip non-directories
      }

      const skillPath = path.join(baseDir, dirent.name, 'SKILL.md');

      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        const metadata = parseSkillFrontmatter(content);

        if (metadata) {
          skills.push({
            skillPath,
            name: metadata.name,
            description: metadata.description,
            scope,
            validationStatus: 'valid',
            allowedTools: metadata.allowedTools,
          });
        } else {
          // Invalid frontmatter - log and skip
          console.warn(`[Skill Service] Invalid YAML frontmatter in ${skillPath}`);
        }
      } catch (err) {
        // File not found or read error - skip this Skill
        console.warn(`[Skill Service] Failed to read ${skillPath}:`, err);
      }
    }
  } catch (err) {
    // Directory doesn't exist - return empty array
    console.warn(`[Skill Service] Skill directory not found: ${baseDir}`);
  }

  return skills;
}

/**
 * Scan both personal and project Skills
 *
 * @returns Object containing personal and project Skills
 */
export async function scanAllSkills(): Promise<{
  personal: SkillReference[];
  project: SkillReference[];
}> {
  const personalDir = getPersonalSkillsDir();
  const projectDir = getProjectSkillsDir();

  const [personal, project] = await Promise.all([
    scanSkills(personalDir, 'personal'),
    projectDir ? scanSkills(projectDir, 'project') : Promise.resolve([]),
  ]);

  return { personal, project };
}

/**
 * Validate a SKILL.md file and return metadata
 *
 * @param skillPath - Absolute path to SKILL.md file
 * @returns Skill metadata
 * @throws Error if file not found or invalid frontmatter
 */
export async function validateSkillFile(skillPath: string): Promise<SkillMetadata> {
  try {
    const content = await fs.readFile(skillPath, 'utf-8');
    const metadata = parseSkillFrontmatter(content);

    if (!metadata) {
      throw new Error('Invalid SKILL.md frontmatter: missing required fields (name or description)');
    }

    return metadata;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`SKILL.md file not found at ${skillPath}`);
    }
    throw err;
  }
}

/**
 * Create a new Skill
 *
 * @param _payload - Skill creation payload (unused until Phase 5)
 * @returns Absolute path to created SKILL.md file
 * @throws Error if validation fails or file write fails
 *
 * NOTE: Full implementation will be added in Phase 5 (T024-T025)
 */
export async function createSkill(_payload: CreateSkillPayload): Promise<string> {
  // Phase 5: T024-T025 will implement this
  throw new Error('Not implemented: createSkill() will be implemented in Phase 5');
}
