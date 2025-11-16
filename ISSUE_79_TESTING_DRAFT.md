# Issue #79 - Windows環境AI編集機能修正テストドラフト

## 修正概要

Windows環境でAI編集機能（Workflow生成機能）が動作しない問題を修正しました。

### 根本原因

1. **コマンド実行の環境依存問題**
   - `child_process.spawn()`がWindows環境で`claude`コマンドを正しく解決できない
   - Windowsでは`.cmd`や`.exe`などの拡張子処理が必要

2. **プロセス終了シグナルの非互換性**
   - `SIGTERM`と`SIGKILL`はUnix系OSのシグナル
   - Windowsではこれらのシグナルがサポートされていない

3. **Windowsコマンドライン引数の制限**
   - 長いプロンプト（22KB）をコマンドライン引数で渡すと失敗
   - Windowsではシングルクォート`'`がサポートされていない
   - エスケープシーケンス`'\''`がWindows環境で動作しない

### 修正内容

#### 1. nano-spawnライブラリの採用

**変更理由:**
- クロスプラットフォーム対応（Windows/Unix/macOS）
- 依存ゼロ（セキュリティリスク軽減）
- 2025年最新版（v2.0.0, 8日前リリース）
- Sindre Sorhus氏メンテナンス（信頼性）

**変更ファイル:**
- `package.json` - nano-spawn@^2.0.0追加
- `src/extension/services/claude-code-service.ts` - 全面的に書き換え

#### 2. プロセス終了処理の修正

**変更前（Unix専用）:**
```typescript
childProcess.kill('SIGTERM');  // Windowsでは動作しない
childProcess.kill('SIGKILL');  // Windowsでは動作しない
```

**変更後（クロスプラットフォーム対応）:**
```typescript
childProcess.kill();  // 引数なし = Windows/Unix両対応
// Windows: 無条件終了
// Unix: SIGTERM（優雅な終了）
```

#### 3. 型定義の手動定義

**変更理由:**
- TypeScriptの`moduleResolution: "node"`との互換性問題
- nano-spawnはESM形式だが、VSCode拡張機能はCommonJS

**対策:**
```typescript
const nanoSpawn = require('nano-spawn');
// 型定義を手動で定義
interface SubprocessError extends Error { ... }
interface Result { ... }
interface Subprocess extends Promise<Result> { ... }
```

#### 4. stdin経由でのプロンプト渡し

**変更理由:**
- Windowsコマンドライン引数の文字数制限とクォート処理の問題を回避
- 長いプロンプト（22KB）でも確実に動作

**変更前（コマンドライン引数）:**
```typescript
const subprocess = spawn('claude', ['-p', prompt], {
  cwd: workingDirectory,
  timeout: timeoutMs,
  stdin: 'ignore',
  stdout: 'pipe',
  stderr: 'pipe',
});
```

**変更後（stdin経由）:**
```typescript
const subprocess = spawn('claude', ['-p', '-'], {
  cwd: workingDirectory,
  timeout: timeoutMs,
  stdin: { string: prompt },  // 標準入力経由でプロンプトを渡す
  stdout: 'pipe',
  stderr: 'pipe',
});
```

#### 5. VSIXパッケージングの修正

**変更理由:**
- nano-spawnはESM専用パッケージのため、VSIXに明示的に含める必要がある
- `require('nano-spawn')`は実行時に解決されるため、bundlerで自動検出されない

**変更内容:**
`.vscodeignore`に例外追加:
```
# Build tools
node_modules/**
# Include nano-spawn for cross-platform process spawning (Issue #79)
!node_modules/nano-spawn/**
*.vsix
```

#### 6. npx経由での実行

**変更理由:**
- Windowsでグローバルインストール時のPATH認識問題（Issue #3838）を回避
- すべてのプラットフォームで確実に動作させる
- シンプルで保守しやすいコード

**変更前（直接実行）:**
```typescript
const subprocess = spawn('claude', ['-p', '-'], {
  cwd: workingDirectory,
  timeout: timeoutMs,
  stdin: { string: prompt },
  stdout: 'pipe',
  stderr: 'pipe',
});
```

**変更後（npx経由）:**
```typescript
const subprocess = spawn('npx', ['claude', '-p', '-'], {
  cwd: workingDirectory,
  timeout: timeoutMs,
  stdin: { string: prompt },
  stdout: 'pipe',
  stderr: 'pipe',
});
```

**性能への影響:**
- npxオーバーヘッド: 約0.4秒
- AI生成時間: 通常30〜90秒
- 相対的な影響: 0.4〜1.3%（誤差範囲）

## テストシナリオ

### 前提条件
- Windows 10/11環境
- VSCode最新版
- Claude Code CLIインストール済み

### テストケース1: 基本的なWorkflow生成

1. VSCodeでcc-wf-studioを開く
2. Command Palette → "Claude Code Workflow Studio: Open Workflow Canvas"
3. "Generate with AI"ボタンをクリック
4. プロンプト入力: "Create a workflow that greets the user"
5. 生成ボタンをクリック

**期待結果:**
- ✅ エラーなく生成完了
- ✅ 生成されたWorkflowがCanvasに表示される
- ✅ Output Channel（"Claude Code Workflow Studio"）にログが出力される

### テストケース2: タイムアウト処理

