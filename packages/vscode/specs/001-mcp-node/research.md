# Research: MCP Node Implementation

**Date**: 2025-11-15
**Status**: Complete
**Researcher**: Claude Code Research Analysis

---

## 1. Claude Code MCP CLI Integration

### Decision

Use `claude mcp list` and `claude mcp get <server-name>` CLI commands as the primary interface for MCP server discovery and configuration retrieval. Implement a dedicated `mcp-service.ts` in the Extension Host that wraps these CLI calls via `child_process.spawn()`, following the established pattern from `claude-code-service.ts`.

### Rationale

1. **Simplicity**: The Claude Code CLI provides a clean, documented interface specifically designed for MCP server management. No need to parse configuration files directly.
2. **Consistency**: Using the existing `child_process.spawn()` pattern from `claude-code-service.ts` (which is already proven in the codebase for AI generation) minimizes implementation complexity.
3. **Reliability**: The CLI handles MCP server validation, connection checks, and configuration parsing internally - we don't need to duplicate this logic.
4. **Future-proof**: If Claude Code updates its MCP configuration format or adds new transports, our code automatically benefits from CLI updates.
5. **No new dependencies**: This approach uses only Node.js built-in APIs, avoiding bundle size increases.

### Output Format

#### `claude mcp list` - Text Output

**Command**: `claude mcp list`

**Raw Output Example**:
```
Checking MCP server health...

aws-knowledge-mcp: npx mcp-remote https://knowledge-mcp.global.api.aws - ✓ Connected
```

**Parsed Structure** (for implementation):
```typescript
interface McpServerListEntry {
  name: string;           // "aws-knowledge-mcp"
  command: string;        // "npx" (from the output)
  args: string;           // "mcp-remote https://knowledge-mcp.global.api.aws"
  status: 'connected' | 'disconnected' | 'error';  // "✓ Connected"
  scope?: 'user' | 'project' | 'enterprise';       // Inferred if available
}
```

**Parsing Logic**:
- Split output by lines
- Skip "Checking MCP server health..." header
- Parse pattern: `{name}: {command} {args} - {status}`
- Extract check mark (✓) for connected status
- Use regex: `/^([^:]+):\s+(.+?)\s+(\-\s+)(.*)$/gm`

#### `claude mcp get <server-name>` - Detailed Output

**Command**: `claude mcp get aws-knowledge-mcp`

**Raw Output Example**:
```
aws-knowledge-mcp:
  Scope: User config (available in all your projects)
  Status: ✓ Connected
  Type: stdio
  Command: npx
  Args: mcp-remote https://knowledge-mcp.global.api.aws
  Environment:

To remove this server, run: claude mcp remove "aws-knowledge-mcp" -s user
```

**Parsed Structure** (for implementation):
```typescript
interface McpServerDetail {
  name: string;                      // "aws-knowledge-mcp"
  scope: 'user' | 'project' | 'enterprise';  // "user" (extracted from "User config")
  status: 'connected' | 'disconnected';
  type: 'stdio' | 'sse' | 'http';   // "stdio"
  command: string;                   // "npx"
  args: string[];                    // ["mcp-remote", "https://knowledge-mcp.global.api.aws"]
  environment?: Record<string, string>;  // Empty if not set
  removeCommand?: string;            // For future use
}
```

**Parsing Logic**:
- Parse key-value pairs with indentation (2 spaces per level)
- Extract scope from parenthetical note: `User config (available in all your projects)` → scope: 'user'
- Parse "Args:" as space-separated array
- Line "To remove this server..." is informational only

### Tool Parameter Schema (From MCP Spec)

When a tool's parameters are requested, MCP servers return JSON Schema format. Based on actual MCP CLI integration output:

