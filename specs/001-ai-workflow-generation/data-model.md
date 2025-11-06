# Data Model: AI-Assisted Workflow Generation

**Feature**: 001-ai-workflow-generation
**Date**: 2025-11-06
**Related**: [spec.md](spec.md), [research.md](research.md)

## Entity Overview

This feature introduces 3 new entities and reuses 1 existing entity:

1. **WorkflowSchemaDocumentation** (NEW): Machine-readable workflow schema for AI context
2. **AiGenerationRequest** (NEW): User's request to generate a workflow
3. **AiGenerationResponse** (NEW): Result from Claude Code CLI execution
4. **Workflow** (EXISTING): Generated workflow structure (from `workflow-definition.ts`)

## Entity Definitions

### 1. WorkflowSchemaDocumentation

**Purpose**: Comprehensive JSON document describing the workflow data model for AI consumption

**Fields**:
- `schemaVersion`: string (semantic version, e.g., "1.0.0")
- `metadata`: object
  - `description`: string (human-readable description of the schema)
  - `maxNodes`: number (50)
  - `supportedNodeTypes`: string[] (["start", "end", "prompt", "subAgent", "askUserQuestion", "ifElse", "switch", "branch"])
- `nodeTypes`: Record<NodeType, NodeTypeDefinition>
  - NodeTypeDefinition:
    - `description`: string (purpose of this node type)
    - `fields`: Record<string, FieldDefinition>
      - FieldDefinition:
        - `type`: "string" | "number" | "boolean" | "array" | "object"
        - `required`: boolean
        - `description`: string
        - `constraints`: object (optional, e.g., `{ min: 1, max: 100 }`)
        - `defaultValue`: any (optional)
    - `inputPorts`: number | "unlimited"
    - `outputPorts`: number | "variable"
    - `examples`: object[] (sample node data)
- `connectionRules`: object
  - `forbidden`: string[] (natural language rules, e.g., "Start node cannot have input connections")
  - `required`: string[] (e.g., "Every workflow must have exactly one Start node")
- `validationRules`: object
  - `workflow`: object (max nodes, name pattern, etc.)
  - `node`: object (per-type validation)
  - `connection`: object (valid source/target combinations)
- `examples`: WorkflowExample[]
  - WorkflowExample:
    - `name`: string (e.g., "Simple Code Review Workflow")
    - `description`: string (what this workflow demonstrates)
    - `complexity`: "simple" | "medium" | "complex"
    - `workflow`: Workflow (complete valid workflow JSON)

**Relationships**:
- Referenced by `AiGenerationRequest` (schema is embedded in prompt)
- Validates `Workflow` (defines structure that generated workflows must match)

**Validation Rules**:
- Schema version must be valid semantic version (MAJOR.MINOR.PATCH)
- All node types from `NodeType` enum must be documented
- Each field definition must specify type and whether it's required
- At least 3 examples must be provided with varying complexity levels
- Total file size must be <10KB (AI context window constraint)

**Lifecycle**:
- Created: Manually authored and stored at `resources/workflow-schema.json`
- Updated: When workflow schema changes (manual sync required)
- Loaded: Once at extension activation, cached in memory
- Used: Embedded in every AI generation request prompt

---

### 2. AiGenerationRequest

**Purpose**: Represents a user's request to generate a workflow from natural language

**Fields**:
- `id`: string (unique request ID, e.g., `req-${Date.now()}-${Math.random()}`)
- `userDescription`: string (natural language workflow description, max 2000 chars)
- `schema`: WorkflowSchemaDocumentation (reference to loaded schema)
- `timestamp`: Date (when request was created)
- `status`: "pending" | "processing" | "completed" | "failed" (request lifecycle state)
- `timeoutMs`: number (30000, configurable)

**Relationships**:
- Contains reference to `WorkflowSchemaDocumentation`
- Produces `AiGenerationResponse` upon completion

