import type React from 'react';
import { ColorPicker, type SubAgentColor } from '../../common/ColorPicker';
import type { ControlProps } from '../types';

export const ColorControl: React.FC<ControlProps> = ({ value, readonly, onChange }) => (
  <ColorPicker
    value={typeof value === 'string' ? (value as SubAgentColor) : undefined}
    onChange={(color) => onChange(color)}
    disabled={readonly}
    hideLabel
  />
);
