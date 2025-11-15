## [2.2.1](https://github.com/breaking-brake/cc-wf-studio/compare/v2.2.0...v2.2.1) (2025-11-15)

### Bug Fixes

* bundle extension with Vite to include MCP SDK dependencies ([f3a2878](https://github.com/breaking-brake/cc-wf-studio/commit/f3a2878832fa8220e438e7c69befe4850a4a4a29))

## [2.2.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.0.3...v2.2.0) (2025-11-15)

### Features

* **MCP Tool Node Integration** - Complete implementation of Model Context Protocol tool nodes
  * MCPサーバー自動検出とツール一覧表示
  * ツール検索・フィルタリング機能
  * JSON Schemaベースの動的パラメータフォーム生成（5種類の型対応）
  * リアルタイムバリデーション
  * Slash Commandへの完全なエクスポート対応
  * 5言語対応（en, ja, ko, zh-CN, zh-TW）

### Bug Fixes

* prevent tag conflict by using @semantic-release/exec for webview sync ([bfaf0cf](https://github.com/breaking-brake/cc-wf-studio/commit/bfaf0cfa66292fbeb760d7981d421b477bcd1302))

### Documentation

* add Semantic Release and GitHub Actions automation guide to CLAUDE.md

## [2.1.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.0.3...v2.1.0) (2025-11-15)

### Features

* **001-mcp-node:** MCPノード機能の仕様と実装計画を作成 ([dd14a41](https://github.com/breaking-brake/cc-wf-studio/commit/dd14a41ef8e5fdf68df6a932710bfdbb986414b3))
* **001-mcp-node:** Phase 1完了 - セットアップ ([3400cc7](https://github.com/breaking-brake/cc-wf-studio/commit/3400cc782d21f85b8d4465daf61d115dd9ea704d))
* **001-mcp-node:** Phase 2完了 - 基盤実装 ([d604444](https://github.com/breaking-brake/cc-wf-studio/commit/d604444ebccabab9edebbbac95a618c69f7a22bd))
* **001-mcp-node:** Phase 5完了 - MCPノードのエクスポート処理と国際化対応を実装 ([0cf3dcc](https://github.com/breaking-brake/cc-wf-studio/commit/0cf3dcc1fef8c10f0d2a1ee13c717cb4bcd572aa))
* **001-mcp-node:** Phase 6完了 - ドキュメント整備と総合テスト完了 ([60491fd](https://github.com/breaking-brake/cc-wf-studio/commit/60491fd603366472eb14d509e1fc11d5e9b959b8))
* **001-mcp-node:** T018-T021 Extension側MCPメッセージハンドラとCLI実装 ([f5dd4ff](https://github.com/breaking-brake/cc-wf-studio/commit/f5dd4ffe1122027459a120ff9b7a52418f0855cc))
* **001-mcp-node:** T022-T027 Webview側MCPノードUI実装 ([99c14df](https://github.com/breaking-brake/cc-wf-studio/commit/99c14dfc81adb34a83eb7753cece4af9cbcf818a))
* **001-mcp-node:** 実装タスクリスト(tasks.md)を作成 ([df28cfa](https://github.com/breaking-brake/cc-wf-studio/commit/df28cfa345b38b70425296a4723bb43572239200))
* add automatic release workflow with semantic-release ([95e08f5](https://github.com/breaking-brake/cc-wf-studio/commit/95e08f57ffbb810c1cfbddd661c8fcbd4b46ab98))
* add automatic sync from production to main after release ([b0ed08b](https://github.com/breaking-brake/cc-wf-studio/commit/b0ed08bb8116fa59a64b6c8eef412057a30b7f46))
* MCP SDKを使用した直接接続によるツール一覧取得を実装 ([dde6982](https://github.com/breaking-brake/cc-wf-studio/commit/dde6982baac7f3397c21abaf725ac8577e50a47b))
* **mcp-node:** implement parameter configuration UI (T031-T038) ([9eed706](https://github.com/breaking-brake/cc-wf-studio/commit/9eed7067e3ae042993f905062b18809e04ce9b31))
* **mcp-node:** implement tool schema retrieval and JSON Schema parser (T028-T030) ([8b692d4](https://github.com/breaking-brake/cc-wf-studio/commit/8b692d4d742788b59958ae4e50ae4ec68c0032ed))

### Bug Fixes

* add missing conventional-changelog-conventionalcommits dependency ([93b5ead](https://github.com/breaking-brake/cc-wf-studio/commit/93b5ead5dbc37dc314a11a01b57e899f2255d0ef))
* build and package vsix with correct version after semantic-release ([0ce6ca4](https://github.com/breaking-brake/cc-wf-studio/commit/0ce6ca4e39e7c8853fa969ac0ba71af545bc0661))
* format, lint, check修正 ([36d6505](https://github.com/breaking-brake/cc-wf-studio/commit/36d650538faddf5069ed691bb9f7fd038eb78156))
* **mcp-node:** add MCP node support to PropertyPanel ([b64d35b](https://github.com/breaking-brake/cc-wf-studio/commit/b64d35b0a044c66b7a1f36072eba5f6e0df773e8))
* **mcp-node:** resolve lint and type errors in Phase 4 implementation ([9425a13](https://github.com/breaking-brake/cc-wf-studio/commit/9425a13f85b13fbc82e469f2c4a7939050d7d86c))
* MCPツール取得エラーの詳細ログを追加 ([bd2461c](https://github.com/breaking-brake/cc-wf-studio/commit/bd2461c3207b074fe4d7d23333f0fd27f880e492))
* MCP設定のtype自動推論と翻訳の改善 ([9d6f04c](https://github.com/breaking-brake/cc-wf-studio/commit/9d6f04c28eaf8ecf868972be70a596435c93a708))
* MCP設定ファイル読み込みとワークスペース対応を修正 ([63cf48b](https://github.com/breaking-brake/cc-wf-studio/commit/63cf48bf84dcaeebe961b5935861a9f653618377))
* production→main同期でリリースコミットが含まれない問題を修正 ([e938486](https://github.com/breaking-brake/cc-wf-studio/commit/e9384861a618ae8e6c0518b8aa6a44bb1916cadb))
* README.mdでGitHub Issue番号として誤認識される問題を修正 ([c413572](https://github.com/breaking-brake/cc-wf-studio/commit/c413572f845709a8b942eada7a2160c1e32044b5)), closes [1/#2](https://github.com/1/cc-wf-studio/issues/2)
* remove main branch from release workflow trigger ([9c878ef](https://github.com/breaking-brake/cc-wf-studio/commit/9c878effc313fd87bcab71eebc873175e44ae6e3))
* TypeScript型定義の整合性を修正 ([8e0c091](https://github.com/breaking-brake/cc-wf-studio/commit/8e0c09181ee24b4e25aa3b4c032b8f0877489b15))

### Documentation

* **001-mcp-node:** 手動E2Eテストタスクを追加 ([5f5938a](https://github.com/breaking-brake/cc-wf-studio/commit/5f5938af1bd713d663db458bbd8d81f88b5b1cab))
* add Semantic Release and GitHub Actions automation guide to CLAUDE.md ([2efe70f](https://github.com/breaking-brake/cc-wf-studio/commit/2efe70ff9d249e78357efa7b26d5de64e87bc86b))

### Code Refactoring

* **mcp-node:** replan Phase 5 and 6 tasks based on project scope ([4856629](https://github.com/breaking-brake/cc-wf-studio/commit/4856629fe35e0007fc4d737aed4b3a03c018a8d3))
* **mcp-node:** simplify MCP node type badge to "MCP Tool" ([3437140](https://github.com/breaking-brake/cc-wf-studio/commit/343714033959bcc2d9eadb8c81ae33e3a27787d5))

## [2.1.0](https://github.com/breaking-brake/cc-wf-studio/compare/v2.0.3...v2.1.0) (2025-11-15)

### Features

* add automatic release workflow with semantic-release ([95e08f5](https://github.com/breaking-brake/cc-wf-studio/commit/95e08f57ffbb810c1cfbddd661c8fcbd4b46ab98))
* add automatic sync from production to main after release ([b0ed08b](https://github.com/breaking-brake/cc-wf-studio/commit/b0ed08bb8116fa59a64b6c8eef412057a30b7f46))

### Bug Fixes

* add missing conventional-changelog-conventionalcommits dependency ([93b5ead](https://github.com/breaking-brake/cc-wf-studio/commit/93b5ead5dbc37dc314a11a01b57e899f2255d0ef))
* build and package vsix with correct version after semantic-release ([0ce6ca4](https://github.com/breaking-brake/cc-wf-studio/commit/0ce6ca4e39e7c8853fa969ac0ba71af545bc0661))
* remove main branch from release workflow trigger ([9c878ef](https://github.com/breaking-brake/cc-wf-studio/commit/9c878effc313fd87bcab71eebc873175e44ae6e3))
