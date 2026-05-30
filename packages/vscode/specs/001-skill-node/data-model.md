# Data Model: Skill Node Integration

**Feature**: 001-skill-node | **Date**: 2025-11-08
**Purpose**: Define all entities, relationships, and validation rules

## Entity Definitions

### 1. SkillNodeData

Represents the data stored within a Skill node in the visual workflow.

**Interface**:
```typescript
interface SkillNodeData {
  /** Skill name (extracted from SKILL.md frontmatter) */
  name: string;

  /** Skill description (extracted from SKILL.md frontmatter) */
  description: string;

  /** Path to SKILL.md file (absolute for personal, relative for project) */
  skillPath: string;

  /** Skill scope: personal or project */
  scope: 'personal' | 'project';

  /** Optional: Allowed tools (extracted from SKILL.md frontmatter) */
  allowedTools?: string;

  /** Validation status (checked when workflow loads) */
  validationStatus: 'valid' | 'missing' | 'invalid';

  /** Number of output ports (always 1 for Skill nodes) */
  outputPorts: 1;
}
```

**Field Constraints**:
- `name`: 1-64 characters, lowercase letters/numbers/hyphens only (validated from SKILL.md)
- `description`: 1-1024 characters (validated from SKILL.md)
- `skillPath`: Valid file path, must point to existing SKILL.md or be marked as 'missing'
- `scope`: Enum: `'personal'` or `'project'`
- `allowedTools`: Optional comma-separated string (e.g., "Read, Write, Bash")
- `validationStatus`:
  - `'valid'`: SKILL.md exists, frontmatter is valid
  - `'missing'`: File not found at skillPath
  - `'invalid'`: File exists but frontmatter is malformed
- `outputPorts`: Always `1` (Skill nodes have 1 input, 1 output)

**Relationships**:
- Belongs to a `WorkflowNode` (extends BaseNode)
- References a physical SKILL.md file on disk

---

### 2. SkillReference

Represents a reference to a Skill file, used in the browser dialog.

**Interface**:
```typescript
interface SkillReference {
  /** Absolute path to SKILL.md file */
  skillPath: string;

  /** Skill name (from frontmatter) */
  name: string;

  /** Skill description (from frontmatter) */
  description: string;

  /** Skill scope: personal or project */
  scope: 'personal' | 'project';

  /** Validation status */
  validationStatus: 'valid' | 'invalid';

  /** Optional: Allowed tools (from frontmatter) */
  allowedTools?: string;
}
```

**Field Constraints**:
- `skillPath`: Absolute path (used for display and selection)
- `name`: Same as SkillNodeData.name
- `description`: Same as SkillNodeData.description
- `scope`: Enum: `'personal'` or `'project'`
- `validationStatus`:
  - `'valid'`: SKILL.md parsed successfully
  - `'invalid'`: Frontmatter missing required fields or malformed

**Usage**:
- Populated by Extension Host when scanning `~/.claude/skills/` and `.claude/skills/`
- Sent to Webview via `SKILL_LIST_LOADED` message
- Displayed in SkillBrowserDialog for user selection

---

### 3. SkillMetadata

Represents data extracted from SKILL.md frontmatter.

**Interface**:
```typescript
interface SkillMetadata {
  /** Skill name (required field in YAML frontmatter) */
  name: string;

  /** Skill description (required field in YAML frontmatter) */
  description: string;

  /** Optional: Allowed tools (optional field in YAML frontmatter) */
  allowedTools?: string;
}
```

**Field Constraints**:
- `name`: Must match YAML frontmatter `name:` field
- `description`: Must match YAML frontmatter `description:` field
- `allowedTools`: Optional, matches YAML frontmatter `allowed-tools:` field

**Extraction Logic**:
```typescript
// Implemented in Extension Host: yaml-parser.ts
function parseSkillFrontmatter(content: string): SkillMetadata | null {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) return null;

  const yaml = match[1];
  const name = yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  const description = yaml.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  const allowedTools = yaml.match(/^allowed-tools:\s*(.+)$/m)?.[1]?.trim();

  // Required fields check
  if (!name || !description) return null;

  return { name, description, allowedTools };
}
```

