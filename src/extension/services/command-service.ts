/**
 * Command Service - File I/O Operations for Claude Code Commands
 *
 * Feature: 636 - Sub-Agent "Use Existing Command" support
 * Purpose: Scan .claude/agents/*.md files for reuse in Sub-Agent nodes
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandReference } from '../../shared/types/messages';
import { getProjectCommandsDir, getUserCommandsDir } from '../utils/path-utils';

/**
 * Extract description from agent file content.
 * Prefers the YAML frontmatter `description:` field.
 * Falls back to the first non-empty line of the body.
 */
function extractDescription(content: string): string {
  // Try YAML frontmatter description
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
    if (descMatch) {
      const desc = descMatch[1].trim();
      return desc.length > 100 ? `${desc.substring(0, 97)}...` : desc;
    }
  }

  // Fallback: first non-empty line
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^#+\s*/, '').trim();
    if (trimmed.length > 0) {
      return trimmed.length > 100 ? `${trimmed.substring(0, 97)}...` : trimmed;
    }
  }
  return '';
}

/**
 * Scan a commands directory and return available commands
 *
 * @param baseDir - Base directory to scan (e.g., ~/.claude/agents/)
 * @param scope - Command scope ('user' or 'project')
 * @returns Array of command references
 */
export async function scanCommands(
  baseDir: string,
  scope: 'user' | 'project'
): Promise<CommandReference[]> {
  const commands: CommandReference[] = [];

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      const commandPath = path.join(baseDir, entry.name);
      try {
        const content = await fs.readFile(commandPath, 'utf-8');
        const name = entry.name.replace(/\.md$/, '');

        commands.push({
          name,
          description: extractDescription(content),
          commandPath,
          scope,
          promptContent: content,
        });
      } catch (err) {
        console.warn(`[Command Service] Failed to read ${commandPath}:`, err);
      }
    }
  } catch (_err) {
    // Directory doesn't exist - return empty array
  }

  return commands;
}

/**
 * Scan all command directories (user + project) in parallel
 *
 * @returns Object containing user and project commands
 */
export async function scanAllCommands(): Promise<{
  user: CommandReference[];
  project: CommandReference[];
}> {
  const userDir = getUserCommandsDir();
  const projectDir = getProjectCommandsDir();

  const [user, project] = await Promise.all([
    scanCommands(userDir, 'user'),
    projectDir ? scanCommands(projectDir, 'project') : Promise.resolve([]),
  ]);

  return { user, project };
}
