# Data Model: MCP Node Natural Language Mode

**Feature**: MCP Node Natural Language Mode
**Branch**: `001-mcp-natural-language-mode`
**Phase**: 1 - Design & Contracts
**Date**: 2025-11-16

## Overview

This document defines the data structures for the MCP Node Natural Language Mode feature. The design extends the existing `McpNodeData` interface (defined in `src/shared/types/mcp-node.ts`) with mode-specific fields while maintaining backwards compatibility with existing workflows.

## Entity Relationship

```
McpNode (existing)
  └─ McpNodeData (extended)
       ├─ mode: McpNodeMode
       ├─ naturalLanguageParamConfig? (if mode = 'naturalLanguageParam')
       ├─ fullNaturalLanguageConfig? (if mode = 'fullNaturalLanguage')
       └─ preservedDetailedConfig? (when switching from detailed mode)

Export Metadata (new)
  ├─ ModeExportMetadata
  │   ├─ DetailedModeMetadata (mode = 'detailed')
  │   ├─ NaturalLanguageParamMetadata (mode = 'naturalLanguageParam')
  │   └─ FullNaturalLanguageMetadata (mode = 'fullNaturalLanguage')
```

## Core Data Structures

### 1. McpNodeMode (Enumeration)

**Purpose**: Identifies which configuration mode the MCP node is using.

**Type Definition**:
```typescript
type McpNodeMode = 'detailed' | 'naturalLanguageParam' | 'fullNaturalLanguage';
```

**Values**:
- `'detailed'`: User explicitly configures server, tool, and all parameters (current implementation)
- `'naturalLanguageParam'`: User selects server and tool, describes desired parameters in natural language
- `'fullNaturalLanguage'`: User selects server only, describes entire task in natural language

**Validation Rules**:
- Must be one of the three literal values
- Defaults to `'detailed'` if undefined (backwards compatibility)

**State Transitions**:
```
undefined (v1.2.0) → 'detailed' (on load)
'detailed' ⇄ 'naturalLanguageParam' (via mode selection)
'detailed' ⇄ 'fullNaturalLanguage' (via mode selection)
'naturalLanguageParam' ⇄ 'fullNaturalLanguage' (via mode selection)
```

---

### 2. NaturalLanguageParamConfig (Interface)

**Purpose**: Stores configuration for Natural Language Parameter Mode.

**Type Definition**:
```typescript
interface NaturalLanguageParamConfig {
  /** User's natural language description of desired parameter values */
  description: string;

  /** ISO 8601 timestamp of when this configuration was created */
  timestamp: string;
}
```

**Field Descriptions**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| description | string | Yes | Natural language description of what the user wants the tool to do with specific parameter values | Min length: 10 characters<br>Max length: 10,000 characters |
| timestamp | string | Yes | ISO 8601 timestamp indicating when this configuration was created | Must match format: `YYYY-MM-DDTHH:mm:ss.sssZ` |

**Example**:
```json
{
  "description": "List all S3 buckets in the us-east-1 region",
  "timestamp": "2025-11-16T10:30:00.000Z"
}
```

**Relationships**:
- Used exclusively when `mode = 'naturalLanguageParam'`
- Must be `undefined` when `mode = 'detailed'` or `mode = 'fullNaturalLanguage'`

---

### 3. FullNaturalLanguageConfig (Interface)

**Purpose**: Stores configuration for Full Natural Language Mode.

**Type Definition**:
```typescript
interface FullNaturalLanguageConfig {
  /** User's natural language description of the entire task */
  taskDescription: string;

  /** Snapshot of available tools from the selected server at configuration time */
  availableTools: McpToolReference[];

  /** ISO 8601 timestamp of when this configuration was created */
  timestamp: string;
}
```

**Field Descriptions**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| taskDescription | string | Yes | Natural language description of the entire task the user wants to accomplish | Min length: 20 characters<br>Max length: 10,000 characters |
| availableTools | McpToolReference[] | Yes | List of tools available from the selected MCP server at the time of configuration | Min length: 1 tool<br>Max length: 200 tools |
| timestamp | string | Yes | ISO 8601 timestamp indicating when this configuration was created | Must match format: `YYYY-MM-DDTHH:mm:ss.sssZ` |

