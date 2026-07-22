/**
 * `ccwf samples` — discover and scaffold the bundled example workflows.
 *
 * The same sample workflows that ship with the VSCode extension are synced
 * into `dist/samples/` at build time (`sync:samples`), so an npm install of
 * the CLI carries working examples. `list` shows what is available; `copy`
 * writes one next to the user so they can immediately `ccwf preview` /
 * `ccwf run` it. Sample files use the `{meta, workflow}` wrapper shape,
 * which every `<file>` subcommand accepts.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';

interface SampleMeta {
  id?: string;
  difficulty?: string;
  tags?: string[];
  nodeCount?: number;
}

interface SampleGroup {
  id: string;
  difficulty: string;
  tags: string[];
  nodeCount: number | null;
  /** locale → file name; the empty string keys a locale-less file. */
  files: Map<string, string>;
}

/** Matches `<id>.<locale>.json` (e.g. `foo-sample.zh-CN.json`). */
const LOCALE_SUFFIX = /^(.*)\.([a-z]{2}(?:-[A-Z]{2})?)\.json$/;

/**
 * Resolve the directory containing the bundled samples. Compiled commands
 * live at `<pkg>/dist/commands/samples.js`, so the synced copy is at
 * `<pkg>/dist/samples/`; when running via tsx during development, fall back
 * to the extension's source samples directly.
 */
async function resolveSamplesDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, '../samples'),
    path.resolve(moduleDir, '../../../vscode/resources/samples'),
  ];
  for (const candidate of candidates) {
    try {
      const entries = await fs.readdir(candidate);
      if (entries.some((entry) => entry.endsWith('.json'))) return candidate;
    } catch {
      // continue
    }
  }
  throw new Error(
    'Bundled samples not found. This build of @cc-wf-studio/cli may be incomplete — try reinstalling.'
  );
}

/** Group the sample files by id, folding locale variants together. */
async function collectSampleGroups(samplesDir: string): Promise<SampleGroup[]> {
  const groups = new Map<string, SampleGroup>();
  const entries = (await fs.readdir(samplesDir)).filter((entry) => entry.endsWith('.json')).sort();

  for (const entry of entries) {
    const localeMatch = LOCALE_SUFFIX.exec(entry);
    const id = localeMatch ? localeMatch[1] : entry.replace(/\.json$/, '');
    const locale = localeMatch ? localeMatch[2] : '';

    let group = groups.get(id);
    if (!group) {
      group = { id, difficulty: '-', tags: [], nodeCount: null, files: new Map() };
      groups.set(id, group);
    }
    group.files.set(locale, entry);
  }

  // Read metadata from one representative file per group (prefer en).
  for (const group of groups.values()) {
    const representative = group.files.get('en') ?? group.files.get('') ?? [...group.files.values()][0];
    if (!representative) continue;
    try {
      const raw = await fs.readFile(path.join(samplesDir, representative), 'utf-8');
      const meta = (JSON.parse(raw) as { meta?: SampleMeta }).meta;
      if (meta) {
        if (typeof meta.difficulty === 'string') group.difficulty = meta.difficulty;
        if (Array.isArray(meta.tags)) group.tags = meta.tags;
        if (typeof meta.nodeCount === 'number') group.nodeCount = meta.nodeCount;
      }
    } catch {
      // Unreadable metadata only degrades the listing; the file itself may
      // still be copied and validated by downstream commands.
    }
  }

  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function formatLocales(group: SampleGroup): string {
  const locales = [...group.files.keys()].filter((locale) => locale !== '');
  return locales.length > 0 ? locales.sort().join(', ') : '-';
}

export function registerSamplesCommand(program: Command): void {
  const samples = program
    .command('samples')
    .description('Discover and copy the bundled example workflows.');

  samples
    .command('list')
    .description('List the bundled example workflows.')
    .action(async () => {
      const samplesDir = await resolveSamplesDir();
      const groups = await collectSampleGroups(samplesDir);

      process.stdout.write('Available samples:\n\n');
      for (const group of groups) {
        const nodes = group.nodeCount !== null ? `${group.nodeCount} nodes` : '';
        const tags = group.tags.length > 0 ? group.tags.join(', ') : '';
        const detail = [group.difficulty, nodes, tags].filter(Boolean).join(' · ');
        process.stdout.write(`  ${group.id}\n`);
        process.stdout.write(`      ${detail}\n`);
        process.stdout.write(`      locales: ${formatLocales(group)}\n`);
      }
      process.stdout.write(
        '\nCopy one locally:\n  ccwf samples copy <id> [--locale <locale>] [--output <path>]\n'
      );
    });

  samples
    .command('copy')
    .description('Copy a bundled example workflow to a local file.')
    .argument('<id>', 'Sample id (see `ccwf samples list`).')
    .option('-l, --locale <locale>', 'Locale variant to copy (default: en when localized).')
    .option('-o, --output <path>', 'Destination file (default: ./<id>.json).')
    .option('--overwrite', 'Replace the destination file if it already exists.', false)
    .action(async (id: string, options: { locale?: string; output?: string; overwrite: boolean }) => {
      const samplesDir = await resolveSamplesDir();
      const groups = await collectSampleGroups(samplesDir);
      const group = groups.find((candidate) => candidate.id === id);

      if (!group) {
        const known = groups.map((candidate) => `  - ${candidate.id}`).join('\n');
        process.stderr.write(`error: unknown sample "${id}". Available samples:\n${known}\n`);
        process.exit(1);
        return;
      }

      const locales = [...group.files.keys()].filter((locale) => locale !== '');
      let sourceFile: string | undefined;
      if (options.locale !== undefined) {
        if (locales.length === 0) {
          process.stderr.write(
            `error: sample "${id}" has no locale variants; drop the --locale option.\n`
          );
          process.exit(1);
          return;
        }
        sourceFile = group.files.get(options.locale);
        if (!sourceFile) {
          process.stderr.write(
            `error: sample "${id}" has no "${options.locale}" variant. Available locales: ${formatLocales(group)}\n`
          );
          process.exit(1);
          return;
        }
      } else {
        sourceFile = group.files.get('en') ?? group.files.get('') ?? [...group.files.values()][0];
      }
      if (!sourceFile) {
        process.stderr.write(`error: sample "${id}" has no files.\n`);
        process.exit(1);
        return;
      }

      const destination = path.resolve(options.output ?? `${id}.json`);
      if (!options.overwrite) {
        try {
          await fs.access(destination);
          process.stderr.write(
            `error: ${destination} already exists. Pass --overwrite to replace it.\n`
          );
          process.exit(1);
          return;
        } catch {
          // Destination free — proceed.
        }
      }

      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(path.join(samplesDir, sourceFile), destination);

      const relative = path.relative(process.cwd(), destination) || destination;
      process.stdout.write(`✓ Wrote ${relative}\n`);
      process.stdout.write('\nNext steps:\n');
      process.stdout.write(`  ccwf preview ${relative}\n`);
      process.stdout.write(`  ccwf run ${relative}\n`);
    });
}
