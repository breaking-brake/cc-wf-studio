#!/usr/bin/env node
/**
 * CC Workflow Studio - Standalone MCP Server CLI
 *
 * Runs the MCP server in headless mode, operating directly on workflow JSON files.
 * No UI required — AI agents can create and edit workflows via MCP tools.
 *
 * Usage:
 *   npx @cc-wf-studio/core mcp-server ./path/to/workflow.json
 *   npx @cc-wf-studio/core mcp-server  (uses default .vscode/workflows/workflow.json)
 */

import * as path from 'node:path';
import { ConsoleLogger } from '../adapters/console-logger.js';
import { NodeFileSystem } from '../adapters/node-file-system.js';
import { FileSystemWorkflowProvider } from '../services/fs-workflow-provider.js';
import { setLogger } from '../services/logger-holder.js';
import { McpServerManager } from '../services/mcp-server-service.js';

async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  setLogger(logger);

  const workflowPath =
    process.argv[2] || path.join(process.cwd(), '.vscode', 'workflows', 'workflow.json');
  const resolvedPath = path.resolve(workflowPath);

  logger.info(`CC Workflow Studio - Headless MCP Server`);
  logger.info(`Workflow file: ${resolvedPath}`);

  const fs = new NodeFileSystem();
  const manager = new McpServerManager();

  // Set up headless mode with filesystem provider
  manager.setWorkflowProvider(new FileSystemWorkflowProvider(fs, resolvedPath));

  // Start the MCP server
  const port = await manager.start(process.cwd());

  logger.info(`MCP Server running on http://127.0.0.1:${port}/mcp`);
  logger.info(`Press Ctrl+C to stop`);

  // Handle graceful shutdown
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down MCP server...');
    await manager.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
