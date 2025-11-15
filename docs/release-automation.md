# リリース自動化ガイド

このドキュメントでは、productionブランチへのマージ時に自動的にバージョンアップとGitHubリリースを作成する仕組みについて説明します。

## 概要

このプロジェクトでは **semantic-release** と **Conventional Commits** を使用した完全自動リリースシステムを採用しています。

### 自動化される内容

1. **バージョン決定**: コミットメッセージから自動的にバージョンタイプ (major/minor/patch) を判定
2. **バージョン更新**: `package.json` と `src/webview/package.json` のバージョンを自動更新
3. **CHANGELOG生成**: コミット履歴から自動的に `CHANGELOG.md` を生成
4. **GitHubリリース**: リリースノート付きのGitHubリリースを自動作成
5. **VSIXパッケージ**: ビルドされた `.vsix` ファイルをリリースに添付
6. **ブランチ同期**: productionブランチでリリース後、自動的にmainブランチへバージョンをマージ

## セットアップ

### 1. GitHub Settings

このワークフローは `GITHUB_TOKEN` を使用しますが、デフォルトで提供されるため追加設定は不要です。

ただし、リポジトリの設定で以下を確認してください:

1. **Settings** > **Actions** > **General**
2. **Workflow permissions** セクションで以下を選択:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

### 2. ブランチ保護ルール (オプション)

productionブランチを保護する場合:

1. **Settings** > **Branches** > **Add branch protection rule**
2. Branch name pattern: `production`
3. 推奨設定:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ⚠️ **Do not enable** "Include administrators" (semantic-releaseがコミットできなくなります)

## 使い方

### Conventional Commits の書き方

コミットメッセージは以下の形式に従ってください:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type (必須)

| Type | バージョン | 説明 | リリースノート |
|------|-----------|------|---------------|
| `feat` | **minor** (0.X.0) | 新機能の追加 | ✅ 表示 |
| `fix` | **patch** (0.0.X) | バグ修正 | ✅ 表示 |
| `perf` | **patch** (0.0.X) | パフォーマンス改善 | ✅ 表示 |
| `revert` | **patch** (0.0.X) | 変更の取り消し | ✅ 表示 |
| `docs` | - | ドキュメント更新 | ✅ 表示 |
| `refactor` | - | リファクタリング | ✅ 表示 |
| `style` | - | コードフォーマット | ❌ 非表示 |
| `test` | - | テスト追加/修正 | ❌ 非表示 |
| `build` | - | ビルドシステム変更 | ❌ 非表示 |
| `ci` | - | CI設定変更 | ❌ 非表示 |
| `chore` | - | その他の変更 | ❌ 非表示 |

#### Breaking Changes (major バージョンアップ)

**major** バージョン (X.0.0) にするには、以下のいずれかを使用:

**方法1: Footer に記載**
```
feat: 新しいAPI設計に変更

BREAKING CHANGE: 旧APIは削除されました。新しいAPIを使用してください。
```

**方法2: Type に `!` を追加**
```
feat!: 新しいAPI設計に変更

旧APIは削除されました。
```

#### Scope (オプション)

変更範囲を示す識別子:

```
feat(webview): 新しいUIコンポーネントを追加
fix(extension): ワークフロー保存時のバグを修正
docs(readme): インストール手順を更新
```

### 実践例

#### 新機能追加 (minor バージョンアップ)
```bash
git commit -m "feat: ワークフローのエクスポート機能を追加

ユーザーがワークフローをJSON形式でエクスポートできるようになりました。"
```
結果: `2.0.3` → `2.1.0`

#### バグ修正 (patch バージョンアップ)
```bash
git commit -m "fix: ノード削除時のクラッシュを修正"
```
結果: `2.0.3` → `2.0.4`

#### Breaking Change (major バージョンアップ)
```bash
git commit -m "feat!: 新しいワークフローフォーマットに移行

BREAKING CHANGE: 旧形式のワークフローファイルは手動で移行が必要です。"
```
結果: `2.0.3` → `3.0.0`

#### リリース対象外 (バージョンアップなし)
```bash
git commit -m "docs: READMEのタイポを修正"
git commit -m "test: ユニットテストを追加"
git commit -m "chore: 依存関係を更新"
```
結果: バージョン変更なし