1. VSCodeでcc-wf-studioを開く
2. Command Palette → "Claude Code Workflow Studio: Open Workflow Canvas"
3. "Generate with AI"ボタンをクリック
4. プロンプト入力: 非常に複雑な要求（2000文字近い長文）
5. 生成ボタンをクリック

**期待結果:**
- ✅ タイムアウト（60秒後）が正しく動作
- ✅ エラーメッセージ表示: "AI generation timed out after 60 seconds..."
- ✅ プロセスが正しく終了（ゾンビプロセスが残らない）

### テストケース3: キャンセル操作

1. VSCodeでcc-wf-studioを開く
2. Command Palette → "Claude Code Workflow Studio: Open Workflow Canvas"
3. "Generate with AI"ボタンをクリック
4. プロンプト入力: "Create a complex workflow"
5. 生成ボタンをクリック後、すぐに"Cancel"ボタンをクリック

**期待結果:**
- ✅ 生成がキャンセルされる
- ✅ プロセスが正しく終了
- ✅ エラーメッセージまたはキャンセルメッセージが表示

### テストケース4: コマンド未検出エラー

1. Claude Code CLIをPATHから削除（または一時的にリネーム）
2. VSCodeでcc-wf-studioを開く
3. "Generate with AI"ボタンをクリック
4. プロンプト入力して生成

**期待結果:**
- ✅ エラーメッセージ表示: "Cannot connect to Claude Code - please ensure it is installed and running"
- ✅ エラーコード: `COMMAND_NOT_FOUND`

## 修正ファイル一覧

### 変更ファイル
- `package.json` - nano-spawn依存追加
- `package-lock.json` - 自動生成
- `src/extension/services/claude-code-service.ts` - 全面改修（nano-spawn移行、stdin対応、エラーログ強化）
- `src/extension/services/mcp-cli-service.ts` - nano-spawn移行、エラーログ強化
- `.vscodeignore` - nano-spawnをVSIXに含める設定追加

### 影響範囲
- AI Workflow生成機能（Feature 001-ai-workflow-generation）
- AI Workflow改良機能（Feature 001-ai-workflow-refinement）
- AI Skill生成機能（Feature 001-ai-skill-generation）
- MCP CLI操作機能（サーバー一覧取得、接続、切断）

### 非影響範囲
- Webview UI
- Workflow実行機能
- ファイルシステム操作

## 技術的詳細

### nano-spawn vs 標準child_process.spawn

| 項目 | child_process.spawn | nano-spawn |
|------|---------------------|------------|
| Windows互換性 | ❌ 手動対応必要 | ✅ 自動対応 |
| .cmd/.bat対応 | ❌ shell:true必要 | ✅ 自動検出 |
| PATHEXT処理 | ❌ 手動実装必要 | ✅ 自動処理 |
| Promise対応 | ❌ 手動ラップ必要 | ✅ ネイティブ対応 |
| 依存関係 | 0（標準モジュール） | 0 |
| パッケージサイズ | - | 極小（<10KB） |

### stdin vs コマンドライン引数

| 項目 | コマンドライン引数 (`-p 'prompt'`) | stdin (`-p -` + stdin) |
|------|-----------------------------------|------------------------|
| Windows互換性 | ❌ クォート処理問題 | ✅ 問題なし |
| 長いプロンプト対応 | ❌ CLI制限あり | ✅ 制限なし |
| エスケープ処理 | ❌ 複雑（`'\''`など） | ✅ 不要 |
| 実装の複雑さ | 高い（クォート処理） | 低い（文字列渡すだけ） |
| セキュリティ | ⚠️ プロセス一覧で見える | ✅ 見えない |

### エラーハンドリングの改善

**変更前:**
```typescript
childProcess.on('error', (err) => { ... })
childProcess.on('exit', (code) => { ... })
```

**変更後:**
```typescript
try {
  const result = await subprocess;
  // 成功処理
} catch (error) {
  if (isSubprocessError(error)) {
    // エラー詳細処理（exitCode, signalName, etc.）
  }
}
```

**エラーログの強化:**
```typescript
log('ERROR', 'Claude Code CLI error caught', {
  errorType: typeof error,
  errorConstructor: error?.constructor?.name,
  errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
  error: error,  // 完全なエラーオブジェクト
  executionTimeMs,
});
```

## ビルド確認

```bash
npm run compile  # ✅ 成功
npm run lint     # ✅ 成功
npm run build    # ✅ 成功
npx vsce package # ✅ 成功（cc-wf-studio-2.5.0.vsix, 1.05 MB, nano-spawn含む）
```

## 次のステップ

1. ✅ 修正実装完了（nano-spawn移行、stdin対応、npx対応、VSIX修正）
2. ✅ コンパイル確認完了
3. ✅ Lint確認完了
4. ✅ VSIX作成完了（cc-wf-studio-2.5.0.vsix）
5. ✅ **Windows環境での動作テスト成功**
6. ⏳ macOS/Linux環境での退行テスト ← 次はここ
7. ⏳ PR作成・レビュー
8. ⏳ マージ・リリース

## 関連リンク

- Issue #79: [URL]
- nano-spawn GitHub: https://github.com/sindresorhus/nano-spawn
- nano-spawn npm: https://www.npmjs.com/package/nano-spawn
