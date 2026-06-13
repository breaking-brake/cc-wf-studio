/**
 * CollapsibleSection
 *
 * A lightweight accordion box used to group node property fields by the AI
 * agent (export target) they apply to. The containing box makes a setting's
 * scope visually explicit — e.g. a `Model: Sonnet` field inside the "Claude
 * Code Settings" box reads as Claude Code-only, removing the false impression
 * that it governs other agents.
 */

import { ChevronDown, ChevronRight } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface CollapsibleSectionProps {
  /** Section header label. */
  title: string;
  /** Optional one-line note shown at the top of the expanded body. */
  hint?: string;
  /** Whether the section starts expanded (default: true). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  hint,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 10px',
          backgroundColor: 'var(--vscode-input-background)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--vscode-foreground)',
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
      </button>
      {open && (
        <div
          style={{
            padding: '12px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {hint && (
            <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
              {hint}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
