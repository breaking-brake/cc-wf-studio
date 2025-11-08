# Quickstart: Using Skill Nodes

**Feature**: 001-skill-node | **Date**: 2025-11-08
**Audience**: End users (workflow designers)

## What is a Skill Node?

A **Skill Node** integrates Claude Code Skills into your visual workflows. Skills are reusable, model-invoked agent capabilities defined in `SKILL.md` files. By adding Skill nodes, you can:

- Reuse existing Skills from `~/.claude/skills/` (personal) or `.claude/skills/` (project)
- Share team knowledge through version-controlled Skills
- Create new Skills directly from the visual editor

## Prerequisites

- Claude Code Workflow Studio extension installed
- (Optional) Existing Skills in `~/.claude/skills/` or `.claude/skills/`

## Basic Usage: Add a Skill Node

### 1. Open the Workflow Editor

1. Open VSCode
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type "Claude Code Workflow Studio: Open Editor"
4. Press Enter

### 2. Add a Skill Node to Canvas

1. In the left **Node Palette**, find the "Skill" node
2. Drag the Skill node onto the canvas
3. The node appears with a default label "Skill (Not Configured)"

### 3. Browse Existing Skills

1. Click the Skill node to select it
2. In the right **Property Panel**, click the "Browse Skills" button
3. A dialog opens showing available Skills:
   - **Personal Skills** (from `~/.claude/skills/`): Marked with a "Personal" badge
   - **Project Skills** (from `.claude/skills/`): Marked with a "Project" badge
4. Each Skill shows:
   - **Name**: The Skill identifier (e.g., `pdf-form-filler`)
   - **Description**: What the Skill does
   - **Scope**: Personal or Project

### 4. Select a Skill

1. Click on a Skill from the list to select it
2. Press Enter or click the "Select" button
3. The Skill node updates to show:
   - Node label changes to Skill name (e.g., "pdf-form-filler")
   - Property panel displays Skill details:
     - **Name**: Skill name
     - **Description**: Skill description
     - **Path**: Full file path to SKILL.md
     - **Scope**: Personal or Project
     - **Allowed Tools**: Tools the Skill can use (if specified)

### 5. Connect the Skill Node

1. Drag from the **output port** (right side) of a previous node to the **input port** (left side) of the Skill node
2. Drag from the Skill node's **output port** to the next node
3. The Skill now participates in your workflow

### 6. Export the Workflow

1. Enter a workflow name in the toolbar
2. Click the "Export" button
3. The workflow is exported to `.claude/commands/[workflow-name].md`
4. The exported file includes:
   - Mermaid flowchart showing the Skill node
   - Skill dependency documentation (which Skills are required)

---

## Advanced: Create a New Skill

If you need a Skill that doesn't exist yet, create it directly from the editor.

### 1. Open Skill Creation Dialog

1. Click an unconfigured Skill node (or click "Browse Skills" and then "Create New Skill")
2. The "Create New Skill" dialog opens

### 2. Fill Out the Form

**Skill Name** (required):
- Lowercase letters, numbers, and hyphens only
- Max 64 characters
- Example: `code-reviewer`, `test-generator`

**Description** (required):
- Brief description of what the Skill does (max 1024 characters)
- Example: "Generates unit tests for TypeScript code"

**Instructions** (required):
- Markdown content with detailed instructions for the AI
- Example:
  ```markdown
  # Test Generator

  Analyze TypeScript code in the provided file and generate comprehensive
  unit tests using Vitest. Follow these guidelines:
  - Test happy paths and edge cases
  - Use descriptive test names
  - Mock external dependencies
  ```

**Allowed Tools** (optional):
- Select which tools the Skill can use
- Common tools: Read, Write, Grep, Glob, Bash, Edit
- Leave empty to allow all tools (requires permission prompts)

**Scope** (required):
- **Personal**: Creates Skill in `~/.claude/skills/[skill-name]/`
  - Only available on your machine
  - Use for experimental or personal workflows
- **Project**: Creates Skill in `.claude/skills/[skill-name]/`
  - Shared with team via Git
  - Use for standard team workflows

### 3. Save the Skill

1. Click "Save" button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. The Skill is created:
   - Directory: `[scope-path]/[skill-name]/`
   - File: `[scope-path]/[skill-name]/SKILL.md`
3. The dialog closes and the Skill node updates to reference the new Skill

---

## Troubleshooting

### "SKILL.md file not found" Warning

**Problem**: The Skill node shows a warning icon and the message "SKILL.md file not found at [path]"

**Causes**:
- The SKILL.md file was deleted
- The file was moved to a different location
- (Project Skills only) The workspace doesn't have the `.claude/skills/` directory

**Solutions**:
1. **Re-select a valid Skill**:
   - Click "Browse Skills" again
   - Choose a different Skill or re-create the missing one
2. **Restore the file**:
   - Check Git history (`git checkout -- .claude/skills/[skill-name]/SKILL.md`)
   - Recreate the file manually
3. **Remove the node**:
   - If the Skill is no longer needed, delete the node from the canvas

### "Invalid YAML frontmatter" Error

**Problem**: Skill browser shows "Invalid YAML frontmatter" for a Skill

