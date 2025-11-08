# Implementation Plan: Skill Node Integration

**Branch**: `001-skill-node` | **Date**: 2025-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-skill-node/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a new "Skill" node type to the visual workflow editor, enabling users to integrate Claude Code Skills into workflows. Users can browse and reference existing Skills from `~/.claude/skills/` (personal) or `.claude/skills/` (project), or create new Skills directly from the editor. This bridges visual workflow design with reusable, model-invoked agent capabilities defined in SKILL.md files.

**User Constraint**: Do not add new library dependencies; use existing tech stack (TypeScript, React, Zustand, VSCode API, Node.js fs/path modules).

## Technical Context

**Language/Version**: TypeScript 5.3.0
**Primary Dependencies**:
- Extension Host: VSCode API ^1.80.0, Node.js (built-in fs, path modules)
- Webview: React 18.2.0, React DOM 18.2.0, React Flow 11.10.0, Zustand 4.4.0
- Build: Vite 7.1.12 (Webview), TypeScript compiler (Extension)
- Testing: Vitest 4.0.6 (Webview unit tests), @vscode/test-electron 2.3.8 (Extension integration tests)

**Storage**: File system (SKILL.md files in `~/.claude/skills/` and `.claude/skills/`), workflow JSON files in `.vscode/workflows/`
**Testing**: Vitest (webview unit tests), VSCode Test Runner (extension integration tests), manual testing for file I/O
**Target Platform**: VSCode Extension (Electron-based), cross-platform (Windows, macOS, Linux)
**Project Type**: VSCode Extension with dual architecture (Extension Host + React Webview)
**Performance Goals**:
- Browse Skills: <500ms for scanning up to 50 SKILL.md files
- YAML parsing: <50ms per file (95th percentile)
- Skill creation: <300ms for directory creation + file write
- No new dependencies constraint: Use only existing libraries

**Constraints**:
- No new npm dependencies (use existing React, Zustand, VSCode API, Node.js built-ins)
- File system access limited to Extension Host (Webview must use postMessage)
- YAML parsing must use lightweight approach (manual parsing or minimal existing dependency check)
- Cross-platform path handling (Windows vs Unix)

**Scale/Scope**:
- Support up to 100 Skills total (personal + project)
- Skill nodes per workflow: unlimited (same as other node types)
- SKILL.md file size: assume <50KB per file for parsing performance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - JSDoc comments for all public APIs (Skill service, YAML parser, file operations)
  - Clear naming: `SkillNode`, `SkillBrowserDialog`, `SkillMetadata`, `parseSkillFile`
  - Constants defined: `MAX_SKILL_NAME_LENGTH = 64`, `MAX_DESCRIPTION_LENGTH = 1024`
- [x] 命名規則が明確に定義されているか
  - TypeScript interfaces: `SkillNodeData`, `SkillReference`, `SkillMetadata`
  - React components: `SkillNode.tsx`, `SkillBrowserDialog.tsx`, `SkillCreationDialog.tsx`
  - Services: `skill-service.ts`, `yaml-parser.ts`
- [x] コードの複雑度が妥当な範囲に収まっているか
  - YAML parsing: simple regex-based extraction (no full parser needed)
  - File browsing: recursive directory scan with error handling
  - Skill creation: sequential steps (validate → create dir → write file)

### II. テスト駆動開発
- [x] テストファーストで開発プロセスが計画されているか
  - Phase 2 (tasks.md) will define TDD workflow: Red-Green-Refactor per FR
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - **契約テスト**: SkillNodeData interface, Extension ↔ Webview message types
  - **統合テスト**: End-to-end workflow (add node → browse → select → export)
  - **ユニットテスト**: YAML parser, path resolution, validation logic
- [x] テストカバレッジ目標（80%以上）が設定されているか
  - Target: 85% for new code (YAML parser, Skill service, UI components)
  - Critical paths: 100% (file validation, YAML parsing, Skill creation)

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - Reuse existing dialog patterns: Similar to AiGenerationDialog (modal with form)
  - Property panel: Consistent with existing nodes (PromptNode, SubAgentNode)
  - Error states: Red border + warning icon (same as missing file warnings)
