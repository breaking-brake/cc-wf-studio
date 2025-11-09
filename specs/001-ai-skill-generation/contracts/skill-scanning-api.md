# API Contract: Skill Scanning & Filtering

**Feature**: 001-ai-skill-generation | **Version**: 1.0.0

## Overview

This contract defines the internal APIs for scanning available Skills and filtering them by relevance to user descriptions. These APIs are used within the Extension Host and are not exposed to external clients.

---

## 1. Skill Scanning (Existing - Reused)

### 1.1 scanPersonalSkills()

**Provider**: `src/extension/services/skill-service.ts` (existing)

**Purpose**: Scan `~/.claude/skills/` directory for SKILL.md files

**Signature**:
```typescript
async function scanPersonalSkills(): Promise<SkillReference[]>
```

**Returns**:
```typescript
interface SkillReference {
  skillPath: string;                        // Absolute path to SKILL.md
  name: string;                             // From YAML frontmatter
  description: string;                      // From YAML frontmatter
  scope: 'personal';                        // Always 'personal'
  validationStatus: 'valid' | 'invalid';    // Based on YAML parse
  allowedTools?: string;                    // From YAML frontmatter (optional)
}
```

**Behavior**:
- Recursively scans `~/.claude/skills/*/SKILL.md`
- Parses YAML frontmatter for each file
- Returns array sorted alphabetically by name
- Skips files without valid YAML

**Errors**:
- Directory not found → returns empty array `[]`
- YAML parse error → sets `validationStatus: 'invalid'`

**Performance**:
- Target: <250ms for 100 Skills
- No caching (Skills may change between scans)

---

### 1.2 scanProjectSkills()

**Provider**: `src/extension/services/skill-service.ts` (existing)

**Purpose**: Scan `.claude/skills/` directory for SKILL.md files

**Signature**:
```typescript
async function scanProjectSkills(): Promise<SkillReference[]>
```

**Returns**: Same as `scanPersonalSkills()` but with `scope: 'project'`

**Behavior**: Same as `scanPersonalSkills()` but different base directory

**Errors**: Same as `scanPersonalSkills()`

**Performance**: Same as `scanPersonalSkills()`

---

## 2. Skill Filtering (New)

### 2.1 calculateSkillRelevance()

**Provider**: `src/extension/services/skill-relevance-matcher.ts` (new)

**Purpose**: Calculate relevance score between user description and Skill description

**Signature**:
```typescript
function calculateSkillRelevance(
  userDescription: string,
  skill: SkillReference
): SkillRelevanceScore
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `userDescription` | string | User's natural language workflow description |
| `skill` | SkillReference | Skill to compare against |

**Returns**:
```typescript
interface SkillRelevanceScore {
  skill: SkillReference;      // Reference to the Skill
  score: number;              // Relevance score (0.0 ~ 1.0)
  matchedKeywords: string[];  // Keywords that matched
}
```

**Algorithm**:
```
1. Tokenize userDescription → userTokens[]
2. Tokenize skill.description → skillTokens[]
3. Calculate intersection → matchedKeywords[]
4. score = |matchedKeywords| / sqrt(|userTokens| * |skillTokens|)
5. Return { skill, score, matchedKeywords }
```

**Example**:
```typescript
const result = calculateSkillRelevance(
  "Create a workflow to analyze PDF documents",
  {
    name: "pdf-analyzer",
    description: "Extracts text and metadata from PDF files",
    scope: "personal",
    // ...
  }
);

// Result:
// {
//   skill: { ... },
//   score: 0.72,
//   matchedKeywords: ["pdf", "analyze"]
// }
```

**Behavior**:
- Case-insensitive matching
- Excludes common stopwords (the, a, is, etc.)
- Minimum word length: 3 characters
- Punctuation stripped before matching

**Performance**: O(n + m) where n = user words, m = skill words

---

### 2.2 filterSkillsByRelevance()

**Provider**: `src/extension/services/skill-relevance-matcher.ts` (new)

**Purpose**: Filter and rank Skills by relevance to user description

**Signature**:
```typescript
function filterSkillsByRelevance(
  userDescription: string,
  availableSkills: SkillReference[],
  options?: FilterOptions
): SkillRelevanceScore[]
```

**Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `userDescription` | string | - | User's workflow description |
| `availableSkills` | SkillReference[] | - | All scanned Skills |
| `options.threshold` | number | 0.6 | Minimum relevance score (0.0 ~ 1.0) |
| `options.maxResults` | number | 20 | Maximum Skills to return |

```typescript
interface FilterOptions {
  threshold?: number;    // Min score (default: 0.6)
  maxResults?: number;   // Max Skills (default: 20)
}
```

**Returns**: Array of `SkillRelevanceScore` sorted by:
1. Score (descending)
2. Scope (project > personal)
3. Name (alphabetical)

**Example**:
```typescript
const filtered = filterSkillsByRelevance(
  "Analyze PDF and extract data",
  allSkills,
  { threshold: 0.6, maxResults: 20 }
);

