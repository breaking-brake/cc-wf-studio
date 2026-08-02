import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { NodeType, SUB_AGENT_COLORS } from '../types/workflow-definition.js';
import type { PropertyField } from './field.js';
import { NODE_PROPERTY_SCHEMAS } from './node-schema-registry.js';

function entries(): [string, string, PropertyField][] {
  return Object.entries(NODE_PROPERTY_SCHEMAS).flatMap(([nodeType, schema]) =>
    Object.entries(schema ?? {}).map(
      ([fieldName, property]) =>
        [nodeType, fieldName, property] as [string, string, PropertyField],
    ),
  );
}

function enumValues(property: PropertyField): readonly string[] | undefined {
  let schema = property.zod as z.ZodTypeAny;
  while (schema instanceof z.ZodOptional) schema = schema.unwrap() as z.ZodTypeAny;
  if (!(schema instanceof z.ZodEnum)) return undefined;
  if (schema.options.some((value) => typeof value !== 'string')) {
    throw new TypeError('panel controls require string-valued zod enums');
  }
  return schema.options as string[];
}

describe('property panel option consistency', () => {
  it('gives every select and radio field non-empty options accepted by zod', () => {
    const failures: string[] = [];

    for (const [nodeType, fieldName, property] of entries()) {
      if (property.meta.control !== 'select' && property.meta.control !== 'radio') continue;
      const options = property.meta.options ?? [];
      if (options.length === 0) {
        failures.push(`${nodeType}.${fieldName}: no panel options`);
        continue;
      }
      for (const option of options) {
        if (!property.zod.safeParse(option).success) {
          failures.push(`${nodeType}.${fieldName}: zod rejects ${JSON.stringify(option)}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps enum validators and panel options byte-for-byte equivalent', () => {
    const failures: string[] = [];

    for (const [nodeType, fieldName, property] of entries()) {
      if (property.meta.control !== 'select' && property.meta.control !== 'radio') continue;
      if (property.meta.allowCustom) {
        expect(`${nodeType}.${fieldName}`).toBe(`${NodeType.Codex}.model`);
        continue;
      }
      const allowed = enumValues(property);
      if (!allowed) continue;
      const panel = property.meta.options ?? [];
      if (JSON.stringify([...allowed].sort()) !== JSON.stringify([...panel].sort())) {
        failures.push(
          `${nodeType}.${fieldName}: zod=${JSON.stringify(allowed)} panel=${JSON.stringify(panel)}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps color fields aligned with the shared sub-agent palette', () => {
    const palette = Object.keys(SUB_AGENT_COLORS).sort();
    const failures: string[] = [];

    for (const [nodeType, fieldName, property] of entries()) {
      if (property.meta.control !== 'color') continue;
      const allowed = enumValues(property);
      if (!allowed) {
        failures.push(`${nodeType}.${fieldName}: color control is not backed by a zod enum`);
        continue;
      }
      const unknown = allowed.filter((color) => !(color in SUB_AGENT_COLORS));
      if (unknown.length > 0) {
        failures.push(`${nodeType}.${fieldName}: unknown colors ${JSON.stringify(unknown)}`);
      }
    }

    for (const nodeType of [NodeType.SubAgent, NodeType.SubAgentFlow]) {
      const color = NODE_PROPERTY_SCHEMAS[nodeType]?.color;
      const allowed = color ? enumValues(color) : undefined;
      if (JSON.stringify([...(allowed ?? [])].sort()) !== JSON.stringify(palette)) {
        failures.push(
          `${nodeType}.color: zod=${JSON.stringify(allowed)} palette=${JSON.stringify(palette)}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