```typescript
interface McpToolDefinition {
  name: string;                          // "aws___get_regional_availability"
  description: string;                   // "Retrieve AWS regional availability..."
  inputSchema: {
    type: "object";
    properties: {
      [paramName: string]: ParameterSchema;
    };
    required?: string[];                 // List of required parameter names
  };
}

interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'integer' | 'object' | 'array';
  description?: string;
  required?: boolean;
  enum?: (string | number)[];           // For enumerated values
  minLength?: number;                    // For strings
  maxLength?: number;                    // For strings
  pattern?: string;                      // Regex pattern for validation
  minimum?: number;                      // For numbers
  maximum?: number;                      // For numbers
  items?: ParameterSchema;               // For arrays
  properties?: Record<string, ParameterSchema>;  // For objects
  default?: unknown;
}
```

**Real Example from aws-knowledge-mcp**:
```json
{
  "name": "aws___get_regional_availability",
  "description": "Retrieve AWS regional availability information...",
  "parameters": {
    "region": {
      "type": "string",
      "required": true,
      "description": "Target AWS region code (e.g., us-east-1)"
    },
    "resource_type": {
      "type": "string",
      "required": true,
      "description": "Type of AWS resource to check: 'product'|'api'|'cfn'"
    },
    "filters": {
      "type": "array",
      "items": {"type": "string"},
      "required": false,
      "description": "Optional list of specific resources to check"
    },
    "next_token": {
      "type": "string",
      "required": false,
      "description": "Pagination token for retrieving additional results"
    }
  }
}
```

### Error Scenarios

#### Error 1: MCP Server Not Found

**Command**: `claude mcp get nonexistent-server`

**Output**:
```
No MCP server found with name: nonexistent-server
```

**Exit Code**: 1

**Error Handling**:
```typescript
interface McpError {
  code: 'SERVER_NOT_FOUND' | 'CONNECTION_FAILED' | 'TIMEOUT' | 'CLI_NOT_FOUND';
  message: string;
  details?: string;
}

// Handling example
if (exitCode === 1 && stderr.includes('No MCP server found')) {
  return {
    code: 'SERVER_NOT_FOUND',
    message: `MCP server "${serverName}" is not configured`,
    details: 'Configure the server with: claude mcp add'
  };
}
```

#### Error 2: Server Connection Failed

**Scenario**: MCP server configured but not running

**Output** (from `claude mcp list`):
```
aws-knowledge-mcp: npx mcp-remote https://... - Connection timeout
```

**Handling**: Detected from absence of ✓ check mark, status should be `'disconnected'`

#### Error 3: CLI Not Found

**Scenario**: Claude Code CLI not installed

**Node.js Error**: `Error: spawn ENOENT`

**Handling**: Caught by existing pattern in `claude-code-service.ts` error handler

---

## 2. MCP Tool Parameter Schema & Validation

### Decision

Implement parameter validation using **JSON Schema Draft 7** compatible parsing without external libraries. For UI rendering, create a **custom component-based approach** that maps parameter types to React form components, avoiding dependencies on heavy JSON Schema form libraries (to keep bundle size minimal).

### Rationale

1. **JSON Schema is standard**: The MCP specification uses JSON Schema, and our validation can be built incrementally (start with basic type checking, expand as needed).
2. **No library overhead**: `json-schema-validator` or `ajv` libraries (~100KB+) are too heavy for VSCode Webview. A custom implementation using TypeScript type guards is simpler.
3. **Precedent in codebase**: The existing `validate-workflow.ts` uses a custom validation approach with no external validators.
4. **Runtime safety**: TypeScript types + custom validation functions provide adequate safety without runtime schema evaluation overhead.
5. **Incremental complexity**: Support basic types first (string, number, boolean), then add array/object support if needed.

### Schema Structure for Implementation

```typescript
/**
 * Parameter definition extracted from MCP tool schema
 * Maps JSON Schema properties to form-renderable structure
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  description?: string;
  required: boolean;
  default?: unknown;

  // Validation constraints
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;                    // Regex pattern
    minimum?: number;
    maximum?: number;
    enum?: (string | number)[];         // Predefined choices
  };

  // For complex types
  items?: ToolParameter;                // For arrays: type of array items
  properties?: Record<string, ToolParameter>;  // For objects: nested properties
}

/**
 * Normalized MCP tool for use in workflow nodes
 */
export interface NormalizedMcpTool {
  serverId: string;                     // "aws-knowledge-mcp"
  toolName: string;                     // "aws___get_regional_availability"
  description: string;
  parameters: ToolParameter[];
}

/**
 * Configuration values entered by user for a tool
 */
export interface ToolParameterValues {
  [paramName: string]: unknown;
}
```

