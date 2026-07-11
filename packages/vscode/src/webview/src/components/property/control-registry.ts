/**
 * Default control component per FieldControl kind.
 *
 * `objectArray` lands in a later phase (array node types); until then a
 * schema declaring it renders nothing rather than crashing.
 */

import type { FieldControl } from '@cc-wf-studio/core';
import type React from 'react';
import { CheckboxControl } from './controls/CheckboxControl';
import { ColorControl } from './controls/ColorControl';
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
};
