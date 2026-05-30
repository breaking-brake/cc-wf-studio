# Data Model: AI-Assisted Skill Node Generation

**Feature**: 001-ai-skill-generation | **Date**: 2025-11-09

## Core Entities

### SkillReference (Existing - Reused)

**Purpose**: Represents a scanned Skill file with metadata extracted from YAML frontmatter

**Source**: Defined in `src/shared/types/messages.ts`

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skillPath` | string | Yes | Absolute path to SKILL.md file |
| `name` | string | Yes | Skill name from frontmatter |
| `description` | string | Yes | Skill description from frontmatter |
| `scope` | 'personal' \| 'project' | Yes | Skill location (personal or project) |
| `validationStatus` | 'valid' \| 'missing' \| 'invalid' | Yes | File existence/validation status |
| `allowedTools` | string | No | Comma-separated tool list from frontmatter |

**Relationships**:
- Many-to-many with Workflows (one Skill can be used in multiple workflows)
- One-to-one with SKILL.md file

**Validation Rules**:
- `name` must match pattern: `^[a-z0-9-]+$` (lowercase, numbers, hyphens)
- `description` length: 1-1024 characters
- `skillPath` must be absolute path

**State Transitions**:
```
[File Scanned] → validationStatus: 'valid'
[File Not Found] → validationStatus: 'missing'
[YAML Parse Error] → validationStatus: 'invalid'
```

---

### SkillRelevanceScore (New)

**Purpose**: Represents calculated relevance between user description and a Skill

**Source**: Internal to `skill-relevance-matcher.ts`

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skill` | SkillReference | Yes | Reference to the Skill |
| `score` | number | Yes | Relevance score (0.0 ~ 1.0) |
| `matchedKeywords` | string[] | Yes | Keywords that matched between description and Skill |

**Calculation**:
```
score = (matched keywords count) / sqrt(user words count * skill words count)

Where:
- matched keywords = intersection of user tokens and skill tokens
- tokens = lowercase words excluding stopwords (the, a, is, etc.)
```

**Sorting**:
Skills are sorted by:
1. Score (descending)
2. Scope (project first)
3. Name (alphabetical)

**Validation Rules**:
- `score` must be in range [0.0, 1.0]
- `matchedKeywords` can be empty if score is 0.0

---

### EnhancedAIPrompt (New)

**Purpose**: Augmented prompt structure that includes available Skills for AI context

**Source**: Constructed in `ai-generation.ts`

**Structure**:
```typescript
interface EnhancedAIPrompt {
  baseInstructions: string;        // Existing workflow generation instructions
  userDescription: string;          // User's natural language description
  workflowSchema: object;           // Existing workflow-schema.json
  availableSkills: SkillListPrompt; // NEW: Filtered Skills for AI
}

interface SkillListPrompt {
  skills: SkillPromptEntry[];
  count: number;                    // Total available (may exceed displayed)
  displayed: number;                // Number actually in prompt (max 20)
  filterApplied: boolean;           // True if count > displayed
}

interface SkillPromptEntry {
  name: string;                     // Exact Skill name
  description: string;              // Exact Skill description
  scope: 'personal' | 'project';    // Skill scope
}
```

**Token Budget**:
- Base instructions: ~1500 tokens
- User description (max 2000 chars): ~500 tokens
- Workflow schema: ~2000 tokens
- Skills list (20 * 150 tokens): ~3000 tokens
- **Total**: ~7000 tokens (safe under limit)

**Construction Rules**:
1. Filter Skills by relevance score (>= 0.6 threshold)
2. Sort by score (desc), scope (project first), name (alpha)
3. Take top 20 Skills
4. Format as JSON array with name, description, scope only

---

### SkillNodeData (Existing - Verified)

**Purpose**: Node configuration for Skill nodes in workflows

**Source**: Defined in `src/shared/types/workflow-definition.ts`

