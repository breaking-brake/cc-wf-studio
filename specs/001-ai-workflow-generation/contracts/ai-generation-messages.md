# API Contract: AI Generation Messages (Extension ↔ Webview)

**Feature**: 001-ai-workflow-generation
**Date**: 2025-11-06
**Protocol**: VSCode Webview postMessage API

## Overview

This contract defines the message-passing interface between the Extension Host (Node.js) and Webview (Browser-like) for AI-assisted workflow generation. All messages follow the existing pattern defined in `src/shared/types/messages.ts`.

## Message Types

### 1. GENERATE_WORKFLOW (Webview → Extension)

**Purpose**: Request AI generation of a workflow from user's natural language description

**Direction**: Webview → Extension Host

**Payload**: `GenerateWorkflowPayload`
```typescript
interface GenerateWorkflowPayload {
  userDescription: string;  // Max 2000 characters
  timeoutMs?: number;       // Optional, defaults to 30000
}
```

**Example**:
```typescript
{
  type: 'GENERATE_WORKFLOW',
  requestId: 'req-1730851200000-0.12345',
  payload: {
    userDescription: 'Create a code review workflow that scans code, asks user for priority level, and generates fix suggestions',
    timeoutMs: 30000
  }
}
```

**Validation**:
- `userDescription` must be non-empty string
- `userDescription.length` must be <= 2000
- `timeoutMs` (if provided) must be between 1000 and 60000

**Error Responses**:
- `VALIDATION_ERROR`: If validation fails (e.g., description too long)

---

### 2. GENERATION_SUCCESS (Extension → Webview)

**Purpose**: Return successfully generated workflow

**Direction**: Extension Host → Webview

**Payload**: `GenerationSuccessPayload`
```typescript
interface GenerationSuccessPayload {
  workflow: Workflow;           // Generated workflow matching Workflow interface
  executionTimeMs: number;      // Time taken for CLI execution
  timestamp: string;            // ISO 8601 timestamp
}
```

**Example**:
```typescript
{
  type: 'GENERATION_SUCCESS',
  requestId: 'req-1730851200000-0.12345',
  payload: {
    workflow: {
      id: 'generated-1730851230000',
      name: 'Code Review Workflow',
      nodes: [
        { id: 'start-1', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start' } },
        { id: 'scanner-1', type: 'subAgent', name: 'code-scanner', position: { x: 300, y: 200 }, data: { description: 'Scan code', prompt: '...' } },
        // ... more nodes
      ],
      connections: [
        { id: 'c1', from: 'start-1', to: 'scanner-1', fromPort: 'output', toPort: 'input' },
        // ... more connections
      ],
      version: '1.0.0',
      createdAt: '2025-11-06T10:00:30Z',
      updatedAt: '2025-11-06T10:00:30Z'
    },
    executionTimeMs: 15432,
    timestamp: '2025-11-06T10:00:30Z'
  }
}
```

**Guarantees**:
- `workflow` is a valid `Workflow` object that passes all validation rules
- `workflow.nodes.length` <= 50
- All connections are valid (no cycles, valid source/target)
- Workflow includes at least one Start node and one End node

---

### 3. GENERATION_FAILED (Extension → Webview)

**Purpose**: Report AI generation failure with specific error details

**Direction**: Extension Host → Webview

**Payload**: `GenerationFailedPayload`
```typescript
interface GenerationFailedPayload {
  error: {
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
    message: string;          // User-friendly error message
    details?: string;         // Technical details for debugging (optional)
  };
  executionTimeMs: number;    // Time taken before error occurred
  timestamp: string;          // ISO 8601 timestamp
}
```