- [x] エラーメッセージの明確性が確保されているか
  - "SKILL.md file not found at [path]. Re-select a valid Skill or remove this node."
  - "Invalid YAML frontmatter in [file]: missing 'description' field"
  - "Skill name must be lowercase, use hyphens only (max 64 chars)"
- [x] アクセシビリティが考慮されているか
  - Keyboard navigation: Tab through Skill list, Enter to select, Esc to cancel
  - ARIA labels for browse button, dialog fields
  - Screen reader-friendly error messages

### IV. パフォーマンス基準
- [x] API応答時間目標（p95 < 200ms）が検討されているか
  - File system operations (Extension Host):
    - Browse Skills: <500ms for up to 50 files (p95)
    - YAML parse: <50ms per file (p95)
    - Create Skill: <300ms (directory + file write)
  - Webview rendering:
    - Skill browser dialog open: <200ms
    - Node addition to canvas: <100ms (reuse existing React Flow patterns)
- [x] データベース最適化が計画されているか
  - N/A (file-based storage, no database)
- [x] フロントエンドロード時間目標が設定されているか（該当する場合）
  - No impact on initial load (Skill node lazy-loaded on demand)
  - Skill browser: Load on first open, cache metadata in memory during session

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - Separate services:
    - Extension: `skill-service.ts` (file operations), `yaml-parser.ts` (parsing)
    - Webview: `skill-browser-service.ts` (UI state), `skill-node-store.ts` (node management)
  - Reusable components: `SkillBrowserDialog`, `SkillCreationDialog`
- [x] 設定管理の方針が明確か
  - Skill paths: Environment-based (`process.env.HOME` for personal, workspace root for project)
  - No configuration file needed (convention over configuration)
- [x] バージョニング戦略が定義されているか
  - Follows project versioning (currently 0.3.2 → 0.4.0 for minor feature addition)
  - Backward compatibility: SkillNode data structure versioned in workflow JSON

**違反の正当化**: このセクションは「Complexity Tracking」テーブルに記録する

## Project Structure

### Documentation (this feature)

```text
specs/001-skill-node/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── skill-messages.ts  # Extension ↔ Webview message contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── extension/           # Extension Host (Node.js environment)
│   ├── commands/
│   │   └── skill-operations.ts        # NEW: Browse/Create Skill handlers
│   ├── services/
│   │   ├── skill-service.ts           # NEW: Skill file I/O operations
│   │   └── yaml-parser.ts             # NEW: SKILL.md frontmatter parser
│   └── utils/
│       └── path-utils.ts              # NEW: Cross-platform path resolution
├── shared/
│   └── types/
│       ├── workflow-definition.ts     # UPDATE: Add SkillNode, SkillNodeData
│       └── messages.ts                # UPDATE: Add Skill-related messages
└── webview/
    └── src/
        ├── components/
        │   ├── nodes/
        │   │   └── SkillNode.tsx      # NEW: Skill node component
        │   └── dialogs/
        │       ├── SkillBrowserDialog.tsx    # NEW: Browse Skills UI
        │       └── SkillCreationDialog.tsx   # NEW: Create Skill UI
        ├── services/
        │   └── skill-browser-service.ts      # NEW: Skill browsing logic
        └── stores/
            └── workflow-store.ts             # UPDATE: Add Skill node support

tests/
├── extension/
│   ├── unit/
│   │   ├── yaml-parser.test.ts       # NEW: YAML parsing tests
│   │   └── skill-service.test.ts     # NEW: File operations tests
│   └── integration/
│       └── skill-workflow.test.ts    # NEW: E2E Skill workflow test
└── webview/
    └── src/
        └── components/
            ├── SkillNode.test.tsx            # NEW: Component tests
            └── SkillBrowserDialog.test.tsx   # NEW: Dialog tests
```