**Fields**:
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Skill name (must match SkillReference) |
| `description` | string | Yes | - | Skill description |
| `skillPath` | string | Yes | - | Path to SKILL.md (resolved post-generation) |
| `scope` | 'personal' \| 'project' | Yes | - | Skill scope |
| `allowedTools` | string | No | undefined | Tool restrictions from Skill |
| `validationStatus` | 'valid' \| 'missing' \| 'invalid' | Yes | 'valid' | Validation state |
| `outputPorts` | 1 | Yes | 1 | Fixed: always 1 output port |

**Validation Rules** (from `VALIDATION_RULES.SKILL`):
- `name` length: 1-64 characters, pattern: `^[a-z0-9-]+$`
- `description` length: 1-1024 characters
- `outputPorts` must equal 1 (constant)

**Post-Generation Resolution**:
```
1. AI generates: { name, description, scope, validationStatus: 'valid', outputPorts: 1 }
2. System resolves: skillPath = lookup(name, scope) in availableSkills
3. System validates: validationStatus = 'valid' | 'missing' | 'invalid'
```

---

## Data Flows

### Flow 1: Skill Scanning & Filtering

```
[User Opens AI Dialog]
    ↓
[Extension: scanPersonalSkills() + scanProjectSkills()]
    ↓
[SkillReference[] (all available Skills)]
    ↓
[User Enters Description]
    ↓
[calculateRelevance(description, each Skill)]
    ↓
[SkillRelevanceScore[] (sorted by score)]
    ↓
[Filter: score >= 0.6, take top 20]
    ↓
[SkillPromptEntry[] (for AI context)]
```

**Performance Checkpoints**:
- Scan: <500ms for 100 Skills
- Relevance calculation: <200ms for 200 Skills
- Total: <700ms (within budget)

---

### Flow 2: AI Generation with Skills

```
[Filtered SkillPromptEntry[]]
    ↓
[Construct EnhancedAIPrompt]
    ↓
[Execute Claude Code CLI with prompt]
    ↓
[Parse JSON output → Workflow]
    ↓
[For each Skill node in workflow:]
    ↓
[Resolve skillPath from availableSkills[]]
    ↓
[Validate: file exists? YAML valid?]
    ↓
[Update validationStatus]
    ↓
[Return Workflow to Webview]
```

**Error Handling Points**:
- CLI execution failure → GENERATION_FAILED message
- JSON parse error → PARSE_ERROR code
- Skill not found → validationStatus: 'missing'
- YAML malformed → validationStatus: 'invalid'

---

### Flow 3: Validation & Display

```
[Generated Workflow with Skill nodes]
    ↓
[Webview: workflow-store.addGeneratedWorkflow()]
    ↓
[React Flow renders SkillNode components]
    ↓
[For each Skill node:]
    ↓
[Check validationStatus]
    ↓
[If 'missing' or 'invalid':]
    ↓
[Display visual indicator (warning icon, red border)]
    ↓
[Property panel shows error message]
```

**Visual Indicators**:
- `validationStatus: 'valid'` → Normal display
- `validationStatus: 'missing'` → Warning icon, orange border, message: "Skill file not found"
- `validationStatus: 'invalid'` → Error icon, red border, message: "Skill file malformed"

---

## Keyword Matching Algorithm

### Tokenization

**Input**: Raw text string (user description or Skill description)

**Output**: Array of lowercase words excluding stopwords

**Process**:
```typescript
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'to', 'for', 'of', 'in', 'on', 'at',
  'with', 'from', 'by', 'about', 'as', 'into', 'through', 'during',
  'and', 'or', 'but', 'not', 'so', 'than', 'too', 'very'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)                          // Split by whitespace
    .map(word => word.replace(/[^a-z0-9-]/g, '')) // Remove punctuation
    .filter(word => word.length > 2)       // Min length 3 chars
    .filter(word => !STOPWORDS.has(word)); // Remove common words
}
```

**Example**:
```
Input: "Create a workflow to analyze PDF documents and extract data"
Output: ["create", "workflow", "analyze", "pdf", "documents", "extract", "data"]
```

---

### Relevance Scoring

**Inputs**:
- `userTokens`: string[] (tokenized user description)
- `skillTokens`: string[] (pre-tokenized Skill description)