**Error Code Definitions**:
| Code | Meaning | User Message Example |
|------|---------|---------------------|
| `COMMAND_NOT_FOUND` | Claude Code CLI not installed or not in PATH | "Cannot connect to Claude Code - please ensure it is installed and running" |
| `TIMEOUT` | CLI execution exceeded timeout (default 30s) | "AI generation timed out after 30 seconds. Try simplifying your description." |
| `PARSE_ERROR` | CLI output was not valid JSON | "Generation failed - please try again or rephrase your description" |
| `VALIDATION_ERROR` | Generated workflow failed validation (e.g., >50 nodes, invalid connections) | "Generated workflow exceeds maximum node limit (50). Please simplify your description." |
| `UNKNOWN_ERROR` | Unexpected error during execution | "An unexpected error occurred. Please try again." |

**Example**:
```typescript
{
  type: 'GENERATION_FAILED',
  requestId: 'req-1730851200000-0.12345',
  payload: {
    error: {
      code: 'COMMAND_NOT_FOUND',
      message: 'Cannot connect to Claude Code - please ensure it is installed and running',
      details: 'spawn claude ENOENT'
    },
    executionTimeMs: 125,
    timestamp: '2025-11-06T10:00:00Z'
  }
}
```

---

### 4. GENERATION_PROGRESS (Extension → Webview) [Optional]

**Purpose**: Report progress during long-running AI generation (future enhancement)

**Direction**: Extension Host → Webview

**Status**: NOT IMPLEMENTED in MVP (reserved for future use)

**Payload**: `GenerationProgressPayload`
```typescript
interface GenerationProgressPayload {
  stage: 'validating' | 'executing' | 'parsing' | 'validating_output';
  message: string;
  percentComplete?: number;
}
```

**Note**: This message type is defined for future enhancement but will not be implemented in the initial version. The MVP uses a simple loading indicator without progress stages.

---

## Message Flow Diagram

```
[User] enters description in AiGenerationDialog
         ↓
[AiGenerationDialog.tsx] calls aiGenerationService.generateWorkflow(description)
         ↓
[ai-generation-service.ts] postMessage(GENERATE_WORKFLOW)
         ↓
[Extension Host] receives message in ai-generation.ts
         ↓
[claude-code-service.ts] executes CLI: spawn('claude', ['-p', prompt])
         ↓
      ┌─ SUCCESS: CLI returns valid JSON ────────────────┐
      │                                                   │
      │  [claude-code-service.ts] parses output          │
      │           ↓                                       │
      │  [validate-workflow.ts] validates workflow       │
      │           ↓                                       │
      │  postMessage(GENERATION_SUCCESS)                 │
      │           ↓                                       │
      │  [AiGenerationDialog.tsx] receives success       │
      │           ↓                                       │
      │  [workflow-store.ts] adds workflow to canvas     │
      │           ↓                                       │
      │  Dialog closes, success notification shown       │
      │                                                   │
      └───────────────────────────────────────────────────┘

      ┌─ FAILURE: CLI error or timeout ───────────────────┐
      │                                                   │
      │  [claude-code-service.ts] catches error          │
      │           ↓                                       │
      │  Maps error to error code + user message         │
      │           ↓                                       │
      │  postMessage(GENERATION_FAILED)                  │
      │           ↓                                       │
      │  [AiGenerationDialog.tsx] receives failure       │
      │           ↓                                       │
      │  [ErrorNotification.tsx] displays error          │
      │           ↓                                       │
      │  User can retry with modified description        │
      │                                                   │
      └───────────────────────────────────────────────────┘
```

## Request/Response Correlation

All messages use the `requestId` field for correlation:

1. Webview generates unique `requestId` when sending `GENERATE_WORKFLOW`
2. Extension includes same `requestId` in response (`GENERATION_SUCCESS` or `GENERATION_FAILED`)
3. Webview matches response to original request using `requestId`

**Request ID Format**: `req-${timestamp}-${random}`
- Example: `req-1730851200000-0.12345`
- Timestamp: `Date.now()`
- Random: `Math.random()`

**Timeout Handling**:
- Webview sets a local timeout (default 35 seconds, 5 seconds more than server timeout)
- If no response received within timeout, display generic error message
- Extension always sends response (either success or failure), so timeout should be rare

