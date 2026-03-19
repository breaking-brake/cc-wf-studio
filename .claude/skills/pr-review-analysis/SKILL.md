---
name: pr-review-analysis
description: Analyze PR review comments from a GitHub PR URL. Fetch review comments, verify each finding against the actual codebase, assess validity (correct/incorrect/partial), and present a structured summary with recommended actions. Use when given a PR review URL or when asked to check/analyze PR feedback.
---

# PR Review Analysis

GitHub PR のレビューコメントを取得・分析し、各指摘の妥当性を検証してレポートを出力する。

## Workflow

### Step 1: レビューコメントの取得

1. ユーザーから PR の URL またはリポジトリ情報と PR 番号を受け取る
2. `gh api` を使ってレビューコメントを取得する:
   ```bash
   gh api repos/{owner}/{repo}/pulls/{number}/reviews
   gh api repos/{owner}/{repo}/pulls/{number}/comments
   ```
3. コメントの一覧をパースし、指摘内容・対象ファイル・行番号を整理する

### Step 2: 各指摘の検証

各レビューコメントについて:

1. **該当コードの確認**: 指摘が参照するファイルと行を Read ツールで読む
2. **指摘内容の分析**: レビューアの主張が技術的に正しいか検証する
3. **妥当性の判定**:
   - ✅ **正当** (Valid): 指摘が正しく、修正が必要
   - ❌ **不当** (Invalid): 指摘が誤っている、または該当しない
   - ⚠️ **部分的に正当** (Partial): 指摘の一部は正しいが、完全には当てはまらない

### Step 3: 影響範囲の確認

指摘が参照するパターン（バグ、アンチパターン等）が他のファイルにも存在するか Grep ツールで確認する。
同一パターンが複数箇所にある場合、それらも報告に含める。

### Step 4: レポート出力

以下の形式でまとめを出力する:

```
## PR Review Analysis: #{PR番号}

### Summary
- Total comments: {件数}
- Valid: {件数} | Partial: {件数} | Invalid: {件数}

### Details

| # | File | Severity | Validity | Summary | Action |
|---|------|----------|----------|---------|--------|
| 1 | path/to/file.ts:L42 | Major | ✅ Valid | 説明 | 修正必要 |
| 2 | path/to/file.ts:L100 | Minor | ⚠️ Partial | 説明 | 検討 |

### Detailed Analysis

#### Comment 1: [タイトル]
- **File**: `path/to/file.ts:L42`
- **Reviewer's point**: 指摘内容の要約
- **Verification**: 検証結果の説明
- **Verdict**: ✅ Valid
- **Recommended action**: 具体的な修正方針
- **Same pattern found in**: (該当する場合) 他のファイルパス

...
```

## Notes

- Bot によるレビュー（CodeRabbit, GitHub Actions 等）と人間のレビューの両方に対応する
- レビューコメントに対する返信スレッドも考慮する
- 指摘の severity（重大度）はレビューコメントのラベルまたは内容から推定する
- 日本語で出力する（コード・パス等の技術用語は原文のまま）