**Validation Rules**:
- YAML frontmatter must exist (delimited by `---`)
- `name` and `description` are required
- `allowedTools` is optional
- Returns `null` if validation fails

---

### 4. SkillNode

The complete Skill node entity in the workflow graph.

**Interface** (extends BaseNode from workflow-definition.ts):
```typescript
interface SkillNode extends BaseNode {
  type: NodeType.Skill; // New enum value

  data: SkillNodeData;
}

// BaseNode definition (existing):
interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  position: Position;
}
```

**Field Constraints**:
- `id`: Unique within workflow (e.g., "skill-node-abc123")
- `type`: Must be `NodeType.Skill` (new enum value added to workflow-definition.ts)
- `name`: User-friendly label (defaults to Skill name from metadata)
- `position`: `{ x: number, y: number }` coordinates on canvas
- `data`: SkillNodeData (see above)

**Relationships**:
- Connects to other WorkflowNodes via `Connection` entities
- Input ports: 1 (left side)
- Output ports: 1 (right side)

---

### 5. CreateSkillPayload

Payload for creating a new Skill from the visual editor.

**Interface**:
```typescript
interface CreateSkillPayload {
  /** Skill name (lowercase, hyphens, max 64 chars) */
  name: string;

  /** Skill description (max 1024 chars) */
  description: string;

  /** Markdown content for Skill instructions */
  instructions: string;

  /** Optional: Comma-separated allowed tools */
  allowedTools?: string;

  /** Scope: personal or project */
  scope: 'personal' | 'project';
}
```

**Validation Rules**:
- `name`:
  - Pattern: `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only)
  - Min length: 1, Max length: 64
  - Must not conflict with existing Skill in target directory
- `description`:
  - Min length: 1, Max length: 1024
- `instructions`:
  - Min length: 1 (no max length, but should be reasonable for SKILL.md file)
- `allowedTools`:
  - Optional, format: "Tool1, Tool2, Tool3"
  - Valid tool names: Read, Write, Bash, Grep, Glob, Edit, etc. (from VSCode extension tools)
- `scope`:
  - Enum: `'personal'` or `'project'`

**Processing**:
1. Validate all fields
2. Check for name conflicts:
   - Personal scope: Check `~/.claude/skills/[name]/` exists
   - Project scope: Check `.claude/skills/[name]/` exists
3. Create directory: `mkdir -p [scope-path]/[name]/`
4. Generate SKILL.md content:
   ```markdown
   ---
   name: [name]
   description: [description]
   allowed-tools: [allowedTools] (if provided)
   ---

   [instructions]
   ```
5. Write file: `[scope-path]/[name]/SKILL.md`
6. Return success with skillPath

---

## Entity Relationships

```
WorkflowNode (1) ←─── (1) SkillNode
                       │
                       ├─── (1) SkillNodeData
                       │        │
                       │        └─── (0..1) SKILL.md file (disk)
                       │
                       └─── (N) Connection (to other nodes)

Extension Host:
  SkillService ───scans───> SkillReference[] ───parses───> SkillMetadata

Webview:
  SkillBrowserDialog ───displays───> SkillReference[]
  SkillCreationDialog ───generates───> CreateSkillPayload ───creates───> SKILL.md file
```

---

## State Transitions

### Skill Node Lifecycle

```
[Not Created]
    ↓ (User drags Skill node to canvas)
[Unconfigured Node]
    ↓ (User clicks "Browse Skills")
[Browsing Skills] ←──────────────┐
    ↓ (User selects Skill)        │
[Configured: Valid] ───────────────┤
    ↓ (SKILL.md deleted)          │ (User clicks "Browse Skills" again)
[Configured: Missing] ────────────┘
    ↓ (User re-selects valid Skill)
[Configured: Valid]
    ↓ (User exports workflow)
[Exported]
```

### Validation Status Transitions

```
[valid]
    ↓ (File deleted)
[missing]
    ↓ (File restored)
[valid]
    ↓ (Frontmatter corrupted)
[invalid]
    ↓ (Frontmatter fixed)
