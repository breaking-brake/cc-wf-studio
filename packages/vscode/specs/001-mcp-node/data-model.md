# Data Model: MCP Node Integration

Based on Feature Spec and Research findings for the 001-mcp-node feature.

---

## Entity: McpNode

**Description**: Represents an MCP tool in the workflow canvas. McpNode is a first-class node type that allows users to integrate external AI capabilities from MCP servers into their automation workflows.

**Extends**: BaseNode interface

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID v4) | Yes | Unique identifier for the node |
| `type` | NodeType.Mcp | Yes | Constant value indicating this is an MCP node |
| `name` | string (1-64 chars) | Yes | Display name of the node (e.g., "AWS Regional Availability") |
| `position` | Position {x: number, y: number} | Yes | Canvas coordinates for rendering |
| `data` | McpNodeData | Yes | MCP-specific configuration data |

**TypeScript Definition**:
```typescript
export interface McpNode extends BaseNode {
  type: NodeType.Mcp;
  data: McpNodeData;
}
```

**Validation Rules**:
- **FR-005**: Must create node when tool selected from MCP browser dialog
- **FR-006**: Must store complete tool information in McpNodeData
- **FR-014**: Must support connections to other workflow nodes using standard connection mechanism
- **FR-015**: Visual differentiation from other node types (icon, color, styling)
- **VALIDATION_RULES.MCP.NAME_MIN_LENGTH**: 1 (minimum)
- **VALIDATION_RULES.MCP.NAME_MAX_LENGTH**: 64 (maximum)
- **VALIDATION_RULES.MCP.NAME_PATTERN**: `/^[a-z0-9-]+$/` (lowercase, numbers, hyphens)

**State Transitions**:
- `Created` → `Configured` (when user adds parameters)
- `Configured` → `Valid` (validation succeeds, server is accessible)
- `Configured` → `Missing` (server not found during workflow load)
- `Configured` → `Invalid` (server/tool schema changed)

**Relationships**:
- Inherits from: BaseNode
- Contains: McpNodeData
- Referenced by: Connection (as source or destination)
- Connected to: Other WorkflowNode instances via connections

**Serialization** (in workflow JSON):
```json
{
  "id": "node-uuid-1",
  "type": "mcp",
  "name": "AWS Availability Check",
  "position": { "x": 300, "y": 200 },
  "data": {
    "serverId": "aws-knowledge-mcp",
    "toolName": "aws___get_regional_availability",
    "toolDescription": "Retrieve AWS regional availability information for products",
    "parameters": [...],
    "parameterValues": { "region": "us-east-1", "resource_type": "product" },
    "validationStatus": "valid",
    "outputPorts": 1
  }
}
```

---

## Entity: McpNodeData

**Description**: Encapsulates all MCP-specific configuration data stored with an MCP node. This is the data layer that persists when workflows are saved.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serverId` | string | Yes | Server identifier from MCP list (e.g., "aws-knowledge-mcp") |
| `toolName` | string | Yes | Tool function name (e.g., "aws___get_regional_availability") |
| `toolDescription` | string | Yes | Human-readable description of what the tool does |
| `parameters` | ToolParameter[] | Yes | Array of parameter schemas for this tool (extracted from MCP tool definition) |
| `parameterValues` | ToolParameterValues (Record<string, unknown>) | No | User-configured parameter values; can be empty until user configures them |
| `validationStatus` | 'valid' \| 'missing' \| 'invalid' | Yes | Current validation state (set during workflow load) |
| `outputPorts` | 1 | Yes | Fixed: always 1 output port for MCP nodes |

**TypeScript Definition**:
```typescript
export interface McpNodeData {
  serverId: string;
  toolName: string;
  toolDescription: string;
  parameters: ToolParameter[];
  parameterValues: ToolParameterValues;
  validationStatus: 'valid' | 'missing' | 'invalid';
  outputPorts: 1;
}

export interface ToolParameterValues {
  [paramName: string]: unknown;
}
```

**Validation Rules**:
- **FR-006**: All fields must be present when node is created
- **FR-007**: Parameters array must match MCP tool definition
- **FR-008**: parameterValues must validate against parameter constraints
- **FR-010**: Data must persist when workflows are saved
- **FR-011**: validationStatus must be checked when workflow is loaded

**Data Flow**:
```
MCP Server (via CLI)
    ↓
McpServerDetail (from "claude mcp get")
    ↓
NormalizedMcpTool (parsed tool definition)
    ↓
McpNodeData (extracted into node storage)
    ↓
Workflow JSON (persisted on disk)
    ↓