### リリースフロー

1. **開発ブランチで作業**
   ```bash
   git checkout -b feature/my-feature
   # 開発作業...
   git commit -m "feat: 新機能を追加"
   ```

2. **mainブランチにマージ**
   ```bash
   git checkout main
   git merge feature/my-feature
   git push origin main
   ```

3. **productionブランチにマージ (リリーストリガー)**
   ```bash
   git checkout production
   git merge main
   git push origin production
   ```

4. **自動リリースが実行される** (productionブランチ)
   - GitHub Actionsが起動
   - コミット履歴を分析
   - バージョンを決定
   - `package.json` を更新
   - `CHANGELOG.md` を生成
   - GitHubリリースを作成
   - `.vsix` ファイルを添付
   - **自動的にmainブランチへバージョンをマージ** (`chore: sync version from production [skip ci]`)

## トラブルシューティング

### リリースが実行されない

**原因1: リリース対象のコミットがない**
- 最後のリリース以降、`feat`, `fix`, `perf` などのコミットがない
- `docs`, `chore`, `test` などはリリースを生成しません

**原因2: GitHub Actionsの権限不足**
- Settings > Actions > General で権限を確認

**原因3: ブランチ保護ルールが厳しすぎる**
- semantic-releaseがコミットできるようにする必要があります

### バージョンが期待通りに上がらない

**原因: コミットメッセージの形式が正しくない**
- Conventional Commitsの形式に従っているか確認
- Typo がないか確認 (例: `feat` を `feature` と書いていないか)

**確認方法:**
```bash
# コミット履歴を確認
git log --oneline --since="2025-01-01"

# 特定のコミットの詳細を確認
git show <commit-hash>
```

### 手動でリリースをやり直したい

```bash
# ローカルで semantic-release を実行 (dry-run)
npx semantic-release --dry-run

# 実際に実行 (注意: 本番環境に影響します)
GITHUB_TOKEN=<your-token> npx semantic-release
```

## CI/CD パイプライン詳細

### ワークフローステップ

1. **Checkout**: リポジトリの全履歴を取得 (`fetch-depth: 0`)
2. **Setup Node.js**: Node.js 20をセットアップ
3. **Install dependencies**: ルートと webview の依存関係をインストール
4. **Build**: 拡張機能をビルド
5. **Package**: `.vsix` ファイルを生成
6. **Sync version**: webview の `package.json` バージョンを同期
7. **Semantic Release**: バージョン判定とリリース実行
8. **Sync to main** (productionブランチのみ): リリース後、mainブランチへ自動マージ

### 更新されるファイル

semantic-releaseは以下のファイルを自動更新してコミットします:

- `package.json` (バージョン番号)
- `src/webview/package.json` (バージョン番号)
- `src/webview/package-lock.json` (バージョン同期)
- `CHANGELOG.md` (リリースノート)

コミットメッセージ:
```
chore(release): 2.1.0 [skip ci]

# Release notes
...
```

`[skip ci]` により、このコミットで再度CIが起動することを防ぎます。

### ブランチ同期の仕組み

productionブランチでリリースが成功した後:

1. **productionブランチをフェッチ** (semantic-releaseが作成したリリースコミットを取得)
2. mainブランチをフェッチ
3. mainブランチにチェックアウト
4. productionブランチの変更をマージ (`chore: sync version from production [skip ci]`)
5. mainブランチにプッシュ

これにより、**mainとproductionの両方が同じバージョン**になります。
`[skip ci]` により、このマージコミットでCIが再実行されることを防ぎます。

**重要**: semantic-releaseがproductionブランチにリリースコミットを作成した後、必ず `git fetch origin production` を実行してから同期を行います。これにより、ワークフロー開始時にチェックアウトされた古い状態ではなく、最新のリリースコミットが含まれた状態でマージされます。

## 参考資料

- [Conventional Commits](https://www.conventionalcommits.org/)
- [semantic-release](https://semantic-release.gitbook.io/)
- [GitHub Actions](https://docs.github.com/en/actions)
