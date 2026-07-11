import type React from 'react';
import { readonlyInputExtra, selectStyle } from '../field-styles';
import { useSchemaTranslation } from '../schema-i18n';
import type { ControlProps } from '../types';

/** Sentinel option value used when `meta.allowCustom` is set. */
const CUSTOM = '__custom__';

export const SelectControl: React.FC<ControlProps> = ({
  fieldName,
  nodeId,
  value,
  field,
  readonly,
  onChange,
}) => {
  const { st } = useSchemaTranslation();
  const meta = field.meta;
  const options = meta.options ?? [];

  // A field whose zod type accepts undefined gets an explicit empty choice.
  const isOptional = field.zod.safeParse(undefined).success;

  const current = typeof value === 'string' ? value : '';
  const isCustomValue = meta.allowCustom && current !== '' && !options.includes(current);

  return (
    <div>
      <select
        id={`schema-field-${nodeId}-${fieldName}`}
        className="nodrag"
        value={isCustomValue ? CUSTOM : current}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM) {
            // Switch to free-text entry; keep the current value until typed over.
            onChange(current);
            return;
          }
          onChange(next === '' ? undefined : next);
        }}
        disabled={readonly}
        style={{ ...selectStyle, ...(readonly ? readonlyInputExtra : {}) }}
      >
        {isOptional && <option value="">-</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        {meta.allowCustom && <option value={CUSTOM}>{st('property.select.custom')}</option>}
      </select>
      {isCustomValue && (
        <input
          type="text"
          className="nodrag"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          disabled={readonly}
          style={{ ...selectStyle, marginTop: '6px', cursor: 'text' }}
        />
      )}
    </div>
  );
};
