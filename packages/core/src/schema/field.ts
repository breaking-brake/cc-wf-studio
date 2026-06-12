/**
 * Property-field primitive: a zod type paired with target/render metadata
 * (issue #803).
 *
 * Each node property is declared once via {@link field}, co-locating its
 * runtime validation (zod) and its domain metadata (which export targets it
 * applies to, how the UI renders it). A thin wrapper is preferred over zod's
 * `.meta()`/`.describe()` registry so consumers get strongly-typed access to
 * `targets` and render hints without stringly-typed registry lookups.
 */

import { z } from 'zod';
import { type ExportTarget, type FieldTargets, TARGET_ALL } from './targets.js';

/** UI render hint for a property field. */
export type FieldControl = 'select' | 'text' | 'tools' | 'color' | 'textarea';

/** Domain metadata attached to a property field. */
export interface FieldMeta {
  /** Export targets this field applies to. Fields excluded by a target are
   *  hidden in the UI and reported as "ignored" by exporters for that target. */
  targets: FieldTargets;
  /** i18n key for the field's label (resolved by the webview). */
  labelKey: string;
  /** How the UI should render the field's control. */
  control?: FieldControl;
  /** Allowed values for `select`-style controls (single-sourced for the UI). */
  options?: readonly string[];
  /** When true, the value is governed by Claude Code's built-in agent preset
   *  (e.g. built-in sub-agents control model/tools), so the UI shows it read-only. */
  controlledByBuiltIn?: boolean;
}

/** A single node property: its zod schema plus {@link FieldMeta}. */
export interface PropertyField<T extends z.ZodTypeAny = z.ZodTypeAny> {
  zod: T;
  meta: FieldMeta;
}

/** A node's full property schema, keyed by field name. */
export type PropertySchema = Record<string, PropertyField>;

/** Declare a property field from a zod type and its metadata. */
export function field<T extends z.ZodTypeAny>(zod: T, meta: FieldMeta): PropertyField<T> {
  return { zod, meta };
}

/** Whether a field with the given metadata applies to `target`. */
export function appliesToTarget(meta: FieldMeta, target: ExportTarget): boolean {
  return meta.targets === TARGET_ALL || meta.targets.includes(target);
}

/** Build a zod object validator from a property schema. */
export function toZodObject<S extends PropertySchema>(
  schema: S,
): z.ZodObject<{ [K in keyof S]: S[K]['zod'] }> {
  const shape = {} as { [K in keyof S]: S[K]['zod'] };
  for (const key of Object.keys(schema) as (keyof S)[]) {
    shape[key] = schema[key].zod;
  }
  return z.object(shape);
}
