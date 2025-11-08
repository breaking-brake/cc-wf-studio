# Feature Specification: Skill Node Integration

**Feature Branch**: `001-skill-node`
**Created**: 2025-11-08
**Status**: Draft
**Input**: User description: "ノード種別にSkillを追加、ユーザーが参照可能なスキル(~/.claude/skills/my-skill-nameもしくはmy-project/.claude/skills/my-skill-name)を設定、もしくはスキルの新規追加できるような設定項目を設けてワークフローに組み込めるものとする。"

## Overview

This feature enables users to integrate Claude Code Skills into visual workflows by adding a new "Skill" node type. Users can reference existing Skills from their personal (`~/.claude/skills/`) or project (`.claude/skills/`) directories, or create new Skills directly from the visual editor. This bridges the gap between visual workflow design and reusable, model-invoked agent capabilities.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reference Existing Personal Skill (Priority: P1)

A user wants to incorporate a pre-existing personal Skill (e.g., "pdf-form-filler" from `~/.claude/skills/`) into their visual workflow to leverage specialized capabilities without recreating them.

**Why this priority**: This is the most common use case—reusing existing Skills that users or teams have already invested time creating. It provides immediate value by connecting visual workflows with established agent capabilities.

**Independent Test**: Can be fully tested by creating a workflow with a Skill node pointing to `~/.claude/skills/test-skill/SKILL.md`, exporting the workflow, and verifying the Skill activates when the workflow runs.

**Acceptance Scenarios**:

1. **Given** a user opens the workflow editor, **When** they drag a "Skill" node onto the canvas, **Then** the node appears with configuration options
2. **Given** a Skill node is selected, **When** the user clicks "Browse Skills" in the property panel, **Then** a list of available Skills from `~/.claude/skills/` and `.claude/skills/` is displayed
3. **Given** the user selects an existing Skill from the list, **When** they confirm the selection, **Then** the node's label updates to show the Skill name and the SKILL.md path is stored in node data
4. **Given** a workflow with a configured Skill node is exported, **When** the user executes the exported SlashCommand, **Then** the referenced Skill activates automatically based on its description triggers

---

### User Story 2 - Reference Project-Shared Skill (Priority: P2)

A team member wants to use a project-specific Skill (from `.claude/skills/`) that was committed by another team member to ensure consistent workflow execution across the team.

**Why this priority**: This enables team collaboration and knowledge sharing through version-controlled Skills. It's slightly lower priority than P1 because it builds on the same browsing mechanism but focuses on project-level Skills.

**Independent Test**: Can be tested by checking out a project with Skills in `.claude/skills/`, creating a workflow that references one of those Skills, and verifying team members can use the same workflow without modification.

**Acceptance Scenarios**:

1. **Given** a project has Skills in `.claude/skills/team-skill/`, **When** a user browses available Skills, **Then** both personal and project Skills are listed with clear indicators (e.g., icons or labels showing "Personal" vs "Project")
2. **Given** a user selects a project Skill, **When** they save the workflow, **Then** the Skill reference uses a relative path (`.claude/skills/team-skill/SKILL.md`) to ensure portability across team members' environments
3. **Given** a workflow references a project Skill, **When** a team member without that Skill in their personal directory opens the workflow, **Then** the Skill is still correctly referenced and usable (no broken links)

---

### User Story 3 - Create New Skill from Visual Editor (Priority: P3)

A user wants to create a new Skill directly from the visual editor without manually creating `SKILL.md` files, enabling rapid prototyping of workflow-specific agent capabilities.

**Why this priority**: This is a convenience feature that streamlines Skill creation but is not essential for MVP. Users can still manually create SKILL.md files and use P1/P2 functionality.

**Independent Test**: Can be tested by clicking "Create New Skill" in the Skill node property panel, filling out the form (name, description, instructions), saving, and verifying a new `SKILL.md` file is created in the appropriate directory.

**Acceptance Scenarios**:

1. **Given** a Skill node is selected, **When** the user clicks "Create New Skill" in the property panel, **Then** a dialog opens with fields for Skill name, description, instructions, and allowed-tools
2. **Given** the user fills out the Skill creation form, **When** they choose "Personal" or "Project" scope and click "Save", **Then** a new `SKILL.md` file is created in `~/.claude/skills/[skill-name]/` or `.claude/skills/[skill-name]/` respectively
3. **Given** a new Skill is created, **When** the dialog closes, **Then** the Skill node automatically references the newly created Skill
4. **Given** invalid input (e.g., empty name, special characters), **When** the user attempts to save, **Then** validation errors are displayed with clear guidance

---

### Edge Cases

- **What happens when a referenced Skill file is deleted or moved?**
  The visual editor should detect missing Skill files when loading workflows and display a warning indicator on the Skill node. Users should be prompted to re-select a valid Skill or remove the broken reference.

