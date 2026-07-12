---
paths:
  - "packages/vscode/src/webview/src/components/dialogs/**"
---

# Dialog Component Design Guidelines

## Library choice

**Radix UI Dialog is mandatory.**

Every new dialog must use `@radix-ui/react-dialog`. Existing custom-built dialogs are migrated to Radix UI incrementally.

**Rationale:**
- Accessibility (ARIA attributes, focus management) is handled automatically
- Standard behaviors (ESC key, overlay click) are consistent across dialogs
- z-index management is straightforward

## z-index hierarchy (4 layers)

```text
Layer           z-index   Purpose
─────────────────────────────────────────────────────
Base            9999      Standalone dialogs, parent dialogs
Nested          10000     Child dialogs nested inside a parent
Confirm         10001     Confirmation dialogs
PreviewOverlay  10002     Full-size previews opened from a confirmation dialog
```

| z-index | Purpose | Examples |
|---------|---------|----------|
| **9999** | Standalone / parent dialogs | McpNodeDialog, SkillBrowserDialog, SlackShareDialog |
| **10000** | Nested child dialogs | SkillCreationDialog (inside SkillBrowserDialog), SlackManualTokenDialog |
| **10001** | Confirmation / warning dialogs | ConfirmDialog (delete confirmation etc.), DiffPreviewDialog |
| **10002** | Full-size preview opened from a confirmation dialog | DiffPreviewDialog's Overview preview |

## Implementation pattern

### Basic structure (Radix UI Dialog)

```tsx
import * as Dialog from '@radix-ui/react-dialog';

// z-index constants (recommended: manage in a shared constants file)
const Z_INDEX = {
  DIALOG_BASE: 9999,
  DIALOG_NESTED: 10000,
  DIALOG_CONFIRM: 10001,
  DIALOG_PREVIEW_OVERLAY: 10002,
} as const;

export function MyDialog({ isOpen, onClose }: Props) {
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
            zIndex: Z_INDEX.DIALOG_BASE, // ← always set this
          }}
        >
          <Dialog.Content>
            {/* content */}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Nested dialog pattern

When opening a child dialog from inside a parent dialog:

```tsx
// Parent dialog: z-index 9999
<SkillBrowserDialog>
  {/* Child dialog: z-index 10000 */}
  <SkillCreationDialog />
</SkillBrowserDialog>
```

## Checklist (when creating a new dialog)

- [ ] Uses `@radix-ui/react-dialog`
- [ ] Sets `zIndex` on `Dialog.Overlay`
- [ ] z-index value follows the hierarchy design
  - Standalone / parent dialog → 9999
  - Nested child dialog → 10000
  - Confirmation dialog → 10001
  - Full-size preview opened from a confirmation dialog → 10002
- [ ] Closing via ESC key works correctly
- [ ] Closing via overlay click works correctly

## Dialog examples per layer

Representative examples of the z-index hierarchy in practice (non-exhaustive —
see `packages/vscode/src/webview/src/components/dialogs/` for the full set;
every new dialog must follow the checklist above).

| Dialog | z-index | Role |
|--------|---------|------|
| ConfirmDialog | 10001 | Confirmation dialog |
| DiffPreviewDialog | 10001 | Confirmation dialog (AI editing) |
| DiffPreviewDialog's Overview preview | 10002 | Full-size preview from a confirmation dialog |
| SkillCreationDialog | 10000 | Child dialog |
| SlackManualTokenDialog | 10000 | Child dialog |
| SkillBrowserDialog | 9999 | Parent dialog |
| McpNodeDialog | 9999 | Standalone |
| SubAgentFlowDialog | 9999 | Parent dialog |
| SlackShareDialog | 9999 | Parent dialog |
| SlackConnectionRequiredDialog | 9999 | Standalone |
| McpNodeEditDialog | 9999 | Standalone |
