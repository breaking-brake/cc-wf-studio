/**
 * Skill node property schema (read-only summary panel).
 *
 * Mirrors `SkillNodeData` in types/workflow-definition.ts. Skill properties
 * are loaded from SKILL.md and edited via SkillNodeEditDialog, so the panel
 * renders every field as a display value. `scope`/`validationStatus`/
 * `executionMode` get custom badge/icon renderings in the webview panel;
 * `name`/`source`/`pluginName` are data-only (name shows in the shared
 * node-name field).
 */

import { z } from 'zod';
import type { SkillNodeData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

export const skillPropertySchema = {
  name: field(z.string(), {
    targets: 'all',
    labelKey: 'skill.field.name',
  }),
  description: field(z.string(), {
    targets: 'all',
    labelKey: 'skill.field.description',
    control: 'text',
  }),
  skillPath: field(z.string(), {
    targets: 'all',
    labelKey: 'skill.field.skillPath',
    control: 'text',
  }),
  scope: field(z.enum(['user', 'project', 'local']), {
    targets: 'all',
    labelKey: 'skill.field.scope',
    control: 'select',
    options: ['user', 'project', 'local'],
  }),
  validationStatus: field(z.enum(['valid', 'missing', 'invalid']), {
    targets: 'all',
    labelKey: 'skill.field.validationStatus',
    control: 'select',
    options: ['valid', 'missing', 'invalid'],
  }),
  allowedTools: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'skill.field.allowedTools',
    control: 'text',
    visibleWhen: (data) => !!data.allowedTools,
  }),
  executionMode: field(z.enum(['load', 'execute']).optional(), {
    targets: 'all',
    labelKey: 'skill.field.executionMode',
    control: 'select',
    options: ['load', 'execute'],
  }),
  executionPrompt: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'skill.field.executionPrompt',
    control: 'textarea',
    visibleWhen: (data) =>
      (data.executionMode || 'execute') === 'execute' && !!data.executionPrompt,
  }),
  source: field(z.enum(['claude', 'copilot']).optional(), {
    targets: 'all',
    labelKey: 'skill.field.source',
  }),
  pluginName: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'skill.field.pluginName',
  }),
} satisfies Record<string, PropertyField>;

export type SkillPropertySchema = typeof skillPropertySchema;

/** zod object validator derived from {@link skillPropertySchema}. */
export const skillZodObject = toZodObject(skillPropertySchema);

// Compile-time drift guards: schema field names must exist on SkillNodeData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type SkillSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof skillZodObject>, keyof SkillNodeData>;
export type SkillSchemaValueTypesGuard = AssertAssignable<z.infer<typeof skillZodObject>, Partial<SkillNodeData>>;
