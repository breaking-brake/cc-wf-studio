#!/usr/bin/env node
/**
 * `ccwf-mcp` — standalone stdio MCP server backed by a workflow file.
 *
 * Usage:
 *   npx @cc-wf-studio/mcp --file path/to/workflow.json
 *
 * Reads/writes the supplied file in place. See the file-adapter for behaviour
 * details (sha256 revisions, no auto-create of sub-agent .md files, …).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createWorkflowMcpServer } from './factory.js';
import { FileWorkflowAdapter } from './file-adapter.js';

// Read version from package.json so `ccwf-mcp --version` stays in sync with
// the published npm version. The compiled entry sits at `<pkg>/dist/mcp.js`,
// so package.json is one directory up.
const pkgJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const { version: pkgVersion } = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
  version: string;
};

const USAGE = `Usage: ccwf-mcp --file <path-to-workflow.json> [--project-root <dir>]`;

async function main(): Promise<void> {
  let parsed: ReturnType<typeof parseArgs<typeof argSpec>>;
  const argSpec = {
    options: {
      file: { type: 'string' as const },
      'project-root': { type: 'string' as const },
      help: { type: 'boolean' as const, short: 'h' },
      version: { type: 'boolean' as const, short: 'V' },
    },
    strict: true,
  };
  try {
    parsed = parseArgs(argSpec);
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n${USAGE}\n`);
    process.exit(2);
  }

  if (parsed.values.version) {
    process.stdout.write(`${pkgVersion}\n`);
    return;
  }

  if (parsed.values.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const filePath = parsed.values.file;
  if (typeof filePath !== 'string' || filePath.length === 0) {
    process.stderr.write(`error: --file is required\n${USAGE}\n`);
    process.exit(2);
  }
  const projectRoot = parsed.values['project-root'];

  const adapter = new FileWorkflowAdapter({
    filePath,
    projectRoot: typeof projectRoot === 'string' ? projectRoot : undefined,
  });

  const server = createWorkflowMcpServer(adapter);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