**Validation Rules**:
- `userDescription` must be non-empty and <= 2000 characters
- `id` must be unique within the current session
- `timeoutMs` must be between 1000 and 60000 (1-60 seconds)
- `status` must follow valid state transitions: pending → processing → (completed | failed)

**State Transitions**:
```
pending → processing → completed (success)
                    → failed (error/timeout)
```

**Lifecycle**:
- Created: When user clicks "Generate" button in AiGenerationDialog
- Sent: Extension → Claude Code CLI via `child_process.spawn()`
- Completed: When CLI returns response or timeout occurs
- Disposed: After response is processed and workflow added to canvas

---

### 3. AiGenerationResponse

**Purpose**: Result of Claude Code CLI execution, containing generated workflow or error

**Fields**:
- `requestId`: string (matches `AiGenerationRequest.id`)
- `success`: boolean (true if workflow generated, false if error)
- `workflow`: Workflow | null (generated workflow if success=true)
- `error`: object | null (error details if success=false)
  - `code`: "COMMAND_NOT_FOUND" | "TIMEOUT" | "PARSE_ERROR" | "VALIDATION_ERROR" | "UNKNOWN_ERROR"
  - `message`: string (user-friendly error message)
  - `details`: string (technical details for debugging, optional)
- `executionTimeMs`: number (time taken for CLI execution)
- `timestamp`: Date (when response was received)

**Relationships**:
- Corresponds to one `AiGenerationRequest`
- Contains generated `Workflow` or error information
- Triggers UI updates in Webview (success notification or error display)

**Validation Rules**:
- Exactly one of `workflow` or `error` must be non-null (mutually exclusive)
- If `success=true`, `workflow` must be valid according to `WorkflowSchemaDocumentation`
- If `success=false`, `error.code` must be one of the defined error codes
- `executionTimeMs` must be >= 0

**Error Code Definitions**:
- `COMMAND_NOT_FOUND`: Claude Code CLI not installed or not in PATH
- `TIMEOUT`: CLI execution exceeded 30 seconds
- `PARSE_ERROR`: CLI output was not valid JSON
- `VALIDATION_ERROR`: Generated workflow failed validation (e.g., >50 nodes, invalid connections)
- `UNKNOWN_ERROR`: Unexpected error during execution

**Lifecycle**:
- Created: When CLI process exits or timeout occurs
- Sent: Extension → Webview via postMessage
- Processed: Webview validates and adds workflow to canvas (if success) or displays error
- Disposed: After UI updates complete

---

### 4. Workflow (EXISTING, Reused)

**Purpose**: Complete workflow structure with nodes and connections

**Source**: `src/shared/types/workflow-definition.ts`

**Key Fields** (excerpt):
- `id`: string (unique workflow ID)
- `name`: string (workflow name, generated from user description)
- `description`: string (optional, derived from user description)
- `version`: string (semantic version, e.g., "1.0.0")
- `schemaVersion`: string (indicates compatibility with schema documentation)
- `nodes`: WorkflowNode[] (array of Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch, Branch nodes)
- `connections`: Connection[] (edges between nodes)
- `createdAt`: Date
- `updatedAt`: Date
- `metadata`: WorkflowMetadata (optional tags, author, etc.)

**Usage in AI Generation**:
- AI generates a JSON object matching this interface
- Validation ensures all required fields are present and valid
- Generated workflow is added to canvas via `useWorkflowStore.addNode()` and `useWorkflowStore.setEdges()`

**Validation** (from existing VALIDATION_RULES):
- Max 50 nodes
- Node names must match pattern `/^[a-zA-Z0-9_-]+$/`
- Version must match semantic version pattern
- Connections must be valid (no cycles, no invalid source/target)

---

## Data Flow Diagram