// Returns top 20 Skills with score >= 0.6, sorted by relevance
```

**Behavior**:
- Calculates relevance for all Skills
- Filters by threshold
- Sorts by score (desc), scope (project first), name (alpha)
- Returns top N results (maxResults)
- If duplicate names exist → prefer project scope

**Duplicate Handling**:
```typescript
// If both exist:
{ name: "data-processor", scope: "personal", score: 0.8 }
{ name: "data-processor", scope: "project", score: 0.7 }

// Returns only project version (even with lower score)
{ name: "data-processor", scope: "project", score: 0.7 }
```

**Performance**:
- Target: <200ms for 200 Skills
- Parallelization: Not required (single-threaded sufficient)

---

## 3. Prompt Enhancement (Modified)

### 3.1 constructPrompt()

**Provider**: `src/extension/commands/ai-generation.ts` (existing - modified)

**Purpose**: Build enhanced AI prompt with Skill context

**Signature** (modified):
```typescript
function constructPrompt(
  userDescription: string,
  schema: object,
  filteredSkills: SkillRelevanceScore[]  // NEW parameter
): string
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `userDescription` | string | User's workflow description |
| `schema` | object | workflow-schema.json content |
| `filteredSkills` | SkillRelevanceScore[] | Top N relevant Skills |

**Returns**: Complete prompt string for Claude Code CLI

**Prompt Structure**:
```text
[1. Base Instructions] (~1500 tokens)
  - Role definition
  - Task description
  - Output requirements

[2. User Description] (~500 tokens)
  **User Description**:
  {userDescription}

[3. Available Skills] (~3000 tokens) <-- NEW SECTION
  **Available Skills** (reference when description matches):
  [
    {
      "name": "pdf-analyzer",
      "description": "Extracts text from PDF documents",
      "scope": "personal"
    },
    ...
  ]

  **Instructions for Using Skills**:
  - Use Skill node when user description matches Skill purpose
  - Copy name, description, scope exactly from list
  - Set validationStatus to "valid" and outputPorts to 1
  - Do NOT include skillPath (resolved automatically)
  - Prefer project Skills over personal when both match

[4. Workflow Schema] (~2000 tokens)
  **Workflow Schema**:
  {schema}

[5. Output Format Requirements] (~500 tokens)
  - JSON structure
  - Required fields
  - Validation rules
```