### Validation Function Design

```typescript
/**
 * Validate parameter value against type and constraints
 */
function validateParameterValue(
  value: unknown,
  parameter: ToolParameter
): { valid: boolean; error?: string } {
  // Type checking
  const typedValue = coerceToType(value, parameter.type);
  if (typedValue === null && parameter.type !== 'string') {
    return {
      valid: false,
      error: `Expected ${parameter.type}, got ${typeof value}`
    };
  }

  // Constraint checking
  if (parameter.validation) {
    const { minLength, maxLength, pattern, minimum, maximum, enum: enumValues } =
      parameter.validation;

    if (pattern && typeof typedValue === 'string') {
      if (!new RegExp(pattern).test(typedValue)) {
        return { valid: false, error: `Does not match pattern: ${pattern}` };
      }
    }

    if (minLength && typeof typedValue === 'string' && typedValue.length < minLength) {
      return { valid: false, error: `Minimum length is ${minLength}` };
    }

    if (maxLength && typeof typedValue === 'string' && typedValue.length > maxLength) {
      return { valid: false, error: `Maximum length is ${maxLength}` };
    }

    if (minimum !== undefined && typeof typedValue === 'number' && typedValue < minimum) {
      return { valid: false, error: `Minimum value is ${minimum}` };
    }

    if (enumValues && !enumValues.includes(typedValue)) {
      return { valid: false, error: `Must be one of: ${enumValues.join(', ')}` };
    }
  }

  return { valid: true };
}

/**
 * Validate all parameters for a tool
 */
function validateAllParameters(
  values: ToolParameterValues,
  parameters: ToolParameter[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const param of parameters) {
    const value = values[param.name];

    if (param.required && (value === undefined || value === null)) {
      errors[param.name] = 'This parameter is required';
      continue;
    }

    if (value !== undefined && value !== null) {
      const validation = validateParameterValue(value, param);
      if (!validation.valid) {
        errors[param.name] = validation.error || 'Invalid value';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
```

### Complex Scenarios Handling

