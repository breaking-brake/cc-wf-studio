/**
 * @cc-wf-studio/mcp public API.
 *
 * Exports the adapter contract, tool registrations, and the factory that
 * stitches them onto an `McpServer`. The bin entry (`ccwf-mcp`) lives in a
 * separate module (`./mcp.ts`) that is wired in step 4.
 */

export type {
  AgentCommandInfo,
  ApplyWorkflowOptions,
  ApplyWorkflowResult,
  GetCurrentWorkflowResult,
  GetWorkflowSchemaResult,
  HighlightResult,
  ListAvailableAgentsResult,
  PlannedSubAgentFile,
  WorkflowIoAdapter,
} from './types.js';

export { registerWorkflowTools } from './tools.js';
export {
  createWorkflowMcpServer,
  type CreateWorkflowMcpServerOptions,
} from './factory.js';
export { FileWorkflowAdapter, type FileWorkflowAdapterOptions } from './file-adapter.js';