**Token Budget**:
- Total: ~7500 tokens (safe under Claude's limit)
- Skills section: ~150 tokens per Skill * 20 = ~3000 tokens

**Behavior**:
- Skills array includes top 20 filtered Skills
- Each Skill entry includes only: name, description, scope
- skillPath and allowedTools excluded (internal metadata)
- If fewer than 20 Skills match → includes all matching Skills

**Example Output Snippet**:
```
...existing instructions...

**Available Skills** (use when user description matches their purpose):
[
  {
    "name": "pdf-analyzer",
    "description": "Extracts text and metadata from PDF documents",
    "scope": "personal"
  },
  {
    "name": "data-validator",
    "description": "Validates data against schema rules",
    "scope": "project"
  }
]

**Instructions for Using Skills**:
- Use a Skill node when the user's description matches a Skill's documented purpose
- Copy the name, description, and scope exactly from the Available Skills list above
- Set validationStatus to "valid" and outputPorts to 1
- Do NOT include skillPath in your response (the system will resolve it automatically)
- If both personal and project Skills match, prefer the project Skill

...rest of prompt...
```

---

## 4. Skill Path Resolution (New)

### 4.1 resolveSkillPaths()

**Provider**: `src/extension/commands/ai-generation.ts` (new function)

**Purpose**: Resolve skillPath for AI-generated Skill nodes

**Signature**:
```typescript
async function resolveSkillPaths(
  workflow: Workflow,
  availableSkills: SkillReference[]
): Promise<Workflow>
```

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `workflow` | Workflow | AI-generated workflow (may have unresolved Skill nodes) |
| `availableSkills` | SkillReference[] | All scanned Skills (with paths) |

**Returns**: Modified workflow with resolved skillPath values

**Behavior**:
```typescript
for each node in workflow.nodes:
  if node.type === 'skill':
    matchedSkill = availableSkills.find(
      s => s.name === node.data.name && s.scope === node.data.scope
    )

    if matchedSkill:
      node.data.skillPath = matchedSkill.skillPath
      node.data.validationStatus = matchedSkill.validationStatus
    else:
      node.data.validationStatus = 'missing'
```

**Example**:
```typescript
// Input (AI-generated Skill node):
{
  id: "skill-1",
  type: "skill",
  data: {
    name: "pdf-analyzer",
    description: "Extracts text from PDFs",
    scope: "personal",
    validationStatus: "valid",  // Assumed by AI
    outputPorts: 1
    // skillPath: undefined (not set by AI)
  }
}

// Output (after resolution):
{
  id: "skill-1",
  type: "skill",
  data: {
    name: "pdf-analyzer",
    description: "Extracts text from PDFs",
    scope: "personal",
    skillPath: "/Users/user/.claude/skills/pdf-analyzer/SKILL.md", // Resolved
    validationStatus: "valid",  // Confirmed
    outputPorts: 1
  }
}
```

**Error Handling**:
| Scenario | Behavior |
|----------|----------|
| Skill not found in availableSkills | Set `validationStatus: 'missing'` |
| Skill found but file deleted | Set `validationStatus: 'missing'` |
| YAML parse error | Set `validationStatus: 'invalid'` |

**Performance**: O(n * m) where n = Skill nodes, m = available Skills (~100ms for typical workflows)

---

## 5. Validation (Extended)

### 5.1 validateSkillNode()

**Provider**: `src/extension/utils/validate-workflow.ts` (extended)

**Purpose**: Validate Skill node structure and Skill file existence

**Signature**:
```typescript
function validateSkillNode(node: SkillNode): ValidationResult
```

**Parameters**:
```typescript
interface SkillNode {
  id: string;
  type: 'skill';
  name: string;
  data: SkillNodeData;
}
```

**Returns**:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  code: string;
  message: string;
  field?: string;
}
```

**Validation Checks**:

1. **Required Fields**:
   - name, description, skillPath, scope, validationStatus, outputPorts

2. **Format Validation**:
   - `name`: matches `/^[a-z0-9-]+$/`, length 1-64
   - `description`: length 1-1024
   - `scope`: enum ['personal', 'project']
   - `validationStatus`: enum ['valid', 'missing', 'invalid']
   - `outputPorts`: equals 1

3. **Semantic Validation**:
   - Skill file exists at skillPath
   - YAML frontmatter is valid

**Error Codes**:
| Code | Message | Trigger |
|------|---------|---------|
| `SKILL_MISSING_FIELD` | "Skill node missing required field: {field}" | Required field absent |
| `SKILL_INVALID_NAME` | "Skill name must be lowercase with hyphens only" | Name format mismatch |
| `SKILL_NAME_TOO_LONG` | "Skill name exceeds 64 characters" | Name length > 64 |
| `SKILL_DESC_TOO_LONG` | "Skill description exceeds 1024 characters" | Description length > 1024 |
| `SKILL_FILE_NOT_FOUND` | "Skill file not found at {skillPath}" | File doesn't exist |
| `SKILL_INVALID_YAML` | "Skill file has invalid YAML: {error}" | YAML parse error |
| `SKILL_INVALID_PORTS` | "Skill outputPorts must equal 1" | outputPorts !== 1 |

**Example**:
```typescript
const result = validateSkillNode({
  id: "skill-1",
  type: "skill",
  name: "pdf-analyzer",
  data: {
    name: "Invalid Name!",  // Contains invalid characters
    description: "...",
    scope: "personal",
    validationStatus: "valid",
    outputPorts: 1
  }
});

// Returns:
// {
//   valid: false,
//   errors: [
//     {
//       code: "SKILL_INVALID_NAME",
//       message: "Skill name must be lowercase with hyphens only",
//       field: "name"
//     }
//   ]
// }
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-09 | Initial API contract definition |

---

## Dependencies

### Internal
- `skill-service.ts`: Existing Skill scanning (scanPersonalSkills, scanProjectSkills)
- `ai-generation.ts`: Existing prompt construction (modified)
- `validate-workflow.ts`: Existing validation framework (extended)

### External
- Node.js `fs` module: File system operations
- Node.js `path` module: Path resolution
- VSCode Extension API: No direct usage (file operations only)

---

## Testing Requirements

### Contract Tests
1. **Skill Scanning**: Verify SkillReference structure matches contract
2. **Relevance Calculation**: Verify score range [0.0, 1.0] and keyword matching
3. **Filtering**: Verify sorting order (score > scope > name)
4. **Prompt Construction**: Verify token count < 10000, Skills array format
5. **Path Resolution**: Verify skillPath resolution and error handling
6. **Validation**: Verify all error codes and messages

### Test Data
- Mock SKILL.md files with valid/invalid YAML
- Mock user descriptions with varying complexity
- Edge cases: 0 Skills, 200 Skills, duplicate names

---

## Performance Contracts

| Operation | Target | Measured By |
|-----------|--------|-------------|
| scanPersonalSkills() | <250ms | Execution time for 100 Skills |
| scanProjectSkills() | <250ms | Execution time for 100 Skills |
| calculateSkillRelevance() | <1ms | Per Skill calculation |
| filterSkillsByRelevance() | <200ms | Total for 200 Skills |
| constructPrompt() | <50ms | Prompt string construction |
| resolveSkillPaths() | <100ms | Total for 10 Skill nodes |

**Total Budget**: <700ms for scan + filter + prompt construction