**Example**:
```json
{
  "taskDescription": "Find AWS documentation about S3 bucket policies and versioning",
  "availableTools": [
    {
      "serverId": "aws-knowledge-mcp",
      "name": "read_documentation",
      "description": "Fetch and convert AWS docs to markdown",
      "parameters": [ /* ... */ ]
    },
    {
      "serverId": "aws-knowledge-mcp",
      "name": "search_documentation",
      "description": "Search AWS documentation",
      "parameters": [ /* ... */ ]
    }
  ],
  "timestamp": "2025-11-16T10:30:00.000Z"
}
```

**Relationships**:
- Used exclusively when `mode = 'fullNaturalLanguage'`
- Must be `undefined` when `mode = 'detailed'` or `mode = 'naturalLanguageParam'`
- `availableTools` references `McpToolReference` entities (defined in existing `src/shared/types/mcp-node.ts`)

**Rationale for Snapshots**:
- MCP servers can be updated with new tools or parameter schema changes
- Capturing available tools at configuration time ensures export metadata remains valid
- If server unavailable at export time, snapshot provides fallback data

---

### 4. PreservedDetailedConfig (Interface)

**Purpose**: Stores detailed mode configuration when user switches to a natural language mode.

**Type Definition**:
```typescript
interface PreservedDetailedConfig {
  /** Parameter values from Detailed Mode configuration */
  parameterValues: Record<string, unknown>;

  /** ISO 8601 timestamp of when the original detailed config was created */
  timestamp: string;
}
```

**Field Descriptions**:

| Field | Type | Required | Description | Validation Rules |
|-------|------|----------|-------------|------------------|
| parameterValues | Record<string, unknown> | Yes | Key-value pairs of parameter names to their configured values | Must match parameter schema from tool definition |
| timestamp | string | Yes | ISO 8601 timestamp of the original detailed configuration | Must match format: `YYYY-MM-DDTHH:mm:ss.sssZ` |

**Example**:
```json
{
  "parameterValues": {
    "region": "us-east-1",
    "resource_type": "api",
    "filters": ["Lambda", "DynamoDB"]
  },
  "timestamp": "2025-11-16T09:00:00.000Z"
}
```

**Relationships**:
- Created when switching from `mode = 'detailed'` to natural language modes
- Restored when switching back to `mode = 'detailed'`
- Optional field (only present if user has switched modes)

---

### 5. Extended McpNodeData (Interface)

**Purpose**: Extends existing `McpNodeData` to support mode-specific configurations.

**Type Definition**:
```typescript
interface McpNodeData {
  // ========================================
  // Existing fields (from v1.2.0)
  // ========================================

  /** MCP server identifier (from 'claude mcp list') */
  serverId: string;

  /** Tool function name from the MCP server */
  toolName: string;

  /** Human-readable description of the tool's functionality */
  toolDescription: string;

  /** Array of parameter schemas for this tool (immutable, from MCP definition) */
  parameters: ToolParameter[];

  /** User-configured values for the tool's parameters */
  parameterValues: Record<string, unknown>;

  /** Validation state (computed during workflow load) */
  validationStatus: 'valid' | 'missing' | 'invalid';

  /** Number of output ports (fixed at 1 for MCP nodes) */
  outputPorts: 1;

  // ========================================
  // New fields for Natural Language Mode
  // ========================================

  /** Configuration mode (defaults to 'detailed' if undefined) */
  mode?: McpNodeMode;

  /** Natural Language Parameter Mode configuration */
  naturalLanguageParamConfig?: NaturalLanguageParamConfig;

  /** Full Natural Language Mode configuration */
  fullNaturalLanguageConfig?: FullNaturalLanguageConfig;

  /** Preserved detailed configuration (when switching from detailed mode) */
  preservedDetailedConfig?: PreservedDetailedConfig;
}
```