```
User Input (description)
         ↓
[AiGenerationDialog.tsx] ← User clicks "Generate"
         ↓
AiGenerationRequest created
         ↓
[vscode-bridge.ts] postMessage to Extension
         ↓
[ai-generation.ts] Receives request in Extension Host
         ↓
[schema-loader-service.ts] Load WorkflowSchemaDocumentation (cached)
         ↓
[claude-code-service.ts] Construct prompt + Execute CLI
         ↓
      child_process.spawn('claude', ['-p', prompt])
         ↓
      (30s timeout or CLI returns JSON)
         ↓
AiGenerationResponse created
         ↓
[ai-generation.ts] Parse & validate workflow
         ↓
[vscode-bridge.ts] postMessage back to Webview
         ↓
[AiGenerationDialog.tsx] Display result
         ↓
      SUCCESS: [workflow-store.ts] Add workflow to canvas
      FAILURE: [ErrorNotification.tsx] Display error
```

## Storage Strategy

### WorkflowSchemaDocumentation
- **Location**: `resources/workflow-schema.json` (bundled with extension VSIX)
- **Format**: JSON
- **Size**: Target <10KB, optimize for AI context window
- **Caching**: Loaded once at extension activation, stored in memory
- **Persistence**: Static file, manually updated when schema changes

### AiGenerationRequest
- **Location**: In-memory only (Extension Host process)
- **Lifecycle**: Created → Processed → Disposed (not persisted)
- **Concurrency**: Single request at a time (dialog modal enforces serialization)

### AiGenerationResponse
- **Location**: In-memory only (passed from Extension → Webview)
- **Lifecycle**: Created → Sent → Processed → Disposed
- **Logging**: Success/failure logged to VSCode Output channel for debugging

### Workflow (Generated)
- **Location**: Initially in-memory (Zustand store in Webview)
- **Persistence**: User manually saves via "Save" button → `.vscode/workflows/*.json`
- **Format**: JSON (same as manually created workflows)

## Constraints & Invariants

### Invariants
1. **Schema Validity**: WorkflowSchemaDocumentation must always be valid JSON and parseable
2. **Request Uniqueness**: Each AiGenerationRequest.id is unique within a session
3. **Response Correlation**: Every AiGenerationResponse.requestId matches exactly one AiGenerationRequest.id
4. **Workflow Validity**: If AiGenerationResponse.success=true, workflow MUST pass validation
5. **Mutual Exclusivity**: AiGenerationResponse has either workflow or error, never both

### Constraints
1. **Size Limits**:
   - WorkflowSchemaDocumentation: <10KB
   - AiGenerationRequest.userDescription: <=2000 characters
   - Generated Workflow.nodes: <=50 elements

2. **Timeouts**:
   - CLI execution: 30 seconds max
   - Schema loading: 1 second max (file read)

3. **Concurrency**:
   - Only 1 AI generation request active at a time (UI enforces)
   - Schema loaded once and shared across requests

4. **Error Handling**:
   - All CLI errors must map to one of 5 defined error codes
   - All error messages must be user-actionable

## Example Data

### WorkflowSchemaDocumentation (excerpt)
```json
{
  "schemaVersion": "1.0.0",
  "metadata": {
    "description": "Workflow schema for Claude Code Workflow Studio",
    "maxNodes": 50,
    "supportedNodeTypes": ["start", "end", "prompt", "subAgent", "askUserQuestion", "ifElse", "switch"]
  },
  "nodeTypes": {
    "start": {
      "description": "Entry point of the workflow",
      "fields": {
        "label": {
          "type": "string",
          "required": false,
          "description": "Display label for the start node",
          "defaultValue": "Start"
        }
      },
      "inputPorts": 0,
      "outputPorts": 1
    },
    "subAgent": {
      "description": "AI Sub-Agent that executes a task",
      "fields": {
        "description": {
          "type": "string",
          "required": true,
          "description": "What this sub-agent does"
        },
        "prompt": {
          "type": "string",
          "required": true,
          "description": "System prompt for the sub-agent"
        },
        "model": {
          "type": "string",
          "required": false,
          "description": "AI model to use",
          "constraints": { "enum": ["sonnet", "opus", "haiku"] },
          "defaultValue": "sonnet"
        }
      },
      "inputPorts": 1,
      "outputPorts": 1
    }
  },
  "examples": [
    {
      "name": "Simple Data Analysis",
      "complexity": "simple",
      "workflow": {
        "id": "example-001",
        "name": "Data Analysis",
        "nodes": [
          { "id": "start-1", "type": "start", "position": { "x": 100, "y": 200 }, "data": { "label": "Start" } },
          { "id": "agent-1", "type": "subAgent", "name": "analyzer", "position": { "x": 300, "y": 200 }, "data": { "description": "Analyze data", "prompt": "Analyze the provided data and generate insights." } },
          { "id": "end-1", "type": "end", "position": { "x": 500, "y": 200 }, "data": { "label": "End" } }
        ],
        "connections": [
          { "id": "c1", "from": "start-1", "to": "agent-1", "fromPort": "output", "toPort": "input" },
          { "id": "c2", "from": "agent-1", "to": "end-1", "fromPort": "output", "toPort": "input" }
        ],
        "version": "1.0.0",
        "createdAt": "2025-11-06T00:00:00Z",
        "updatedAt": "2025-11-06T00:00:00Z"
      }
    }
  ]
}
```

