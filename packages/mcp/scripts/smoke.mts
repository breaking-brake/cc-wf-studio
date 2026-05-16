/**
 * Smoke test for the cc-wf-mcp bin: spawn it with a fixture workflow, talk
 * MCP over stdio, and assert every expected tool is exposed and answers
 * basic calls without erroring.
 *
 * Run from the workspace root after building @cc-wf-studio/mcp:
 *   pnpm --filter @cc-wf-studio/mcp run smoke
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_PATH = path.resolve(__dirname, '../dist/mcp.js');

const FIXTURE: Record<string, unknown> = {
  id: 'smoke-test-wf',
  name: 'smoke-test',
  version: '1.0.0',
  nodes: [
    { id: 'start-1', type: 'start', name: 'Start', position: { x: 0, y: 0 }, data: {} },
    { id: 'end-1', type: 'end', name: 'End', position: { x: 200, y: 0 }, data: {} },
  ],
  connections: [{ id: 'c-1', from: 'start-1', to: 'end-1' }],
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt: '2026-05-16T00:00:00.000Z',
};

const EXPECTED_TOOLS = [
  'get_current_workflow',
  'get_workflow_schema',
  'apply_workflow',
  'list_available_agents',
  'update_nodes',
  'highlight_group_node',
];

async function main(): Promise<void> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-wf-mcp-smoke-'));
  const fixturePath = path.join(tmpDir, 'workflow.json');
  await fs.writeFile(fixturePath, JSON.stringify(FIXTURE, null, 2), 'utf-8');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BIN_PATH, '--file', fixturePath, '--project-root', tmpDir],
  });

  const client = new Client({ name: 'smoke-client', version: '0.0.0' });
  await client.connect(transport);

  try {
    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name).sort();
    for (const expected of EXPECTED_TOOLS) {
      if (!toolNames.includes(expected)) {
        throw new Error(`Missing tool '${expected}'. Got: ${toolNames.join(', ')}`);
      }
    }
    console.log(`OK tools registered: ${toolNames.join(', ')}`);

    const current = await client.callTool({
      name: 'get_current_workflow',
      arguments: {},
    });
    const text = (current.content as { type: string; text: string }[])[0]?.text;
    const parsed = JSON.parse(text);
    if (!parsed.success) {
      throw new Error(`get_current_workflow failed: ${JSON.stringify(parsed)}`);
    }
    if (parsed.workflow?.id !== FIXTURE.id) {
      throw new Error(`Wrong workflow returned: ${JSON.stringify(parsed.workflow)}`);
    }
    if (typeof parsed.revision !== 'string' || !parsed.revision.startsWith('sha256:')) {
      throw new Error(`Expected sha256: revision, got ${parsed.revision}`);
    }
    console.log(`OK get_current_workflow returned workflow id=${parsed.workflow.id} revision=${parsed.revision.slice(0, 20)}…`);

    const highlight = await client.callTool({
      name: 'highlight_group_node',
      arguments: { groupNodeId: 'foo' },
    });
    const highlightParsed = JSON.parse(
      (highlight.content as { type: string; text: string }[])[0].text
    );
    if (!highlightParsed.success || !highlightParsed.note?.includes('canvas-only')) {
      throw new Error(
        `highlight_group_node should return success+canvas-only note. Got: ${JSON.stringify(highlightParsed)}`
      );
    }
    console.log(`OK highlight_group_node no-op note: "${highlightParsed.note}"`);
  } finally {
    await client.close().catch(() => {});
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  process.stderr.write(`SMOKE FAILED: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
