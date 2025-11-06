# Quickstart: AI-Assisted Workflow Generation

**Feature**: 001-ai-workflow-generation
**Date**: 2025-11-06
**Audience**: Developers implementing this feature

## Prerequisites

Before starting implementation, ensure you have:

1. **Development Environment**:
   - Node.js 18+ installed
   - VSCode with Extension Development Host support
   - TypeScript 5.3+ knowledge
   - React 18.2+ knowledge (for Webview UI)

2. **Codebase Familiarity**:
   - Read `specs/001-cc-wf-studio/spec.md` (base application spec)
   - Understand existing Extension ↔ Webview message-passing (`src/shared/types/messages.ts`)
   - Familiar with ReactFlow (workflow canvas library)
   - Familiar with Zustand (state management)

3. **External Dependencies**:
   - Claude Code CLI installed on development machine (for testing)
   - Access to Claude Code documentation for CLI usage

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      VSCode Extension Host                      │
│                        (Node.js Process)                        │
├─────────────────────────────────────────────────────────────────┤
│  Extension Commands                                             │
│  └─ ai-generation.ts: Handle GENERATE_WORKFLOW requests         │
│                                                                 │
│  Services                                                       │
│  ├─ claude-code-service.ts: Execute CLI via child_process      │
│  ├─ schema-loader-service.ts: Load workflow schema from file   │
│  └─ validate-workflow.ts: Validate AI-generated workflows      │
│                                                                 │
│  Resources                                                      │
│  └─ workflow-schema.json: Workflow spec for AI context         │
└─────────────────────────────────────────────────────────────────┘
                            ↕ postMessage
┌─────────────────────────────────────────────────────────────────┐
│                      Webview (React UI)                         │
│                     (Browser-like Process)                      │
├─────────────────────────────────────────────────────────────────┤
│  Components                                                     │
│  ├─ AiGenerationDialog.tsx: Modal UI for user input            │
│  └─ Toolbar.tsx: "Generate with AI" button (update existing)   │
│                                                                 │
│  Services                                                       │
│  └─ ai-generation-service.ts: Webview ↔ Extension bridge       │
│                                                                 │
│  Store                                                          │
│  └─ workflow-store.ts: Add generated workflows to canvas       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 0: Setup & Schema Documentation (**Estimated: 2 hours**)

**Goal**: Create the workflow schema documentation that AI will use as context

**Tasks**:
1. Create `resources/workflow-schema.json` file
2. Document all 7 node types (Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch)
3. Include validation rules from `VALIDATION_RULES` in `workflow-definition.ts`
4. Add 3 example workflows (simple, medium, complex)
5. Validate JSON structure and size (<10KB)

**Files to Create**:
- `resources/workflow-schema.json`

**Validation**:
- Run `cat resources/workflow-schema.json | wc -c` → should be <10240 bytes
- Parse JSON to ensure valid structure
- Compare against `src/shared/types/workflow-definition.ts` to ensure accuracy

---

### Phase 1: Extension Services (**Estimated: 4 hours**)

**Goal**: Implement Extension Host services for CLI execution and schema loading

**Tasks**:
1. Create `ClaudeCodeService` to execute CLI commands
   - Use `child_process.spawn()` with timeout
   - Handle stdout/stderr streaming
   - Map errors to defined error codes

2. Create `SchemaLoaderService` to load schema file
   - Load from `resources/workflow-schema.json`
   - Cache in memory after first load
   - Handle file read errors gracefully

3. Create `validateWorkflow()` utility
   - Reuse existing `VALIDATION_RULES` from `workflow-definition.ts`
   - Add AI-specific checks (node count, connection validity)
   - Return structured validation errors

**Files to Create**:
- `src/extension/services/claude-code-service.ts`
- `src/extension/services/schema-loader-service.ts`
- `src/extension/utils/validate-workflow.ts`

