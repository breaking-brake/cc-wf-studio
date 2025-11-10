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
import type { CreateSkillPayload, SkillReference } from '../../shared/types/messages';
import { getPersonalSkillsDir, getProjectSkillsDir, toRelativePath } from '../utils/path-utils';
import { generateSkillFileContent } from './skill-file-generator';
import { parseSkillFrontmatter, type SkillMetadata } from './yaml-parser';

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
          // Convert to relative path for project Skills (T020)
          const pathToStore = scope === 'project' ? toRelativePath(skillPath, scope) : skillPath;

          skills.push({
            skillPath: pathToStore,
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
  } catch (_err) {
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
      throw new Error(
        'Invalid SKILL.md frontmatter: missing required fields (name or description)'
      );
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
 * @param payload - Skill creation payload
 * @returns Absolute path to created SKILL.md file
 * @throws Error if validation fails or file write fails
 *
 * Implementation: T024-T025
 */
export async function createSkill(payload: CreateSkillPayload): Promise<string> {
  // 1. Get base directory for scope
  const baseDir = payload.scope === 'personal' ? getPersonalSkillsDir() : getProjectSkillsDir();

  if (!baseDir) {
    throw new Error('No workspace folder is open. Cannot create project Skill.');
  }

  // 2. Check for name collision
  const skillDir = path.join(baseDir, payload.name);
  const skillPath = path.join(skillDir, 'SKILL.md');

  try {
    await fs.access(skillDir);
    // Directory exists - name collision
    throw new Error(
      `A Skill with the name "${payload.name}" already exists in ${baseDir}. Choose a different name.`
    );
  } catch (err) {
    // Directory doesn't exist - this is what we want (continue)
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Some other error occurred
      throw err;
    }
  }

  // 3. Create directory
  await fs.mkdir(skillDir, { recursive: true });

  // 4. Generate and write SKILL.md content
  const content = generateSkillFileContent(payload);

  try {
    await fs.writeFile(skillPath, content, 'utf-8');
  } catch (err) {
    // Clean up directory if file write fails
    try {
      await fs.rm(skillDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(
      `Failed to create SKILL.md file: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 5. Return absolute path
  return skillPath;
}
