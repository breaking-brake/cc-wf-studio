# Issue #265 実装タスク引き継ぎ

## タスク概要

GitHub Issue #265「ローカルコードベースインデックス機能（BM25全文検索）」を実装してください。

**Issue URL**: https://github.com/breaking-brake/cc-wf-studio/issues/265

## 背景

当初はLanceDB + Transformers.js（Embedding）でベクトル検索を計画していたが、以下の問題で断念：
- LanceDB: Rustネイティブバイナリのx64/arm64アーキテクチャ不一致
- Transformers.js: CSPによるWASMフェッチブロック

**解決策**: Embeddingを使用せず、**Orama + BM25全文検索**のみで実装する。

## 技術選定

| 項目 | 選定 |
|------|------|
| 検索エンジン | Orama（Pure TypeScript） |
| 検索アルゴリズム | BM25（全文検索） |
| 永続化 | `@orama/plugin-data-persistence`（JSON） |

## 実装手順

### 1. ブランチ作成

```bash
git checkout main
git pull origin main
git checkout -b feat/265-codebase-index-bm25
```

### 2. 依存関係追加

```bash
npm install @orama/orama @orama/plugin-data-persistence
```

### 3. 型定義作成

**新規作成**: `src/shared/types/codebase-index.ts`

```typescript
// エラーコード
export type CodebaseIndexErrorCode =
  | 'INDEX_FILE_READ_ERROR'
  | 'INDEX_DATABASE_ERROR'
  | 'INDEX_MEMORY_EXCEEDED'
  | 'INDEX_CANCELLED'
  | 'INDEX_WORKSPACE_NOT_FOUND'
  | 'SEARCH_INDEX_NOT_FOUND'
  | 'SEARCH_QUERY_EMPTY'
  | 'SEARCH_DATABASE_ERROR';

// インデックス設定
export interface IndexOptions {
  batchSize: number;
  chunkSize: number;
  chunkOverlap: number;
  maxFileSizeKB: number;
  excludePatterns: string[];
  includeExtensions: string[];
}

// ドキュメント型（ベクトルフィールドなし）
export interface CodeDocument {
  id: string;
  filePath: string;
  content: string;
  language: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  updatedAt: number;
}

// その他: IndexStatus, IndexProgress, SearchOptions, SearchResult, IndexBuildResult
```

### 4. メッセージ型追加

**修正**: `src/shared/types/messages.ts`

WebviewMessage に追加:
- `BUILD_INDEX`
- `GET_INDEX_STATUS`
- `CANCEL_INDEX_BUILD`
- `CLEAR_INDEX`
- `SEARCH_CODEBASE`

ExtensionMessage に追加:
- `INDEX_BUILD_PROGRESS`
- `INDEX_BUILD_SUCCESS`
- `INDEX_BUILD_FAILED`
- `INDEX_STATUS`
- `SEARCH_CODEBASE_RESULT`

### 5. サービス実装

**新規作成**: `src/extension/services/vector-search-service.ts`
- Orama DBの初期化・接続
- `createTable()` - ドキュメント挿入
- `searchFullText()` - BM25検索
- `dropTable()` - インデックス削除
- `persistToFile()` / `restoreFromFile()` - 永続化

**新規作成**: `src/extension/services/codebase-index-service.ts`
- `initializeCodebaseIndexService()` - 初期化
- `buildIndex()` - ファイルスキャン・チャンク分割・インデックス構築
- `searchCodebase()` - 検索API
- `getIndexStatus()` - ステータス取得
- `cancelIndexing()` - キャンセル
- `clearIndex()` - クリア

### 6. ハンドラ実装

**新規作成**: `src/extension/commands/codebase-index-handlers.ts`
- Webviewメッセージをサービスに橋渡し

**修正**: `src/extension/commands/open-editor.ts`
- `initializeCodebaseIndexService(context)` 呼び出し追加
- `handleCodebaseIndexMessage()` 呼び出し追加

### 7. ビルド・テスト

```bash
npm run format && npm run lint && npm run check && npm run build
```

## 重要な注意点

1. **Embeddingは実装しない** - BM25全文検索のみ
2. **CSP変更は不要** - Oramaはpure TypeScript
3. **Webview側UIは実装しない** - Extension Host内で完結（UIは別Issue）
4. **Orama永続化**: `@orama/plugin-data-persistence/server` からインポート（Node.js専用）

## Orama API リファレンス

```typescript
import { create, insertMultiple, search, count } from '@orama/orama';
import { persistToFile, restoreFromFile } from '@orama/plugin-data-persistence/server';

// スキーマ定義
const schema = {
  id: 'string',
  filePath: 'string',
  content: 'string',
  language: 'string',
  startLine: 'number',
  endLine: 'number',
  chunkIndex: 'number',
  updatedAt: 'number',
} as const;

// DB作成
const db = await create({ schema });

// ドキュメント挿入
await insertMultiple(db, documents);

// 全文検索（BM25）
const results = await search(db, {
  term: 'search query',
  properties: ['content', 'filePath'],
  limit: 10,
});

// 永続化
await persistToFile(db, 'json', '/path/to/db.json');

// 復元
const db = await restoreFromFile('json', '/path/to/db.json');
```

## ファイル一覧

### 新規作成（4ファイル）
- `src/shared/types/codebase-index.ts`
- `src/extension/services/vector-search-service.ts`
- `src/extension/services/codebase-index-service.ts`
- `src/extension/commands/codebase-index-handlers.ts`

### 修正（3ファイル）
- `package.json` - 依存関係追加
- `src/shared/types/messages.ts` - メッセージ型追加
- `src/extension/commands/open-editor.ts` - 初期化・ハンドラ統合

## 完了条件

- [ ] `npm run build` が成功する
- [ ] インデックス構築が正常完了（Output Channelでログ確認）
- [ ] 検索APIが正常動作
- [ ] 永続化・復元が動作（Extension再起動後も検索可能）
