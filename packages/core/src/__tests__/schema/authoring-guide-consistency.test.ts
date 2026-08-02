import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateAIGeneratedWorkflow } from '../../utils/validate-workflow.js';
import { NODE_PROPERTY_SCHEMAS } from '../../schema/node-schema-registry.js';

/**
 * Suite S1, item 1 — consistency between the two independently maintained
 * representations of a node's properties:
 *
 * | Representation  | Location                                  | Role                                  |
 * |-----------------|-------------------------------------------|---------------------------------------|
 * | zod schemas     | `packages/core/src/schema/nodes/`          | runtime validation + property panel   |
 * | authoring guide | `packages/core/resources/workflow-schema.json` | instructions for AI agents (hand-written) |
 *
 * CLAUDE.md states a cross-reference rule ("update `workflow-schema.json`
 * when you add a zod field, and vice versa") but nothing enforces it. These
 * tests do.
 *
 * The direction that matters is **guide → zod**: if the guide advertises
 * something the validator rejects, an AI agent follows the guide and produces
 * a workflow that fails validation. The reverse (zod accepts a field the
 * guide never mentions) is harmless — an agent simply does not author it.
 *
 * This relates two artifacts to each other rather than restating one of them,
 * so it is a check and not a transcription of the schema.
 */

interface GuideField {
  type?: string;
  enum?: unknown[];
  default?: unknown;
}

interface GuideNodeType {
  fields?: Record<string, GuideField>;
}

interface AuthoringGuide {
  nodeTypes: Record<string, GuideNodeType>;
  examples: { name?: string; workflow?: unknown }[];
}

/**
 * Read via `fs` rather than a JSON import: `resources/` sits outside the
 * package's `rootDir`, so importing it would break `tsc`. The relative path
 * resolves the same from `src/schema/` and from the compiled `dist/schema/`.
 */
const guide = JSON.parse(
  readFileSync(new URL('../../../resources/workflow-schema.json', import.meta.url), 'utf-8'),
) as AuthoringGuide;

/**
 * Node types the authoring guide documents with no zod counterpart.
 * `start` / `end` carry no configurable fields, so they have no property
 * schema to register.
 */
const GUIDE_ONLY_NODE_TYPES = new Set(['start', 'end']);

/**
 * Node types with a zod schema that the guide deliberately does not offer to
 * AI agents. `branch` is the legacy two-way branch kept for backward
 * compatibility — `ifElse` / `switch` replaced it for new authoring.
 */
const ZOD_ONLY_NODE_TYPES = new Set(['branch']);

/**
 * Fields the guide documents that are validated by the hand-written rules in
 * `validate-workflow.ts` rather than by a zod property field. Listing them
 * explicitly means a *new* undocumented divergence still fails.
 *
 * - `outputPorts`: deliberately excluded from the schema pass so the
 *   legacy-tolerated transient `outputPorts: 0` keeps loading; per-node
 *   port counts are checked by hand instead.
 * - SubAgent `commandFilePath` / `commandScope`: checked by hand because the
 *   rules are cross-field (mutually exclusive with `builtInType`).
 */
const HAND_VALIDATED_FIELDS_ALL_NODES = new Set(['outputPorts']);
const HAND_VALIDATED_FIELDS_BY_NODE: Record<string, Set<string>> = {
  subAgent: new Set(['commandFilePath', 'commandScope']),
};

function isHandValidated(nodeType: string, fieldName: string): boolean {
  return (
    HAND_VALIDATED_FIELDS_ALL_NODES.has(fieldName) ||
    (HAND_VALIDATED_FIELDS_BY_NODE[nodeType]?.has(fieldName) ?? false)
  );
}

describe('authoring guide ↔ zod node schemas', () => {
  it('documents every node type that has a zod property schema', () => {
    const undocumented = Object.keys(NODE_PROPERTY_SCHEMAS).filter(
      (type) => !(type in guide.nodeTypes) && !ZOD_ONLY_NODE_TYPES.has(type),
    );
    expect(undocumented).toEqual([]);
  });

  it('documents no node type that the validator does not know about', () => {
    // A guide entry with no schema and no exception means an AI agent is told
    // to author a node type nothing validates.
    const unknown = Object.keys(guide.nodeTypes).filter(
      (type) => !(type in NODE_PROPERTY_SCHEMAS) && !GUIDE_ONLY_NODE_TYPES.has(type),
    );
    expect(unknown).toEqual([]);
  });

  it('documents no field that has neither a zod field nor a hand-written check', () => {
    const orphans: string[] = [];
    for (const [type, definition] of Object.entries(guide.nodeTypes)) {
      const schema = NODE_PROPERTY_SCHEMAS[type as keyof typeof NODE_PROPERTY_SCHEMAS];
      if (!schema) continue;
      for (const fieldName of Object.keys(definition.fields ?? {})) {
        if (fieldName in schema) continue;
        if (isHandValidated(type, fieldName)) continue;
        orphans.push(`${type}.${fieldName}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  /**
   * The load-bearing assertion. The two representations can list the same
   * field name and still disagree about its permitted values — exactly the
   * drift that makes an AI-authored workflow fail validation on a value the
   * guide told the agent to use.
   */
  it('advertises no enum value or default that zod would reject', () => {
    const rejected: string[] = [];
    for (const [type, definition] of Object.entries(guide.nodeTypes)) {
      const schema = NODE_PROPERTY_SCHEMAS[type as keyof typeof NODE_PROPERTY_SCHEMAS];
      if (!schema) continue;
      for (const [fieldName, fieldDefinition] of Object.entries(definition.fields ?? {})) {
        const property = schema[fieldName];
        if (!property) continue;
        const advertised = [
          ...(Array.isArray(fieldDefinition.enum) ? fieldDefinition.enum : []),
          ...(fieldDefinition.default !== undefined ? [fieldDefinition.default] : []),
        ];
        for (const value of advertised) {
          if (!property.zod.safeParse(value).success) {
            rejected.push(`${type}.${fieldName} = ${JSON.stringify(value)}`);
          }
        }
      }
    }
    expect(rejected).toEqual([]);
  });
});

/**
 * The guide ships complete example workflows that AI agents are shown as
 * templates. An example that does not itself validate teaches the agent to
 * produce a workflow the product then refuses — the most direct possible way
 * for guide/validator drift to reach a user.
 */
describe('authoring guide example workflows', () => {
  it('ships at least one example', () => {
    expect(guide.examples.length).toBeGreaterThan(0);
  });

  it.each(guide.examples.map((example, index) => [example.name ?? `example ${index}`, example]))(
    'validates the "%s" example',
    (_name, example) => {
      const result = validateAIGeneratedWorkflow(example.workflow ?? example);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    },
  );
});
