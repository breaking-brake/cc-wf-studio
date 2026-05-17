/**
 * `ccwf uninstall-skills` — symmetric counterpart to `install-skills`.
 *
 * Removes every skill the CLI ships from the destination scope (user or
 * project). Missing destinations are a no-op (exit 0), since "nothing to
 * remove" is the user's intended state. `--dry-run` previews the deletion
 * without touching disk.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

interface UninstallSkillsOptions {
  project?: boolean;
  dryRun?: boolean;
}

async function resolveSkillsSourceDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  // Compiled: <pkg>/dist/commands/uninstall-skills.js → ../skills/
  // Dev (tsx): <pkg>/src/commands/uninstall-skills.ts → ../../skills/
  const candidates = [
    path.resolve(moduleDir, '../skills'),
    path.resolve(moduleDir, '../../skills'),
  ];
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        const entries = await fs.readdir(candidate);
        if (entries.length > 0) return candidate;
      }
    } catch {
      // continue
    }
  }
  throw new Error(
    `Could not find the bundled skills directory. Looked in:\n${candidates.map((c) => `  - ${c}`).join('\n')}\nRun \`pnpm -F @cc-wf-studio/cli build\` first to populate dist/skills.`
  );
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export function registerUninstallSkillsCommand(program: Command): void {
  program
    .command('uninstall-skills')
    .description(
      "Remove ccwf's bundled Claude Code Skill(s) from ~/.claude/skills/ (default) or ./.claude/skills/ with --project."
    )
    .option(
      '--project',
      'Remove from <cwd>/.claude/skills/ instead of ~/.claude/skills/ (project scope).',
      false
    )
    .option('--dry-run', 'Print the planned deletions without writing.', false)
    .action(async (options: UninstallSkillsOptions) => {
      try {
        const sourceDir = await resolveSkillsSourceDir();
        const destRoot = options.project
          ? path.join(process.cwd(), '.claude', 'skills')
          : path.join(os.homedir(), '.claude', 'skills');

        const skillDirs = (await fs.readdir(sourceDir, { withFileTypes: true })).filter(
          (entry) => entry.isDirectory()
        );

        const plans = await Promise.all(
          skillDirs.map(async (entry) => ({
            name: entry.name,
            dest: path.join(destRoot, entry.name),
            exists: await pathExists(path.join(destRoot, entry.name)),
          }))
        );

        const present = plans.filter((p) => p.exists);
        const missing = plans.filter((p) => !p.exists);

        if (options.dryRun) {
          if (present.length === 0) {
            process.stdout.write(`No ccwf skills found in ${destRoot}; nothing to remove.\n`);
            return;
          }
          process.stdout.write(`Would remove ${present.length} skill(s) from ${destRoot}:\n`);
          for (const plan of present) {
            process.stdout.write(`  - ${plan.name} (${plan.dest})\n`);
          }
          if (missing.length > 0) {
            process.stdout.write(`Already absent: ${missing.map((m) => m.name).join(', ')}\n`);
          }
          return;
        }

        if (present.length === 0) {
          process.stdout.write(`No ccwf skills found in ${destRoot}; nothing to remove.\n`);
          return;
        }

        for (const plan of present) {
          await fs.rm(plan.dest, { recursive: true, force: true });
        }

        process.stdout.write(`✓ Removed ${present.length} skill(s) from ${destRoot}:\n`);
        for (const plan of present) {
          process.stdout.write(`  - ${plan.name}\n`);
        }
        if (missing.length > 0) {
          process.stdout.write(`Already absent: ${missing.map((m) => m.name).join(', ')}\n`);
        }
      } catch (error) {
        process.stderr.write(
          `error: ${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exit(1);
      }
    });
}
