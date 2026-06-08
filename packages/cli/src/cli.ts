#!/usr/bin/env node
/**
 * `ccwf` — cc-wf-studio command-line entry.
 *
 * Subcommands are wired in subsequent commits:
 *   - render <file>                 (commit 4)
 *   - validate <file>               (commit 5)
 *   - mcp --file <file>             (commit 6)
 *   - run <file> [--overwrite]      (commit 7)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { registerCanvasCommand } from './commands/canvas.js';
import { registerExportCommand } from './commands/export.js';
import { registerInstallSkillsCommand } from './commands/install-skills.js';
import { registerMcpCommand } from './commands/mcp.js';
import { registerPreviewCommand } from './commands/preview.js';
import { registerRenderCommand } from './commands/render.js';
import { registerRunCommand } from './commands/run.js';
import { registerTourCommand } from './commands/tour.js';
import { registerUninstallSkillsCommand } from './commands/uninstall-skills.js';
import { registerValidateCommand } from './commands/validate.js';

// Read version from package.json so `ccwf --version` stays in sync with the
// published npm version without a build-time substitution step. The compiled
// entry sits at `<pkg>/dist/cli.js`, so package.json is one directory up.
const pkgJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const { version: pkgVersion } = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
  version: string;
};

const program = new Command();

program
  .name('ccwf')
  .description('Command-line tool for cc-wf-studio workflows.')
  .version(pkgVersion);

registerRenderCommand(program);
registerValidateCommand(program);
registerMcpCommand(program);
registerExportCommand(program);
registerRunCommand(program);
registerPreviewCommand(program);
registerCanvasCommand(program);
registerTourCommand(program);
registerInstallSkillsCommand(program);
registerUninstallSkillsCommand(program);

program.parseAsync(process.argv).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