**Tests to Write** (Contract Tests):
```typescript
// claude-code-service.test.ts
describe('ClaudeCodeService', () => {
  it('should execute CLI and return JSON output', async () => { ... });
  it('should timeout after 30 seconds', async () => { ... });
  it('should map ENOENT error to COMMAND_NOT_FOUND', async () => { ... });
});

// schema-loader-service.test.ts
describe('SchemaLoaderService', () => {
  it('should load schema from file', async () => { ... });
  it('should cache schema after first load', async () => { ... });
  it('should handle missing file gracefully', async () => { ... });
});

// validate-workflow.test.ts
describe('validateWorkflow', () => {
  it('should pass valid workflow', () => { ... });
  it('should reject workflow with >50 nodes', () => { ... });
  it('should reject invalid connections', () => { ... });
});
```

---

### Phase 2: Extension Command Handler (**Estimated: 3 hours**)

**Goal**: Implement the Extension command that handles `GENERATE_WORKFLOW` messages

**Tasks**:
1. Create `ai-generation.ts` command handler
2. Register command in `extension.ts` activation
3. Wire up message handling in Webview event listener
4. Construct prompt from user description + schema
5. Execute CLI via `ClaudeCodeService`
6. Parse and validate response
7. Send success/failure message back to Webview

**Files to Create**:
- `src/extension/commands/ai-generation.ts`

**Files to Update**:
- `src/extension/extension.ts` (register command)
- `src/extension/commands/open-editor.ts` (add message handler for GENERATE_WORKFLOW)

**Tests to Write** (Integration Tests):
```typescript
// ai-generation.test.ts
describe('AI Generation Command', () => {
  it('should generate workflow from description', async () => { ... });
  it('should send GENERATION_SUCCESS on success', async () => { ... });
  it('should send GENERATION_FAILED on CLI error', async () => { ... });
  it('should validate generated workflow before sending', async () => { ... });
});
```

---

### Phase 3: Shared Type Definitions (**Estimated: 1 hour**)

**Goal**: Define TypeScript types for AI generation messages

**Tasks**:
1. Add `GenerateWorkflowPayload` interface
2. Add `GenerationSuccessPayload` interface
3. Add `GenerationFailedPayload` interface
4. Update `WebviewMessage` union type
5. Update `ExtensionMessage` union type

**Files to Update**:
- `src/shared/types/messages.ts`

**Validation**:
- Run `npm run compile` → should compile without errors
- Ensure type safety across Extension ↔ Webview boundary

---

### Phase 4: Webview Service (**Estimated: 2 hours**)

**Goal**: Implement Webview service for sending/receiving AI generation messages

**Tasks**:
1. Create `ai-generation-service.ts` with `generateWorkflow()` function
2. Use existing `vscode-bridge` postMessage pattern
3. Handle request/response correlation via `requestId`
4. Implement local timeout (35 seconds)
5. Return Promise that resolves to workflow or error

**Files to Create**:
- `src/webview/src/services/ai-generation-service.ts`

**Tests to Write** (Unit Tests):
```typescript
// ai-generation-service.test.ts
describe('aiGenerationService', () => {
  it('should send GENERATE_WORKFLOW message', async () => { ... });
  it('should resolve Promise on GENERATION_SUCCESS', async () => { ... });
  it('should reject Promise on GENERATION_FAILED', async () => { ... });
  it('should timeout after 35 seconds', async () => { ... });
});
```

---

### Phase 5: Webview UI Components (**Estimated: 4 hours**)

**Goal**: Implement the user-facing dialog and integrate with Toolbar

**Tasks**:
1. Create `AiGenerationDialog.tsx` component
   - Modal dialog with textarea for user description
   - "Generate" button (disabled when empty or >2000 chars)
   - Loading indicator during generation
   - Error display area (reuse `ErrorNotification` style)
   - Cancel button to close dialog

2. Update `Toolbar.tsx` to add "Generate with AI" button
   - Position next to existing Save/Export buttons
   - Opens `AiGenerationDialog` when clicked
   - Uses existing icon style (⚡ or 🤖)

3. Update `workflow-store.ts` to handle adding generated workflows
   - Add nodes to canvas at auto-positioned location
   - Avoid overlapping with existing nodes
   - Select newly added workflow for immediate editing

