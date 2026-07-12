/**
 * Generic property panel that renders a node's fields from its core
 * PropertySchema (zod + FieldMeta).
 *
 * Render order is schema declaration order. Fields sharing a `sectionKey`
 * render together inside a CollapsibleSection at the position of the key's
 * first occurrence. Fields without a `control` (data-only) are skipped unless
 * a custom control is registered for them in the panel config. A failing
 * `visibleWhen` predicate always hides the field — including custom-control
 * fields: custom controls override how a field renders, not whether it is
 * visible.
 *
 * Every field change flows through the node's optional `derive` normalizer
 * (outputPorts sync etc.) before `updateNodeData` persists it.
 */

import { getSchemaFields, type PropertyField } from '@cc-wf-studio/core';
import type React from 'react';
import type { Node } from 'reactflow';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { SchemaField } from './SchemaField';
import { useSchemaTranslation } from './schema-i18n';
import type { NodePanelConfig } from './types';

interface SchemaPropertyPanelProps {
  node: Node<Record<string, unknown>>;
  config: NodePanelConfig;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
}

type RenderItem =
  | { kind: 'field'; name: string }
  | { kind: 'section'; sectionKey: string; fieldNames: string[] };

/** Group field names into top-level fields and sections, in declaration order. */
function buildRenderItems(schema: Record<string, PropertyField>): RenderItem[] {
  const items: RenderItem[] = [];
  const sections = new Map<string, RenderItem & { kind: 'section' }>();

  for (const { name, meta } of getSchemaFields(schema)) {
    if (meta.sectionKey) {
      let section = sections.get(meta.sectionKey);
      if (!section) {
        section = { kind: 'section', sectionKey: meta.sectionKey, fieldNames: [] };
        sections.set(meta.sectionKey, section);
        items.push(section);
      }
      section.fieldNames.push(name);
    } else {
      items.push({ kind: 'field', name });
    }
  }
  return items;
}

export const SchemaPropertyPanel: React.FC<SchemaPropertyPanelProps> = ({
  node,
  config,
  updateNodeData,
}) => {
  const { st, stOptional } = useSchemaTranslation();
  const {
    schema,
    derive,
    mode,
    i18nNamespace,
    Header,
    Footer,
    customControls,
    sectionDefaultOpen,
  } = config;
  const data = node.data;

  const handleChange = (fieldName: string, value: unknown) => {
    const patch: Record<string, unknown> = { [fieldName]: value };
    updateNodeData(node.id, derive ? derive(data, patch) : patch);
  };

  const renderField = (name: string): React.ReactNode => {
    const propertyField = schema[name];
    const meta = propertyField.meta;
    const CustomControl = customControls?.[name];

    // Data-only fields render only via an explicit custom control.
    if (!meta.control && !CustomControl) {
      return null;
    }
    if (meta.visibleWhen && !meta.visibleWhen(data)) {
      return null;
    }

    return (
      <SchemaField
        key={name}
        mode={mode}
        CustomControl={CustomControl}
        nodeId={node.id}
        fieldName={name}
        value={data[name]}
        data={data}
        field={propertyField}
        onChange={(value) => handleChange(name, value)}
      />
    );
  };

  const renderItems = buildRenderItems(schema);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Header && <Header node={node} updateNodeData={updateNodeData} />}

      {renderItems.map((item) => {
        if (item.kind === 'field') {
          return renderField(item.name);
        }
        const children = item.fieldNames.map(renderField).filter(Boolean);
        if (children.length === 0) {
          return null;
        }
        return (
          // Keyed by node.id so switching nodes remounts the section and
          // re-applies the computed defaultOpen (its open state is internal).
          <CollapsibleSection
            key={`${node.id}-${item.sectionKey}`}
            title={st(`${i18nNamespace}.section.${item.sectionKey}`)}
            hint={stOptional(`${i18nNamespace}.section.${item.sectionKey}.hint`)}
            defaultOpen={sectionDefaultOpen?.[item.sectionKey]?.(data) ?? true}
          >
            {children}
          </CollapsibleSection>
        );
      })}

      {Footer && <Footer node={node} updateNodeData={updateNodeData} />}
    </div>
  );
};
