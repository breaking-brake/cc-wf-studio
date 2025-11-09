# Research & Resolution: AI-Assisted Skill Node Generation

**Feature**: 001-ai-skill-generation | **Date**: 2025-11-09

## Research Questions

### Q1: Keyword Matching Algorithm for Skill Relevance Scoring

**Question**: What algorithm should be used for calculating relevance between user description and Skill descriptions without external libraries?

**Decision**: Simple word overlap scoring with TF weighting

**Rationale**:
- No external library dependencies required (constraint)
- Fast execution (<200ms for 200 Skills)
- Predictable behavior for debugging
- Good enough accuracy for 20-Skill limit (precision matters more than recall)

**Algorithm Details**:
```typescript
// Pseudo-code for relevance scoring
function calculateRelevance(userDescription: string, skillDescription: string): number {
  // 1. Tokenize both strings (split by whitespace, lowercase, remove common words)
  const userWords = tokenize(userDescription);
  const skillWords = tokenize(skillDescription);

  // 2. Calculate word overlap (intersection)
  const commonWords = userWords.filter(word => skillWords.includes(word));

  // 3. Score = (common words count) / sqrt(user words count * skill words count)
  //    This balances precision vs description length
  const score = commonWords.length / Math.sqrt(userWords.length * skillWords.length);

  return score; // Range: 0.0 ~ 1.0
}

// Stopwords to filter: the, a, an, is, are, to, for, of, in, on, at
const STOPWORDS = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'for', 'of', 'in', 'on', 'at']);
```

**Performance Characteristics**:
- Tokenization: O(n) where n = description length
- Filtering: O(m) where m = Skills count
- Total: O(m * k) where k = avg description length (~100 chars)
- Expected: <200ms for 200 Skills with 100-char descriptions

**Alternatives Considered**:
- **Levenshtein distance**: Too slow (O(n*m) per pair), overkill for keyword matching
- **TF-IDF**: Requires corpus analysis, external library preferred
- **Cosine similarity**: Similar complexity to chosen approach but harder to debug

---

### Q2: Skill Schema Documentation Format

**Question**: How should Skill nodes be documented in workflow-schema.json to provide sufficient AI context?

**Decision**: Add dedicated Skill node type section with field descriptions and examples

**Rationale**:
- Skill nodes already exist in workflow-definition.ts (per spec assumption)
- Schema must remain <15KB (current ~11KB, ~4KB budget remaining)
- AI needs clear guidance on when/how to use Skills vs Sub-Agents

**Schema Addition** (JSON):
```json
{
  "nodeTypes": {
    "skill": {
      "description": "Reference a Claude Code Skill (specialized agent capability defined in SKILL.md files). Use when user description matches a Skill's documented purpose.",
      "fields": {
        "name": {
          "type": "string",
          "required": true,
          "description": "Exact Skill name from available Skills list"
        },
        "description": {
          "type": "string",
          "required": true,
          "description": "Exact description from available Skills list"
        },
        "scope": {
          "type": "string",
          "enum": ["personal", "project"],
          "required": true,
          "description": "Skill scope (personal or project)"
        },
        "skillPath": {
          "type": "string",
          "required": false,
          "description": "Auto-resolved by system after generation"
        },
        "allowedTools": {
          "type": "string",
          "required": false,
          "description": "Optional tool restrictions from Skill definition"
        },
        "validationStatus": {
          "type": "string",
          "enum": ["valid", "missing", "invalid"],
          "required": true,
          "default": "valid"
        },
        "outputPorts": {
          "type": "number",
          "value": 1,
          "required": true
        }
      },
      "inputPorts": 1,
      "outputPorts": 1,
      "examples": [
        {
          "id": "skill-1",
          "type": "skill",
          "name": "pdf-analyzer",
          "data": {
            "name": "pdf-analyzer",
            "description": "Extracts text and metadata from PDF documents",
            "scope": "personal",
            "validationStatus": "valid",
            "outputPorts": 1
          }
        }
      ]
    }
  }
}
```

