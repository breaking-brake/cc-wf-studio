# Developer Quickstart: AI-Assisted Skill Node Generation

**Feature**: 001-ai-skill-generation | **For**: New developers joining this feature

## What This Feature Does

Enhances AI workflow generation by automatically including relevant Skill nodes when users describe workflows. Instead of manually adding Skills after generation, the AI now:

1. Scans available personal/project Skills
2. Filters Skills by relevance to user description (keyword matching)
3. Includes top 20 Skills in AI prompt
4. Generates workflows with Skill nodes pre-configured
5. Validates Skill node references against actual files

**User Benefit**: Faster workflow creation, less manual Skill selection, intelligent Skill recommendations

---

## Prerequisites

Before starting development:

- [ ] Read [spec.md](spec.md) - Understand user requirements and success criteria
- [ ] Read [research.md](research.md) - Understand technical decisions (keyword algorithm, schema format)
- [ ] Read [data-model.md](data-model.md) - Understand data structures and flows
- [ ] Read [contracts/skill-scanning-api.md](contracts/skill-scanning-api.md) - Understand API contracts

**Existing Knowledge Required**:
- TypeScript 5.3 basics
- VSCode Extension API (messaging between Extension Host & Webview)
- React 18.2 (for optional P3 UI changes)
- Existing codebase familiarity:
  - `skill-service.ts` (Skill scanning)
  - `ai-generation.ts` (AI prompt construction)
  - `validate-workflow.ts` (workflow validation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  Webview (React)                            │
│  ├─ AiGenerationDialog (optional P3 UI)    │
│  └─ postMessage(GENERATE_WORKFLOW)          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Extension Host (Node.js)                   │
│  ├─ ai-generation.ts (orchestrator)         │
│  │   ├─ scanPersonalSkills() + scanProject()│
│  │   ├─ filterSkillsByRelevance() [NEW]     │
│  │   ├─ constructPrompt() [MODIFIED]        │
│  │   ├─ executeClaudeCodeCLI()              │
│  │   └─ resolveSkillPaths() [NEW]           │
│  ├─ skill-relevance-matcher.ts [NEW]        │
│  └─ validate-workflow.ts [EXTENDED]         │
└─────────────────────────────────────────────┘
```

**Key Files** (in order of modification):
1. `src/extension/services/skill-relevance-matcher.ts` [NEW]
2. `src/extension/commands/ai-generation.ts` [MODIFY]
3. `src/extension/utils/validate-workflow.ts` [EXTEND]
4. `resources/workflow-schema.json` [VERIFY/UPDATE]
5. `src/webview/src/components/dialogs/AiGenerationDialog.tsx` [P3 ONLY]

---

## Development Workflow (TDD)

### Phase 1: P1 - Core AI Skill Generation (3-5 days)

#### Day 1: Setup & Keyword Matching

**Tasks**:
1. Create `skill-relevance-matcher.ts`
2. Implement `tokenize()` function
3. Implement `calculateSkillRelevance()`
4. Write unit tests for keyword matching

**Test First**:
```typescript
// tests/extension/unit/skill-relevance-matcher.test.ts

describe('tokenize', () => {
  it('should convert to lowercase and remove stopwords', () => {
    expect(tokenize('Create a PDF analyzer'))
      .toEqual(['create', 'pdf', 'analyzer']);
  });

  it('should filter short words (<3 chars)', () => {
    expect(tokenize('To do or not to do'))
      .toEqual(['not']); // 'to', 'do', 'or' filtered
  });
});

describe('calculateSkillRelevance', () => {
  it('should return score between 0.0 and 1.0', () => {
    const result = calculateSkillRelevance(
      'Analyze PDF documents',
      { name: 'pdf-tool', description: 'PDF text extraction', ... }
    );
    expect(result.score).toBeGreaterThanOrEqual(0.0);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it('should return matched keywords', () => {
    const result = calculateSkillRelevance(
      'Analyze PDF documents',
      { name: 'pdf-tool', description: 'PDF text extraction', ... }
    );
    expect(result.matchedKeywords).toContain('pdf');
  });
});
```

**Implementation**:
- Follow algorithm in [data-model.md](data-model.md#keyword-matching-algorithm)
- No external libraries (constraint)
- Target: <1ms per Skill

**Verification**:
```bash
npm run test -- skill-relevance-matcher.test.ts
```

---

#### Day 2: Skill Filtering & Sorting

**Tasks**:
1. Implement `filterSkillsByRelevance()`
2. Handle duplicate Skill names (project > personal)
3. Write unit tests for filtering/sorting

**Test First**:
```typescript
describe('filterSkillsByRelevance', () => {
  it('should filter by threshold', () => {
    const results = filterSkillsByRelevance(
      'PDF analysis',
      mockSkills,
      { threshold: 0.6 }
    );
    results.forEach(r => expect(r.score).toBeGreaterThanOrEqual(0.6));
  });

  it('should limit results to maxResults', () => {
    const results = filterSkillsByRelevance(
      'test',
      mockSkills,
      { maxResults: 5 }
    );
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should prefer project scope for duplicate names', () => {
    const results = filterSkillsByRelevance('data', [
      { name: 'data-tool', scope: 'personal', score: 0.9 },
      { name: 'data-tool', scope: 'project', score: 0.7 }
    ]);
    expect(results[0].skill.scope).toBe('project');
  });

  it('should sort by score desc, then scope, then name', () => {
    const results = filterSkillsByRelevance('test', mockSkills);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i+1].score);
    }
  });
});
```

**Implementation**:
- Use `Array.filter()`, `Array.sort()`
- Deduplicate by name (keep project scope)
- Target: <200ms for 200 Skills

**Verification**:
```bash
npm run test -- skill-relevance-matcher.test.ts
```

---

#### Day 3: Prompt Enhancement

**Tasks**:
1. Modify `ai-generation.ts` to scan Skills
2. Integrate `filterSkillsByRelevance()`
3. Update `constructPrompt()` to include Skills
4. Write integration tests

**Test First**:
```typescript
// tests/extension/integration/ai-skill-generation.test.ts

