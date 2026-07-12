# Webview Implementation Patterns

## External Link Implementation Pattern

Webview から外部URLを開く場合、VSCode の制約上 `<a href>` は使えないため、`openExternalUrl` ユーティリティと `lucide-react` の `ExternalLink` アイコンを使用する。

### 実装方法

```tsx
import { ExternalLink } from 'lucide-react';
import { openExternalUrl } from '../../services/vscode-bridge';

// アイコンリンク（テキストなし）
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

### 要点
- `openExternalUrl()` は Extension Host 経由で `vscode.env.openExternal` を呼ぶ
- `role="button"` + `tabIndex={0}` + `onKeyDown` でアクセシビリティ対応
- アイコンサイズは周囲のテキストサイズに合わせる（11〜14px）
- `e.stopPropagation()` はアコーディオンヘッダー内など親要素のクリックイベントと競合する場合に追加する
- 既存の使用例: `McpServerSection.tsx`, `CodexNodeDialog.tsx`, `ClaudeApiUploadDialog.tsx`