Workflow Load → Validate → McpNode.validationStatus updated
```

**Notes**:
- `parameterValues` starts empty when node is first created
- `parameters` is read-only (determined by MCP server tool definition)
- `validationStatus` is computed during workflow load (not set by user)
- Node is usable even with `validationStatus: 'invalid'` in editor (visual warning only)

---

## Entity: McpServerReference

**Description**: Represents a configured MCP server that is available to the user. Servers are discovered via the Claude Code CLI (`claude mcp list` / `claude mcp get`).

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Server identifier (e.g., "aws-knowledge-mcp") |
| `displayName` | string | Yes | Human-readable server name (derived from name) |
| `description` | string | No | Short description of server's purpose |
| `scope` | 'user' \| 'project' \| 'enterprise' | Yes | Configuration scope (from "claude mcp get" output) |
| `connectionStatus` | 'connected' \| 'disconnected' | Yes | Whether server is currently accessible |
| `type` | 'stdio' \| 'sse' \| 'http' | Yes | Transport type (from MCP spec) |
| `command` | string | Yes | Executable command (e.g., "npx") |
| `args` | string[] | Yes | Command arguments |
| `environment` | Record<string, string> | No | Environment variables for server |
| `tools` | McpToolReference[] | No | List of available tools (populated on demand) |

**TypeScript Definition**:
```typescript
export interface McpServerReference {
  name: string;
  displayName: string;
  description?: string;
  scope: 'user' | 'project' | 'enterprise';
  connectionStatus: 'connected' | 'disconnected';
  type: 'stdio' | 'sse' | 'http';
  command: string;
  args: string[];
  environment?: Record<string, string>;
  tools?: McpToolReference[];
}
```

**Validation Rules**:
- **FR-001**: Retrieved from Claude Code configuration via `claude mcp list`
- **FR-002**: Must be organized by scope (user, project, enterprise)
- **FR-003**: Tools list populated by `claude mcp get <name>`

**State**:
- `connectionStatus` is determined during MCP server discovery (from CLI health check)
- `tools` array is lazy-loaded when user browses server details
- `scope` is immutable (set during server configuration in Claude Code)

**Relationships**:
- Contains: McpToolReference[] (available tools)
- Referenced by: McpNodeData (via serverId)

**Data Flow in UI**:
```
MCP Browser Dialog
├── List MCP Servers (McpServerReference[])
│   ├── Scope indicator (user/project/enterprise)
│   ├── Connection status indicator
│   └── Tool count
└── Click server → Load tools (McpToolReference[])
    └── Display in server detail view
```

---

## Entity: McpToolReference

**Description**: Represents an available tool provided by an MCP server. Tools are discovered via the Claude Code CLI (`claude mcp get <server-name>`).

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `serverId` | string | Yes | Reference to parent MCP server |
| `toolName` | string | Yes | Tool function name (e.g., "aws___get_regional_availability") |
| `description` | string | Yes | Human-readable description of tool functionality |
| `inputSchema` | MCP InputSchema | Yes | JSON Schema defining tool parameters (from MCP spec) |
| `normalizedParameters` | ToolParameter[] | Yes | Parsed parameter schema for UI rendering |

**TypeScript Definition**:
```typescript
export interface McpToolReference {
  serverId: string;
  toolName: string;
  description: string;
  inputSchema: McpInputSchema;
  normalizedParameters: ToolParameter[];
}

export interface McpInputSchema {
  type: 'object';
  properties: Record<string, unknown>;  // Raw JSON Schema
  required?: string[];
}
```

**Validation Rules**:
- **FR-003**: Derived from MCP server tool definitions
- **FR-004**: Must be selectable from MCP browser dialog
- Parameter schema must be JSON Schema Draft 7 compliant

**Transformation**:
- `inputSchema` (raw) → `normalizedParameters` (normalized for UI)
- Happens during tool discovery phase
- Cached in memory during browser dialog session

**Relationships**:
- Belongs to: McpServerReference (parent)
- Becomes: McpNodeData.parameters (when node is created)

---

## Entity: ToolParameter

**Description**: Represents a single configurable parameter for an MCP tool. Derived from MCP JSON Schema definition and normalized for UI rendering.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Parameter identifier (e.g., "region") |
| `type` | ParameterType | Yes | Data type: string, number, boolean, integer, array, object |
| `description` | string | No | User-friendly description of parameter |
| `required` | boolean | Yes | Whether parameter is mandatory for tool execution |
| `default` | unknown | No | Default value if not provided by user |
| `validation` | ParameterValidation | No | Constraints: minLength, maxLength, pattern, min, max, enum |
| `items` | ToolParameter | No | For arrays: schema of array items |
| `properties` | Record<string, ToolParameter> | No | For objects: schema of nested properties |

**TypeScript Definition**:
```typescript
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  description?: string;
  required: boolean;
  default?: unknown;
  validation?: ParameterValidation;
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ParameterValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;  // Regex pattern
  minimum?: number;  // For numbers
  maximum?: number;  // For numbers
  enum?: (string | number)[];  // Predefined choices
}

