# Feature Specification: AI-Assisted Workflow Generation

**Feature Branch**: `001-ai-workflow-generation`
**Created**: 2025-11-06
**Status**: Draft
**Input**: User description: "下記のAIによるワークフロー生成機能を追加したい。本アプリケーションのworkflowJSONファイルのルールをまとめたドキュメントをJSONで作成する。ユーザーがAIにワークフロー生成を依頼するUIを作成する。対話形式ではなく単発で良い。使用するAIエージェントはローカルのClaudeCodeへワンショット指示(bashのclaude -p "プロンプト")で行わせる。プロンプト指示ないにはユーザーがUIで入力した文章に加えて、前述のワークフロールールJSONファイルを参照するように指示する。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI-Assisted Workflow Creation from Natural Language (Priority: P1)

Users can describe a workflow in natural language and have the system automatically generate a complete workflow definition. The user opens a dialog, enters a plain text description of what they want the workflow to do (e.g., "Create a code review workflow that scans code, asks user for priority level, and generates fix suggestions"), clicks a generate button, and receives a fully constructed workflow that appears on the canvas ready for use or further editing.

**Why this priority**: This is the core value proposition of the feature. Without AI-generated workflows, users must manually construct every workflow from scratch. This automation significantly reduces time and cognitive load for workflow creation, making the tool accessible to non-technical users and dramatically speeding up workflow prototyping for power users.

**Independent Test**: Open the workflow editor, click "Generate with AI" button, enter "Create a workflow that analyzes data and generates a report", submit the request, and verify that a valid workflow with appropriate nodes and connections appears on the canvas. The generated workflow should be immediately usable without requiring manual corrections.

**Acceptance Scenarios**:

1. **Given** the workflow editor is open, **When** user clicks the "Generate with AI" button, **Then** a dialog appears with a text input field and generate button
2. **Given** the AI generation dialog is open, **When** user enters "Create a code review workflow with analysis and fix suggestions" and clicks generate, **Then** the system generates a workflow with appropriate Sub-Agent nodes and connections
3. **Given** the AI generation dialog is open, **When** user enters a complex workflow description with conditional branching, **Then** the generated workflow includes appropriate AskUserQuestion or Branch nodes
4. **Given** a workflow generation request is in progress, **When** the AI is processing the request, **Then** a loading indicator is displayed to the user
5. **Given** AI has successfully generated a workflow, **When** the generation completes, **Then** the dialog closes and the new workflow appears on the canvas with all nodes properly positioned
6. **Given** AI generation encounters an error, **When** the error occurs, **Then** an error message is displayed to the user explaining what went wrong

---

### User Story 2 - Workflow Schema Documentation for AI Context (Priority: P2)

The system provides a comprehensive, machine-readable documentation of the workflow JSON schema that the AI can reference when generating workflows. This documentation includes all node types, required fields, validation rules, connection constraints, and example workflows. The documentation is maintained as a static resource file that gets updated when the workflow schema evolves.

**Why this priority**: This documentation is essential for the AI to generate valid workflows, but it's a supporting component rather than user-facing functionality. It needs to exist before P1 can work reliably, but users don't directly interact with it. It's P2 because it enables P1 but doesn't deliver standalone user value.

**Independent Test**: Locate the workflow schema documentation file in the project resources. Validate that it contains complete definitions for all node types (Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch), includes all required and optional fields with their data types and constraints, provides example workflows, and is in valid JSON format. Verify that the documentation accurately reflects the current workflow schema by comparing it against the TypeScript type definitions.

**Acceptance Scenarios**:

1. **Given** the workflow schema documentation file exists, **When** opened and parsed, **Then** it contains valid JSON structure
2. **Given** the schema documentation, **When** reviewing node type definitions, **Then** all 7 node types (Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch) are documented with complete field specifications
3. **Given** the schema documentation, **When** checking validation rules, **Then** it includes constraints such as maximum nodes (50), name patterns, and connection rules
4. **Given** the schema documentation, **When** reviewing examples, **Then** it contains at least 3 example workflows demonstrating different complexity levels
5. **Given** the workflow schema changes in the application, **When** the schema is updated, **Then** the documentation file is also updated to reflect the changes

