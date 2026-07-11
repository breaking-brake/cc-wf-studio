import type React from 'react';
import { useSchemaTranslation } from '../schema-i18n';
import type { ControlProps } from '../types';

export const CheckboxControl: React.FC<ControlProps> = ({
  fieldName,
  nodeId,
  value,
  field,
  readonly,
  onChange,
}) => {
  const { st } = useSchemaTranslation();

  return (
    <label
      htmlFor={`schema-field-${nodeId}-${fieldName}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: 'var(--vscode-foreground)',
        cursor: readonly ? 'not-allowed' : 'pointer',
        opacity: readonly ? 0.6 : 1,
      }}
    >
      <input
        id={`schema-field-${nodeId}-${fieldName}`}
        type="checkbox"
        className="nodrag"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        disabled={readonly}
      />
      {st(field.meta.labelKey)}
    </label>
  );
};
