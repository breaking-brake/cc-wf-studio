# Feature Specification: AI-Assisted Skill Node Generation

**Feature Branch**: `001-ai-skill-generation`
**Created**: 2025-11-09
**Status**: Draft
**Input**: User description: "AI生成でSkillについても対応したいです。パーソナルもしくはプロジェクトのスキルを参照し、AI生成の指示に応じて必要であれば、最適なパーソナルもしくはプロジェクトのスキルを選択してワークフローが生成されるようにしたいです。"

## User Scenarios & Testing

### User Story 1 - AI Generates Workflow with Relevant Skills (Priority: P1)

Users describe a workflow that requires specialized capabilities, and the AI automatically identifies and includes appropriate Skill nodes from available personal or project Skills.

**Why this priority**: This is the core value proposition - enabling AI to leverage existing Skills without manual selection, making workflow generation more intelligent and reducing user effort.

**Independent Test**: Can be fully tested by requesting "Create a workflow that analyzes PDF documents" when a PDF-related Skill exists, and verifying the generated workflow includes the correct Skill node with proper references.

**Acceptance Scenarios**:

1. **Given** user has personal Skill "pdf-analyzer" and project Skill "data-validator" available, **When** user requests "Create a workflow to analyze PDF reports and validate data", **Then** AI generates workflow with both Skill nodes correctly configured with name, description, scope, and validation status
2. **Given** user requests workflow without mentioning specific Skills, **When** AI determines Skills would be beneficial based on description keywords, **Then** AI selects and includes relevant Skills from available pool
3. **Given** user has 20+ Skills available, **When** user describes workflow needing specific capability, **Then** AI selects only the most relevant Skills (max 3-5 per workflow) based on description matching

---

### User Story 2 - AI Handles Missing or Invalid Skills Gracefully (Priority: P2)

When AI references a Skill that doesn't exist or becomes unavailable, users receive clear validation feedback and can take corrective action.

**Why this priority**: Ensures reliability and user trust - prevents broken workflows from being generated and provides clear path to resolution.

**Independent Test**: Can be tested by having AI generate workflow referencing non-existent Skill, then verifying validation catches the issue and displays appropriate warning with actionable guidance.

**Acceptance Scenarios**:

1. **Given** AI suggests using Skill "data-processor" that doesn't exist, **When** workflow is validated before display, **Then** Skill node is marked with validation status "missing" and user sees warning indicator
2. **Given** generated workflow includes Skill node with validation error, **When** user views the workflow on canvas, **Then** visual indicator (icon/color) shows validation issue and property panel displays error message with suggestion to select alternative Skill or remove node
3. **Given** Skill file exists but has malformed YAML frontmatter, **When** workflow is validated, **Then** Skill node is marked "invalid" with specific error details visible in property panel

---

### User Story 3 - Users Control Skill Inclusion in AI Generation (Priority: P3)

Users can optionally specify which Skills should be considered or excluded during AI generation to maintain control over workflow complexity and dependencies.

**Why this priority**: Provides advanced users with fine-grained control, but not essential for basic functionality - most users will be satisfied with automatic Skill selection.

**Independent Test**: Can be tested by opening AI generation dialog, selecting specific Skills from checkbox list, generating workflow, and verifying only selected Skills are used even if others match the description.

**Acceptance Scenarios**:

1. **Given** AI generation dialog is open, **When** user expands "Available Skills" section, **Then** list shows all personal and project Skills with checkboxes (all checked by default)
2. **Given** user unchecks Skill "legacy-processor" before generation, **When** AI generates workflow, **Then** unchecked Skill is excluded even if description matches its capabilities
3. **Given** user has selected specific Skills subset, **When** generation completes, **Then** dialog displays which Skills were actually used in generated workflow

---

### Edge Cases

- What happens when user has 100+ Skills available and AI prompt becomes too large?
  - System limits Skill list to top 20 most relevant based on description keyword matching
  - User sees notification: "Only showing top 20 most relevant Skills - refine description for better matching"

- How does system handle duplicate Skill names across personal/project scopes?
  - AI prefers project Skills over personal Skills when names conflict (team consistency)
  - Validation displays warning if both scopes have same Skill name

