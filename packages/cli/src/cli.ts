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

import { Command } from 'commander';
import { registerCanvasCommand } from './commands/canvas.js';
import { registerExportCommand } from './commands/export.js';
import { registerInstallSkillsCommand } from './commands/install-skills.js';
import { registerMcpCommand } from './commands/mcp.js';
import { registerPreviewCommand } from './commands/preview.js';
import { registerRenderCommand } from './commands/render.js';
import { registerRunCommand } from './commands/run.js';
import { registerUninstallSkillsCommand } from './commands/uninstall-skills.js';
import { registerValidateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('ccwf')
  .description('Command-line tool for cc-wf-studio workflows.')
  .version('0.0.0');

registerRenderCommand(program);
registerValidateCommand(program);
registerMcpCommand(program);
registerExportCommand(program);
registerRunCommand(program);
registerPreviewCommand(program);
registerCanvasCommand(program);
registerInstallSkillsCommand(program);
registerUninstallSkillsCommand(program);

program.parseAsync(process.argv).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
