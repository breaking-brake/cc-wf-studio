import type React from 'react';
import { useState } from 'react';
import { EditInEditorButton } from '../../common/EditInEditorButton';
import { readonlyInputExtra, textareaStyle } from '../field-styles';
import { useSchemaTranslation } from '../schema-i18n';
import type { ControlProps } from '../types';

export const TextareaControl: React.FC<ControlProps> = ({
  fieldName,
  nodeId,
  value,
  field,
  readonly,
  onChange,
}) => {
  const { st, stOptional } = useSchemaTranslation();
  // Lock the textarea while the value is being edited in the external editor.
  const [isEditingInEditor, setIsEditingInEditor] = useState(false);

  const text = typeof value === 'string' ? value : '';
  const locked = readonly || isEditingInEditor;

  return (
    <div>
      <textarea
        id={`schema-field-${nodeId}-${fieldName}`}
        className="nodrag"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
        rows={6}
        placeholder={stOptional(field.meta.placeholderKey)}
        style={{ ...textareaStyle, ...(locked ? readonlyInputExtra : {}) }}
      />
      {field.meta.editInEditor && !readonly && (
        <div style={{ marginTop: '4px' }}>
          <EditInEditorButton
            content={text}
            onContentUpdated={onChange}
            label={st(field.meta.labelKey)}
            onEditingStateChange={setIsEditingInEditor}
          />
        </div>
      )}
    </div>
  );
};