#### Scenario 1: Array of Objects (e.g., filters parameter)

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "key": { "type": "string" },
      "value": { "type": "string" }
    }
  }
}
```

**UI Approach**:
- Render as "Add Item" button
- Each item rendered as a sub-form with nested fields
- Display as a list of configured items with edit/delete buttons

#### Scenario 2: Enum Parameters

```json
{
  "type": "string",
  "enum": ["sonnet", "opus", "haiku"],
  "description": "Model to use"
}
```

**UI Approach**:
- Render as dropdown/select component
- Pre-populate with enum values
- Prevent invalid value entry

#### Scenario 3: Nested Objects (future support)

```json
{
  "type": "object",
  "properties": {
    "region": { "type": "string" },
    "filters": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

**UI Approach**:
- Create collapsible section for object properties
- Recursively render nested parameters
- Validate entire structure before saving

---

## 3. Dynamic Form Rendering in React

### Decision

Implement a **custom, component-based form builder** using React hooks and TypeScript, mapping parameter types to form input components. No external JSON Schema form library.

### Rationale

1. **Bundle size**: JSON Schema Form libraries (react-jsonschema-form, formik) add 100KB+ to Webview bundle. Custom implementation is ~2-3KB.
2. **VSCode constraints**: Webview has limited resources and sandboxing. Simpler code = fewer security risks.
3. **UI consistency**: Custom components can match VSCode theme colors and component styles (use native VSCode input/button components).
4. **Familiar pattern**: Follows the Skill node property panel pattern already used in the codebase.
5. **Maintainability**: Team controls all form behavior without depending on external library updates.

### Alternatives Considered

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **react-jsonschema-form** | Full featured, handles complex schemas | +120KB bundle, heavy dependencies, learning curve | Rejected |
| **Formik + custom schema handler** | Popular, well-maintained | Still +50KB, overkill for simple forms | Rejected |
| **Custom component-based** | Minimal bundle, full control, matches codebase pattern | Requires manual schema handling | **Chosen** |
| **Vue/Svelte form builders** | Lighter alternatives | Not compatible with React codebase | Rejected |

### Implementation Plan

#### Component Architecture

```
McpPropertyPanel (parent)
├── ParameterForm (orchestrator)
│   └── [for each parameter]
│       └── ParameterInput (type-specific renderer)
│           ├── StringInput (for type: 'string')
│           ├── NumberInput (for type: 'number'|'integer')
│           ├── BooleanInput (for type: 'boolean')
│           ├── EnumSelect (for parameters with enum values)
│           ├── ArrayInput (for type: 'array')
│           │   └── ArrayItemEditor (renders individual items)
│           └── ObjectInput (for type: 'object')
│               └── [recursive ParameterInput for nested fields]
```

#### Core Components (TypeScript + React)

```typescript
/**
 * McpPropertyPanel.tsx
 * Main panel showing MCP node configuration
 */
export function McpPropertyPanel({ mcpNode }: { mcpNode: McpNodeData }) {
  const [values, setValues] = useState<ToolParameterValues>(mcpNode.parameterValues || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    const validation = validateAllParameters(values, mcpNode.parameters);
    if (validation.valid) {
      updateMcpNode({ ...mcpNode, parameterValues: values });
      showSuccess('Parameters saved');
    } else {
      setErrors(validation.errors);
    }
  };

  return (
    <div className="mcp-property-panel">
      <h3>{mcpNode.toolName}</h3>
      <ParameterForm
        parameters={mcpNode.parameters}
        values={values}
        errors={errors}
        onChange={setValues}
      />
      <button onClick={handleSave} disabled={Object.keys(errors).length > 0}>
        Save Configuration
      </button>
    </div>
  );
}

/**
 * ParameterForm.tsx
 * Renders all parameters for a tool
 */
export function ParameterForm({
  parameters,
  values,
  errors,
  onChange
}: ParameterFormProps) {
  return (
    <div className="parameter-form">
      {parameters.map(param => (
        <div key={param.name} className="parameter-field">
          <label htmlFor={param.name}>
            {param.name}
            {param.required && <span className="required">*</span>}
          </label>
          <ParameterInput
            parameter={param}
            value={values[param.name]}
            error={errors[param.name]}
            onChange={val => onChange({ ...values, [param.name]: val })}
          />
          {param.description && (
            <p className="help-text">{param.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * ParameterInput.tsx
 * Type-specific input renderer (dispatch component)
 */
export function ParameterInput({
  parameter,
  value,
  error,
  onChange
}: ParameterInputProps) {
  // Enum selector takes precedence
  if (parameter.validation?.enum) {
    return <EnumSelect parameter={parameter} value={value} onChange={onChange} />;
  }

  // Type-based rendering
  switch (parameter.type) {
    case 'string':
      return (
        <StringInput
          parameter={parameter}
          value={value as string}
          error={error}
          onChange={onChange}
        />
      );
    case 'number':
    case 'integer':
      return (
        <NumberInput
          parameter={parameter}
          value={value as number}
          error={error}
          onChange={onChange}
        />
      );
    case 'boolean':
      return (
        <BooleanInput
          value={value as boolean}
          onChange={onChange}
        />
      );
    case 'array':
      return (
        <ArrayInput
          parameter={parameter}
          value={value as unknown[]}
          error={error}
          onChange={onChange}
        />
      );
    case 'object':
      return (
        <ObjectInput
          parameter={parameter}
          value={value as Record<string, unknown>}
          error={error}
          onChange={onChange}
        />
      );
    default:
      return <div className="error">Unknown parameter type: {parameter.type}</div>;
  }
}

/**
 * StringInput.tsx
 * Input for string parameters
 */
export function StringInput({
  parameter,
  value,
  error,
  onChange
}: StringInputProps) {
  const { minLength, maxLength, pattern } = parameter.validation || {};
  const maxLen = maxLength || 1000;

  return (
    <>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={parameter.description}
        minLength={minLength}
        maxLength={maxLen}
        pattern={pattern}
        aria-invalid={!!error}
        aria-describedby={error ? `${parameter.name}-error` : undefined}
      />
      {error && <p className="error-message" id={`${parameter.name}-error`}>{error}</p>}
      <span className="char-count">{(value as string)?.length || 0} / {maxLen}</span>
    </>
  );
}

/**
 * EnumSelect.tsx
 * Dropdown for enum parameters
 */
export function EnumSelect({
  parameter,
  value,
  onChange
}: EnumSelectProps) {
  const options = parameter.validation?.enum || [];

  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      aria-label={parameter.name}
    >
      <option value="">-- Select --</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

/**
 * ArrayInput.tsx
 * Input for array parameters
 */
export function ArrayInput({
  parameter,
  value,
  error,
  onChange
}: ArrayInputProps) {
  const [items, setItems] = useState<unknown[]>(value || []);

  const addItem = () => {
    const newItems = [...items, parameter.items?.default || ''];
    setItems(newItems);
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange(newItems);
  };

  const updateItem = (index: number, newValue: unknown) => {
    const newItems = [...items];
    newItems[index] = newValue;
    setItems(newItems);
    onChange(newItems);
  };

  return (
    <div className="array-input">
      {items.map((item, index) => (
        <div key={index} className="array-item">
          <ParameterInput
            parameter={{ ...parameter.items!, name: `${parameter.name}[${index}]` }}
            value={item}
            onChange={val => updateItem(index, val)}
          />
          <button onClick={() => removeItem(index)} className="remove-btn">Remove</button>
        </div>
      ))}
      <button onClick={addItem} className="add-btn">Add Item</button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}
```

#### Data Flow

```
User edits parameter value
    ↓
ParameterInput.onChange(newValue)
    ↓
McpPropertyPanel.onChange({ ...values, paramName: newValue })
    ↓
Local state updates (values, errors via real-time validation)
    ↓
User clicks "Save Configuration"
    ↓
validateAllParameters(values, parameters)
    ↓
If valid: updateMcpNode() → persist to workflow
If invalid: setErrors(validation.errors) → highlight fields
```

---

## 4. Extension Host Child Process Best Practices

### Decision

Extend the existing `claude-code-service.ts` pattern to include MCP CLI commands. Create a dedicated `mcp-service.ts` that handles MCP-specific CLI operations with consistent error handling, timeout management, and logging.

### Rationale

1. **Reuse proven pattern**: `claude-code-service.ts` already implements proper error handling for spawning child processes (ENOENT detection, timeout management, signal handling).
2. **Consistency**: Using the same spawning mechanism (stdio pipes, error listeners, timeout cleanup) ensures predictable behavior.
3. **Reliability**: The existing pattern handles edge cases like:
   - Process not found (ENOENT)
   - Timeout graceful termination + force kill
   - Proper cleanup of resources
   - Comprehensive logging
4. **Maintainability**: Any improvements to child process handling in one service benefit both.

### Child Process Management Pattern

```typescript
/**
 * mcp-service.ts
 * MCP server discovery and tool enumeration via Claude Code CLI
 */

import { spawn } from 'node:child_process';
import { log } from '../extension';

export interface McpCliResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  executionTimeMs: number;
}

/**
 * Execute MCP CLI command with timeout and error handling
 * Based on: claude-code-service.ts pattern
 */
async function executeMcpCommand(
  args: string[],
  timeoutMs = 5000  // 5 second timeout for MCP CLI
): Promise<McpCliResult> {
  const startTime = Date.now();
  let stdout = '';
  let stderr = '';

  return new Promise(resolve => {
    const process = spawn('claude', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs
    });

    const timeout = setTimeout(() => {
      process.kill('SIGTERM');

      // Force kill after 500ms
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 500);

      log('WARN', 'MCP CLI command timed out', { args, timeoutMs });
      resolve({
        success: false,
        error: {
          code: 'MCP_TIMEOUT',
          message: 'MCP server query timed out',
          details: `Command: claude ${args.join(' ')}`
        },
        executionTimeMs: Date.now() - startTime
      });
    }, timeoutMs);

    process.stdout?.on('data', chunk => {
      stdout += chunk.toString();
    });

    process.stderr?.on('data', chunk => {
      stderr += chunk.toString();
    });

    process.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);

      if (err.code === 'ENOENT') {
        log('ERROR', 'Claude Code CLI not found', { errorMessage: err.message });
        resolve({
          success: false,
          error: {
            code: 'CLI_NOT_FOUND',
            message: 'Claude Code CLI is not installed or not in PATH',
            details: err.message
          },
          executionTimeMs: Date.now() - startTime
        });
      } else {
        log('ERROR', 'MCP CLI execution error', { errorCode: err.code, errorMessage: err.message });
        resolve({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to execute MCP command',
            details: err.message
          },
          executionTimeMs: Date.now() - startTime
        });
      }
    });

    process.on('exit', code => {
      clearTimeout(timeout);

      if (code === 0) {
        log('INFO', 'MCP CLI command succeeded', { args, outputLength: stdout.length });
        resolve({
          success: true,
          data: stdout,
          executionTimeMs: Date.now() - startTime
        });
      } else {
        log('ERROR', 'MCP CLI command failed', { args, exitCode: code, stderr: stderr.substring(0, 200) });
        resolve({
          success: false,
          error: {
            code: 'COMMAND_FAILED',
            message: 'MCP command returned non-zero exit code',
            details: `Exit code: ${code}, stderr: ${stderr}`
          },
          executionTimeMs: Date.now() - startTime
        });
      }
    });
  });
}

/**
 * List all configured MCP servers
 */
export async function listMcpServers(): Promise<McpCliResult> {
  return executeMcpCommand(['mcp', 'list']);
}

/**
 * Get details about a specific MCP server
 */
export async function getMcpServerDetails(serverName: string): Promise<McpCliResult> {
  return executeMcpCommand(['mcp', 'get', serverName]);
}

/**
 * Parse MCP list output
 */
export function parseMcpListOutput(output: string): McpServerListEntry[] {
  const entries: McpServerListEntry[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Skip empty lines and headers
    if (!line.trim() || line.includes('Checking MCP')) {
      continue;
    }

    // Pattern: "server-name: command args - ✓ Connected"
    const match = line.match(/^([^:]+):\s+(.+?)\s+-\s+(.*)$/);
    if (match) {
      const [, name, commandAndArgs, status] = match;
      const parts = commandAndArgs.trim().split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1).join(' ');

      entries.push({
        name,
        command,
        args,
        status: status.includes('✓') ? 'connected' : 'disconnected'
      });
    }
  }

  return entries;
}

/**
 * Parse MCP get output
 */
export function parseMcpDetailOutput(output: string): McpServerDetail {
  const lines = output.split('\n');
  const detail: Partial<McpServerDetail> = {};

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith('  ')) {
      // Indented key-value pair
      const [key, value] = line.trim().split(':').map(s => s.trim());

      if (key === 'Scope') {
        // Extract scope from "User config (description)"
        const scopeMatch = value.match(/^(User|Project|Enterprise)/i);
        detail.scope = scopeMatch?.[1]?.toLowerCase() as 'user' | 'project' | 'enterprise';
      } else if (key === 'Status') {
        detail.status = value.includes('✓') ? 'connected' : 'disconnected';
      } else if (key === 'Type') {
        detail.type = value as 'stdio' | 'sse' | 'http';
      } else if (key === 'Command') {
        detail.command = value;
      } else if (key === 'Args') {
        detail.args = value.split(/\s+/);
      }
    } else if (!line.startsWith('To remove')) {
      // First line is the server name
      const serverName = line.split(':')[0];
      detail.name = serverName;
    }
  }

  return detail as McpServerDetail;
}
```

### Security Considerations

#### 1. Command Injection Prevention

```typescript
// DANGEROUS - DO NOT USE
const command = `claude mcp get ${userProvidedServerName}`;  // User can inject
spawn('sh', ['-c', command]);

// SAFE - USE THIS PATTERN
spawn('claude', ['mcp', 'get', userProvidedServerName]);  // Args are separate
```

**Rule**: Always use array form of spawn/exec, never shell=true with concatenated strings.

#### 2. Output Validation

```typescript
// Validate parsed output before using
if (!Array.isArray(parsedServers)) {
  throw new Error('Unexpected output format from MCP CLI');
}

for (const server of parsedServers) {
  if (typeof server.name !== 'string' || server.name.length > 1024) {
    log('WARN', 'Suspicious server name', { name: server.name });
    continue;  // Skip potentially malformed entry
  }
}
```

**Rule**: Validate type and length of all parsed values before storing or using.

#### 3. Timeout Protection

```typescript
// Always set reasonable timeouts for CLI execution
const MCP_CLI_TIMEOUT_MS = 5000;  // 5 seconds max
// This prevents hanging processes from blocking the UI

// If an MCP server is slow, timeout gracefully instead of hanging
```

**Rule**: MCP servers may be unreliable. 5-second timeout is reasonable default.

#### 4. Stderr Logging Limits

```typescript
// Don't log entire stderr output (could be huge)
log('ERROR', 'MCP error', {
  stderr: stderr.substring(0, 500)  // Limit to first 500 chars
});
```

**Rule**: Truncate error messages to prevent log flooding.

### Reference Implementation from claude-code-service.ts

Key patterns to follow:

1. **Process tracking**: Map active processes by requestId for cancellation support
2. **Graceful cleanup**: Use SIGTERM first, SIGKILL after timeout
3. **Comprehensive logging**: Log start, timeout, error, and success with execution time
4. **Error codes**: Use string codes for i18n-friendly error messages
5. **Resource cleanup**: Always clear timeouts and remove from active process map

---

## Summary of Research Findings

### Key Decisions Made

1. **MCP CLI Integration**: Use `claude mcp list` and `claude mcp get` with text parsing (no JSON flags available)
2. **Parameter Schema**: JSON Schema Draft 7 format from MCP spec; custom validation (no external libraries)
3. **Form Rendering**: Custom React component-based approach (no json-schema-form library)
4. **Child Process**: Extend existing claude-code-service.ts pattern to mcp-service.ts

### Implementation Priority

**Phase 1 (MVP - P1)**: MCP tool discovery and selection
- `listMcpServers()` function parsing `claude mcp list` output
- `getMcpServerDetails()` function parsing `claude mcp get <name>` output
- McpBrowserDialog component with server/tool selection

**Phase 2 (P2)**: Parameter configuration
- ParameterForm component for rendering tool parameters
- Type-specific inputs (string, number, boolean, enum)
- Parameter validation and error messaging

**Phase 3 (P3)**: Workflow integration
- McpNodeComponent for canvas rendering
- MCP node data persistence in workflow JSON
- Workflow export with MCP tool invocations

### Risk Mitigations

1. **MCP server unavailability**: 5-second timeout prevents UI hangs; graceful error messages guide users to `claude mcp list`
2. **Complex parameter schemas**: Start with basic types; implement array/object support incrementally
3. **Bundle size**: Custom components keep webview under 1MB; no external JSON Schema libraries
4. **Process safety**: Follow established patterns from claude-code-service.ts; comprehensive error handling

### Testing Considerations

- Mock MCP CLI responses for unit tests (use real output samples collected)
- Integration tests should verify parsing accuracy (test with real aws-knowledge-mcp output)
- Parameter validation unit tests should cover all constraint types (enum, min/max, pattern)
- UI component tests should verify error message display and form submission blocking
