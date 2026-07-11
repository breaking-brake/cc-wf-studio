/**
 * One schema-driven field: label row, control (or readonly value), help text.
 *
 * Visibility (`visibleWhen`) is filtered by the panel; this component handles
 * the readonly gate and label/help rendering. Checkbox controls carry their
 * own inline label, so the label row is skipped for them.
 */

import type React from 'react';
import { DEFAULT_CONTROLS } from './control-registry';
import { ReadonlyValue } from './controls/ReadonlyValue';
import { editLabelStyle, fieldLabelStyle, helpTextStyle } from './field-styles';
import { useSchemaTranslation } from './schema-i18n';
import type { ControlProps } from './types';

interface SchemaFieldProps extends Omit<ControlProps, 'readonly'> {
  /** Panel-level mode; 'readonly' renders every field as a display value. */
  mode: 'edit' | 'readonly';
  /** Per-field component override from the panel config. */
  CustomControl?: React.FC<ControlProps>;
}

export const SchemaField: React.FC<SchemaFieldProps> = ({
  mode,
  CustomControl,
  ...controlProps
}) => {
  const { st, stOptional } = useSchemaTranslation();
  const { data, field } = controlProps;
  const meta = field.meta;

  const fieldReadonly = mode === 'readonly' || (meta.readonlyWhen?.(data) ?? false);

  const Control =
    CustomControl ??
    (mode === 'readonly'
      ? ReadonlyValue
      : meta.control
        ? DEFAULT_CONTROLS[meta.control]
        : undefined);

  if (!Control) {
    return null;
  }

  const showLabel = !(mode === 'edit' && meta.control === 'checkbox');
  const help = stOptional(meta.helpKey);

  return (
    <div>
      {showLabel && (
        <div style={mode === 'readonly' ? fieldLabelStyle : editLabelStyle}>
          {st(meta.labelKey)}
        </div>
      )}
      <Control {...controlProps} readonly={fieldReadonly} />
      {help && <div style={helpTextStyle}>{help}</div>}
    </div>
  );
};
