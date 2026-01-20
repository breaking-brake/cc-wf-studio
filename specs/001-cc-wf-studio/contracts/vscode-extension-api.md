# VSCode Extension API Contract

**Version**: 1.0.0
**Date**: 2025-11-01
**Target VSCode Version**: 1.80+

## Overview

このドキュメントは、CC Workflow Studio 拡張機能が使用する VSCode Extension API の契約を定義します。すべての API 呼び出しは `vscode` モジュールを通じて行われます。

---

## 1. Commands

拡張機能が登録するコマンドとその動作です。

### 1.1 `cc-wf-studio.openEditor`

ワークフローエディタを開きます。

**Command ID**: `cc-wf-studio.openEditor`

**Title**: `CC Workflow Studio: Open Editor`

**Trigger**:
- コマンドパレットから実行
- アクティビティバーのアイコンクリック（オプション）

**Behavior**:
1. 新しい Webview Panel を作成
2. React アプリケーション（Vite ビルド成果物）を読み込み
3. 既存のワークフローがある場合、リストを表示

**Implementation**:
```typescript
vscode.commands.registerCommand('cc-wf-studio.openEditor', () => {
  const panel = vscode.window.createWebviewPanel(
    'cc-wf-studio',
    'Workflow Studio',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
      ]
    }
  );

  panel.webview.html = getWebviewContent(panel.webview, extensionUri);
});
```

---

### 1.2 `cc-wf-studio.newWorkflow`

新しいワークフローを作成します。

**Command ID**: `cc-wf-studio.newWorkflow`

**Title**: `CC Workflow Studio: New Workflow`

**Trigger**: コマンドパレット

**Behavior**:
1. エディタを開く（未開封の場合）
2. 新規ワークフローの初期状態を Webview に送信

---

### 1.3 `cc-wf-studio.saveWorkflow`

現在のワークフローを保存します。

**Command ID**: `cc-wf-studio.saveWorkflow`

**Title**: `CC Workflow Studio: Save Workflow`

**Keybinding**: `Ctrl+S` (Windows/Linux), `Cmd+S` (macOS)

**Trigger**:
- コマンドパレット
- キーボードショートカット
- Webview からの `SAVE_WORKFLOW` メッセージ

**Behavior**:
1. Webview から現在のワークフロー状態を取得
2. `.vscode/workflows/{workflow-name}.json` に保存
3. `SAVE_SUCCESS` メッセージを Webview に送信

---

### 1.4 `cc-wf-studio.exportWorkflow`

ワークフローを `.claude` 形式にエクスポートします。

**Command ID**: `cc-wf-studio.exportWorkflow`

**Title**: `CC Workflow Studio: Export Workflow`

**Trigger**:
- コマンドパレット
- Webview からの `EXPORT_WORKFLOW` メッセージ

**Behavior**:
1. ワークフローを `.claude/agents/*.md` と `.claude/commands/*.md` に変換
2. 既存ファイルがある場合、上書き確認ダイアログを表示
3. エクスポート完了後、`EXPORT_SUCCESS` メッセージを Webview に送信

---

## 2. File System API

### 2.1 Workspace Folder Access

**API**: `vscode.workspace.workspaceFolders`

**Usage**:
```typescript
const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
if (!workspaceFolder) {
  vscode.window.showErrorMessage('ワークスペースが開かれていません。');
  return;
}

const workflowsDir = vscode.Uri.joinPath(
  workspaceFolder.uri,
  '.vscode',
  'workflows'
);
```

**Contract**:
- ✅ ワークスペースが開かれている場合のみ動作
- ✅ マルチルートワークスペースの場合、最初のフォルダを使用
- ✅ ワークスペースが未開封の場合、エラーメッセージを表示

---

### 2.2 File Read

**API**: `vscode.workspace.fs.readFile()`

**Usage**:
```typescript
async function loadWorkflow(filePath: vscode.Uri): Promise<Workflow> {
  try {
    const fileData = await vscode.workspace.fs.readFile(filePath);
    const jsonString = Buffer.from(fileData).toString('utf8');
    const workflow = JSON.parse(jsonString);
    return workflow;
  } catch (error) {
    if (error.code === 'FileNotFound') {
      throw new Error('ワークフローファイルが見つかりません。');
    } else if (error instanceof SyntaxError) {
      throw new Error('ワークフローファイルのJSON形式が不正です。');
    }
    throw error;
  }
}
```

**Contract**:
- ✅ ファイルが存在しない場合、`FileNotFound` エラーをスロー
- ✅ JSON パースエラーの場合、`SyntaxError` をスロー
- ✅ UTF-8 エンコーディングを使用

---

### 2.3 File Write

**API**: `vscode.workspace.fs.writeFile()`

**Usage**:
```typescript
async function saveWorkflow(
  filePath: vscode.Uri,
  workflow: Workflow
): Promise<void> {
  const jsonString = JSON.stringify(workflow, null, 2);
  const fileData = Buffer.from(jsonString, 'utf8');

  await vscode.workspace.fs.writeFile(filePath, fileData);
}
```

