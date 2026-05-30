/**
 * `ccwf install-skills` — copy the bundled SKILL.md(s) into a discoverable
 * Claude Code skills directory.
 *
 * Default destination is the user-scope `~/.claude/skills/` so the skill is
 * available across projects. `--project` switches to `<cwd>/.claude/skills/`
 * for shared/team use. `--overwrite` is required if the destination already
 * exists. `--dry-run` prints what would happen without writing.
 *
 * Discovery model: skills live next to the CLI build output
 * (`<pkg>/dist/skills/<skill-name>/...`) when installed, and at
 * `<pkg>/skills/<skill-name>/...` when running through tsx during local
 * development — same resolution dance as preview/canvas use for the webview.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

interface InstallSkillsOptions {
  project?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
}

async function resolveSkillsSourceDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  // Compiled location: <pkg>/dist/commands/install-skills.js → ../skills/
  // Dev (tsx) location: <pkg>/src/commands/install-skills.ts → ../../skills/
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

/**
 * Recursively copy a source directory into dest. Uses fs.cp when available
 * (Node 16.7+), so we don't have to walk the tree by hand.
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}

export function registerInstallSkillsCommand(program: Command): void {
  program
    .command('install-skills')
    .description(
      "Copy ccwf's bundled Claude Code Skill(s) into ~/.claude/skills/ so AI agents discover when to use the CLI."
    )
    .option(
      '--project',
      'Install into <cwd>/.claude/skills/ instead of ~/.claude/skills/ (project scope).',
      false
    )
    .option('--overwrite', 'Replace existing skill directories.', false)
    .option('--dry-run', 'Print the planned paths without writing anything.', false)
    .action(async (options: InstallSkillsOptions) => {
      try {
        const sourceDir = await resolveSkillsSourceDir();
        const destRoot = options.project
          ? path.join(process.cwd(), '.claude', 'skills')
          : path.join(os.homedir(), '.claude', 'skills');

        const skillDirs = (await fs.readdir(sourceDir, { withFileTypes: true })).filter(
          (entry) => entry.isDirectory()
        );
        if (skillDirs.length === 0) {
          process.stderr.write(`error: no skills found under ${sourceDir}\n`);
          process.exit(1);
        }

        const plans = skillDirs.map((entry) => ({
          name: entry.name,
          src: path.join(sourceDir, entry.name),
          dest: path.join(destRoot, entry.name),
        }));

        if (options.dryRun) {
          process.stdout.write(`Would install ${plans.length} skill(s) into ${destRoot}:\n`);
          for (const plan of plans) {
            const exists = await pathExists(plan.dest);
            const note = exists
              ? options.overwrite
                ? ' (will overwrite)'
                : ' (already exists — pass --overwrite to replace)'
              : '';
            process.stdout.write(`  - ${plan.name} → ${plan.dest}${note}\n`);
          }
          return;
        }

        if (!options.overwrite) {
          const conflicts: string[] = [];
          for (const plan of plans) {
            if (await pathExists(plan.dest)) {
              conflicts.push(plan.dest);
            }
          }
          if (conflicts.length > 0) {
            process.stderr.write(
              `error: ${conflicts.length} skill(s) already exist. Pass --overwrite to replace them:\n`
            );
            for (const conflict of conflicts) {
              process.stderr.write(`  - ${conflict}\n`);
            }
            process.exit(1);
          }
        }

        for (const plan of plans) {
          if (options.overwrite && (await pathExists(plan.dest))) {
            await fs.rm(plan.dest, { recursive: true, force: true });
          }
          await copyDirectory(plan.src, plan.dest);
        }

        process.stdout.write(`✓ Installed ${plans.length} skill(s) into ${destRoot}:\n`);
        for (const plan of plans) {
          process.stdout.write(`  - ${plan.name} → ${plan.dest}\n`);
        }
        if (!options.project) {
          process.stdout.write(
            '\nClaude Code picks up user-scope skills automatically. Open or restart your Claude Code session to load them.\n'
          );
        } else {
          process.stdout.write(
            '\nCommit `.claude/skills/` to share these with your team. Claude Code reads project-scope skills next to user-scope ones.\n'
          );
        }
      } catch (error) {
        process.stderr.write(
          `error: ${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exit(1);
      }
    });
}