**Output**: number (0.0 ~ 1.0)

**Formula**:
```
score = |userTokens ∩ skillTokens| / sqrt(|userTokens| * |skillTokens|)

Where:
- ∩ = intersection (matched keywords)
- || = cardinality (count)
```

**Example**:
```
User: ["create", "workflow", "analyze", "pdf", "documents", "extract", "data"]
Skill: ["extracts", "text", "metadata", "pdf", "documents", "files"]

Intersection: ["pdf", "documents"] → 2 matches
Score: 2 / sqrt(7 * 6) = 2 / sqrt(42) ≈ 0.31

Interpretation: Low relevance (below 0.6 threshold)
```

**Threshold**:
- `score >= 0.6`: Relevant Skill, include in prompt
- `score < 0.6`: Irrelevant, exclude

**Performance**:
- O(n + m) for tokenization (n = user words, m = skill words)
- O(min(n, m)) for intersection
- **Total**: O(n + m) per Skill
- For 200 Skills: ~200ms (within budget)

---

## Validation Rules (Extended)

### Skill Node Validation

**Rule Set**: Extends existing `VALIDATION_RULES` in `workflow-definition.ts`

**New Rules**:
```typescript
SKILL: {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 64,
  NAME_PATTERN: /^[a-z0-9-]+$/,
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 1024,
  OUTPUT_PORTS: 1,           // Fixed constant
  REQUIRED_FIELDS: ['name', 'description', 'skillPath', 'scope', 'validationStatus', 'outputPorts']
}
```

**Validation Process**:
1. **Structure Validation**: All required fields present
2. **Format Validation**: NAME_PATTERN, length constraints
3. **Semantic Validation**: Skill file exists at skillPath
4. **YAML Validation**: Skill file has valid frontmatter

**Error Messages**:
| Error Condition | Message |
|-----------------|---------|
| Missing required field | "Skill node missing required field: {fieldName}" |
| Invalid name format | "Skill name must be lowercase with hyphens only" |
| Name too long | "Skill name exceeds 64 characters" |
| Description too long | "Skill description exceeds 1024 characters" |
| File not found | "Skill file not found at {skillPath}" |
| YAML parse error | "Skill file has invalid YAML frontmatter: {error}" |

---

## State Management

### Extension State (Temporary)

**Scope**: Within AI generation request lifecycle

**State**:
```typescript
interface AIGenerationState {
  availableSkills: SkillReference[];     // Scanned once at dialog open
  filteredSkills: SkillRelevanceScore[]; // Calculated per generation
  requestId: string;                      // For cancellation tracking
  startTime: number;                      // For performance metrics
}
```

**Lifetime**: Created at dialog open, destroyed at dialog close

**Caching**: No persistent cache (Skills may change between sessions)

---

### Webview State (React)

**Scope**: AiGenerationDialog component state

**State** (P3 only - optional Skill selection):
```typescript
interface DialogState {
  description: string;                    // User input
  availableSkills: SkillPromptEntry[];   // Received from Extension
  selectedSkillNames: Set<string>;        // User-selected Skills (P3)
  isGenerating: boolean;                  // Loading state
  error: string | null;                   // Error message
}
```

**Updates**:
- User types → `description` updates
- Extension sends Skills → `availableSkills` updates
- User checks/unchecks → `selectedSkillNames` updates (P3)
- Generate clicked → `isGenerating = true`
- Response received → `isGenerating = false`, `error` updates

---

## Summary

### Entity Count
- **Reused**: 2 (SkillReference, SkillNodeData)
- **New**: 3 (SkillRelevanceScore, EnhancedAIPrompt, SkillPromptEntry)

### Validation Rules Added
- 7 new rules for Skill nodes (name, description, path, YAML)

### Data Flow Stages
1. Scan & Filter (700ms budget)
2. Generate with Skills (90s total budget)
3. Validate & Display (immediate)

### Performance Targets Met
- Scanning: <500ms ✓
- Keyword matching: <200ms ✓
- Total generation: <90s ✓
- Schema size: <15KB ✓
