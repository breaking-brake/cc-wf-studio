# cc-wf-studio Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-01

## Active Technologies
- ローカルファイルシステム (`.vscode/workflows/*.json`, `.claude/skills/*.md`, `.claude/commands/*.md`) (001-cc-wf-studio)
- TypeScript 5.3 (VSCode Extension Host), React 18.2 (Webview UI) (001-node-types-extension)
- ローカルファイルシステム (`.vscode/workflows/*.json`) (001-node-types-extension)
- TypeScript 5.3 (Extension Host & Webview shared types), React 18.2 (Webview UI) (001-ai-workflow-generation)
- File system (workflow schema JSON in resources/, generated workflows in canvas state) (001-ai-workflow-generation)

- TypeScript 5.x (VSCode Extension Host), React 18.x (Webview UI) (001-cc-wf-studio)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (VSCode Extension Host), React 18.x (Webview UI): Follow standard conventions

## Recent Changes
- 001-ai-workflow-generation: Added TypeScript 5.3 (Extension Host & Webview shared types), React 18.2 (Webview UI)
- 001-node-types-extension: Added TypeScript 5.3 (VSCode Extension Host), React 18.2 (Webview UI)
- 001-cc-wf-studio: Added TypeScript 5.x (VSCode Extension Host), React 18.x (Webview UI)


<!-- MANUAL ADDITIONS START -->

## AI-Assisted Workflow Generation (Feature 001-ai-workflow-generation)

### Key Files and Components

#### Extension Host Services
- **src/extension/services/claude-code-service.ts**
  - Executes Claude Code CLI via child_process.spawn()
  - Handles timeout (30s default), error mapping (COMMAND_NOT_FOUND, TIMEOUT, etc.)
  - Includes comprehensive logging to VSCode Output Channel

- **src/extension/services/schema-loader-service.ts**
  - Loads workflow-schema.json from resources/ directory
  - Implements in-memory caching for performance
  - Provides schema to AI for context during generation

- **src/extension/commands/ai-generation.ts**
  - Main command handler for GENERATE_WORKFLOW messages from Webview
  - Orchestrates: schema loading → CLI execution → parsing → validation
  - Sends success/failure messages back to Webview with execution metrics

- **src/extension/utils/validate-workflow.ts**
  - Validates AI-generated workflows against VALIDATION_RULES
  - Checks node count (<50), connection validity, required fields
  - Returns structured validation errors for user feedback

#### Webview Components
- **src/webview/src/services/ai-generation-service.ts**
  - Bridge between Webview UI and Extension Host
  - Sends GENERATE_WORKFLOW messages via postMessage
  - Returns Promise that resolves to workflow or AIGenerationError

- **src/webview/src/components/dialogs/AiGenerationDialog.tsx**
  - Modal dialog for user description input (max 2000 chars)
  - Handles loading states, error display, success notifications
  - Fully internationalized (5 languages: en, ja, ko, zh-CN, zh-TW)
  - Keyboard shortcuts: Ctrl/Cmd+Enter (generate), Esc (cancel)

#### Resources
- **resources/workflow-schema.json**
  - Comprehensive schema documentation for AI context
  - Documents all 7 node types (Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch)
  - Includes validation rules and 3 example workflows
  - Size: <10KB (optimized for token efficiency)
  - **IMPORTANT**: Included in VSIX package (not excluded by .vscodeignore)

#### Documentation
- **docs/schema-maintenance.md**
  - Maintenance guide for workflow-schema.json
  - Synchronization procedures between TypeScript types and JSON schema
  - Update workflows, validation rules mapping, common tasks
  - File size optimization guidelines (target <10KB, max 15KB)

### Message Flow
```
Webview (AiGenerationDialog)
  → postMessage(GENERATE_WORKFLOW)
  → Extension (ai-generation.ts)
  → ClaudeCodeService.executeClaudeCodeCLI()
  → Parse & Validate
  → postMessage(GENERATION_SUCCESS | GENERATION_FAILED)
  → Webview (workflow-store.addGeneratedWorkflow())
```

### Error Handling
- All errors mapped to specific error codes for i18n
- Comprehensive logging to "Claude Code Workflow Studio" Output Channel
- Execution time tracking for all operations (success and failure)

### Testing Notes
- T052-T054: Manual testing scenarios (simple/medium/complex workflows, error scenarios)
- T055: VSCode Output Channel logging implemented ✓
- Unit/integration tests deferred (T011-T015, T019, T023, T028, T032, T035, T040)

<!-- MANUAL ADDITIONS END -->
