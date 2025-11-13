# Implementation Plan: AI-Assisted Workflow Refinement

**Branch**: `001-ai-workflow-refinement` | **Date**: 2025-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-workflow-refinement/spec.md`

## Summary

This feature enables users to iteratively refine AI-generated workflows through a conversational chat interface. After generating a workflow with the existing "AIで生成" button, users can click a new "AIで修正" button to open a chat panel where they can request incremental improvements (e.g., "Add more error handling", "Make prompts clearer"). The system maintains conversation history across sessions, tracks iteration count (max 20), and automatically applies refinements to the canvas. The conversation history is stored within the workflow JSON files in the `.vscode/workflows/` directory.

## Technical Context

**Language/Version**: TypeScript 5.3 (VSCode Extension Host), React 18.2 (Webview UI)
**Primary Dependencies**:
- Extension Host: VSCode Extension API ^1.80.0, Node.js child_process (for Claude Code CLI)
- Webview: React 18.2, ReactFlow (for workflow canvas), Zustand (for state management)
**Storage**: Workflow JSON files in `.vscode/workflows/` directory (conversation history embedded in workflow metadata)
**Testing**: Vitest (Webview unit tests), VSCode Test framework (Integration tests)
**Target Platform**: VSCode Extension ^1.80.0 (cross-platform: Windows, macOS, Linux)
**Project Type**: Web (VSCode Extension with Webview)
**Performance Goals**:
- Refinement requests complete within 30 seconds in 95% of cases
- Chat UI updates (message display, scroll) within 100ms
**Constraints**:
- Warning displayed at 20 refinement iterations (unlimited iterations supported)
- Conversation history size limited by practical JSON file size (<1MB recommended)
- Must work offline for UI interactions (only refinement processing requires network)
**Scale/Scope**:
- Support workflows with up to 50 nodes (existing limit)
- Handle conversations with 20+ iterations (warning shown at 20)
- Support existing 5 languages (en, ja, ko, zh-CN, zh-TW)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - All new components and services will follow existing naming conventions
  - JSDoc comments for all public APIs (services, message handlers)
  - Clear separation between UI logic (React components) and business logic (services)
- [x] 命名規則が明確に定義されているか
  - Follows existing patterns: `RefinementChatPanel.tsx`, `refinement-service.ts`
  - Message types follow existing convention: `REFINE_WORKFLOW`, `RefinementSuccessPayload`
- [x] コードの複雑度が妥当な範囲に収まっているか
  - Chat panel is a standalone component with clear responsibilities
  - Refinement service handles AI communication (extends existing `claude-code-service.ts`)
  - No new architectural patterns introduced

### II. テスト駆動開発
- [x] テストファースト開発プロセスが計画されているか
  - Unit tests for conversation history persistence logic
  - Unit tests for iteration counter and warning banner logic
  - Integration tests for message flow (Webview ↔ Extension Host)
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - Contract: Refinement message protocol validation
  - Integration: End-to-end refinement flow (chat → Claude → canvas update)
  - Unit: Individual components (chat panel, message list, input area)
- [x] テストカバレッジ目標(80%以上)が設定されているか
  - Target 80%+ for new code (matches existing project standards)
  - Critical paths (history persistence, warning banner display) require 100% coverage

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - Chat panel design follows existing dialog patterns (AiGenerationDialog)
  - Message bubbles follow standard chat UI conventions
  - Progress indicators reuse existing patterns
- [x] エラーメッセージの明確性が確保されているか
  - All error states display actionable messages (network failure, timeout, validation errors)
  - Internationalized error messages for all 5 supported languages
- [x] アクセシビリティが考慮されているか
  - Keyboard navigation: Ctrl/Cmd+Enter to send, Esc to close
  - ARIA labels for screen readers
  - Focus management for dialog opening/closing

### IV. パフォーマンス基準
- [x] API応答時間目標(p95 < 200ms)が検討されているか
  - Not applicable (Claude Code CLI timeout is 30-60s, not API response)
  - UI interactions (typing, scrolling) maintain <100ms response time
- [x] データベース最適化が計画されているか
  - Not applicable (file-based storage, not database)
  - JSON parsing/serialization optimized for workflow files
- [x] フロントエンドロード時間目標が設定されているか(該当する場合)
  - Chat panel opens within 200ms (lazy-loaded React component)
  - Message rendering uses virtualization for long conversations (>50 messages)

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - Refinement chat is independent module (can be reused for other features)
  - Clear separation: UI (ChatPanel) ↔ Service (RefinementService) ↔ Storage (WorkflowFileService)
- [x] 設定管理の方針が明確か
  - Warning threshold (20) defined as constant (can be made configurable later)
  - Timeout values follow existing pattern (configurable via payload)
- [x] バージョニング戦略が定義されているか
  - Follows existing extension versioning (semantic versioning)
  - Conversation history schema versioned (future migrations if needed)

**違反の正当化**: なし(No violations)

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-workflow-refinement/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── refinement-messages.json  # Message protocol specification
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# VSCode Extension + Webview (Web application structure)

src/extension/  # Extension Host (TypeScript)
├── commands/
│   └── workflow-refinement.ts  # NEW: Handle REFINE_WORKFLOW messages
├── services/
│   ├── refinement-service.ts   # NEW: Orchestrate refinement workflow
│   ├── claude-code-service.ts  # MODIFIED: Add refinement-specific prompt construction
│   └── file-service.ts         # MODIFIED: Save/load conversation history in workflow JSON
└── extension.ts                # MODIFIED: Register refinement command handler

src/webview/src/  # Webview UI (React + TypeScript)
├── components/
│   ├── dialogs/
│   │   └── RefinementChatPanel.tsx  # NEW: Chat panel dialog
│   ├── chat/
│   │   ├── MessageList.tsx          # NEW: Conversation history display
│   │   ├── MessageInput.tsx         # NEW: User input area
│   │   ├── MessageBubble.tsx        # NEW: Individual message component
│   │   ├── IterationCounter.tsx     # NEW: Shows iteration count
│   │   └── WarningBanner.tsx        # NEW: Warning at 20+ iterations
│   └── Toolbar.tsx                  # MODIFIED: Add "AIで修正" button
├── services/
│   └── refinement-service.ts        # NEW: Webview-side refinement API
├── stores/
│   └── refinement-store.ts          # NEW: Zustand store for chat state
└── i18n/
    └── translations/                # MODIFIED: Add refinement-related strings
        ├── en.ts
        ├── ja.ts
        ├── ko.ts
        ├── zh-CN.ts
        └── zh-TW.ts

src/shared/types/
├── messages.ts                      # MODIFIED: Add refinement message types
└── workflow-definition.ts           # MODIFIED: Add conversationHistory field

tests/
├── extension/
│   ├── services/
│   │   └── refinement-service.test.ts
│   └── commands/
│       └── workflow-refinement.test.ts
└── webview/
    ├── components/
    │   └── RefinementChatPanel.test.tsx
    └── services/
        └── refinement-service.test.ts
```

**Structure Decision**: This is a web application structure (VSCode Extension with Webview UI). The extension host handles file I/O, Claude Code CLI execution, and message orchestration, while the Webview provides the React-based chat UI. Conversation history is stored in the workflow JSON file structure under a new `conversationHistory` field at the workflow root level (not in individual nodes).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - this section is empty.
