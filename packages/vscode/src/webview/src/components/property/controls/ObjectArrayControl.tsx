/**
 * Array-of-objects editor for `control: 'objectArray'` fields.
 *
 * Item add/remove bounds come from the field's zod type (`.min()/.max()`;
 * `.length(n)` hides both controls). Rows matching `itemReadonlyWhen` render
 * disabled and cannot be removed (e.g. the switch default branch). Ordering
 * rules and outputPorts sync live in the node's core `derive` function, so
 * this control simply emits the new array.
 *
 * i18n conventions on the field's labelKey:
 * - `<labelKey>`        header text, receives {count}
 * - `<labelKey>.item`   per-row title, receives {number}
 * - `<labelKey>.add`    add-button label
 *
 * Adding rows requires a `newItem` factory — panels provide it by wrapping
 * this control in `customControls` (the factory owns localized defaults and
 * ID generation). Without a factory the add button never renders.
 */

import { getArrayBounds } from '@cc-wf-studio/core';
import type React from 'react';
import { useTranslation } from '../../../i18n/i18n-context';
import { useSchemaTranslation } from '../schema-i18n';
import type { ControlProps } from '../types';

type ArrayItem = Record<string, unknown> & { id?: string };

export interface ObjectArrayControlProps extends ControlProps {
  /** Build a new item (localized defaults + generated id). */
  newItem?: (existing: ArrayItem[]) => ArrayItem;
  /** Extra gate for the add button, ANDed with the zod max bound. */
  canAdd?: (data: Record<string, unknown>) => boolean;
}

const itemInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 6px',
  backgroundColor: 'var(--vscode-input-background)',
  color: 'var(--vscode-input-foreground)',
  border: '1px solid var(--vscode-input-border)',
  borderRadius: '2px',
  fontSize: '12px',
  boxSizing: 'border-box',
};

const itemLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--vscode-foreground)',
  marginBottom: '4px',
};

export const ObjectArrayControl: React.FC<ObjectArrayControlProps> = ({
  fieldName,
  nodeId,
  value,
  data,
  field,
  readonly,
  onChange,
  newItem,
  canAdd,
}) => {
  const { t } = useTranslation();
  const { st, stOptional } = useSchemaTranslation();
  const meta = field.meta;

  const items: ArrayItem[] = Array.isArray(value) ? (value as ArrayItem[]) : [];
  const { min, max } = getArrayBounds(field.zod);
  const fixedLength = min !== undefined && min === max;

  const showAdd =
    !readonly &&
    !fixedLength &&
    !!newItem &&
    (max === undefined || items.length < max) &&
    (canAdd?.(data) ?? true);

  const canRemove = (item: ArrayItem) =>
    !readonly &&
    !fixedLength &&
    !(meta.itemReadonlyWhen?.(item) ?? false) &&
    items.length > (min ?? 0);

  const updateItem = (index: number, name: string, fieldValue: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [name]: fieldValue } : item)));
  };

  return (
    <div>
      {/* Header: count label + add button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>
          {st(meta.labelKey, { count: items.length })}
        </div>
        {showAdd && (
          <button
            type="button"
            onClick={() => onChange([...items, (newItem as NonNullable<typeof newItem>)(items)])}
            className="nodrag"
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            {st(`${meta.labelKey}.add`)}
          </button>
        )}
      </div>

      {items.map((item, index) => {
        const itemReadonly = readonly || (meta.itemReadonlyWhen?.(item) ?? false);
        return (
          <div
            key={item.id ?? index}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {st(`${meta.labelKey}.item`, { number: index + 1 })}
              </span>
              {canRemove(item) && (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  className="nodrag"
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                >
                  {t('property.remove')}
                </button>
              )}
            </div>

            {(meta.itemFields ?? []).map((itemField) => {
              const itemFieldId = `schema-field-${nodeId}-${fieldName}-${index}-${itemField.name}`;
              const itemValue =
                typeof item[itemField.name] === 'string' ? (item[itemField.name] as string) : '';
              const label = stOptional(itemField.labelKey);
              const placeholder = stOptional(itemField.placeholderKey);
              const disabledStyle = itemReadonly ? { opacity: 0.6, cursor: 'not-allowed' } : {};

              return (
                <div key={itemField.name} style={{ marginBottom: '8px' }}>
                  {label && (
                    <label htmlFor={itemFieldId} style={itemLabelStyle}>
                      {label}
                    </label>
                  )}
                  {itemField.control === 'textarea' ? (
                    <textarea
                      id={itemFieldId}
                      className="nodrag"
                      value={itemValue}
                      onChange={(e) => updateItem(index, itemField.name, e.target.value)}
                      rows={2}
                      placeholder={placeholder}
                      disabled={itemReadonly}
                      style={{
                        ...itemInputStyle,
                        resize: itemReadonly ? 'none' : 'vertical',
                        ...disabledStyle,
                      }}
                    />
                  ) : (
                    <input
                      id={itemFieldId}
                      type="text"
                      className="nodrag"
                      value={itemValue}
                      onChange={(e) => updateItem(index, itemField.name, e.target.value)}
                      placeholder={placeholder}
                      disabled={itemReadonly}
                      style={{ ...itemInputStyle, ...disabledStyle }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
