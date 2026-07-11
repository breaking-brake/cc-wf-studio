/**
 * Node property schema layer (issue #803).
 *
 * zod-based, target-scoped property definitions that serve as the single
 * source of truth for UI field scoping, export "ignored field" warnings, and
 * runtime validation. This branch covers the infrastructure plus the SubAgent
 * node; other node types follow on later branches.
 */

export * from './targets.js';
export * from './field.js';
export * from './nodes/ask-user-question-schema.js';
export * from './nodes/branch-schema.js';
export * from './nodes/branch-session-schema.js';
export * from './nodes/codex-schema.js';
export * from './nodes/group-schema.js';
export * from './nodes/if-else-schema.js';
export * from './nodes/mcp-schema.js';
export * from './nodes/skill-schema.js';
export * from './nodes/sub-agent-flow-schema.js';
export * from './nodes/prompt-schema.js';
export * from './nodes/sub-agent-schema.js';
export * from './nodes/switch-schema.js';
export * from './node-schema-registry.js';
export * from './queries.js';
export * from './warnings.js';
export * from './claude-code-only.js';
