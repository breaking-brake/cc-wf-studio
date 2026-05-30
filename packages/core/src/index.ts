/**
 * @cc-wf-studio/core — public API barrel.
 *
 * Re-exports the bulk of the pure workflow logic. A few modules are namespaced
 * (`McpNode`, `SlackWorkflowValidator`) because they declare identifiers that
 * collide with `workflow-definition` / `validate-workflow`. Resolving those
 * collisions is a follow-up refactor; for now consumers reach those types via
 * the namespace re-exports.
 */

// Primary workflow types and validation rules.
export * from './types/workflow-definition.js';
export * from './types/ai-metrics.js';
export * from './types/sample-workflow.js';

// Built-in sub-agent metadata.
export * from './constants/built-in-sub-agents.js';

// Pure formatters / generators.
export * from './services/workflow-prompt-generator.js';
export * from './services/workflow-overview-formatter.js';
export * from './services/workflow-export.js';
export * from './services/agent-skill-export.js';

// Pure validation, migration, schema parsing.
export * from './utils/validate-workflow.js';
export * from './utils/migrate-workflow.js';
export * from './utils/schema-parser.js';

// Slack workflow validator — its `ValidationResult` collides with the AI
// validator's identical name, so re-export it under a distinct alias.
export {
  validateWorkflowFile,
  type ValidationResult as SlackValidationResult,
} from './utils/workflow-validator.js';

// mcp-node has its own `McpNodeData` / `ToolParameter` that pre-date and
// drifted from workflow-definition's versions. Reach those types and helpers
// via the `/mcp` subpath import: `import { ... } from '@cc-wf-studio/core/mcp'`.
