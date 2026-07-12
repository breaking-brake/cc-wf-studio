---
paths:
  - "packages/vscode/src/webview/**"
---

# Webview Implementation Patterns

## External Link Implementation Pattern

To open an external URL from the webview, `<a href>` cannot be used due to VSCode restrictions. Use the `openExternalUrl` utility together with the `ExternalLink` icon from `lucide-react`.

### Implementation

```tsx
import { ExternalLink } from 'lucide-react';
import { openExternalUrl } from '../../services/vscode-bridge';

// Icon link (no text)
<span
  role="button"
  tabIndex={0}
  onClick={() => openExternalUrl('https://example.com')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      openExternalUrl('https://example.com');
    }
  }}
  style={{
    display: 'inline-flex',
    cursor: 'pointer',
    color: 'var(--vscode-textLink-foreground)',
  }}
  title="Open documentation"
>
  <ExternalLink size={11} />
</span>
```

### Key points
- `openExternalUrl()` calls `vscode.env.openExternal` via the Extension Host
- Accessibility: `role="button"` + `tabIndex={0}` + `onKeyDown`
- Match the icon size to the surrounding text size (11–14px)
- Add `e.stopPropagation()` when the click would conflict with a parent element's click handler (e.g. inside an accordion header)
- Existing usages: `McpServerSection.tsx`, `CodexNodeDialog.tsx`, `ClaudeApiUploadDialog.tsx`