## Type Definitions (TypeScript)

**Add to `src/shared/types/messages.ts`**:

```typescript
// Payloads
export interface GenerateWorkflowPayload {
  userDescription: string;
  timeoutMs?: number;
}

export interface GenerationSuccessPayload {
  workflow: Workflow;
  executionTimeMs: number;
  timestamp: string;
}

export interface GenerationFailedPayload {
  error: {
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
  timestamp: string;
}

// Message types
export type WebviewMessage =
  | Message<GenerateWorkflowPayload, 'GENERATE_WORKFLOW'>
  | // ... existing message types
  ;

export type ExtensionMessage =
  | Message<GenerationSuccessPayload, 'GENERATION_SUCCESS'>
  | Message<GenerationFailedPayload, 'GENERATION_FAILED'>
  | // ... existing message types
  ;
```

## Error Handling Strategy

### Webview Side
1. **Input Validation**: Validate description length before sending request
2. **Timeout**: Set local timeout to catch unresponsive Extension
3. **Error Display**: Use existing `ErrorNotification` component with specific messages
4. **Retry**: Allow user to modify description and retry without closing dialog

### Extension Side
1. **Pre-flight Checks**: Validate request payload before executing CLI
2. **CLI Errors**: Map all CLI errors to defined error codes
3. **Validation Errors**: Validate generated workflow before sending success
4. **Logging**: Log all errors to VSCode Output channel for debugging

## Testing Strategy

### Contract Tests
- **Test that Webview sends valid GENERATE_WORKFLOW messages**
  - Validate payload structure matches `GenerateWorkflowPayload`
  - Ensure requestId is unique and well-formed

- **Test that Extension responds with valid GENERATION_SUCCESS messages**
  - Validate payload structure matches `GenerationSuccessPayload`
  - Ensure workflow passes validation
  - Ensure requestId matches original request

- **Test that Extension responds with valid GENERATION_FAILED messages**
  - Validate payload structure matches `GenerationFailedPayload`
  - Ensure error code is one of defined codes
  - Ensure error message is user-friendly

### Integration Tests
- **Test round-trip: Webview → Extension → Webview**
  - Send GENERATE_WORKFLOW, receive GENERATION_SUCCESS
  - Verify workflow appears on canvas

- **Test error scenarios**
  - CLI not found → COMMAND_NOT_FOUND
  - CLI timeout → TIMEOUT
  - Invalid JSON → PARSE_ERROR
  - Workflow >50 nodes → VALIDATION_ERROR

## Backward Compatibility

- All new message types (`GENERATE_WORKFLOW`, `GENERATION_SUCCESS`, `GENERATION_FAILED`) are additions
- No existing message types are modified
- No breaking changes to message structure
- Extension ignores unknown message types (graceful degradation)

## Security Considerations

- **Input Sanitization**: User description is passed to CLI, but CLI is local (no XSS risk)
- **Command Injection**: Use `spawn()` with array arguments (not shell), prevents injection
- **Output Validation**: Parse and validate CLI output before trusting it
- **Timeout Protection**: Prevent indefinite waiting with 30-second timeout

## Performance Considerations

- **Non-blocking UI**: Extension executes CLI asynchronously, Webview UI remains responsive
- **Single Request**: Only one AI generation request active at a time (dialog enforces serialization)
- **Schema Caching**: Workflow schema loaded once and reused for all requests
- **Timeout**: 30-second timeout prevents long waits, user can retry

## Future Enhancements (Out of Scope for MVP)

1. **Progress Updates**: Implement `GENERATION_PROGRESS` messages for long-running requests
2. **Cancellation**: Allow user to cancel in-progress generation
3. **History**: Store previous generation requests for reuse/retry
4. **Batch Generation**: Support multiple workflow generations in parallel
5. **Streaming**: Stream partial workflow updates as AI generates (if supported by Claude Code CLI)
