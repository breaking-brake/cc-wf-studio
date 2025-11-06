# Research: AI-Assisted Workflow Generation

**Feature**: 001-ai-workflow-generation
**Date**: 2025-11-06
**Status**: Complete

## Research Questions

### Q1: How to execute Claude Code CLI from VSCode Extension?

**Decision**: Use Node.js `child_process.spawn()` with proper error handling and timeout

**Rationale**:
- VSCode extensions run in Node.js environment with full access to `child_process` module
- `spawn()` is preferred over `exec()` for streaming output and better control over process lifecycle
- Timeout can be implemented using `AbortController` (Node 15+) or manual timeout with `kill()`
- Error scenarios (command not found, timeout, non-zero exit) can be handled distinctly

**Alternatives Considered**:
- **exec()**: Simpler API but buffers entire output in memory, no streaming support
- **execFile()**: Similar limitations to exec(), not suitable for potentially long-running AI requests
- **External npm package** (e.g., execa): Adds dependency for minimal benefit, built-in APIs are sufficient

**Implementation Notes**:
```typescript
// Pseudo-code pattern
const process = spawn('claude', ['-p', prompt], {
  timeout: 30000, // 30 seconds
  stdio: ['ignore', 'pipe', 'pipe']
});

process.stdout.on('data', (chunk) => {
  // Accumulate JSON output
});

process.on('error', (err) => {
  // Handle ENOENT (command not found) or other spawn errors
});

process.on('exit', (code) => {
  // Parse accumulated output if code === 0
});
```

**References**:
- Node.js child_process documentation: https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
- VSCode Extension API limitations: Extensions have full Node.js access, no sandboxing

---

### Q2: What format should the workflow schema documentation use?

**Decision**: Custom JSON format optimized for AI context, inspired by JSON Schema but simplified

**Rationale**:
- **Not pure JSON Schema**: Too verbose for AI context window constraints (<10KB target)
- **Custom structure**: Tailored to Claude Code's workflow domain, focusing on essential information
- **Human-readable**: AI should easily understand node types, fields, validation rules without complex dereferencing
- **Example-driven**: Include 3+ complete workflow examples to guide AI generation

**Alternatives Considered**:
- **JSON Schema (strict)**: Industry standard but verbose ($ref, allOf, definitions inflate size)
- **TypeScript definitions**: Not ideal for AI consumption, would need conversion
- **Plain text markdown**: Less structured, harder to parse programmatically if needed

**Schema Structure** (outline):
```json
{
  "schemaVersion": "1.0.0",
  "metadata": {
    "description": "Workflow schema for Claude Code Workflow Studio",
    "maxNodes": 50,
    "supportedNodeTypes": [...]
  },
  "nodeTypes": {
    "start": {
      "description": "...",
      "fields": {...},
      "constraints": {...}
    },
    // ... other node types
  },
  "connectionRules": {
    "forbidden": [
      "Start node cannot have input connections",
      "End node cannot have output connections"
    ]
  },
  "validationRules": [...],
  "examples": [
    {
      "name": "Simple Code Review Workflow",
      "workflow": { /* complete workflow JSON */ }
    },
    // ... more examples
  ]
}
```

**References**:
- JSON Schema spec: https://json-schema.org/specification.html
- Claude Code AI context best practices (internal knowledge)

---

### Q3: How to validate AI-generated workflows before adding to canvas?

**Decision**: Reuse existing workflow validation logic from `src/shared/types/workflow-definition.ts` and add specific checks for AI-generated content

**Rationale**:
- **Existing validation rules**: VALIDATION_RULES constants already define node limits, name patterns, field constraints
- **Type safety**: TypeScript interfaces ensure structural validity at compile time
- **Runtime checks**: Add runtime validation for:
  - Node count <= 50
  - Valid connections (no cycles, no invalid source/target)
  - Required fields present for each node type
  - Field values within constraints (e.g., description length, option counts)

**Alternatives Considered**:
- **JSON Schema validator library** (e.g., ajv): Adds dependency, not needed since we have TypeScript types
- **Manual validation from scratch**: Error-prone, duplicates existing logic
- **No validation**: Unsafe, could crash UI with malformed data

**Validation Strategy**:
```typescript
function validateAiGeneratedWorkflow(workflow: unknown): { valid: boolean; errors: string[] } {
  // 1. Type check: Does it match Workflow interface?
  if (!isWorkflow(workflow)) {
    return { valid: false, errors: ['Invalid workflow structure'] };
  }

  // 2. Node count check
  if (workflow.nodes.length > VALIDATION_RULES.WORKFLOW.MAX_NODES) {
    return { valid: false, errors: ['Exceeds maximum node count'] };
  }

  // 3. Node-specific validation
  for (const node of workflow.nodes) {
    const errors = validateNode(node); // existing logic
    if (errors.length > 0) {
      return { valid: false, errors };
    }
  }

  // 4. Connection validation
  const connectionErrors = validateConnections(workflow.connections, workflow.nodes);
  if (connectionErrors.length > 0) {
    return { valid: false, errors: connectionErrors };
  }

  return { valid: true, errors: [] };
}
```