---

### User Story 3 - Clear Feedback on Generation Success and Failures (Priority: P3)

Users receive clear, actionable feedback when workflow generation succeeds or fails. On success, users see the generated workflow on the canvas and can immediately save, export, or modify it. On failure, users see a specific error message explaining what went wrong and how to resolve it (e.g., "Description too vague - please specify what each step should do" or "AI service unavailable - check that Claude Code is running").

**Why this priority**: Good error handling improves user experience but is less critical than the core generation functionality. Users can work around poor error messages by trial and error, whereas without P1 they can't use the feature at all. This is P3 because it enhances usability of an existing feature rather than enabling new capabilities.

**Independent Test**: Intentionally trigger various error conditions (AI service unavailable, invalid description, malformed AI response) and verify that each displays a specific, helpful error message. Also test successful generation to confirm that success feedback is clear and the workflow is immediately usable.

**Acceptance Scenarios**:

1. **Given** AI successfully generates a workflow, **When** generation completes, **Then** a success notification appears briefly confirming "Workflow generated successfully"
2. **Given** AI service is unavailable, **When** user attempts to generate a workflow, **Then** an error message displays "Cannot connect to Claude Code - please ensure it is installed and running"
3. **Given** user provides an unclear description, **When** AI cannot generate a valid workflow, **Then** an error message suggests "Please provide more detail about what each step should do"
4. **Given** AI returns malformed JSON, **When** the response is parsed, **Then** an error message displays "Generation failed - please try again or rephrase your description"
5. **Given** workflow generation fails, **When** the error message is displayed, **Then** the user can retry with a modified description without losing their input

---

### Edge Cases

- What happens when the user's description is extremely long (>1000 characters)?
  - System should accept descriptions up to 2000 characters and truncate with a warning if exceeded

- What happens when the AI generates a workflow with more than 50 nodes (the application limit)?
  - System should validate the generated workflow and display an error: "Generated workflow exceeds maximum node limit (50). Please simplify your description."

- What happens when the user closes the generation dialog while AI is processing?
  - The request should be cancelled gracefully, and no partial workflow should be added to the canvas

- What happens when the AI generates invalid JSON?
  - System should catch the parsing error and display a user-friendly error message suggesting retry

- What happens when the AI generates a workflow with invalid connections (e.g., connecting from End node)?
  - System should validate the workflow structure and either auto-correct simple issues or display specific validation errors

- What happens when Claude Code command execution times out?
  - System should timeout after 30 seconds and display an error message suggesting the description may be too complex

- What happens when the user already has nodes on the canvas?
  - The generated workflow should be added to the canvas at an empty position, preserving existing nodes (default behavior). Future enhancement could add a "Replace" option.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a workflow schema documentation file in JSON format that describes all workflow structure rules, node types, and validation constraints
- **FR-002**: The schema documentation MUST include complete specifications for all node types: Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch, and Branch (deprecated)
- **FR-003**: The schema documentation MUST include validation rules such as maximum node count (50), node name patterns, connection constraints, and required fields for each node type
- **FR-004**: The schema documentation MUST include at least 3 example workflows demonstrating different complexity levels and use cases
- **FR-005**: System MUST provide a user interface element (button or menu item) to initiate AI-assisted workflow generation
- **FR-006**: System MUST display a dialog when user initiates AI generation, containing a text input field for workflow description and a generate button
- **FR-007**: System MUST accept workflow descriptions up to 2000 characters in length
- **FR-008**: System MUST execute the AI generation request by invoking Claude Code CLI command with the user's description and schema documentation as context
- **FR-009**: System MUST construct a prompt that includes both the user's workflow description and the complete workflow schema documentation
- **FR-010**: System MUST display a loading indicator while AI generation is in progress
- **FR-011**: System MUST parse the AI-generated workflow JSON and validate it against the schema rules before adding it to the canvas
- **FR-012**: System MUST add the successfully generated workflow to the canvas with nodes positioned to avoid overlapping existing nodes
- **FR-013**: System MUST display a success notification when workflow generation completes successfully
- **FR-014**: System MUST display specific error messages for different failure scenarios: AI service unavailable, parsing errors, validation errors, and timeout
- **FR-015**: System MUST timeout AI generation requests after 30 seconds to prevent indefinite waiting
- **FR-016**: System MUST allow users to retry generation with a modified description after a failure without losing their input text
- **FR-017**: System MUST validate that generated workflows do not exceed the maximum node limit (50 nodes)
- **FR-018**: System MUST validate that generated workflows have valid connections (no connections from End nodes, no connections to Start nodes)