**Size Impact**: ~800 bytes (well within 4KB budget)

**Alternatives Considered**:
- **Inline in existing node types**: Confusing, breaks schema organization
- **External Skill documentation file**: Adds complexity, requires multiple file loads

---

### Q3: Skill Path Resolution Strategy

**Question**: When/how should skillPath be resolved for AI-generated Skill nodes?

**Decision**: Post-generation resolution in ai-generation.ts after validation

**Rationale**:
- AI doesn't know file system paths (only name + scope)
- Resolution requires file system access (Extension Host only)
- Separation of concerns: AI generates semantic references, system resolves paths

**Resolution Logic**:
```typescript
async function resolveSkillPaths(
  workflow: Workflow,
  availableSkills: SkillReference[]
): Promise<Workflow> {
  const skillNodes = workflow.nodes.filter(node => node.type === NodeType.Skill);

  for (const node of skillNodes) {
    const skillData = node.data as SkillNodeData;

    // Find matching Skill from scanned list
    const matchedSkill = availableSkills.find(
      skill => skill.name === skillData.name && skill.scope === skillData.scope
    );

    if (matchedSkill) {
      skillData.skillPath = matchedSkill.skillPath;
      skillData.validationStatus = 'valid';
    } else {
      skillData.validationStatus = 'missing';
    }
  }

  return workflow;
}
```

**Error Handling**:
- If Skill not found → `validationStatus: 'missing'`, user sees visual warning
- If Skill file exists but malformed → `validationStatus: 'invalid'`, detailed error in property panel

**Alternatives Considered**:
- **Pre-generation path inclusion**: AI receives absolute paths (security concern, fragile)
- **Runtime resolution on canvas load**: Slower, requires async node rendering

---

### Q4: Prompt Construction Strategy for Skills

**Question**: How should available Skills be formatted in the AI prompt to maximize effectiveness?

**Decision**: Concise JSON array with name, description, scope only (no paths, no full frontmatter)

**Rationale**:
- Token efficiency: 20 Skills * ~150 tokens/skill = ~3000 tokens (acceptable)
- AI doesn't need internal metadata (allowedTools, skillPath)
- Clear structure for AI to reference

**Prompt Format**:
```typescript
const prompt = `
...existing workflow generation instructions...

**Available Skills** (reference these when user description matches their purpose):
${JSON.stringify(
  filteredSkills.map(skill => ({
    name: skill.name,
    description: skill.description,
    scope: skill.scope
  })),
  null,
  2
)}

**Instructions for Using Skills**:
- Use a Skill node when user description matches a Skill's documented purpose
- Copy name, description, and scope exactly from Available Skills list
- Set validationStatus to "valid" and outputPorts to 1
- Do NOT include skillPath (system resolves automatically)
- Prefer project Skills over personal Skills when both match

...rest of existing instructions...
`;
```