**References**:
- Existing validation: `src/shared/types/workflow-definition.ts` lines 209-262
- ReactFlow validation patterns: https://reactflow.dev/learn/advanced-use/validation

---

### Q4: Best practices for constructing the AI prompt with schema documentation?

**Decision**: Structured prompt with clear sections: role, task, schema reference, output format, constraints

**Rationale**:
- **Clear role**: "You are an expert workflow designer for Claude Code Workflow Studio"
- **Specific task**: "Generate a valid workflow JSON based on the user's description"
- **Schema reference**: Embed or reference the complete schema documentation
- **Output format**: "Output ONLY valid JSON matching the Workflow interface, no explanation"
- **Constraints**: "Respect maxNodes=50, ensure all connections are valid, include Start and End nodes"

**Alternatives Considered**:
- **Minimal prompt**: Just user description + schema - too vague, produces inconsistent results
- **Few-shot prompting**: Include examples in prompt - increases token usage, schema examples already sufficient
- **Chain-of-thought**: Ask AI to explain then generate - slower, unnecessary for structured output

**Prompt Template** (pseudo-code):
```typescript
const prompt = `
You are an expert workflow designer for Claude Code Workflow Studio.

**Task**: Generate a valid workflow JSON based on the user's natural language description.

**User Description**:
${userDescription}

**Workflow Schema**:
${JSON.stringify(workflowSchema, null, 2)}

**Output Requirements**:
- Output ONLY valid JSON matching the Workflow interface
- Do NOT include explanations, markdown, or additional text
- Ensure the workflow has a Start node and an End node
- Respect the maximum node limit of 50
- All connections must be valid (no connections from End nodes, no connections to Start nodes)
- Node IDs must be unique
- All required fields for each node type must be present

**Output Format**:
\`\`\`json
{
  "id": "generated-workflow-{timestamp}",
  "name": "...",
  "nodes": [...],
  "connections": [...]
  // ... other required fields
}
\`\`\`
`;
```

**References**:
- Claude prompt engineering guide: https://docs.anthropic.com/claude/docs/prompt-engineering
- Structured output techniques (internal knowledge)

---

### Q5: How to handle Claude Code CLI not being installed?

**Decision**: Detect at command execution time with clear error message, provide installation instructions

**Rationale**:
- **No pre-flight check**: Checking for CLI existence at extension activation adds startup latency
- **Lazy detection**: Check only when user attempts to generate a workflow (fail-fast)
- **Clear error message**: "Claude Code CLI not found. Please install it from https://claude.com/claude-code"
- **Installation check**: Use `spawn('which', ['claude'])` or `spawn('where', ['claude'])` on Windows

**Alternatives Considered**:
- **Check at extension activation**: Slows down VSCode startup, annoying if user doesn't use AI generation
- **Bundle Claude Code with extension**: Not feasible, CLI is separately maintained and licensed
- **Prompt for installation path**: Too complex UX, user should install via official method

**Error Handling Strategy**:
```typescript
try {
  const result = await executeClaudeCLI(prompt);
  return result;
} catch (error) {
  if (error.code === 'ENOENT') {
    // Command not found
    return {
      success: false,
      error: 'Claude Code CLI not found. Please install it: https://claude.com/claude-code'
    };
  } else if (error.code === 'TIMEOUT') {
    return {
      success: false,
      error: 'AI generation timed out after 30 seconds. Try simplifying your description.'
    };
  } else {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}
```

**References**:
- Node.js spawn error codes: https://nodejs.org/api/child_process.html#event-error
- VSCode error notification API: https://code.visualstudio.com/api/references/vscode-api#window.showErrorMessage

---

## Summary

All technical unknowns have been resolved:
1. **CLI Execution**: Use Node.js `child_process.spawn()` with timeout and error handling
2. **Schema Format**: Custom JSON optimized for AI context, ~5-10KB size
3. **Validation**: Reuse existing TypeScript types and validation rules, add AI-specific checks
4. **Prompt Engineering**: Structured prompt with role, task, schema, output format, and constraints
5. **Error Handling**: Detect CLI absence at runtime with actionable error messages

No further research needed. Ready to proceed to Phase 1 (Design & Contracts).
