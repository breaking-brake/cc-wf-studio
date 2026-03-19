---
name: jira-driven-planning
description: Jiraチケットの要件とConfluenceの関連ドキュメントを基に、Frontend/Backend/Infrastructureに分割した実装計画を策定するプランニングスキル。Jiraチケット情報とConfluence検索結果が前段で取得済みであることを前提とし、構造化された実装計画を出力する。「プランニング」「実装計画策定」「タスク分割」などの文脈で使用。
---

# Jira Driven Planning

Jiraチケットの要件とConfluenceの関連ドキュメントを入力として、Frontend / Backend / Infrastructure に分割した実装計画を策定する。

## Workflow

1. 前段で取得されたJiraチケット情報（タイトル、説明、受け入れ基準、優先度）を確認
2. 前段で取得されたConfluenceドキュメント（設計書、仕様書、アーキテクチャ図）を確認
3. [planning-template.md](references/planning-template.md) に従って実装計画を策定
4. 計画をユーザーに提示し、レビューを依頼

## Output Requirements

- 要件サマリーは箇条書きで簡潔に
- 技術的アプローチはアーキテクチャ判断の根拠を含める
- タスク分割は Frontend / Backend / Infrastructure の3軸で整理
- 依存関係はブロッカーを明示
- リスクは重大度と対策をセットで記載

## Constraints

- 既存のコードベースやアーキテクチャパターンを尊重する
- 不明確な要件がある場合はユーザーに確認を求める
- 過度に詳細な実装レベルまで踏み込まず、計画レベルに留める