describe('AI Generation with Skills', () => {
  it('should include Skills in prompt', async () => {
    const prompt = await constructPromptWithSkills(
      'Analyze PDFs',
      mockSchema,
      mockSkills
    );
    expect(prompt).toContain('Available Skills');
    expect(prompt).toContain('pdf-analyzer');
  });

  it('should limit to 20 Skills', async () => {
    const prompt = await constructPromptWithSkills(
      'test',
      mockSchema,
      Array(100).fill(mockSkill) // 100 Skills
    );
    const skillsSection = extractSkillsSection(prompt);
    const skillsArray = JSON.parse(skillsSection);
    expect(skillsArray.length).toBeLessThanOrEqual(20);
  });

  it('should include only name, description, scope', async () => {
    const prompt = await constructPromptWithSkills('test', mockSchema, mockSkills);
    const skillsSection = extractSkillsSection(prompt);
    const skillsArray = JSON.parse(skillsSection);
    skillsArray.forEach(skill => {
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('description');
      expect(skill).toHaveProperty('scope');
      expect(skill).not.toHaveProperty('skillPath'); // Excluded
      expect(skill).not.toHaveProperty('allowedTools'); // Excluded
    });
  });
});
```

**Implementation**:
```typescript
// Modified handleGenerateWorkflow() in ai-generation.ts

async function handleGenerateWorkflow(...) {
  // 1. Scan Skills
  const [personalSkills, projectSkills] = await Promise.all([
    scanPersonalSkills(),
    scanProjectSkills()
  ]);
  const allSkills = [...personalSkills, ...projectSkills];

  // 2. Filter by relevance
  const filteredSkills = filterSkillsByRelevance(
    payload.userDescription,
    allSkills,
    { threshold: 0.6, maxResults: 20 }
  );

  // 3. Construct enhanced prompt
  const prompt = constructPrompt(
    payload.userDescription,
    schemaResult.schema,
    filteredSkills // NEW parameter
  );

  // 4. Execute CLI (unchanged)
  const cliResult = await executeClaudeCodeCLI(prompt, timeout, requestId);

  // 5. Resolve Skill paths (NEW)
  const workflowWithPaths = await resolveSkillPaths(
    parsedOutput as Workflow,
    allSkills
  );

  // 6. Validate & return (unchanged)
  // ...
}
```

**Verification**:
```bash
npm run test -- ai-skill-generation.test.ts
```

---

#### Day 4: Skill Path Resolution & Validation

**Tasks**:
1. Implement `resolveSkillPaths()` in `ai-generation.ts`
2. Extend `validateSkillNode()` in `validate-workflow.ts`
3. Write unit tests for resolution & validation

**Test First**:
```typescript
describe('resolveSkillPaths', () => {
  it('should resolve skillPath for valid Skills', async () => {
    const workflow = {
      nodes: [{
        type: 'skill',
        data: { name: 'pdf-tool', scope: 'personal', validationStatus: 'valid' }
      }]
    };
    const resolved = await resolveSkillPaths(workflow, mockSkills);
    expect(resolved.nodes[0].data.skillPath).toBe('/path/to/skill');
  });

  it('should set validationStatus to missing if Skill not found', async () => {
    const workflow = {
      nodes: [{
        type: 'skill',
        data: { name: 'nonexistent', scope: 'personal' }
      }]
    };
    const resolved = await resolveSkillPaths(workflow, []);
    expect(resolved.nodes[0].data.validationStatus).toBe('missing');
  });
});

