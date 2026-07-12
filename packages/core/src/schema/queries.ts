/**
 * Query helpers over property schemas (issue #803).
 *
 * The UI asks "which fields apply to target T?" to scope its panels; exporters
 * ask "which set fields does target T ignore?" to emit honest warnings. Both
 * read the same schema, so the UI and compile warnings can never drift apart.
 */

import { appliesToTarget, type FieldMeta, type PropertySchema } from './field.js';
import { subAgentPropertySchema, subAgentZodObject } from './nodes/sub-agent-schema.js';
import type { ExportTarget } from './targets.js';

/** Ordered list of `{ name, meta }` for rendering a schema's fields. */
export function getSchemaFields(schema: PropertySchema): Array<{ name: string; meta: FieldMeta }> {
  return Object.entries(schema).map(([name, f]) => ({ name, meta: f.meta }));
}

/** Convenience: the SubAgent schema's fields in declaration order. */
export function getSubAgentFields(): Array<{ name: string; meta: FieldMeta }> {
  return getSchemaFields(subAgentPropertySchema);
}

/** Whether `fieldName` in `schema` applies to `target`. Unknown fields → false. */
export function isFieldAppliedToTarget(
  schema: PropertySchema,
  fieldName: string,
  target: ExportTarget,
): boolean {
  const f = schema[fieldName];
  return f ? appliesToTarget(f.meta, target) : false;
}

/** Names of the fields in `schema` that apply to `target`. */
export function getFieldsForTarget(schema: PropertySchema, target: ExportTarget): string[] {
  return Object.entries(schema)
    .filter(([, f]) => appliesToTarget(f.meta, target))
    .map(([name]) => name);
}

function isMeaningful(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/** A field that is set on node data but ignored by the active target. */
export interface IgnoredField {
  name: string;
  value: unknown;
  labelKey: string;
}

/**
 * Fields that are meaningfully set on `nodeData` but whose target scope
 * excludes `target` — i.e. values that will be silently dropped on export.
 * Unset/empty values are skipped so a defaulted-but-unused field never warns.
 */
export function getIgnoredFields(
  nodeData: Record<string, unknown>,
  schema: PropertySchema,
  target: ExportTarget,
): IgnoredField[] {
  const ignored: IgnoredField[] = [];
  for (const [name, f] of Object.entries(schema)) {
    if (!appliesToTarget(f.meta, target) && isMeaningful(nodeData[name])) {
      ignored.push({ name, value: nodeData[name], labelKey: f.meta.labelKey });
    }
  }
  return ignored;
}

/**
 * Return the values to reset when `data`'s active target changes — every field
 * not applicable to `target` is set to `undefined`. Spread the result over the
 * form data to drop now-irrelevant Claude Code-only fields.
 */
export function clearFieldsNotAppliedToTarget(
  data: Record<string, unknown>,
  schema: PropertySchema,
  target: ExportTarget,
): Record<string, undefined> {
  const cleared: Record<string, undefined> = {};
  for (const [name, f] of Object.entries(schema)) {
    if (!appliesToTarget(f.meta, target) && name in data) {
      cleared[name] = undefined;
    }
  }
  return cleared;
}

/** @deprecated Schema validation is wired into `validateAIGeneratedWorkflow`
 *  (registry-driven, per present field) — use that instead. Kept for API
 *  stability. */
export function validateSubAgentData(data: unknown): ReturnType<typeof subAgentZodObject.safeParse> {
  return subAgentZodObject.safeParse(data);
}