**Field Constraints by Mode**:

| Mode | Required Fields | Optional Fields | Forbidden Fields |
|------|----------------|-----------------|------------------|
| `detailed` | serverId, toolName, toolDescription, parameters, parameterValues | preservedDetailedConfig | naturalLanguageParamConfig, fullNaturalLanguageConfig |
| `naturalLanguageParam` | serverId, toolName, toolDescription, parameters, naturalLanguageParamConfig | preservedDetailedConfig | fullNaturalLanguageConfig |
| `fullNaturalLanguage` | serverId, fullNaturalLanguageConfig | preservedDetailedConfig | toolName (empty string), toolDescription (empty string), naturalLanguageParamConfig |

**Backwards Compatibility**:
- Nodes with `mode = undefined` are treated as `mode = 'detailed'`
- Existing workflows load without migration
- New fields are optional, default values applied on load

---

## Export Metadata Structures

### 6. ModeExportMetadata (Discriminated Union)

**Purpose**: Metadata included in exported slash commands to guide Claude Code interpretation.

**Type Definition**:
```typescript
type ModeExportMetadata =
  | DetailedModeMetadata
  | NaturalLanguageParamMetadata
  | FullNaturalLanguageMetadata;

interface DetailedModeMetadata {
  mode: 'detailed';
  // No additional metadata needed (existing export format)
}

interface NaturalLanguageParamMetadata {
  mode: 'naturalLanguageParam';

  /** Tool name for explicit invocation */
  toolName: string;

  /** Parameter schema (JSON Schema format) */
  parameterSchema: Record<string, unknown>;

  /** User's natural language description */
  userIntent: string;

  /** Interpretation instructions for Claude Code */
  instructions: string;
}

interface FullNaturalLanguageMetadata {
  mode: 'fullNaturalLanguage';

  /** MCP server identifier */
  serverId: string;

  /** List of available tools with their schemas */
  availableTools: Array<{
    name: string;
    description: string;
    parameterSchema: Record<string, unknown>;
  }>;

  /** User's natural language task description */
  userIntent: string;

  /** Interpretation instructions for Claude Code */
  instructions: string;
}
```

**Example - Natural Language Parameter Mode**:
```json
{
  "mode": "naturalLanguageParam",
  "toolName": "get_regional_availability",
  "parameterSchema": {
    "type": "object",
    "properties": {
      "region": { "type": "string" },
      "resource_type": { "type": "string", "enum": ["product", "api", "cfn"] }
    },
    "required": ["region", "resource_type"]
  },
  "userIntent": "List all S3 buckets in us-east-1 region",
  "instructions": "Map this natural language description to the tool's parameters according to the schema above."
}
```

**Example - Full Natural Language Mode**:
```json
{
  "mode": "fullNaturalLanguage",
  "serverId": "aws-knowledge-mcp",
  "availableTools": [
    {
      "name": "read_documentation",
      "description": "Fetch and convert AWS docs to markdown",
      "parameterSchema": { /* ... */ }
    },
    {
      "name": "search_documentation",
      "description": "Search AWS documentation",
      "parameterSchema": { /* ... */ }
    }
  ],
  "userIntent": "Find AWS documentation about S3 bucket policies",
  "instructions": "Select the most appropriate tool from the available tools listed above and set its parameters according to the user's intent."
}
```

**Relationships**:
- Generated during workflow export (by `export-service.ts`)
- Embedded in exported slash command markdown as HTML comments
- Consumed by Claude Code during slash command execution

---

## Validation Rules Summary

### Natural Language Description Validation

| Mode | Field | Min Length | Max Length | Additional Rules |
|------|-------|-----------|-----------|------------------|
| naturalLanguageParam | description | 10 chars | 10,000 chars | Must be non-empty after trim |
| fullNaturalLanguage | taskDescription | 20 chars | 10,000 chars | Must be non-empty after trim |

### Tool List Validation (Full Natural Language Mode)