**Causes**:
- SKILL.md file is missing required fields (`name:` or `description:`)
- YAML frontmatter is not properly delimited by `---`

**Solutions**:
1. **Edit SKILL.md manually**:
   - Open the file in VSCode
   - Ensure frontmatter follows this format:
     ```yaml
     ---
     name: skill-name
     description: What it does
     ---

     # Markdown content
     ```
2. **Recreate the Skill**:
   - Use "Create New Skill" to generate a valid SKILL.md

### Skill Nodes Don't Appear in Node Palette

**Problem**: The "Skill" node is missing from the left palette

**Causes**:
- Feature not yet implemented (if you're reading this before v0.4.0 release)
- Extension not properly installed

**Solutions**:
1. **Update extension**: Ensure you're using Claude Code Workflow Studio v0.4.0 or later
2. **Restart VSCode**: Close and reopen VSCode
3. **Check extension status**: View → Extensions → Search "Claude Code Workflow Studio"

### Performance: Slow Skill Browsing

**Problem**: The "Browse Skills" dialog takes a long time to load

**Causes**:
- Very large number of Skills (>100)
- Large SKILL.md files (>50KB each)

**Solutions**:
1. **Archive unused Skills**:
   - Move old/unused Skills to a backup directory outside `.claude/skills/`
2. **Split large Skills**:
   - Keep SKILL.md files focused and concise
   - Move detailed documentation to separate files

---

## Best Practices

### 1. Use Project Skills for Team Workflows

When creating Skills that your team will use, choose **Project** scope:
- Skills are version-controlled in Git
- Team members automatically get Skills after `git pull`
- Everyone executes workflows consistently

### 2. Use Personal Skills for Experimentation

When prototyping or testing new workflows, choose **Personal** scope:
- Keep experimental Skills private
- Iterate quickly without affecting team
- Promote to Project scope once stable

### 3. Write Clear Skill Descriptions

The Skill description is crucial for:
- **Discovery**: Helps you find the right Skill in the browser
- **Model Activation**: Claude uses the description to decide when to invoke the Skill
- **Team Understanding**: Clear descriptions help teammates understand Skill purpose

**Good Description Examples**:
- ✅ "Generates unit tests for TypeScript code using Vitest"
- ✅ "Reviews pull requests for security vulnerabilities and best practices"
- ✅ "Fills PDF forms with data from JSON files"

**Bad Description Examples**:
- ❌ "Does stuff" (too vague)
- ❌ "Helper" (doesn't explain what it does)
- ❌ "test" (not descriptive)

### 4. Document Skill Dependencies

When exporting workflows with Skill nodes:
- Review the generated `.claude/commands/[workflow-name].md`
- Verify the Skill dependency section lists all required Skills
- Share this documentation with team members

---

## Examples

### Example 1: Code Review Workflow with Personal Skill

**Scenario**: You have a personal Skill called `code-reviewer` that checks for common bugs.

**Steps**:
1. Drag a "Skill" node onto canvas
2. Click "Browse Skills" → Select `code-reviewer` (Personal)
3. Connect: Start → Skill (code-reviewer) → AskUserQuestion ("Approve changes?") → End
4. Export workflow as `code-review.md`

**Result**: When you run `/code-review`, the `code-reviewer` Skill activates automatically, scans your code, and asks for approval.

### Example 2: Team Workflow with Project Skill

**Scenario**: Your team has a standard Skill for generating API documentation.

**Steps**:
1. Teammate creates Skill in `.claude/skills/api-doc-generator/` and commits to Git
2. You run `git pull` to get the Skill
3. Drag "Skill" node onto canvas
4. Click "Browse Skills" → Select `api-doc-generator` (Project)
5. Connect: Start → Skill (api-doc-generator) → End
6. Export workflow as `generate-docs.md`

**Result**: All team members can run `/generate-docs` and get identical API documentation, following the same standards.

### Example 3: Create Skill from Scratch

**Scenario**: You need a Skill to minify JSON files, but it doesn't exist yet.

**Steps**:
1. Drag "Skill" node onto canvas
2. Click "Browse Skills" → Click "Create New Skill"
3. Fill form:
   - **Name**: `json-minifier`
   - **Description**: "Minifies JSON files by removing whitespace"
   - **Instructions**:
     ```markdown
     # JSON Minifier

     Read JSON files, remove all whitespace, and write minified output.
     ```
   - **Allowed Tools**: Read, Write
   - **Scope**: Personal (for now)
4. Click "Save"
5. The Skill is created at `~/.claude/skills/json-minifier/SKILL.md`
6. Connect to workflow and export

**Result**: You now have a reusable `json-minifier` Skill for future workflows.

---

## Next Steps

- **Learn more about Claude Code Skills**: [Official Documentation](https://code.claude.com/docs/en/skills.md)
- **Explore existing Skills**: Browse community-shared Skills on GitHub
- **Share your Skills**: Commit Project Skills to Git and collaborate with your team
- **Advanced**: Combine Skill nodes with AskUserQuestion and IfElse nodes for dynamic workflows

---

## Feedback

If you encounter issues or have suggestions for improving Skill nodes:
1. Open the Claude Code Workflow Studio repository
2. Create a GitHub Issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)

Your feedback helps make the feature better for everyone!