- **How does the system handle Skill name collisions (same name in personal and project directories)?**
  When browsing Skills, display the full path or a clear indicator (e.g., "personal: my-skill" vs "project: my-skill") to help users distinguish. Allow users to explicitly choose which one to reference. Store the full path in node data to avoid ambiguity.

- **What if the SKILL.md file has invalid YAML frontmatter?**
  During browsing, skip invalid Skills and log a warning. Optionally, display an error message in the browse dialog explaining which Skills couldn't be loaded and why.

- **How does exporting workflows with Skill nodes to `.claude/commands/` work?**
  The exported SlashCommand should include instructions referencing the Skill by name (assuming Skills are model-invoked based on description). The workflow documentation should note the dependency on the Skill being present.

- **What if a user tries to create a Skill with a name that already exists?**
  Display an error message: "A Skill with this name already exists in [directory]. Choose a different name or edit the existing Skill manually." Prevent overwriting existing Skills without explicit confirmation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a new node type "Skill" to the visual editor's node palette alongside existing node types (SubAgent, AskUserQuestion, etc.)
- **FR-002**: Skill node MUST display an icon and label distinguishing it from other node types in the palette and on the canvas
- **FR-003**: System MUST allow users to browse existing Skills from both `~/.claude/skills/` and `.claude/skills/` directories
- **FR-004**: Skill browser MUST display a list of available Skills with their names, descriptions (from YAML frontmatter), and source location (Personal/Project)
- **FR-005**: System MUST validate that selected Skill files contain valid YAML frontmatter with required fields (name, description)
- **FR-006**: Skill node property panel MUST display the referenced Skill's name, description, and full file path
- **FR-007**: System MUST allow users to change the referenced Skill by re-opening the browser and selecting a different Skill
- **FR-008**: System MUST provide a "Create New Skill" button in the Skill node property panel
- **FR-009**: Skill creation dialog MUST include fields for:
  - Skill name (lowercase, hyphens, max 64 chars, validated)
  - Description (max 1024 chars)
  - Instructions (markdown content)
  - Allowed-tools (optional, multi-select from available tool list)
  - Scope (Personal or Project)
- **FR-010**: System MUST create a new directory `~/.claude/skills/[skill-name]/` or `.claude/skills/[skill-name]/` when creating a new Skill
- **FR-011**: System MUST generate a valid `SKILL.md` file with proper YAML frontmatter and markdown content
- **FR-012**: System MUST prevent creating Skills with names that already exist in the target directory
- **FR-013**: Skill node MUST store the full file path to the referenced SKILL.md in its node data
- **FR-014**: System MUST detect when a referenced Skill file is missing or inaccessible and display a warning on the Skill node
- **FR-015**: Exported workflows MUST include documentation noting dependencies on referenced Skills
- **FR-016**: Skill node MUST have exactly 1 input port and 1 output port (similar to SubAgent node behavior)

### Key Entities

- **Skill Node**: A workflow node representing a Claude Code Skill invocation
  - Attributes: node ID, position, referenced Skill path, Skill metadata (name, description)
  - Relationships: Connects to other workflow nodes via input/output ports

- **Skill Reference**: A pointer to a SKILL.md file
  - Attributes: file path (absolute or relative), Skill name, description, scope (personal/project)
  - Validation: Ensures YAML frontmatter is valid and required fields are present

- **Skill Metadata**: Information extracted from SKILL.md frontmatter
  - Attributes: name, description, allowed-tools (optional)
  - Source: Parsed from YAML frontmatter

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a Skill node to a workflow and configure it to reference an existing Skill in under 30 seconds
- **SC-002**: Users can browse and select from at least 10 existing Skills (personal + project) without performance degradation
- **SC-003**: 95% of valid SKILL.md files are correctly parsed and displayed in the Skill browser
- **SC-004**: Users can create a new basic Skill (name, description, simple instructions) in under 2 minutes without leaving the visual editor
- **SC-005**: Workflows with Skill nodes export successfully and include clear documentation of Skill dependencies
- **SC-006**: When a referenced Skill file is missing, users receive a clear warning and can resolve the issue (re-select or remove) within 1 minute

## Assumptions

- Users have basic familiarity with Claude Code Skills and understand the SKILL.md format
- The file system paths `~/.claude/skills/` and `.claude/skills/` are accessible and writable by the extension
- SKILL.md files follow the standard format with YAML frontmatter (as documented in Claude Code Skills documentation)
- The visual editor already supports dynamic node type registration (or can be extended to support it)
- Skill nodes do not require complex branching logic (1 input, 1 output is sufficient for MVP)

## Out of Scope

- Editing existing SKILL.md files from the visual editor (users can manually edit files)
- Advanced Skill features like supporting files (reference.md, scripts/, templates/) in the creation dialog
- Version control integration for Skills (e.g., auto-committing new Skills to git)
- Real-time validation of Skill instructions (checking if instructions are valid Claude prompts)
- Automatic Skill discovery/recommendation based on workflow context
- Importing Skills from remote repositories or marketplaces
