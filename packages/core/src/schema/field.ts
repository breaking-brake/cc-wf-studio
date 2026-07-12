/**
 * Property-field primitive: a zod type paired with target/render metadata
 * (issue #803).
 *
 * Each node property is declared once via {@link field}, co-locating its
 * runtime validation (zod) and its domain metadata (which export targets it
 * applies to, how the UI renders it). A thin wrapper is preferred over zod's
 * `.meta()`/`.describe()` registry so consumers get strongly-typed access to
 * `targets` and render hints without stringly-typed registry lookups.
 *
 * Scope guardrails — what FieldMeta deliberately does NOT model:
 * - side effects between fields (outputPorts sync etc.) → per-node pure
 *   `derive*Update` functions exported next to each node schema
 * - layout/styling hints → declaration order is render order
 * - dialogs and navigation → Header/Footer slots in the webview panel config
 * - cross-field validation → zod `refine` on the node's zod object
 */

import { z } from 'zod';
import { type ExportTarget, type FieldTargets, TARGET_ALL } from './targets.js';

/** UI render hint for a property field. */
export type FieldControl =
  | 'select'
  | 'text'
  | 'tools'
  | 'color'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'objectArray';

/** One column of an `objectArray` item row (text/textarea only by design). */
export interface ArrayItemField {
  /** Property name inside each array item object. */
  name: string;
  /** i18n key for the column label (optional — placeholder-only columns). */
  labelKey?: string;
  /** i18n key for the input placeholder. */
  placeholderKey?: string;
  control: 'text' | 'textarea';
}

/** Domain metadata attached to a property field. */
export interface FieldMeta {
  /** Export targets this field applies to. Fields excluded by a target are
   *  hidden in the UI and reported as "ignored" by exporters for that target. */
  targets: FieldTargets;
  /** i18n key for the field's label (resolved by the webview). */
  labelKey: string;
  /** How the UI should render the field's control.
   *  `undefined` = data-only field: validated/target-scoped but never rendered
   *  by the generic panel (e.g. builtInType, MCP dynamic parameters). */
  control?: FieldControl;
  /** Allowed values for `select`/`radio`-style controls (single-sourced for the UI). */
  options?: readonly string[];
  /** i18n key for a help line rendered under the control. */
  helpKey?: string;
  /** i18n key for the control's placeholder text. */
  placeholderKey?: string;
  /** Groups this field into a CollapsibleSection. The section's title/hint
   *  resolve to `<i18nNamespace>.section.<sectionKey>` (+ `.hint`) in the
   *  webview. Fields sharing a key render together at the position of the
   *  first occurrence, in declaration order. */
  sectionKey?: string;
  /** Hide the field unless the predicate holds for the node's current data. */
  visibleWhen?: (data: Record<string, unknown>) => boolean;
  /** Render the field read-only while the predicate holds (e.g. built-in
   *  sub-agent presets controlling model/tools). */
  readonlyWhen?: (data: Record<string, unknown>) => boolean;
  /** i18n key for a suffix hint shown when `readonlyWhen` holds
   *  (e.g. "(controlled by preset)"). */
  readonlyHintKey?: string;
  /** textarea only: pair the control with an "edit in external editor" button. */
  editInEditor?: boolean;
  /** select only: append a "custom" option that switches to free-text input. */
  allowCustom?: boolean;
  /** objectArray only: the columns rendered for each item row. */
  itemFields?: readonly ArrayItemField[];
  /** objectArray only: render an item's row read-only (e.g. switch default branch). */
  itemReadonlyWhen?: (item: Record<string, unknown>) => boolean;
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

/**
 * Compile-time assertion that `T` is assignable to `U`. Each node schema
 * declares drift guards with this so a schema whose field names or value
 * types diverge from the node's public interface fails `tsc` instead of
 * surfacing at runtime (e.g. a mistyped enum value).
 */
export type AssertAssignable<T extends U, U> = T;

/**
 * Min/max item counts of a zod array type, read from its checks so the UI
 * never duplicates bounds the validator already declares. `length(n)` yields
 * `min === max === n` (the UI hides add/remove entirely).
 */
export function getArrayBounds(zodType: z.ZodTypeAny): { min?: number; max?: number } {
  const def = (zodType as { _zod?: { def?: { checks?: unknown[] } } })._zod?.def;
  let min: number | undefined;
  let max: number | undefined;
  for (const check of def?.checks ?? []) {
    const checkDef = (check as { _zod?: { def?: Record<string, unknown> } })._zod?.def;
    if (!checkDef) continue;
    if (checkDef.check === 'min_length') min = checkDef.minimum as number;
    if (checkDef.check === 'max_length') max = checkDef.maximum as number;
    if (checkDef.check === 'length_equals') {
      min = checkDef.length as number;
      max = checkDef.length as number;
    }
  }
  return { min, max };
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
