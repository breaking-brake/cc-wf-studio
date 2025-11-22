# 実装計画: [機能]

**ブランチ**: `[###-feature-name]` | **日付**: [日付] | **仕様**: [リンク]
**入力**: `/specs/[###-feature-name]/spec.md` の機能仕様書

**注意**: このテンプレートは `/speckit.plan` コマンドによって記入されます。実行ワークフローについては `.specify/templates/commands/plan.md` を参照してください。

## 概要

[機能仕様書から抽出: 主要要件 + 調査からの技術的アプローチ]

## 技術コンテキスト

<!--
  要対応: このセクションの内容をプロジェクトの技術的詳細に置き換えてください。
  ここに示された構造は、反復プロセスをガイドするための助言として提示されています。
-->

**言語/バージョン**: [例: Python 3.11、Swift 5.9、Rust 1.75 または NEEDS CLARIFICATION]
**主要な依存関係**: [例: FastAPI、UIKit、LLVM または NEEDS CLARIFICATION]
**ストレージ**: [該当する場合、例: PostgreSQL、CoreData、ファイル または N/A]
**テスト**: [例: pytest、XCTest、cargo test または NEEDS CLARIFICATION]
**ターゲットプラットフォーム**: [例: Linuxサーバー、iOS 15+、WASM または NEEDS CLARIFICATION]
**プロジェクトタイプ**: [single/web/mobile - ソース構造を決定]
**パフォーマンス目標**: [ドメイン固有、例: 1000 req/s、10k lines/sec、60 fps または NEEDS CLARIFICATION]
**制約**: [ドメイン固有、例: <200ms p95、<100MB メモリ、オフライン対応 または NEEDS CLARIFICATION]
**規模/スコープ**: [ドメイン固有、例: 10k ユーザー、1M LOC、50 画面 または NEEDS CLARIFICATION]

## Constitution Check

*ゲート: Phase 0 調査の前に合格する必要があります。Phase 1 設計後に再確認してください。*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [ ] 可読性とドキュメント化の要件が満たされているか
- [ ] 命名規則が明確に定義されているか
- [ ] コードの複雑度が妥当な範囲に収まっているか

### II. テスト駆動開発
- [ ] テストファースト開発プロセスが計画されているか
- [ ] 契約テスト・統合テスト・ユニットテストの計画があるか
- [ ] テストカバレッジ目標（80%以上）が設定されているか

### III. UX一貫性
- [ ] 一貫したUIパターンが定義されているか
- [ ] エラーメッセージの明確性が確保されているか
- [ ] アクセシビリティが考慮されているか

### IV. パフォーマンス基準
- [ ] API応答時間目標（p95 < 200ms）が検討されているか
- [ ] データベース最適化が計画されているか
- [ ] フロントエンドロード時間目標が設定されているか（該当する場合）

### V. 保守性と拡張性
- [ ] モジュール化・疎結合設計が採用されているか
- [ ] 設定管理の方針が明確か
- [ ] バージョニング戦略が定義されているか

**違反の正当化**: このセクションは「複雑度追跡」テーブルに記録する

## プロジェクト構造

### ドキュメント (この機能)

```text
specs/[###-feature]/
├── plan.md              # このファイル (/speckit.plan コマンドの出力)
├── research.md          # Phase 0 の出力 (/speckit.plan コマンド)
├── data-model.md        # Phase 1 の出力 (/speckit.plan コマンド)
├── quickstart.md        # Phase 1 の出力 (/speckit.plan コマンド)
├── contracts/           # Phase 1 の出力 (/speckit.plan コマンド)
└── tasks.md             # Phase 2 の出力 (/speckit.tasks コマンド - /speckit.plan では作成されない)
```

### ソースコード (リポジトリルート)
<!--
  要対応: 以下のプレースホルダーツリーをこの機能の具体的なレイアウトに置き換えてください。
  未使用のオプションを削除し、選択した構造を実際のパス（例: apps/admin、packages/something）で
  展開してください。提供される計画にはオプションラベルを含めないでください。
-->

```text
# [未使用の場合は削除] オプション 1: 単一プロジェクト (デフォルト)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [未使用の場合は削除] オプション 2: Webアプリケーション ("frontend" + "backend" が検出された場合)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [未使用の場合は削除] オプション 3: モバイル + API ("iOS/Android" が検出された場合)
api/
└── [上記のbackendと同じ]

ios/ または android/
└── [プラットフォーム固有の構造: 機能モジュール、UIフロー、プラットフォームテスト]
```

**構造の決定**: [選択した構造を文書化し、上記でキャプチャした実際のディレクトリを参照する]

## 複雑度追跡

> **Constitution Checkで正当化が必要な違反がある場合のみ記入**

| 違反 | 必要な理由 | より単純な代替案が却下された理由 |
|------|-----------|--------------------------------|
| [例: 4つ目のプロジェクト] | [現在のニーズ] | [なぜ3つのプロジェクトでは不十分か] |
| [例: Repositoryパターン] | [特定の問題] | [なぜ直接のDB アクセスでは不十分か] |
