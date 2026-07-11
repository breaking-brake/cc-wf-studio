/**
 * Display-only rendering of a schema field's value.
 *
 * Used for every field of a `mode: 'readonly'` panel (summary panels whose
 * editing happens in a dialog) and as the readonly face of edit-mode fields.
 */

import { SUB_AGENT_COLORS } from '@cc-wf-studio/core';
import type React from 'react';
import { clampedMonoValueStyle, valueStyle } from '../field-styles';
import { useSchemaTranslation } from '../schema-i18n';
import type { ControlProps } from '../types';

export const ReadonlyValue: React.FC<ControlProps> = ({ value, data, field }) => {
  const { st } = useSchemaTranslation();
  const meta = field.meta;

  const hint =
    meta.readonlyHintKey && meta.readonlyWhen?.(data) ? ` (${st(meta.readonlyHintKey)})` : '';

  if (meta.control === 'color') {
    const colorKey = typeof value === 'string' ? value : undefined;
    const colorValue =
      colorKey && colorKey in SUB_AGENT_COLORS
        ? SUB_AGENT_COLORS[colorKey as keyof typeof SUB_AGENT_COLORS]
        : undefined;
    return (
      <div style={{ ...valueStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {colorValue ? (
          <>
            <div
              style={{
                width: '14px',
                height: '14px',
                backgroundColor: colorValue,
                borderRadius: '2px',
              }}
            />
            <span style={{ textTransform: 'capitalize' }}>{colorKey}</span>
          </>
        ) : (
          '-'
        )}
      </div>
    );
  }

  const text =
    value === undefined || value === null || value === '' ? '-' : `${String(value)}${hint}`;

  if (meta.control === 'textarea') {
    return <div style={clampedMonoValueStyle}>{text}</div>;
  }

  return <div style={valueStyle}>{text}</div>;
};
