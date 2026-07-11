/**
 * Shared styles for schema-driven property fields.
 *
 * Single source for the label/value/input styling that the legacy per-node
 * property components each duplicated inline.
 */

import type React from 'react';

export const fieldLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--vscode-descriptionForeground)',
  marginBottom: '2px',
};

export const editLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--vscode-foreground)',
  marginBottom: '6px',
};

export const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--vscode-foreground)',
  wordBreak: 'break-word',
};

/** Multi-line readonly value: monospace, pre-wrap, clamped to ~3 lines. */
export const clampedMonoValueStyle: React.CSSProperties = {
  ...valueStyle,
  fontFamily: 'var(--vscode-editor-font-family)',
  whiteSpace: 'pre-wrap',
  maxHeight: '4.5em',
  lineHeight: '1.5',
  overflow: 'hidden',
};

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  backgroundColor: 'var(--vscode-input-background)',
  color: 'var(--vscode-input-foreground)',
  border: '1px solid var(--vscode-input-border)',
  borderRadius: '2px',
  fontSize: '13px',
  boxSizing: 'border-box',
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'var(--vscode-editor-font-family)',
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

export const helpTextStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--vscode-descriptionForeground)',
  marginTop: '4px',
};

export const readonlyInputExtra: React.CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
};