**Contract**:
- ✅ ディレクトリが存在しない場合、`FileNotFound` エラーをスロー（事前に `createDirectory` 必要）
- ✅ ファイルが既存の場合、上書き
- ✅ UTF-8 エンコーディングを使用

---

### 2.4 Directory Creation

**API**: `vscode.workspace.fs.createDirectory()`

**Usage**:
```typescript
async function ensureWorkflowsDirectory(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const workflowsDir = vscode.Uri.joinPath(
    workspaceFolder.uri,
    '.vscode',
    'workflows'
  );

  try {
    await vscode.workspace.fs.createDirectory(workflowsDir);
  } catch (error) {
    if (error.code !== 'FileExists') {
      throw error;
    }
    // ディレクトリが既存の場合は無視
  }
}
```

**Contract**:
- ✅ ディレクトリが既存の場合、`FileExists` エラーをスロー（無視可能）
- ✅ 親ディレクトリが存在しない場合、自動的に作成されない（事前作成必要）

---

### 2.5 File Stat (Existence Check)

**API**: `vscode.workspace.fs.stat()`

**Usage**:
```typescript
async function fileExists(filePath: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'FileNotFound') {
      return false;
    }
    throw error;
  }
}
```

**Contract**:
- ✅ ファイルが存在する場合、`FileStat` オブジェクトを返す
- ✅ ファイルが存在しない場合、`FileNotFound` エラーをスロー

---

## 3. UI API

### 3.1 Information Message

**API**: `vscode.window.showInformationMessage()`

**Usage**:
```typescript
vscode.window.showInformationMessage(
  'ワークフローを保存しました。'
);
```

**Contract**:
- ✅ 通知メッセージを画面右下に表示
- ✅ 自動的に数秒後に消える
- ✅ アクションボタンを追加可能（オプション）

---

### 3.2 Error Message

**API**: `vscode.window.showErrorMessage()`

**Usage**:
```typescript
vscode.window.showErrorMessage(
  'ワークフローの保存に失敗しました。',
  '再試行'
).then((selection) => {
  if (selection === '再試行') {
    // 再試行処理
  }
});
```

**Contract**:
- ✅ エラーメッセージを画面右下に表示（赤色）
- ✅ アクションボタンを追加可能
- ✅ Promise で選択されたボタンを返す

---

### 3.3 Warning Message

**API**: `vscode.window.showWarningMessage()`

**Usage**:
```typescript
const selection = await vscode.window.showWarningMessage(
  'ファイルが既に存在します。上書きしますか?',
  '上書き',
  'キャンセル'
);

if (selection === '上書き') {
  // 上書き処理
}
```

**Contract**:
- ✅ 警告メッセージを画面右下に表示（黄色）
- ✅ アクションボタンを追加可能
- ✅ Promise で選択されたボタンを返す（キャンセル時は `undefined`）

---

### 3.4 Input Box

**API**: `vscode.window.showInputBox()`

**Usage**:
```typescript
const workflowName = await vscode.window.showInputBox({
  prompt: 'ワークフロー名を入力してください',
  placeHolder: 'my-workflow',
  validateInput: (value) => {
    if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
      return '英数字、ハイフン、アンダースコアのみ使用できます。';
    }
    return null;
  }
});

if (!workflowName) {
  return; // キャンセルされた
}
```

**Contract**:
- ✅ 入力ダイアログを表示
- ✅ `validateInput` でリアルタイムバリデーション
- ✅ キャンセル時は `undefined` を返す
- ✅ Enter キーで確定

---

## 4. Webview API

### 4.1 Webview Panel Creation

**API**: `vscode.window.createWebviewPanel()`

**Usage**:
```typescript
const panel = vscode.window.createWebviewPanel(
  'cc-wf-studio',              // viewType
  'Workflow Studio',           // title
  vscode.ViewColumn.One,       // showOptions
  {
    enableScripts: true,       // スクリプト実行を許可
    retainContextWhenHidden: true, // 非表示時も状態を保持
    localResourceRoots: [      // ローカルリソースのルート
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
    ]
  }
);
```

**Contract**:
- ✅ `enableScripts: true` で React アプリケーションを実行可能
- ✅ `retainContextWhenHidden: true` でタブ切り替え時も状態を保持
- ✅ `localResourceRoots` で読み込み可能なリソースパスを制限

---

### 4.2 Webview HTML Content

**API**: `panel.webview.html`

**Usage**:
```typescript
function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'main.js')
  );

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'style.css')
  );

  const nonce = getNonce(); // CSP nonce生成

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource} 'unsafe-inline';
                 script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
```

**Contract**:
- ✅ CSP (Content Security Policy) を設定して XSS 攻撃を防止
- ✅ `webview.asWebviewUri()` でリソース URI を変換
- ✅ `nonce` を使用してインラインスクリプトを許可

---

### 4.3 Webview Message Handling

**API**: `panel.webview.onDidReceiveMessage()`

