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
export * from './sub-agent-schema.js';
export * from './queries.js';
export * from './warnings.js';
export * from './claude-code-only.js';
