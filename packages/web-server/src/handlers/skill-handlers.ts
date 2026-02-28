/**
 * Skill Handlers - Web Server
 *
 * Handles skill browsing, creation, and validation.
 * Ported from src/extension/commands/skill-operations.ts
 * and src/extension/services/skill-service.ts
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { log } from '@cc-wf-studio/core';

type Reply = (type: string, payload?: unknown) => void;

interface SkillReference {
  skillPath: string;
  name: string;
  description: string;
  scope: 'user' | 'project' | 'local';
  validationStatus: 'valid' | 'invalid';
  allowedTools?: string[];
}

/**
 * Handle BROWSE_SKILLS request
 * Scans user (~/.claude/skills/) and project (.claude/skills/) directories
 */
export async function handleBrowseSkillsWeb(
  workspacePath: string,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  const startTime = Date.now();
  log('INFO', `[Skill Browse] Starting scan`);

  try {
    const userSkills = await scanSkillDirectory(
      path.join(os.homedir(), '.claude', 'skills'),
      'user'
    );
    const projectSkills = await scanSkillDirectory(
      path.join(workspacePath, '.claude', 'skills'),
      'project'
    );

    // Also scan other provider directories
    const localSkills: SkillReference[] = [];
    const otherDirs = [
      { dir: '.github/skills', scope: 'local' as const },
      { dir: '.codex/skills', scope: 'local' as const },
      { dir: '.roo/skills', scope: 'local' as const },
      { dir: '.gemini/skills', scope: 'local' as const },
      { dir: '.cursor/skills', scope: 'local' as const },
      { dir: '.agent/skills', scope: 'local' as const },
    ];

    for (const { dir, scope } of otherDirs) {
      const skills = await scanSkillDirectory(path.join(workspacePath, dir), scope);
      localSkills.push(...skills);
    }

    const allSkills = [...userSkills, ...projectSkills, ...localSkills];
    const executionTime = Date.now() - startTime;
    log(
      'INFO',
      `[Skill Browse] Scan completed in ${executionTime}ms - Found ${userSkills.length} user, ${projectSkills.length} project, ${localSkills.length} local Skills`
    );

    reply('SKILL_LIST_LOADED', {
      skills: allSkills,
      timestamp: new Date().toISOString(),
      userCount: userSkills.length,
      projectCount: projectSkills.length,
      localCount: localSkills.length,
    });
  } catch (error) {
    log('ERROR', `[Skill Browse] Error: ${error}`);
    reply('SKILL_VALIDATION_FAILED', {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: String(error),
      details: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Handle CREATE_SKILL request
 */
export async function handleCreateSkillWeb(
  workspacePath: string,
  payload: { name: string; description: string; scope: 'user' | 'project'; content?: string },
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const { name, description, scope, content } = payload;
    const baseDir =
      scope === 'user'
        ? path.join(os.homedir(), '.claude', 'skills')
        : path.join(workspacePath, '.claude', 'skills');

    await fs.mkdir(baseDir, { recursive: true });

    const fileName = `${name.replace(/[^a-zA-Z0-9_-]/g, '-')}.md`;
    const skillPath = path.join(baseDir, fileName);

    // Generate skill file content
    const skillContent = [
      '---',
      `name: ${name}`,
      `description: ${description}`,
      '---',
      '',
      content || `# ${name}`,
      '',
      description || '',
    ].join('\n');

    await fs.writeFile(skillPath, skillContent, 'utf-8');

    reply('SKILL_CREATION_SUCCESS', {
      skillPath,
      name,
      description,
      scope,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply('SKILL_CREATION_FAILED', {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: String(error),
      details: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Handle VALIDATE_SKILL_FILE request
 */
export async function handleValidateSkillFileWeb(
  payload: { skillPath: string },
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const { skillPath } = payload;
    const content = await fs.readFile(skillPath, 'utf-8');
    const metadata = parseSkillFrontmatter(content);

    if (!metadata.name) {
      throw new Error('Invalid SKILL.md frontmatter: missing name');
    }

    const normalizedPath = skillPath.replace(/\\/g, '/');
    const scope: 'user' | 'project' | 'local' = normalizedPath.includes('/.claude/skills')
      ? 'project'
      : 'user';

    reply('SKILL_VALIDATION_SUCCESS', {
      skill: {
        skillPath,
        name: metadata.name,
        description: metadata.description || '',
        scope,
        validationStatus: 'valid',
        allowedTools: metadata.allowedTools,
      },
    });
  } catch (error) {
    const errorMessage = String(error);
    let errorCode: string = 'UNKNOWN_ERROR';
    if (errorMessage.includes('ENOENT')) {
      errorCode = 'SKILL_NOT_FOUND';
    } else if (errorMessage.includes('frontmatter')) {
      errorCode = 'INVALID_FRONTMATTER';
    }

    reply('SKILL_VALIDATION_FAILED', {
      errorCode,
      errorMessage,
      filePath: payload.skillPath,
    });
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

async function scanSkillDirectory(
  dirPath: string,
  scope: 'user' | 'project' | 'local'
): Promise<SkillReference[]> {
  const skills: SkillReference[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const skillPath = path.join(dirPath, entry.name);
        try {
          const content = await fs.readFile(skillPath, 'utf-8');
          const metadata = parseSkillFrontmatter(content);
          skills.push({
            skillPath,
            name: metadata.name || entry.name.replace(/\.md$/i, ''),
            description: metadata.description || '',
            scope,
            validationStatus: metadata.name ? 'valid' : 'invalid',
            allowedTools: metadata.allowedTools,
          });
        } catch {
          // Skip files that can't be read
        }
      }
    }
  } catch {
    // Directory doesn't exist — that's fine
  }
  return skills;
}

function parseSkillFrontmatter(content: string): {
  name: string;
  description: string;
  allowedTools?: string[];
} {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) {
    return { name: '', description: '' };
  }

  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  // Parse allowed_tools as YAML array
  const toolsMatch = frontmatter.match(/^allowed_tools:\s*\n((?:\s+-\s+.+\n?)*)/m);
  let allowedTools: string[] | undefined;
  if (toolsMatch) {
    allowedTools = toolsMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s+-\s+/, '').trim())
      .filter(Boolean);
  }

  return {
    name: nameMatch?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim() || '',
    allowedTools,
  };
}
