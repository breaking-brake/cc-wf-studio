/**
 * Default control component per FieldControl kind.
 *
 * The bare `objectArray` entry has no add-item factory; panels that need an
 * add button wrap ObjectArrayControl via `customControls` to supply one.
 */

import type { FieldControl } from '@cc-wf-studio/core';
import type React from 'react';
import { CheckboxControl } from './controls/CheckboxControl';
import { ColorControl } from './controls/ColorControl';
import { ObjectArrayControl } from './controls/ObjectArrayControl';
import { RadioControl } from './controls/RadioControl';
import { SelectControl } from './controls/SelectControl';
import { TextareaControl } from './controls/TextareaControl';
import { TextControl } from './controls/TextControl';
import { ToolsControl } from './controls/ToolsControl';
import type { ControlProps } from './types';

export const DEFAULT_CONTROLS: Partial<Record<FieldControl, React.FC<ControlProps>>> = {
  text: TextControl,
  textarea: TextareaControl,
  select: SelectControl,
  checkbox: CheckboxControl,
  radio: RadioControl,
  color: ColorControl,
  tools: ToolsControl,
  objectArray: ObjectArrayControl,
};