### AiGenerationRequest
```typescript
{
  id: "req-1730851200000-0.12345",
  userDescription: "Create a code review workflow that scans code, asks user for priority level, and generates fix suggestions",
  schema: { /* WorkflowSchemaDocumentation loaded from file */ },
  timestamp: new Date("2025-11-06T10:00:00Z"),
  status: "pending",
  timeoutMs: 30000
}
```

### AiGenerationResponse (Success)
```typescript
{
  requestId: "req-1730851200000-0.12345",
  success: true,
  workflow: {
    id: "generated-1730851230000",
    name: "Code Review Workflow",
    nodes: [
      { id: "start-1", type: "start", position: { x: 100, y: 200 }, data: { label: "Start" } },
      { id: "scanner-1", type: "subAgent", name: "code-scanner", position: { x: 300, y: 200 }, data: { description: "Scan code for issues", prompt: "Scan the codebase and identify potential issues." } },
      { id: "ask-1", type: "askUserQuestion", name: "priority-check", position: { x: 500, y: 200 }, data: { questionText: "Select priority level", options: [{ label: "Critical", description: "High priority issues only" }, { label: "All", description: "All issues" }], outputPorts: 2 } },
      { id: "fix-gen-1", type: "subAgent", name: "fix-generator", position: { x: 700, y: 200 }, data: { description: "Generate fix suggestions", prompt: "Generate actionable fix suggestions for the identified issues." } },
      { id: "end-1", type: "end", position: { x: 900, y: 200 }, data: { label: "End" } }
    ],
    connections: [
      { id: "c1", from: "start-1", to: "scanner-1", fromPort: "output", toPort: "input" },
      { id: "c2", from: "scanner-1", to: "ask-1", fromPort: "output", toPort: "input" },
      { id: "c3", from: "ask-1", to: "fix-gen-1", fromPort: "branch-0", toPort: "input" },
      { id: "c4", from: "ask-1", to: "fix-gen-1", fromPort: "branch-1", toPort: "input" },
      { id: "c5", from: "fix-gen-1", to: "end-1", fromPort: "output", toPort: "input" }
    ],
    version: "1.0.0",
    createdAt: new Date("2025-11-06T10:00:30Z"),
    updatedAt: new Date("2025-11-06T10:00:30Z")
  },
  error: null,
  executionTimeMs: 15432,
  timestamp: new Date("2025-11-06T10:00:30Z")
}
```

### AiGenerationResponse (Failure)
```typescript
{
  requestId: "req-1730851200000-0.12345",
  success: false,
  workflow: null,
  error: {
    code: "COMMAND_NOT_FOUND",
    message: "Cannot connect to Claude Code - please ensure it is installed and running",
    details: "spawn claude ENOENT"
  },
  executionTimeMs: 125,
  timestamp: new Date("2025-11-06T10:00:00Z")
}
```
