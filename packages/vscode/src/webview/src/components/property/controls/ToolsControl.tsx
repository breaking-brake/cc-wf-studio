import type React from 'react';
import { ToolSelectTagInput } from '../../common/ToolSelectTagInput';
import type { ControlProps } from '../types';

/** Node data stores tools as a comma-separated string; the tag input uses string[]. */
export const ToolsControl: React.FC<ControlProps> = ({ value, readonly, onChange }) => {
  const selected =
    typeof value === 'string' && value.trim() !== ''
      ? value
          .split(',')
          .map((tool) => tool.trim())
          .filter(Boolean)
      : [];

  return (
    <ToolSelectTagInput
      selectedTools={selected}
      onChange={(tools) => onChange(tools.length > 0 ? tools.join(', ') : undefined)}
      disabled={readonly}
    />
  );
};
