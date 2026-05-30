/**
 * `ccwf mcp --file <path>` — run the file-mode stdio MCP server in-process.
 *
 * Equivalent to the standalone `ccwf-mcp` bin (shipped by `@cc-wf-studio/mcp`),
 * exposed here so users only need to remember the unified `ccwf` entry point.
 * No child process is spawned — we directly instantiate the same factory the
 * standalone bin uses.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FileWorkflowAdapter, createWorkflowMcpServer } from '@cc-wf-studio/mcp';
import { Command } from 'commander';

interface McpOptions {
  file: string;
  projectRoot?: string;
}

export function registerMcpCommand(program: Command): void {
  program
    .command('mcp')
    .description('Run the cc-wf-studio stdio MCP server against a workflow file.')
    .requiredOption('--file <path>', 'Workflow JSON file to read/write.')
    .option(
      '--project-root <dir>',
      'Base directory used to resolve <project>/.claude/agents/. Defaults to process.cwd().'
    )
    .action(async (options: McpOptions) => {
      const adapter = new FileWorkflowAdapter({
        filePath: options.file,
        projectRoot: options.projectRoot,
      });
      const server = createWorkflowMcpServer(adapter);
      const transport = new StdioServerTransport();
      await server.connect(transport);
    });
}
