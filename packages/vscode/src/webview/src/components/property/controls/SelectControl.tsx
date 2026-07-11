import type React from 'react';
import { useState } from 'react';
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
  const { st, stOptional } = useSchemaTranslation();
  const meta = field.meta;
  const options = meta.options ?? [];
  // Options with a `<labelKey>.option.<value>` translation show it; product
  // terms (model names etc.) have no such key and render verbatim.
  const optionLabel = (opt: string) => stOptional(`${meta.labelKey}.option.${opt}`) ?? opt;

  // A field whose zod type accepts undefined gets an explicit empty choice.
  const isOptional = field.zod.safeParse(undefined).success;

  const current = typeof value === 'string' ? value : '';
  const isCustomValue = !!meta.allowCustom && current !== '' && !options.includes(current);
  // The stored value alone cannot express "the user just picked Custom... but
  // hasn't typed yet" (the value is still a regular option), so that transient
  // UI state lives here.
  const [customMode, setCustomMode] = useState(false);
  const showCustomInput = !!meta.allowCustom && (customMode || isCustomValue);

  return (
    <div>
      <select
        id={`schema-field-${nodeId}-${fieldName}`}
        className="nodrag"
        value={showCustomInput ? CUSTOM : current}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM) {
            // Enter custom-input mode; keep the stored value until typed over.
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(next === '' ? undefined : next);
        }}
        disabled={readonly}
        style={{ ...selectStyle, ...(readonly ? readonlyInputExtra : {}) }}
      >
        {isOptional && <option value="">-</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {optionLabel(opt)}
          </option>
        ))}
        {meta.allowCustom && <option value={CUSTOM}>{st('property.select.custom')}</option>}
      </select>
      {showCustomInput && (
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