| Field | Min Items | Max Items | Additional Rules |
|-------|-----------|-----------|------------------|
| availableTools | 1 | 200 | Each tool must have valid schema |

### Timestamp Validation

| Field | Format | Additional Rules |
|-------|--------|------------------|
| timestamp | ISO 8601 | Must be valid date, not future date |

---

## State Transition Rules

### Mode Switching Behavior

**Detailed → Natural Language Parameter**:
1. Preserve current `parameterValues` in `preservedDetailedConfig`
2. Set `mode = 'naturalLanguageParam'`
3. Initialize `naturalLanguageParamConfig` with empty description
4. Clear `fullNaturalLanguageConfig`

**Detailed → Full Natural Language**:
1. Preserve current `parameterValues` in `preservedDetailedConfig`
2. Set `mode = 'fullNaturalLanguage'`
3. Initialize `fullNaturalLanguageConfig` with empty task description
4. Fetch and store `availableTools` from MCP server
5. Clear `toolName`, `toolDescription`, `naturalLanguageParamConfig`

**Natural Language Parameter → Detailed**:
1. Restore `parameterValues` from `preservedDetailedConfig` (if exists)
2. Set `mode = 'detailed'`
3. Preserve `naturalLanguageParamConfig` in temporary field (for re-switching)
4. Clear `fullNaturalLanguageConfig`

**Full Natural Language → Detailed**:
1. Restore `parameterValues` from `preservedDetailedConfig` (if exists)
2. Prompt user to select tool (since toolName was empty)
3. Set `mode = 'detailed'`
4. Preserve `fullNaturalLanguageConfig` in temporary field (for re-switching)
5. Clear `naturalLanguageParamConfig`

**Natural Language Parameter ⇄ Full Natural Language**:
1. Preserve current natural language config in temporary field
2. Switch mode
3. Initialize new mode's config
4. Preserve `preservedDetailedConfig` (if exists)

---

## Data Migration Strategy

**From v1.2.0 to v1.3.0**:
- **No migration required**: New fields are optional
- **Default values applied on load**:
  - `mode` defaults to `'detailed'` if undefined
  - `naturalLanguageParamConfig`, `fullNaturalLanguageConfig`, `preservedDetailedConfig` remain undefined
- **Export compatibility**: Detailed mode nodes export in identical format to v1.2.0

**Version Detection**:
```typescript
function normalizeMcpNodeData(data: McpNodeData): McpNodeData {
  return {
    ...data,
    mode: data.mode ?? 'detailed'  // Apply default
  };
}
```

---

## Error Handling

### Validation Errors

| Error Code | Condition | User-Facing Message |
|-----------|-----------|---------------------|
| MCP_NL_DESC_TOO_SHORT | Natural language description < minimum length | "Natural language description is too short ({length} characters). Please provide at least {min} characters to help Claude Code understand your intent." |
| MCP_NL_DESC_EMPTY | Description is empty or whitespace-only | "Natural language description cannot be empty. Please describe what you want to accomplish." |
| MCP_INVALID_MODE | Mode value not in enum | "Invalid configuration mode. Please select Detailed, Natural Language Parameter, or Full Natural Language mode." |
| MCP_MODE_CONFIG_MISMATCH | Config field doesn't match mode | "Configuration data does not match the selected mode. Please reconfigure the node." |
| MCP_TOOL_LIST_EMPTY | Full NL mode with no available tools | "No tools available from the selected MCP server. Cannot configure Full Natural Language mode." |

### Data Integrity Checks

| Check | Condition | Action |
|-------|-----------|--------|
| Mode-config consistency | Config field present but mode doesn't match | Log warning, clear invalid config field |
| Timestamp validity | Timestamp is future date | Log warning, use current timestamp |
| Tool list staleness | availableTools snapshot > 7 days old | Display warning: "Tool list may be outdated. Server may have new tools." |

---

## Next Steps

With data model defined, proceed to:
1. **contracts/**: Generate JSON schemas for validation
2. **quickstart.md**: Document usage patterns for each mode
3. **Update CLAUDE.md**: Add new type definitions to project context