describe('validateSkillNode', () => {
  it('should validate required fields', () => {
    const result = validateSkillNode({
      type: 'skill',
      data: { name: 'test' } // Missing fields
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('SKILL_MISSING_FIELD');
  });

  it('should validate name format', () => {
    const result = validateSkillNode({
      type: 'skill',
      data: { name: 'Invalid Name!', ... }
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('SKILL_INVALID_NAME');
  });
});
```

**Implementation**: Follow contracts in [skill-scanning-api.md](contracts/skill-scanning-api.md)

**Verification**:
```bash
npm run test
npm run lint
```

---

#### Day 5: Schema Verification & E2E Testing

**Tasks**:
1. Verify `workflow-schema.json` includes Skill node type
2. Add Skill node documentation if missing
3. Run manual E2E tests (T052-T054 scenarios)

**Schema Check**:
```bash
# Verify Skill node is documented
cat resources/workflow-schema.json | grep -A 20 '"skill"'
```

**If Missing**: Add Skill node section per [research.md Q2](research.md#q2-skill-schema-documentation-format)

**Manual E2E Tests**:
1. Open AI Generation Dialog
2. Enter: "Create a workflow to analyze PDF documents"
3. Verify: Generated workflow includes Skill node (if matching Skill exists)
4. Verify: Skill node has skillPath resolved
5. Verify: validationStatus is 'valid'
6. Test error: Delete Skill file → refresh → validation shows 'missing'

---

### Phase 2: P2 - Validation & Error Handling (1-2 days)

#### Day 6-7: Visual Indicators & Error Messages

**Tasks**:
1. Verify SkillNode component displays validation indicators
2. Add error messages to property panel
3. Test all error scenarios

**Manual Tests**:
- Missing Skill file → orange warning icon, "Skill file not found"
- Invalid YAML → red error icon, "Skill file has invalid YAML"
- Duplicate Skill names → warning message in property panel

**No Code Changes Expected**: Validation indicators already exist in SkillNode component (spec assumption)

---

### Phase 3: P3 - User Skill Selection (Optional - 2-3 days)

**Tasks** (only if P3 is prioritized):
1. Add Skill checkbox list to AiGenerationDialog
2. Pass selected Skills to Extension
3. Filter Skills by user selection
4. Write Webview component tests

**Test First**:
```typescript
describe('AiGenerationDialog - Skill Selection', () => {
  it('should display available Skills as checkboxes', () => {
    render(<AiGenerationDialog availableSkills={mockSkills} />);
    expect(screen.getByRole('checkbox', { name: /pdf-analyzer/ })).toBeInTheDocument();
  });

  it('should default all Skills to checked', () => {
    render(<AiGenerationDialog availableSkills={mockSkills} />);
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => expect(cb).toBeChecked());
  });

  it('should send only selected Skills on generate', async () => {
    const onGenerate = jest.fn();
    render(<AiGenerationDialog onGenerate={onGenerate} />);
    const checkbox = screen.getByRole('checkbox', { name: /skill-2/ });
    userEvent.click(checkbox); // Uncheck
    userEvent.click(screen.getByText('Generate'));
    expect(onGenerate).toHaveBeenCalledWith({
      description: '...',
      selectedSkillNames: ['skill-1', 'skill-3'] // skill-2 excluded
    });
  });
});
```

**Implementation**: Add collapsible "Available Skills" section in AiGenerationDialog.tsx

---

## Common Pitfalls & Solutions

### Pitfall 1: Keyword Matching Too Strict

**Symptom**: No Skills match even for obvious descriptions

**Cause**: Threshold too high (e.g., 0.9) or stopwords list too aggressive

**Solution**:
- Lower threshold to 0.6 (60% match required)
- Review stopwords list - keep it minimal (20-30 words)
- Test with real Skill descriptions

---

### Pitfall 2: Prompt Token Limit Exceeded

**Symptom**: AI generation fails with "context too long" error

**Cause**: Including too many Skills (>20) or full SKILL.md content

**Solution**:
- Enforce 20 Skill limit in `filterSkillsByRelevance()`
- Include only name/description/scope (not allowedTools, skillPath)
- Verify prompt token count <10000 in tests

---

### Pitfall 3: Skill Path Resolution Fails

**Symptom**: validationStatus always 'missing' even when Skill exists

**Cause**: Name/scope mismatch between AI output and scanned Skills

**Solution**:
- Add logging: `console.log('Resolving:', node.data.name, node.data.scope)`
- Verify AI copies name/scope exactly from prompt
- Check case sensitivity (should be lowercase)

---

### Pitfall 4: Duplicate Skills Confuse AI

**Symptom**: AI uses wrong scope or includes both versions

**Cause**: Duplicate handling not applied before prompt construction

**Solution**:
- Call `filterDuplicateSkills()` before `constructPrompt()`
- Verify project scope takes precedence
- Log warning when duplicates detected

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In ai-generation.ts
log('DEBUG', 'Scanned Skills', { count: allSkills.length });
log('DEBUG', 'Filtered Skills', { count: filteredSkills.length, skills: filteredSkills });
log('DEBUG', 'Prompt token count', { tokens: estimateTokenCount(prompt) });
```

**View Logs**:
- VSCode: View → Output → "Claude Code Workflow Studio"

---

### Inspect AI Output

```typescript
// After CLI execution
log('DEBUG', 'Claude Code output', { output: cliResult.output.substring(0, 500) });

// After parsing
log('DEBUG', 'Parsed workflow', { nodeCount: parsedOutput.nodes.length });
```

---

### Test Keyword Matching Manually

```typescript
// Run in Node REPL
const { calculateSkillRelevance } = require('./skill-relevance-matcher');

const score = calculateSkillRelevance(
  'Analyze PDF documents',
  { name: 'pdf-tool', description: 'Extract text from PDF files' }
);
console.log(score); // { score: 0.72, matchedKeywords: ['pdf'] }
```

---

## Performance Monitoring

### Measure Scan Time

```typescript
const scanStart = Date.now();
const allSkills = await scanAllSkills();
log('PERF', 'Skill scanning', { timeMs: Date.now() - scanStart, count: allSkills.length });
```

**Target**: <500ms for 100 Skills

---

### Measure Filter Time

```typescript
const filterStart = Date.now();
const filtered = filterSkillsByRelevance(description, allSkills);
log('PERF', 'Skill filtering', { timeMs: Date.now() - filterStart, count: filtered.length });
```

**Target**: <200ms for 200 Skills

---

## Next Steps After Completion

1. **Run Full Test Suite**:
   ```bash
   npm test
   npm run lint
   ```

2. **Manual E2E Testing**:
   - Follow scenarios in [spec.md](spec.md) User Stories
   - Test all edge cases from [spec.md](spec.md) Edge Cases

3. **Performance Verification**:
   - Measure scan + filter time with 100 Skills
   - Verify total generation <90 seconds

4. **Documentation**:
   - Update [CLAUDE.md](../../../CLAUDE.md) with new Skill generation feature
   - Add usage examples to README

5. **Code Review**:
   - Check Constitution compliance (code quality, tests, UX)
   - Verify no new library dependencies

---

## Questions?

- **Architecture**: See [plan.md](plan.md) Project Structure
- **Data Structures**: See [data-model.md](data-model.md)
- **API Details**: See [contracts/skill-scanning-api.md](contracts/skill-scanning-api.md)
- **Technical Decisions**: See [research.md](research.md)

**Contact**: Refer to project maintainers or file issue in repository