[valid]
```

---

## Validation Rules

### SkillNodeData Validation

When loading a workflow with Skill nodes:

1. **Path Resolution**:
   - If `scope === 'personal'`: Use absolute path directly
   - If `scope === 'project'`: Resolve relative path from workspace root

2. **File Existence Check**:
   - Check if file exists at resolved path
   - If missing: Set `validationStatus = 'missing'`, display warning

3. **Frontmatter Validation**:
   - Parse YAML frontmatter using `parseSkillFrontmatter()`
   - If parse fails: Set `validationStatus = 'invalid'`, display error
   - If parse succeeds: Set `validationStatus = 'valid'`, update metadata

4. **Name Consistency Check** (optional):
   - Compare `SkillNodeData.name` with parsed `SkillMetadata.name`
   - If mismatch: Log warning (Skill may have been renamed)

### CreateSkillPayload Validation

Before creating a new Skill:

1. **Name Format**:
   - Regex: `^[a-z0-9-]+$`
   - Length: 1-64 characters
   - Error: "Skill name must be lowercase, use hyphens only (max 64 chars)"

2. **Name Collision**:
   - Check if `[scope-path]/[name]/` directory exists
   - Error: "A Skill with this name already exists in [directory]. Choose a different name."

3. **Description Length**:
   - Length: 1-1024 characters
   - Error: "Description must be 1-1024 characters"

4. **Instructions Not Empty**:
   - Length: ≥1 character
   - Error: "Instructions cannot be empty"

5. **Scope Valid**:
   - Must be 'personal' or 'project'
   - Error: "Invalid scope" (should not occur if UI enforces radio buttons)

---

## Example Data

### SkillNodeData (Personal Skill)
```json
{
  "name": "pdf-form-filler",
  "description": "Automatically fills PDF forms with data",
  "skillPath": "/Users/alice/.claude/skills/pdf-form-filler/SKILL.md",
  "scope": "personal",
  "allowedTools": "Read, Write",
  "validationStatus": "valid",
  "outputPorts": 1
}
```

### SkillReference (Project Skill)
```json
{
  "skillPath": "/workspace/myproject/.claude/skills/code-reviewer/SKILL.md",
  "name": "code-reviewer",
  "description": "Reviews code for best practices and bugs",
  "scope": "project",
  "validationStatus": "valid",
  "allowedTools": "Read, Grep, Glob"
}
```

### CreateSkillPayload
```json
{
  "name": "test-generator",
  "description": "Generates unit tests for TypeScript code",
  "instructions": "# Test Generator\n\nAnalyze TypeScript code and generate comprehensive unit tests using Vitest.",
  "allowedTools": "Read, Write",
  "scope": "project"
}
```

---

## Changes to Existing Entities

### workflow-definition.ts Updates

**Add new NodeType**:
```typescript
export enum NodeType {
  SubAgent = 'subAgent',
  AskUserQuestion = 'askUserQuestion',
  Branch = 'branch',
  IfElse = 'ifElse',
  Switch = 'switch',
  Start = 'start',
  End = 'end',
  Prompt = 'prompt',
  Skill = 'skill', // NEW
}
```

**Add SkillNode type**:
```typescript
export interface SkillNode extends BaseNode {
  type: NodeType.Skill;
  data: SkillNodeData;
}

export type WorkflowNode =
  | SubAgentNode
  | AskUserQuestionNode
  | BranchNode
  | IfElseNode
  | SwitchNode
  | StartNode
  | EndNode
  | PromptNode
  | SkillNode; // NEW
```

**Add SkillNodeData interface** (see Entity #1 above)

---

## Database/Storage Considerations

**File System Storage**:
- SKILL.md files stored in `~/.claude/skills/[skill-name]/` or `.claude/skills/[skill-name]/`
- Workflow JSON files (in `.vscode/workflows/`) reference Skills via `SkillNodeData.skillPath`

**Caching Strategy**:
- Extension Host caches scanned SkillReference[] in memory during session
- Cache invalidated on:
  - User manually refreshes browser dialog
  - New Skill created via SkillCreationDialog
  - Workspace change event (if project Skills directory modified)

**Performance**:
- No database queries (file-based storage only)
- File I/O operations asynchronous to avoid blocking UI

---

## Next Steps

1. Generate contracts/skill-messages.ts (Extension ↔ Webview message definitions)
2. Generate quickstart.md (user-facing guide)
3. Proceed to Phase 2: tasks.md (test-first implementation tasks)