### Key Entities

- **Workflow Schema Documentation**: A JSON-formatted document containing complete specifications of the workflow data model, including all node types, field definitions, validation rules, connection constraints, and example workflows. Serves as the knowledge base for AI generation.

- **AI Generation Request**: Represents a user's request to generate a workflow, containing the natural language description (up to 2000 characters), timestamp, and status (pending, completed, failed).

- **Generated Workflow**: A complete workflow structure returned by AI, containing nodes array, connections array, and metadata. Must conform to the same schema as manually created workflows.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a valid workflow from a natural language description in under 60 seconds (including AI processing time)
- **SC-002**: AI successfully generates valid workflows for at least 80% of typical workflow descriptions (e.g., "code review workflow", "data analysis pipeline", "content approval process")
- **SC-003**: Generated workflows require less than 3 user edits on average before being ready for export
- **SC-004**: Workflow creation time is reduced by at least 70% compared to manual node-by-node construction for workflows with 5+ nodes
- **SC-005**: Error messages for failed generations are clear enough that users can successfully retry and complete generation within 2 attempts in 90% of cases
- **SC-006**: The schema documentation file remains synchronized with the actual workflow schema, with zero discrepancies between documented and actual behavior

## Assumptions

- **Assumption 1**: Users have Claude Code CLI installed and accessible in their system PATH
- **Assumption 2**: Claude Code CLI supports the `-p` parameter for one-shot prompt execution
- **Assumption 3**: Users have sufficient Claude Code API credits/quota to execute generation requests
- **Assumption 4**: The AI model used by Claude Code has sufficient context window to process both the schema documentation (estimated 5-10KB) and user description (up to 2KB)
- **Assumption 5**: Generated workflows will use the same language/locale as the application's current i18n setting (English, Japanese, Korean, or Chinese)
- **Assumption 6**: The workflow schema documentation file will be stored in the application's resources directory and bundled with the extension
- **Assumption 7**: Users understand that AI generation is a convenience feature and may require manual refinement
- **Assumption 8**: Network latency for local Claude Code CLI execution is negligible (<1 second)

## Dependencies

- **Dependency 1**: Claude Code CLI must be installed on the user's system
- **Dependency 2**: The workflow schema must be stable enough to document (no major breaking changes expected)
- **Dependency 3**: The application's workflow validation logic must be exposed/reusable for validating AI-generated workflows

## Out of Scope

- **Multi-turn conversational workflow generation**: The initial version supports only single-shot generation. Users cannot have a back-and-forth conversation with the AI to refine the workflow.
- **Workflow generation from uploaded files or images**: Only natural language text descriptions are supported as input.
- **Custom AI model selection**: The feature uses Claude Code's default model and does not allow users to select specific models (e.g., GPT-4, Claude 3 Opus).
- **Workflow generation history/library**: The system does not store or display previously generated workflows for reuse.
- **AI-assisted editing of existing workflows**: The feature only generates new workflows from scratch, not modifications to existing workflows.
- **Schema documentation automatic updates**: The schema documentation must be manually updated when the workflow schema changes. Automatic synchronization is not included.