**Token Budget**:
- Base prompt: ~1500 tokens (existing)
- Skills list (20 * 150): ~3000 tokens
- User description (max 2000 chars): ~500 tokens
- Schema (existing): ~2000 tokens
- **Total**: ~7000 tokens (well under Claude's limit)

**Alternatives Considered**:
- **Full SKILL.md content**: Too verbose (~1000 tokens per Skill), exceeds limit
- **Only names list**: Insufficient context for AI to make informed choices
- **Skill descriptions in schema examples**: Redundant, harder to update

---

### Q5: Skill Name Conflict Resolution

**Question**: How should the system handle duplicate Skill names across personal/project scopes?

**Decision**: Prefer project scope in AI generation, warn user in validation

**Rationale**:
- Project Skills represent team consensus (more likely to be correct/maintained)
- Consistent with team collaboration best practices
- User can override by unchecking project Skill in P3 UI

**Implementation**:
```typescript
function filterDuplicateSkills(skills: SkillReference[]): SkillReference[] {
  const uniqueSkills = new Map<string, SkillReference>();

  for (const skill of skills) {
    const existing = uniqueSkills.get(skill.name);

    if (!existing) {
      uniqueSkills.set(skill.name, skill);
    } else if (skill.scope === 'project' && existing.scope === 'personal') {
      // Replace personal with project (project takes precedence)
      uniqueSkills.set(skill.name, skill);
    }
    // Else: keep existing (already project or duplicate project)
  }

  return Array.from(uniqueSkills.values());
}
```

**User Notification** (when conflict detected):
- Display warning in property panel: "Skill 'data-processor' exists in both personal and project scopes. Using project version."
- No blocking error (allows workflow to function)

**Alternatives Considered**:
- **Prompt user to choose**: Interrupts AI generation flow, poor UX
- **Include both in prompt**: Confuses AI, wastes tokens
- **Prefer personal**: Inconsistent with team collaboration goals

---

## Best Practices

### Skill Scanning Performance

**Practice**: Scan Skills once at AI generation dialog open, cache for dialog lifetime

**Justification**:
- Skills rarely change mid-session
- Scanning 200 Skills takes ~500ms (acceptable for one-time cost)
- Avoids re-scanning on every "Generate" click

**Implementation Note**: Invalidate cache if user navigates away from dialog and returns (assume Skills may have changed)

---

### Keyword Matching Optimization

**Practice**: Pre-compute tokenized description for each Skill at scan time

**Justification**:
- Tokenization is O(n), only need to do once per Skill
- Speeds up relevance calculation from O(m*k) to O(m*p) where p = pre-tokenized array lookup

**Implementation**:
```typescript
interface SkillReferenceWithTokens extends SkillReference {
  tokens: string[]; // Pre-computed during scanning
}

// At scan time:
const skillsWithTokens = skills.map(skill => ({
  ...skill,
  tokens: tokenize(skill.description)
}));

// At relevance scoring time:
const userTokens = tokenize(userDescription);
for (const skill of skillsWithTokens) {
  const score = calculateOverlap(userTokens, skill.tokens);
  // ...
}
```

---

### Error Message Clarity

**Practice**: Provide actionable next steps in all Skill-related errors

**Examples**:
- ❌ Bad: "Skill validation failed"
- ✅ Good: "Skill 'pdf-analyzer' not found at ~/.claude/skills/pdf-analyzer/SKILL.md. Please verify the Skill exists or select another Skill from the property panel."

**Error Message Template**:
```
[What happened] + [Why it happened] + [How to fix it]
```

---

## Dependencies Verification

### Existing Infrastructure (No Changes Needed)

✅ **skill-service.ts**: Already implements Skill scanning and YAML parsing
- `scanPersonalSkills()` → returns SkillReference[]
- `scanProjectSkills()` → returns SkillReference[]
- No modifications required

✅ **claude-code-service.ts**: Already executes Claude Code CLI
- `executeClaudeCodeCLI(prompt, timeout)` → returns output
- No modifications required

✅ **validate-workflow.ts**: Already validates workflows
- Extend with 3 new rules for Skill nodes
- Reuse existing validation framework

### New Components (This Feature)

🆕 **skill-relevance-matcher.ts**: Keyword matching algorithm (Q1 decision)
🆕 **Enhanced ai-generation.ts**: Skill list in prompt (Q4 decision), path resolution (Q3 decision)
🆕 **Schema update**: Skill node documentation (Q2 decision)

---

## Summary of Decisions

| Research Area | Decision | Impact |
|--------------|----------|--------|
| Relevance algorithm | Simple word overlap with TF weighting | <200ms, no libraries |
| Schema format | Dedicated Skill node section in workflow-schema.json | +800 bytes |
| Path resolution | Post-generation in ai-generation.ts | Clear separation of concerns |
| Prompt format | JSON array with name/description/scope only | ~3000 tokens for 20 Skills |
| Name conflicts | Prefer project scope, warn user | Team collaboration best practice |

**Total Token Budget**: ~7000 tokens (safe margin under Claude's limit)
**Total Schema Size**: ~11.8KB (safe margin under 15KB limit)
**Performance**: All operations <500ms (meets SC-003 goal of 90s total)