**Files to Create**:
- `src/webview/src/components/dialogs/AiGenerationDialog.tsx`

**Files to Update**:
- `src/webview/src/components/Toolbar.tsx`
- `src/webview/src/stores/workflow-store.ts`

**Tests to Write** (Component Tests):
```typescript
// AiGenerationDialog.test.tsx
describe('AiGenerationDialog', () => {
  it('should render textarea and generate button', () => { ... });
  it('should disable generate button when description is empty', () => { ... });
  it('should show error when description exceeds 2000 chars', () => { ... });
  it('should display loading indicator during generation', () => { ... });
  it('should show error message on failure', () => { ... });
  it('should close dialog on successful generation', () => { ... });
});
```

---

### Phase 6: i18n Support (**Estimated: 2 hours**)

**Goal**: Add internationalization for UI labels and error messages

**Tasks**:
1. Add translation keys to `src/webview/src/i18n/translation-keys.ts`
2. Add English translations to `src/webview/src/i18n/translations/en.ts`
3. Add Japanese translations to `src/webview/src/i18n/translations/ja.ts`
4. Add other language translations (ko, zh-CN, zh-TW)
5. Update `AiGenerationDialog` to use translation keys

**Files to Update**:
- `src/webview/src/i18n/translation-keys.ts`
- `src/webview/src/i18n/translations/*.ts` (all 5 languages)
- `src/webview/src/components/dialogs/AiGenerationDialog.tsx`

**Translation Keys to Add**:
```typescript
export const TRANSLATION_KEYS = {
  // ... existing keys
  ai: {
    generateButton: 'ai.generateButton',
    dialogTitle: 'ai.dialogTitle',
    descriptionPlaceholder: 'ai.descriptionPlaceholder',
    descriptionTooLong: 'ai.descriptionTooLong',
    generating: 'ai.generating',
    success: 'ai.success',
    errors: {
      commandNotFound: 'ai.errors.commandNotFound',
      timeout: 'ai.errors.timeout',
      parseError: 'ai.errors.parseError',
      validationError: 'ai.errors.validationError',
      unknownError: 'ai.errors.unknownError',
    }
  }
};
```

---

### Phase 7: Integration Testing & Polish (**Estimated: 3 hours**)

**Goal**: End-to-end testing and UI/UX polish

**Tasks**:
1. Manual testing: Generate various workflows
   - Simple workflow (3 nodes)
   - Medium workflow (7-10 nodes)
   - Complex workflow (20+ nodes)
   - Invalid workflow (should fail validation)

2. Error scenario testing:
   - Claude Code not installed → COMMAND_NOT_FOUND error
   - Very long description → TIMEOUT error
   - Invalid AI response → PARSE_ERROR

3. UI/UX polish:
   - Ensure consistent styling with existing UI
   - Verify keyboard shortcuts work (Enter=Generate, Esc=Cancel)
   - Test accessibility (screen reader, keyboard nav)
   - Verify loading indicator animation

4. Documentation updates:
   - Update README.md with AI generation feature
   - Add examples to quickstart guide

**Files to Update**:
- `README.md`
- `docs/*` (if applicable)

**E2E Test Scenarios**:
```typescript
// e2e/ai-generation.test.ts
describe('AI Generation E2E', () => {
  it('should generate workflow end-to-end', async () => {
    // 1. Open workflow editor
    // 2. Click "Generate with AI" button
    // 3. Enter description
    // 4. Click Generate
    // 5. Wait for success
    // 6. Verify workflow on canvas
  });
});
```

---

## Development Workflow

### Day 1: Foundation
- [ ] Phase 0: Schema Documentation (2h)
- [ ] Phase 1: Extension Services (4h)

### Day 2: Extension Integration
- [ ] Phase 2: Extension Command Handler (3h)
- [ ] Phase 3: Shared Type Definitions (1h)
- [ ] Phase 4: Webview Service (2h)

### Day 3: UI & Polish
- [ ] Phase 5: Webview UI Components (4h)
- [ ] Phase 6: i18n Support (2h)