- What if Skill file is deleted/moved after workflow generation but before user saves?
  - Validation re-checks Skill paths before save operation
  - User prompted to re-select Skill or remove node before saving

- How does AI handle ambiguous Skill descriptions?
  - Skill matching uses description text similarity scoring (>60% threshold)
  - Ties broken by: project scope first, then alphabetical order

## Requirements

### Functional Requirements

- **FR-001**: System MUST scan both personal (`~/.claude/skills/`) and project (`.claude/skills/`) directories for available Skills before AI generation
- **FR-002**: System MUST extract Skill metadata (name, description, scope, allowedTools) from YAML frontmatter of each SKILL.md file
- **FR-003**: System MUST include available Skill list in AI generation prompt with simplified format (name, description, scope only - max 20 Skills)
- **FR-004**: System MUST validate generated Skill nodes against actual Skill files and mark validation status (valid, missing, invalid)
- **FR-005**: AI MUST generate Skill nodes with complete data structure: name, description, skillPath, scope, allowedTools (if present), validationStatus, outputPorts=1
- **FR-006**: System MUST resolve skillPath automatically after generation by matching Skill name and scope to actual file location
- **FR-007**: System MUST limit Skill list in prompt to maximum 20 entries to prevent timeout issues
- **FR-008**: System MUST prioritize Skill selection by relevance when more than 20 Skills available, using description keyword matching
- **FR-009**: Webview MUST display validation warnings on Skill nodes with status "missing" or "invalid" through visual indicators (icon, color)
- **FR-010**: Property panel MUST show detailed validation error messages for invalid Skill nodes with actionable guidance (e.g., "Skill file not found at path X - please select another Skill or remove this node")
- **FR-011**: System MUST handle Skill name conflicts between personal/project scopes by preferring project scope in AI generation
- **FR-012**: System MUST re-validate Skill nodes before workflow save operation to catch file changes

### Key Entities

- **Skill Reference**: Available Skill information for AI context including name (string), description (string), scope (personal|project), allowedTools (optional string), source path (absolute path to SKILL.md)
- **Skill Node Data**: Generated node configuration including all fields from Skill Reference plus validationStatus (valid|missing|invalid), outputPorts (always 1), and any validation error messages
- **AI Prompt Context**: Enhanced prompt structure including user description, workflow schema, and filtered Skill list (max 20 entries) with relevance scores

## Success Criteria

### Measurable Outcomes

- **SC-001**: AI correctly identifies and includes relevant Skills in 80%+ of workflows where applicable Skills exist and description mentions related capabilities
- **SC-002**: Generated workflows with Skill nodes pass validation on first attempt 90%+ of time when referenced Skills exist
- **SC-003**: AI generation completes within 90 seconds even with 100+ available Skills (due to 20-Skill prompt limit)
- **SC-004**: Users can identify validation errors on Skill nodes within 5 seconds of viewing generated workflow (clear visual indicators)
- **SC-005**: Skill path resolution succeeds automatically for 95%+ of generated Skill nodes without manual intervention

## Assumptions

- Skills follow standard YAML frontmatter format as defined in Claude Code documentation
- Personal Skills directory (`~/.claude/skills/`) and project Skills directory (`.claude/skills/`) locations are standard and accessible
- Skill descriptions are meaningful enough for keyword-based relevance matching (at least 20 characters)
- Users have fewer than 200 total Skills (combined personal + project) to keep scanning performant
- Existing AI generation infrastructure (Claude Code CLI integration, schema system, validation framework) remains unchanged
- Skill nodes already exist in workflow schema and type definitions (based on prior feature implementation)

## Dependencies

- Existing Skill management system (skill-service.ts, skill-file-generator.ts) for Skill scanning and validation
- Current AI generation pipeline (ai-generation.ts, claude-code-service.ts) for workflow generation
- Workflow schema (workflow-schema.json) must include Skill node type definition
- React Flow canvas and property panel components for displaying validation indicators

## Out of Scope

- Creating new Skills during AI generation workflow (users must use existing Skill creation dialog)
- Modifying Skill files or metadata from generated workflows
- AI-generated recommendations for creating missing Skills
- Automatic Skill installation from remote repositories
- Skill dependency resolution (if Skills reference other Skills)
- Machine learning-based Skill relevance scoring (using simple keyword matching instead)