export type ParameterType = 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
```

**Validation Rules**:
- **FR-008**: Value must match parameter type
- **FR-008**: Value must satisfy all constraints (enum, min/max, pattern, length)
- **FR-009**: Description must be displayed in property panel

**Complex Type Handling**:

### Array Parameters
- `type: 'array'` with `items: ToolParameter`
- UI renders as list with "Add Item" / "Remove Item" buttons
- Each item validated against `items` schema
- Example: `filters: [string]`

### Enum Parameters
- `validation.enum: [...]` takes precedence
- UI renders as dropdown/select
- Value must be one of enum values

### Object Parameters
- `type: 'object'` with `properties: Record<string, ToolParameter>`
- UI renders as collapsible section
- Each property recursively rendered as ToolParameter
- Example: `config: { apiKey: string, region: string }`

### Nested Complex Types
- Arrays of objects: `type: 'array'` → `items.type: 'object'` → `items.properties`
- Recursively rendered through `ParameterInput` component

**Data Flow**:
```
MCP Tool Definition (JSON Schema)
    ↓
parseToolParameters() function
    ↓
ToolParameter[] array
    ↓
McpNodeData.parameters (stored in node)
    ↓
ParameterForm component (UI rendering)
    ↓
User enters values
    ↓
validateAllParameters() function
    ↓
McpNodeData.parameterValues (persisted)
```

---

## Entity: ToolParameterValues

**Description**: User-configured values for a specific MCP tool's parameters. This is the runtime data that flows from UI to node storage.

**Type Definition**:
```typescript
export interface ToolParameterValues {
  [paramName: string]: unknown;
}
```

**Examples**:
```json
{
  "region": "us-east-1",
  "resource_type": "product",
  "filters": ["EC2", "Lambda"]
}
```

```json
{
  "query": "What is the AWS Regions API?",
  "max_results": 5
}
```

**Validation Rules**:
- **FR-008**: All required parameters must have values
- **FR-008**: All values must validate against parameter type and constraints
- **FR-009**: Invalid values must produce clear error messages

**Data Flow**:
1. User enters value in form input
2. `ParameterInput.onChange()` → `ParameterForm.onChange()`
3. Local state updates (real-time validation shown)
4. User clicks "Save Configuration"
5. `validateAllParameters()` checks all required + optional values
6. If valid: `updateMcpNode()` persists to workflow
7. If invalid: Error messages displayed, prevent save

---

## Validation Rules Matrix

| Rule | Entity | Constraint | Source |
|------|--------|------------|--------|
| FR-001 | McpServerReference | Retrieved from `claude mcp list` | CLI integration |
| FR-002 | McpServerReference | Organized by scope (user/project/enterprise) | CLI integration |
| FR-003 | McpToolReference | Retrieved from `claude mcp get <server>` | CLI integration |
| FR-004 | McpToolReference | Selectable in MCP browser dialog | UI requirement |
| FR-005 | McpNode | Created when tool selected | Node creation logic |
| FR-006 | McpNodeData | Stores server ID, tool name, description, parameters | Storage requirement |
| FR-007 | McpNodeData | Property panel for editing parameters | UI requirement |
| FR-008 | ToolParameterValues | Parameter validation by type and constraints | Validation logic |
| FR-009 | ToolParameter | Descriptions displayed in property panel | UI requirement |
| FR-010 | McpNodeData | Persists in workflow JSON when saved | Serialization |
| FR-011 | McpNode | Validation status checked during workflow load | Validation logic |
| FR-012 | McpNode | validationStatus: valid/missing/invalid | Validation logic |
| FR-013 | McpNodeData | Exported in slash command format | Export logic |
| FR-014 | McpNode | Connectable to other nodes | Connection logic |
| FR-015 | McpNode | Visually differentiated from other node types | Rendering logic |

---

## VALIDATION_RULES Constant (TypeScript)

```typescript
export const VALIDATION_RULES = {
  MCP: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 64,
    NAME_PATTERN: /^[a-z0-9-]+$/,
    DESCRIPTION_MAX_LENGTH: 1024,
    OUTPUT_PORTS: 1,  // Fixed: always 1
  },
  MCP_PARAMETER: {
    STRING_MIN_LENGTH: 0,
    STRING_MAX_LENGTH: 10000,
    NUMBER_MIN: Number.NEGATIVE_INFINITY,
    NUMBER_MAX: Number.POSITIVE_INFINITY,
    ENUM_MAX_VALUES: 100,  // Prevent huge enums from crashing UI
  },
  MCP_TOOL: {
    MAX_PARAMETERS: 50,  // Prevent overly complex tools
    MAX_ENUM_VALUES: 100,
  },
} as const;
```

---

## Error Codes (for Error Handling & i18n)

```typescript
export enum McpNodeErrorCode {
  // Server-related errors
  SERVER_NOT_FOUND = 'MCP_SERVER_NOT_FOUND',
  SERVER_DISCONNECTED = 'MCP_SERVER_DISCONNECTED',
  CLI_NOT_FOUND = 'MCP_CLI_NOT_FOUND',
  CLI_TIMEOUT = 'MCP_CLI_TIMEOUT',