### Day 4: Testing & Release
- [ ] Phase 7: Integration Testing & Polish (3h)
- [ ] Write unit/integration tests (3h)
- [ ] Update documentation (1h)

**Total Estimated Time**: 21 hours (~3 developer days)

---

## Testing Strategy

### Unit Tests (Vitest)
- Services: ClaudeCodeService, SchemaLoaderService, validateWorkflow
- Webview: ai-generation-service, AiGenerationDialog component

### Integration Tests (@vscode/test-electron)
- Extension: Message handling, CLI execution, validation
- Webview → Extension round-trip

### E2E Tests (Manual + Automated)
- Full user flow: Open editor → Generate → Verify canvas
- Error scenarios: CLI not found, timeout, validation failures

### Test Coverage Goal
- New code: 80%+ coverage
- Critical paths (validation, CLI execution): 100% coverage

---

## Debugging Tips

### Extension Host Debugging
1. Open VSCode Extension Development Host (F5)
2. In Extension Host, open Developer Tools (Help > Toggle Developer Tools)
3. Set breakpoints in `src/extension/services/claude-code-service.ts`
4. Trigger AI generation from Webview
5. Debug CLI execution in real-time

### Webview Debugging
1. In Extension Development Host, open Workflow Editor
2. Right-click in Webview → Inspect Element
3. Set breakpoints in `src/webview/src/services/ai-generation-service.ts`
4. Use Chrome DevTools to debug React components

### CLI Debugging
- Test Claude Code CLI manually:
  ```bash
  claude -p "Generate a simple workflow with 3 nodes: start, sub-agent, end"
  ```
- Verify output is valid JSON
- Check execution time (should be <30 seconds)

---

## Common Pitfalls

1. **Schema Size**: Ensure `workflow-schema.json` stays <10KB. Optimize by removing verbose descriptions.

2. **Timeout Tuning**: 30 seconds might be too short for complex workflows. Monitor AI execution times in production and adjust if needed.

3. **JSON Parsing**: Claude Code CLI might output non-JSON (e.g., error messages). Always try-catch JSON.parse().

4. **Node Positioning**: Auto-position generated nodes to avoid overlap. Use existing canvas bounds + offset logic.

5. **i18n**: Don't forget to translate error messages in all 5 languages. Missing translations cause UI bugs.

6. **Message Correlation**: Always include `requestId` in responses. Missing correlation breaks request/response matching.

---

## Success Criteria Checklist

From [spec.md](spec.md) Success Criteria:

- [ ] **SC-001**: Users can generate a valid workflow in <60 seconds
- [ ] **SC-002**: AI successfully generates valid workflows for 80%+ of typical descriptions
- [ ] **SC-003**: Generated workflows require <3 user edits on average
- [ ] **SC-004**: Workflow creation time reduced by 70% vs manual construction (5+ nodes)
- [ ] **SC-005**: Error messages clear enough for 90% of users to retry within 2 attempts
- [ ] **SC-006**: Schema documentation synchronized with actual workflow schema (0 discrepancies)

---

## Additional Resources

- **Claude Code Documentation**: [https://claude.com/claude-code](https://claude.com/claude-code) (external)
- **VSCode Extension API**: [https://code.visualstudio.com/api](https://code.visualstudio.com/api)
- **ReactFlow Documentation**: [https://reactflow.dev/](https://reactflow.dev/)
- **Node.js child_process**: [https://nodejs.org/api/child_process.html](https://nodejs.org/api/child_process.html)
- **Existing Feature Specs**: `specs/001-cc-wf-studio/` (base application)

---

## Next Steps

After reading this quickstart:

1. Review [research.md](research.md) for technical decisions
2. Review [data-model.md](data-model.md) for entity definitions
3. Review [contracts/ai-generation-messages.md](contracts/ai-generation-messages.md) for API contracts
4. Start with Phase 0 (Schema Documentation)
5. Use `/speckit.tasks` to generate detailed implementation tasks

**Ready to implement? Run `/speckit.tasks` to break down this plan into actionable tasks!**