**Structure Decision**:
This project uses a **dual architecture** (Extension Host + Webview) typical of VSCode extensions. The Extension Host handles file system operations (browsing Skills, parsing YAML, creating files) while the Webview provides the React-based visual editor. Communication between the two uses VSCode's postMessage API.

New code follows the existing pattern:
- **Extension services**: Handle file I/O and YAML parsing (no new dependencies, use Node.js built-ins)
- **Webview components**: React components for Skill node, browser dialog, creation dialog
- **Shared types**: TypeScript interfaces for SkillNode and message contracts

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Manual YAML parsing (no library) | User constraint: No new dependencies | Full YAML parser (js-yaml) would be simpler but violates "no new dependencies" rule. Skill YAML is simple (key: value pairs), so regex-based extraction is sufficient. |

## Phase 0: Research & Decision Points

See [research.md](./research.md) for detailed analysis.

### Key Decisions

1. **YAML Parsing Approach** (FR-005, FR-011)
   - **Decision**: Manual regex-based extraction of frontmatter fields
   - **Rationale**: No new dependencies constraint; SKILL.md YAML is simple (name, description, allowed-tools)
   - **Alternatives considered**: js-yaml library (rejected: new dependency), full parser (overkill for simple format)

2. **Skill Browser UI Pattern** (FR-003, FR-004)
   - **Decision**: Modal dialog with list view (similar to AiGenerationDialog)
   - **Rationale**: Consistent with existing UI patterns, familiar user experience
   - **Alternatives considered**: Sidebar panel (rejected: clutters UI), inline dropdown (rejected: limited space for descriptions)

3. **Path Resolution Strategy** (FR-013, Edge Case: collisions)
   - **Decision**: Store absolute paths for personal Skills, relative paths for project Skills
   - **Rationale**: Portability across team members (relative paths work after git clone)
   - **Alternatives considered**: Always absolute (rejected: breaks portability), always relative (rejected: fails for personal Skills)

4. **Skill Creation Workflow** (FR-008-FR-012)
   - **Decision**: Multi-step dialog (name → description → instructions → scope)
   - **Rationale**: Guides users through required fields, prevents invalid inputs
   - **Alternatives considered**: Single form (rejected: overwhelming), wizard (rejected: unnecessary complexity)

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

**Core Entities**:
- `SkillNodeData`: name, description, skillPath, scope (personal|project), metadata
- `SkillReference`: skillPath, name, description, scope, validationStatus
- `SkillMetadata`: Extracted from SKILL.md frontmatter (name, description, allowedTools)

### API Contracts

See [contracts/skill-messages.ts](./contracts/skill-messages.ts) for complete message definitions.

**Extension → Webview**:
- `SKILL_LIST_LOADED`: { skills: SkillReference[] }
- `SKILL_CREATION_SUCCESS`: { skillPath: string }
- `SKILL_VALIDATION_ERROR`: { errorCode, errorMessage, filePath }

**Webview → Extension**:
- `BROWSE_SKILLS`: { } (trigger scan)
- `CREATE_SKILL`: { name, description, instructions, allowedTools, scope }
- `VALIDATE_SKILL_FILE`: { skillPath }

### Quickstart

See [quickstart.md](./quickstart.md) for user-facing guide.

**Usage Flow**:
1. User drags "Skill" node onto canvas
2. Click "Browse Skills" button in property panel
3. Select existing Skill from list OR click "Create New Skill"
4. (If creating) Fill form: name, description, instructions, scope
5. Node updates to show selected/created Skill
6. Export workflow → includes Skill dependency documentation

## Implementation Phases

### Phase 2: Task Breakdown

Run `/speckit.tasks` to generate [tasks.md](./tasks.md) with:
- Test-first task definitions (Red-Green-Refactor per FR)
- Dependency ordering (YAML parser → Skill service → UI components)
- Acceptance criteria from spec.md