  // Tool-related errors
  TOOL_NOT_FOUND = 'MCP_TOOL_NOT_FOUND',
  TOOL_SCHEMA_INVALID = 'MCP_TOOL_SCHEMA_INVALID',

  // Parameter validation errors
  PARAMETER_INVALID_TYPE = 'MCP_PARAMETER_INVALID_TYPE',
  PARAMETER_REQUIRED = 'MCP_PARAMETER_REQUIRED',
  PARAMETER_CONSTRAINT_VIOLATED = 'MCP_PARAMETER_CONSTRAINT_VIOLATED',
  PARAMETER_ENUM_INVALID = 'MCP_PARAMETER_ENUM_INVALID',

  // Node errors
  NODE_VALIDATION_FAILED = 'MCP_NODE_VALIDATION_FAILED',
  NODE_NOT_FOUND = 'MCP_NODE_NOT_FOUND',
}
```

---

## Relationship Diagram

```
Workflow
├── nodes: WorkflowNode[]
│   ├── McpNode
│   │   ├── id: string (UUID)
│   │   ├── type: NodeType.Mcp
│   │   ├── name: string
│   │   ├── position: Position
│   │   └── data: McpNodeData
│   │       ├── serverId: string → references McpServerReference
│   │       ├── toolName: string → matches McpToolReference
│   │       ├── toolDescription: string
│   │       ├── parameters: ToolParameter[] (from MCP tool definition)
│   │       ├── parameterValues: ToolParameterValues (user-entered)
│   │       ├── validationStatus: 'valid' | 'missing' | 'invalid'
│   │       └── outputPorts: 1
│   └── [Other node types...]
└── connections: Connection[]
    ├── from: string (McpNode.id)
    ├── to: string (other node id)
    └── [Standard connection properties]

MCP Runtime Context (Not persisted in Workflow)
├── availableServers: McpServerReference[]
│   ├── name, displayName, scope, connectionStatus
│   ├── type, command, args, environment
│   └── tools?: McpToolReference[]
│       ├── serverId, toolName, description
│       ├── inputSchema (raw JSON Schema)
│       └── normalizedParameters: ToolParameter[]
```

---

## Serialization Format (Workflow JSON)

```json
{
  "id": "workflow-1",
  "name": "AWS Availability Checker",
  "version": "1.0.0",
  "schemaVersion": "1.1.0",
  "nodes": [
    {
      "id": "node-start",
      "type": "start",
      "name": "Start",
      "position": { "x": 50, "y": 100 },
      "data": { "label": "Start" }
    },
    {
      "id": "node-mcp-1",
      "type": "mcp",
      "name": "Check AWS Availability",
      "position": { "x": 300, "y": 100 },
      "data": {
        "serverId": "aws-knowledge-mcp",
        "toolName": "aws___get_regional_availability",
        "toolDescription": "Retrieve AWS regional availability information for products",
        "parameters": [
          {
            "name": "region",
            "type": "string",
            "required": true,
            "description": "Target AWS region code (e.g., us-east-1)"
          },
          {
            "name": "resource_type",
            "type": "string",
            "required": true,
            "description": "Type of AWS resource to check: 'product'|'api'|'cfn'"
          }
        ],
        "parameterValues": {
          "region": "us-east-1",
          "resource_type": "product"
        },
        "validationStatus": "valid",
        "outputPorts": 1
      }
    },
    {
      "id": "node-end",
      "type": "end",
      "name": "End",
      "position": { "x": 550, "y": 100 },
      "data": { "label": "End" }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "from": "node-start",
      "to": "node-mcp-1",
      "fromPort": "output",
      "toPort": "input"
    },
    {
      "id": "conn-2",
      "from": "node-mcp-1",
      "to": "node-end",
      "fromPort": "output",
      "toPort": "input"
    }
  ],
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

---

## Notes for Implementation

1. **NodeType Extension**: Add `Mcp = 'mcp'` to NodeType enum in workflow-definition.ts
2. **Type Union**: Update WorkflowNode type union to include McpNode
3. **VALIDATION_RULES**: Add MCP and MCP_PARAMETER sections to constants
4. **Backward Compatibility**: Old workflows (schemaVersion < 1.1.0) will not contain MCP nodes
5. **Validation Service**: Extend validate-workflow.ts with `validateMcpNode()` and `validateToolParameters()`
6. **CLI Integration**: Use mcp-service.ts pattern from research.md for CLI execution
7. **UI Components**: Follow Skill node pattern with custom property panel for parameter editing
