import type React from 'react';
import { inputStyle, readonlyInputExtra } from '../field-styles';
import { useSchemaTranslation } from '../schema-i18n';
import type { ControlProps } from '../types';

export const TextControl: React.FC<ControlProps> = ({
  fieldName,
  nodeId,
  value,
  field,
  readonly,
  onChange,
}) => {
  const { stOptional } = useSchemaTranslation();

  return (
    <input
      id={`schema-field-${nodeId}-${fieldName}`}
      type="text"
      className="nodrag"
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={readonly}
      placeholder={stOptional(field.meta.placeholderKey)}
      style={{ ...inputStyle, ...(readonly ? readonlyInputExtra : {}) }}
    />
  );
};
