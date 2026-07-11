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
import { field, type PropertyField, toZodObject } from '../field.js';

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
  source: field(z.enum(['individual', 'plugin']).optional(), {
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
