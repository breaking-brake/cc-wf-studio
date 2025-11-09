# Implementation Plan: AI-Assisted Skill Node Generation

**Branch**: `001-ai-skill-generation` | **Date**: 2025-11-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ai-skill-generation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature enhances AI-assisted workflow generation by enabling automatic selection and inclusion of Skill nodes from available personal and project Skills. When users describe workflows requiring specialized capabilities, the system scans available Skills, filters them by relevance using keyword matching, includes up to 20 most relevant Skills in the AI prompt, and validates generated Skill nodes against actual Skill files. This eliminates manual Skill selection while maintaining validation and error handling.

## Technical Context

**Language/Version**: TypeScript 5.3 (Extension Host), React 18.2 (Webview UI)
**Primary Dependencies**:
- Extension: VSCode Extension API, existing skill-service.ts (Skill scanning/validation), existing claude-code-service.ts (CLI execution)
- Webview: React, existing AiGenerationDialog.tsx component
- No new external library dependencies required (user constraint)

**Storage**: File system (existing SKILL.md files in `~/.claude/skills/` and `.claude/skills/`, workflow-schema.json in resources/)
**Testing**: Vitest (Webview), @vscode/test-electron (extension integration)
**Target Platform**: VSCode Extension (cross-platform: Windows, macOS, Linux)
**Project Type**: VSCode Extension with Webview UI (dual environment)
**Performance Goals**:
- Skill scanning: <500ms for 100 Skills
- Keyword matching/filtering: <200ms for relevance scoring
- AI generation with Skills: within 90 seconds (total including CLI execution)
- Skill path resolution: <100ms post-generation

**Constraints**:
- No new library dependencies (per user requirement)
- Skill list in prompt limited to 20 entries to prevent timeout
- Schema file size must remain <15KB
- Generation timeout: 90 seconds

**Scale/Scope**:
- Support up to 200 total Skills (personal + project combined)
- Keyword matching algorithm: simple text similarity (no ML libraries)
- Enhanced schema documentation to include Skill node type
- 3 new validation rules for Skill nodes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

**✅ Re-evaluated after Phase 1 (2025-11-09)**: All checks still pass. Design artifacts (data-model.md, contracts/) confirm adherence to all principles.

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - 既存のSkillService, ClaudeCodeServiceを拡張し、責務明確化
  - 新規関数: `filterSkillsByRelevance()`, `addSkillsToPrompt()`, `resolveSkillPaths()` などシンプルな命名
- [x] 命名規則が明確に定義されているか
  - `SkillReference` (既存型再利用), `SkillRelevanceScore`, `EnhancedAIPrompt` など目的明確
- [x] コードの複雑度が妥当な範囲に収まっているか
  - Skill関連度計算は単純なキーワードマッチング（正規表現不使用、外部ライブラリ不要）
  - 既存のバリデーションフレームワーク再利用

### II. テスト駆動開発
- [x] テストファースト開発プロセスが計画されているか
  - 各FR（FR-001～FR-012）に対応するテストケース先行定義
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - **契約テスト**: Skill scanning API仕様、AI prompt format検証
  - **統合テスト**: Skill scan → filter → prompt → generate → validate full flow
  - **ユニットテスト**: keyword matching algorithm, Skill path resolution, validation logic
- [x] テストカバレッジ目標（80%以上）が設定されているか
  - 新規コード80%以上、Skill関連度計算ロジック100%目標

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - 既存AiGenerationDialogを拡張（Optional: Skill selection checkboxes）
  - 既存SkillNode validation indicatorsを再利用
- [x] エラーメッセージの明確性が確保されているか
  - "Skill file not found at path X - please select another Skill or remove this node"
  - "Only showing top 20 most relevant Skills - refine description for better matching"
- [x] アクセシビリティが考慮されているか
  - Skill checkboxes (P3 feature) はaria-labelで説明
  - Validation errorsはaria-liveで通知

### IV. パフォーマンス基準
- [x] API応答時間目標（p95 < 200ms）が検討されているか
  - Skill scanning並列化（Promise.all）、キャッシュ不要（起動時1回）
  - Keyword matching: O(n*m) where n=Skills, m=description words（<200ms for n=200）
- [x] データベース最適化が計画されているか
  - N/A（ファイルシステムのみ）
- [x] フロントエンドロード時間目標が設定されているか（該当する場合）
  - Skill list表示（P3）は仮想化不要（最大20件表示）

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - Extension: Skill filtering logic in new `skill-relevance-matcher.ts`
  - Extension: Prompt enhancement in existing `ai-generation.ts` (minimal changes)
  - Webview: Optional UI extension in `AiGenerationDialog.tsx` (P3 only)
- [x] 設定管理の方針が明確か
  - Skill list limit (20) は定数 `MAX_SKILLS_IN_PROMPT` として定義
  - Relevance threshold (60%) は定数 `SKILL_RELEVANCE_THRESHOLD`
- [x] バージョニング戦略が定義されているか
  - Schema version remains compatible (Skill node type already exists per spec assumption)

**違反の正当化**: 違反なし。すべての原則に準拠。

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-skill-generation/
├── spec.md               # Feature specification (DONE)
├── plan.md               # This file (IN PROGRESS)
├── research.md           # Phase 0 output (NEXT)
├── data-model.md         # Phase 1 output (keyword matching algorithm, Skill filtering data structures)
├── quickstart.md         # Phase 1 output (developer onboarding)
├── contracts/            # Phase 1 output (Skill scanning API, enhanced prompt format)
└── tasks.md              # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── extension/
│   ├── commands/
│   │   └── ai-generation.ts              # MODIFY: Add Skill list to prompt construction
│   ├── services/
│   │   ├── skill-service.ts              # EXISTING: Already scans Skills, reuse as-is
│   │   ├── claude-code-service.ts        # EXISTING: CLI execution, no changes
│   │   └── skill-relevance-matcher.ts    # NEW: Keyword-based relevance scoring
│   └── utils/
│       └── validate-workflow.ts          # MODIFY: Add Skill node validation rules
├── webview/
│   └── src/
│       └── components/
│           └── dialogs/
│               └── AiGenerationDialog.tsx # MODIFY (P3 only): Add optional Skill checkboxes
└── shared/
    └── types/
        ├── messages.ts                    # MODIFY: Add SkillFilterOptions to GenerateWorkflowPayload (P3 only)
        └── workflow-definition.ts         # EXISTING: SkillNodeData already defined

tests/
├── extension/
│   ├── unit/
│   │   └── skill-relevance-matcher.test.ts # NEW: Test keyword matching algorithm
│   └── integration/
│       └── ai-skill-generation.test.ts   # NEW: End-to-end Skill generation flow
└── webview/
    └── unit/
        └── AiGenerationDialog.test.tsx   # MODIFY (P3 only): Test Skill selection UI

resources/
└── workflow-schema.json                  # VERIFY: Ensure Skill node type documented
```

**Structure Decision**: Single project structure (VSCode Extension). Extension Host handles Skill scanning, filtering, and prompt enhancement. Webview provides optional user controls (P3). Existing services (skill-service.ts, claude-code-service.ts) are reused without modification to minimize changes and avoid library dependencies.

## Complexity Tracking

**No violations**. All Constitution Check items pass. Design adheres to simplicity constraints:
- Reuses existing Skill scanning infrastructure (skill-service.ts)
- Simple keyword matching (no regex, no ML libraries)
- Minimal UI changes (P3 Skill selection optional)
- No new external dependencies (per user requirement)

