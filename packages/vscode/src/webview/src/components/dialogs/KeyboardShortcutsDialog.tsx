/**
 * Keyboard Shortcuts Dialog
 *
 * Cheat sheet listing every keyboard shortcut and mouse gesture the canvas
 * supports. Opened with the `?` key or the keyboard toolbar button.
 * Radix UI Dialog, standalone layer (z-index 9999).
 */

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../../i18n/i18n-context';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/** One row: a translated action label and one or more key combos. */
interface ShortcutRow {
  label: string;
  combos: string[][];
}

interface ShortcutSection {
  title: string;
  rows: ShortcutRow[];
}

const KBD_STYLE: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  fontSize: '11px',
  fontFamily: 'var(--vscode-editor-font-family, monospace)',
  color: 'var(--vscode-keybindingLabel-foreground, var(--vscode-foreground))',
  backgroundColor: 'var(--vscode-keybindingLabel-background, rgba(128, 128, 128, 0.17))',
  border: '1px solid var(--vscode-keybindingLabel-border, var(--vscode-panel-border))',
  borderBottom: '2px solid var(--vscode-keybindingLabel-bottomBorder, var(--vscode-panel-border))',
  borderRadius: '3px',
  whiteSpace: 'nowrap',
};

const Combo: React.FC<{ keys: string[] }> = ({ keys }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
    {keys.map((key, index) => (
      <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
        {index > 0 && (
          <span style={{ color: 'var(--vscode-descriptionForeground)', fontSize: '11px' }}>+</span>
        )}
        <kbd style={KBD_STYLE}>{key}</kbd>
      </span>
    ))}
  </span>
);

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const mod = isMac ? '⌘' : 'Ctrl';

  const sections: ShortcutSection[] = [
    {
      title: t('shortcuts.section.editing'),
      rows: [
        { label: t('shortcuts.undo'), combos: [[mod, 'Z']] },
        {
          label: t('shortcuts.redo'),
          combos: [
            [mod, 'Shift', 'Z'],
            [mod, 'Y'],
          ],
        },
        { label: t('shortcuts.copy'), combos: [[mod, 'C']] },
        { label: t('shortcuts.cut'), combos: [[mod, 'X']] },
        { label: t('shortcuts.paste'), combos: [[mod, 'V']] },
        { label: t('shortcuts.duplicate'), combos: [[mod, 'D']] },
        { label: t('shortcuts.group'), combos: [[mod, 'G']] },
        { label: t('shortcuts.ungroup'), combos: [[mod, 'Shift', 'G']] },
        { label: t('shortcuts.delete'), combos: [['Delete'], ['Backspace']] },
      ],
    },
    {
      title: t('shortcuts.section.canvas'),
      rows: [
        { label: t('shortcuts.selectAll'), combos: [[mod, 'A']] },
        { label: t('shortcuts.search'), combos: [[mod, 'F']] },
        { label: t('shortcuts.nextProblem'), combos: [['F8']] },
        { label: t('shortcuts.prevProblem'), combos: [['Shift', 'F8']] },
        { label: t('shortcuts.openCheatSheet'), combos: [['?']] },
      ],
    },
    {
      title: t('shortcuts.section.mouse'),
      rows: [
        { label: t('shortcuts.contextMenu'), combos: [[t('shortcuts.gesture.rightClick')]] },
        { label: t('shortcuts.edgeDrop'), combos: [[t('shortcuts.gesture.dragToCanvas')]] },
        {
          label: t('shortcuts.toggleInteraction'),
          combos: [[mod, t('shortcuts.gesture.drag')]],
        },
      ],
    },
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
            aria-describedby={undefined}
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '20px 24px',
              width: '440px',
              maxWidth: '90vw',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              outline: 'none',
            }}
            onEscapeKeyDown={onClose}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <Dialog.Title
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  margin: 0,
                }}
              >
                {t('shortcuts.title')}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={t('shortcuts.close')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            {sections.map((section) => (
              <div key={section.title} style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--vscode-descriptionForeground)',
                    borderBottom: '1px solid var(--vscode-panel-border)',
                    paddingBottom: '4px',
                    marginBottom: '6px',
                  }}
                >
                  {section.title}
                </div>
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      padding: '3px 0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--vscode-foreground)',
                        lineHeight: 1.4,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      {row.combos.map((combo, comboIndex) => (
                        <span
                          key={combo.join('+')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          {comboIndex > 0 && (
                            <span
                              style={{
                                color: 'var(--vscode-descriptionForeground)',
                                fontSize: '11px',
                              }}
                            >
                              /
                            </span>
                          )}
                          <Combo keys={combo} />
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default KeyboardShortcutsDialog;