**Usage**:
```typescript
panel.webview.onDidReceiveMessage(
  async (message) => {
    switch (message.type) {
      case 'SAVE_WORKFLOW':
        await handleSaveWorkflow(message.payload);
        panel.webview.postMessage({
          type: 'SAVE_SUCCESS',
          requestId: message.requestId,
          payload: { filePath: '...', timestamp: new Date().toISOString() }
        });
        break;

      case 'EXPORT_WORKFLOW':
        await handleExportWorkflow(message.payload);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  },
  undefined,
  context.subscriptions
);
```

**Contract**:
- ✅ Webview からのメッセージを受信
- ✅ `context.subscriptions` に登録して自動クリーンアップ
- ✅ 未知のメッセージタイプは無視（警告ログ出力）

---

### 4.4 Posting Messages to Webview

**API**: `panel.webview.postMessage()`

**Usage**:
```typescript
panel.webview.postMessage({
  type: 'LOAD_WORKFLOW',
  payload: {
    workflow: loadedWorkflow
  }
});
```

**Contract**:
- ✅ Webview にメッセージを送信
- ✅ JSON シリアライズ可能なオブジェクトのみ送信可能
- ✅ Webview 側で `window.addEventListener('message', ...)` で受信

---

## 5. Configuration API

### 5.1 Get Configuration

**API**: `vscode.workspace.getConfiguration()`

**Usage**:
```typescript
const config = vscode.workspace.getConfiguration('cc-wf-studio');
const workflowsDir = config.get<string>('workflowsDirectory', '.vscode/workflows');
const exportDir = config.get<string>('exportDirectory', '.claude');
```

**Contract**:
- ✅ 設定値を取得
- ✅ デフォルト値を指定可能（第2引数）
- ✅ `package.json` の `contributes.configuration` で定義された設定のみ取得可能

---

### 5.2 Update Configuration

**API**: `config.update()`

**Usage**:
```typescript
const config = vscode.workspace.getConfiguration('cc-wf-studio');
await config.update(
  'workflowsDirectory',
  '.workflows',
  vscode.ConfigurationTarget.Workspace
);
```

**Contract**:
- ✅ 設定値を更新
- ✅ `ConfigurationTarget.Workspace` でワークスペース設定を更新
- ✅ `ConfigurationTarget.Global` でグローバル設定を更新

---

## 6. Extension Context

### 6.1 Extension URI

**API**: `context.extensionUri`

**Usage**:
```typescript
export function activate(context: vscode.ExtensionContext) {
  const extensionUri = context.extensionUri;

  // リソースパスの構築
  const webviewPath = vscode.Uri.joinPath(
    extensionUri,
    'dist',
    'webview'
  );
}
```

**Contract**:
- ✅ 拡張機能のルートディレクトリ URI を取得
- ✅ `vscode.Uri.joinPath()` でパスを安全に結合

---

### 6.2 Subscriptions

**API**: `context.subscriptions`

**Usage**:
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('cc-wf-studio.openEditor', () => {
    // コマンド実装
  })
);

context.subscriptions.push(
  panel.webview.onDidReceiveMessage(handleMessage)
);
```

**Contract**:
- ✅ `Disposable` オブジェクトを登録
- ✅ 拡張機能の非アクティブ時に自動的にクリーンアップ
- ✅ メモリリークを防止

---

## 7. Contract Testing Checklist

以下のテストケースで契約の準拠を検証します:

### Commands:
- [x] `cc-wf-studio.openEditor` コマンドが Webview Panel を開く
- [x] `cc-wf-studio.saveWorkflow` コマンドがファイルに保存する
- [x] `cc-wf-studio.exportWorkflow` コマンドが `.claude` 形式にエクスポートする

### File System:
- [x] `vscode.workspace.fs.readFile()` がファイルを読み込む
- [x] `vscode.workspace.fs.writeFile()` がファイルを書き込む
- [x] `vscode.workspace.fs.createDirectory()` がディレクトリを作成する
- [x] ファイルが存在しない場合、`FileNotFound` エラーをスロー
- [x] JSON パースエラーの場合、適切なエラーメッセージを表示

### UI:
- [x] `showInformationMessage()` が成功メッセージを表示
- [x] `showErrorMessage()` がエラーメッセージを表示
- [x] `showWarningMessage()` が上書き確認ダイアログを表示
- [x] `showInputBox()` がワークフロー名入力ダイアログを表示

### Webview:
- [x] Webview Panel が正しく作成される
- [x] Webview にメッセージを送信できる
- [x] Webview からメッセージを受信できる
- [x] CSP が正しく設定されている
- [x] リソース URI が正しく変換される

---

## 8. References

- VSCode Extension API: https://code.visualstudio.com/api/references/vscode-api
- Webview API Guide: https://code.visualstudio.com/api/extension-guides/webview
- Extension Guidelines: https://code.visualstudio.com/api/references/extension-guidelines
- Data Model: `/specs/001-cc-wf-studio/data-model.md`
- Extension-Webview API: `/specs/001-cc-wf-studio/contracts/extension-webview-api.md`
