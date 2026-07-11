import type React from 'react';
import { useSchemaTranslation } from '../schema-i18n';
import type { ControlProps } from '../types';

export const RadioControl: React.FC<ControlProps> = ({
  fieldName,
  nodeId,
  value,
  field,
  readonly,
  onChange,
}) => {
  const { stOptional } = useSchemaTranslation();
  const options = field.meta.options ?? [];
  const groupName = `schema-field-${nodeId}-${fieldName}`;
  const optionLabel = (opt: string) => stOptional(`${field.meta.labelKey}.option.${opt}`) ?? opt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {options.map((opt) => (
        <label
          key={opt}
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
            type="radio"
            className="nodrag"
            name={groupName}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            disabled={readonly}
          />
          {optionLabel(opt)}
        </label>
      ))}
    </div>
  );
};
