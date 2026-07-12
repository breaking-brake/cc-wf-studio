/**
 * Shared contracts for the schema-driven property panel.
 *
 * The panel renders a node's fields from its core `PropertySchema`
 * (zod + FieldMeta). Anything the schema cannot express stays plain React,
 * injected through the escape hatches here: `Header`/`Footer` slots (badges,
 * edit dialogs, navigation) and `customControls` (per-field component
 * overrides, keyed by field name).
 */

import type { DeriveUpdateFn, PropertyField } from '@cc-wf-studio/core';
import type React from 'react';
import type { Node } from 'reactflow';

/** Props passed to every field control (built-in and custom). */
export interface ControlProps {
  nodeId: string;
  fieldName: string;
  /** Current value of this field on the node data. */
  value: unknown;
  /** The node's full data (for cross-field display logic). */
  data: Record<string, unknown>;
  /** The field's schema entry (zod + meta). */
  field: PropertyField;
  /** True when the panel is readonly or the field's readonlyWhen holds. */
  readonly: boolean;
  onChange: (value: unknown) => void;
}

/** Props passed to a panel's Header/Footer slot components. */
export interface PanelSlotProps {
  node: Node<Record<string, unknown>>;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
}

/** Per-node-type configuration consumed by SchemaPropertyPanel. */
export interface NodePanelConfig {
  /** The node's property schema from the core registry. */
  schema: Record<string, PropertyField>;
  /** Pure normalizer applied to each field patch before persisting. */
  derive?: DeriveUpdateFn;
  /**
   * 'edit' renders each field's interactive control; 'readonly' renders every
   * field as a display value (summary panels whose editing happens in a
   * dialog, e.g. SubAgent/Skill/MCP).
   */
  mode: 'edit' | 'readonly';
  /** i18n prefix for section titles: `<ns>.section.<sectionKey>` (+ `.hint`). */
  i18nNamespace: string;
  /** Rendered above the schema fields (badges, edit buttons + their dialogs). */
  Header?: React.FC<PanelSlotProps>;
  /** Rendered below the schema fields (extra sections, navigation). */
  Footer?: React.FC<PanelSlotProps>;
  /** Per-field component overrides, keyed by field name. A custom control for
   *  a field WITHOUT `meta.control` replaces the whole field rendering (no
   *  label/help framing); with `meta.control` set it replaces the input only. */
  customControls?: Record<string, React.FC<ControlProps>>;
  /** Initial open state per sectionKey, computed from node data
   *  (default: open). E.g. codex 'advanced' opens only when sandbox is set. */
  sectionDefaultOpen?: Record<string, (data: Record<string, unknown>) => boolean>;
}
