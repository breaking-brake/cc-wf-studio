# Quickstart: MCP Node Implementation

A practical guide for developers implementing the MCP Node feature (001-mcp-node).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Architecture Overview](#architecture-overview)
4. [Implementation Order](#implementation-order)
5. [Phase 1: Extension Host (Backend)](#phase-1-extension-host-backend)
6. [Phase 2: Webview UI (Frontend)](#phase-2-webview-ui-frontend)
7. [Phase 3: Integration & Testing](#phase-3-integration--testing)
8. [Code Examples](#code-examples)
9. [Testing Strategy](#testing-strategy)
10. [Troubleshooting](#troubleshooting)
11. [Feature Checklist](#feature-checklist)

---

## Prerequisites

- **VSCode**: Version 1.80.0 or later
- **Node.js**: 18+ with npm
- **TypeScript**: 5.3.0+ (already in project)
- **React**: 18.2+ (already in project)
- **Claude Code CLI**: Must be installed and accessible in PATH
  - Test with: `claude --version`
  - Install MCP servers: `claude mcp add aws-knowledge-mcp` (example)
  - List servers: `claude mcp list`

---

## Development Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project root
cd /Users/se_nishikawa/chore/cc-wf-studio

# Install root dependencies
npm install

# Install webview dependencies
cd src/webview
npm install
cd ../..
```

### 2. Verify Project Structure

```bash
# Check required directories exist
ls -la src/shared/types/
ls -la src/extension/services/
ls -la src/webview/src/components/

# Verify existing files
grep -l "validateWorkflow\|WorkflowNode\|NodeType" src/extension/utils/*.ts
```

### 3. Start Development Environment

```bash
# Terminal 1: Watch TypeScript compilation
npm run watch

# Terminal 2: Run VSCode Extension Host
npm run dev

# Terminal 3: Run tests (optional)
npm test

# Terminal 4: Watch tests
npm test -- --watch
```

### 4. Verify Claude Code CLI Access

```bash
# Check CLI is installed
which claude
claude --version

# List MCP servers
claude mcp list

# Get details of a specific server
claude mcp get aws-knowledge-mcp

# If no servers configured, add one for testing
claude mcp add aws-knowledge-mcp
```

---

## Architecture Overview

```
┌─ VSCode Extension Host (TypeScript) ────────────────────────────────────────┐
│                                                                              │
│  Extension Commands & Services                                             │
│  ├── mcp-service.ts ..................... MCP CLI execution & parsing       │
│  │   ├── listMcpServers() ................ Execute "claude mcp list"       │
│  │   ├── getMcpServerDetails() ........... Execute "claude mcp get"        │
│  │   ├── parseMcpListOutput() ............ Parse text → McpServerListEntry │
│  │   └── parseMcpDetailOutput() .......... Parse text → McpServerDetail    │
│  │                                                                           │
│  ├── validate-workflow.ts (Extended)                                       │
│  │   ├── validateMcpNode() ............... Validate MCP node structure     │
│  │   ├── validateToolParameters() ........ Validate parameter values       │
│  │   └── validateAllParameters() ......... Batch parameter validation       │
│  │                                                                           │
│  └── Message Handlers                                                       │
│      ├── LIST_MCP_SERVERS → MCP_SERVERS_RESULT                            │
│      ├── GET_MCP_TOOLS → MCP_TOOLS_RESULT                                  │
│      ├── VALIDATE_MCP_NODE → VALIDATE_MCP_NODE_RESULT                      │
│      └── UPDATE_MCP_NODE → (update workflow store)                         │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
                                    ↕
                         VSCode Message Passing
                                    ↕
┌─ Webview UI (React + TypeScript) ──────────────────────────────────────────┐
│                                                                              │
│  Components                                                                 │
│  ├── McpBrowserDialog.tsx ................. Dialog for server/tool selection│
│  │   ├── ServerList.tsx ................... List of MCP servers            │
│  │   ├── ToolList.tsx ..................... List of tools for selected srv. │
│  │   └── ToolDetailView.tsx ............... Tool details & preview         │
│  │                                                                           │
│  ├── McpNodeComponent.tsx ................. Canvas node representation     │
│  │   ├── NodeHeader.tsx ................... Server/tool name display        │
│  │   ├── ValidationStatusBadge.tsx ........ Status indicator               │
│  │   └── Handles.tsx ...................... Connection points              │
│  │                                                                           │
│  ├── McpPropertyPanel.tsx ................. Node configuration panel       │
│  │   ├── ParameterForm.tsx ................ Form layout                    │
│  │   ├── ParameterInput.tsx ............... Type-specific input dispatcher │
│  │   │   ├── StringInput.tsx .............. Text input with constraints    │
│  │   │   ├── NumberInput.tsx .............. Number input                   │
│  │   │   ├── BooleanInput.tsx ............. Toggle/checkbox                │
│  │   │   ├── EnumSelect.tsx ............... Dropdown selector              │
│  │   │   ├── ArrayInput.tsx ............... List editor                    │
│  │   │   └── ObjectInput.tsx .............. Nested object editor           │
│  │   └── SaveButton.tsx ................... Persist changes                │
│  │                                                                           │
│  └── Services                                                               │
│      └── mcp-generation-service.ts ........ Bridge to Extension Host       │
│          ├── listMcpServers() ............ Post LIST_MCP_SERVERS message   │
│          ├── getMcpTools() ............... Post GET_MCP_TOOLS message      │
│          └── validateMcpNode() .......... Post VALIDATE_MCP_NODE message   │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

### Phase 1: Extension Host (Backend) - Week 1

**Dependency Chain**: Foundation layer, no dependencies on Webview

1. **Extend Types** (Day 1)
   - Add `Mcp = 'mcp'` to `NodeType` enum
   - Add `McpNode` and `McpNodeData` types
   - Update `WorkflowNode` union type
   - Add `VALIDATION_RULES.MCP` constant

2. **Create mcp-service.ts** (Day 1-2)
   - `executeMcpCommand()` - Execute CLI with timeout
   - `listMcpServers()` - Wrapper for `claude mcp list`
   - `getMcpServerDetails()` - Wrapper for `claude mcp get`
   - `parseMcpListOutput()` - Parse list output to McpServerListEntry[]
   - `parseMcpDetailOutput()` - Parse detail output to McpServerDetail
   - Error handling (SERVER_NOT_FOUND, TIMEOUT, CLI_NOT_FOUND)
   - Unit tests for each parsing function

3. **Extend validate-workflow.ts** (Day 2-3)
   - `validateMcpNode()` - Validate node structure
   - `validateToolParameters()` - Validate parameter values
   - `validateParameterValue()` - Single parameter validation
   - `validateAllParameters()` - Batch validation
   - Error codes for each validation failure
   - Unit tests for all validators

4. **Add Message Handlers** (Day 3-4)
   - Register `LIST_MCP_SERVERS` handler
   - Register `GET_MCP_TOOLS` handler
   - Register `VALIDATE_MCP_NODE` handler
   - Register `UPDATE_MCP_NODE` handler
   - Error handling and response formatting
   - Unit tests for message handlers

### Phase 2: Webview UI (Frontend) - Week 2

**Dependency**: Phase 1 Extension Host must be complete

1. **Create Dialog Components** (Day 1-2)
   - `McpBrowserDialog.tsx` - Main dialog
   - `ServerList.tsx` - Server list with status badges
   - `ToolList.tsx` - Tools for selected server
   - State management (selected server, selected tool)
   - Styling (match Skill node dialog pattern)
   - i18n translations (en, ja, ko, zh-CN, zh-TW)

2. **Create Canvas Node Component** (Day 2-3)
   - `McpNodeComponent.tsx` - Node rendering
   - Visual differentiation from other node types
   - Connection handles (input, output)
   - Validation status badge
   - Double-click to edit behavior
   - Styling (match existing node types)

3. **Create Property Panel** (Day 3-4)
   - `McpPropertyPanel.tsx` - Main panel
   - `ParameterForm.tsx` - Form container
   - `ParameterInput.tsx` - Type-based dispatcher
   - Type-specific input components:
     - `StringInput.tsx` - Min/max length, pattern validation
     - `NumberInput.tsx` - Min/max value validation
     - `BooleanInput.tsx` - Toggle
     - `EnumSelect.tsx` - Dropdown
     - `ArrayInput.tsx` - List with add/remove
     - `ObjectInput.tsx` - Nested fields
   - Real-time validation feedback
   - Save/Cancel buttons
   - Error message display
   - i18n translations

4. **Create Service Layer** (Day 4)
   - `mcp-generation-service.ts` - Message bridge
   - `listMcpServers()` - List servers
   - `getMcpTools()` - Get server tools
   - `validateMcpNode()` - Validate node
   - Promise-based interface
   - Timeout handling (30 seconds)
   - Error handling with user-friendly messages

### Phase 3: Integration & Testing - Week 3

**Dependency**: Phase 1 & 2 complete

1. **Workflow Store Integration** (Day 1)
   - `addMcpNode()` - Add new MCP node
   - `updateMcpNode()` - Update node parameters
   - `deleteMcpNode()` - Remove MCP node
   - Persist to workflow JSON
   - Trigger validation on load

2. **Workflow Load & Validation** (Day 1-2)
   - Load MCP nodes from JSON
   - Validate server availability
   - Check tool schema compatibility
   - Update `validationStatus`
   - Show warning if missing/invalid

3. **Workflow Export** (Day 2)
   - Include MCP nodes in export
   - Format for slash command execution
   - Test with real MCP servers

4. **Testing** (Day 2-3)
   - Unit tests for all services
   - Integration tests for message flow
   - E2E tests for user workflows
   - Manual testing with real MCP servers

---

## Phase 1: Extension Host (Backend)

### Step 1: Extend workflow-definition.ts

**File**: `/Users/se_nishikawa/chore/cc-wf-studio/src/shared/types/workflow-definition.ts`

```typescript
// Add to NodeType enum
export enum NodeType {
  // ... existing types
  Mcp = 'mcp',  // NEW
}

// Add McpNodeData interface
export interface McpNodeData {
  serverId: string;
  toolName: string;
  toolDescription: string;
  parameters: ToolParameter[];
  parameterValues: ToolParameterValues;
  validationStatus: 'valid' | 'missing' | 'invalid';
  outputPorts: 1;
}

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
  pattern?: string;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
}

export interface ToolParameterValues {
  [paramName: string]: unknown;
}

// Add McpNode interface
export interface McpNode extends BaseNode {
  type: NodeType.Mcp;
  data: McpNodeData;
}

// Update WorkflowNode union
export type WorkflowNode =
  | SubAgentNode
  | AskUserQuestionNode
  | BranchNode
  | IfElseNode
  | SwitchNode
  | StartNode
  | EndNode
  | PromptNode
  | SkillNode
  | McpNode;  // NEW

// Update VALIDATION_RULES
export const VALIDATION_RULES = {
  // ... existing rules
  MCP: {
    NAME_MIN_LENGTH: 1,
    NAME_MAX_LENGTH: 64,
    NAME_PATTERN: /^[a-z0-9-]+$/,
    DESCRIPTION_MAX_LENGTH: 1024,
    OUTPUT_PORTS: 1,
  },
  MCP_PARAMETER: {
    STRING_MAX_LENGTH: 10000,
    ENUM_MAX_VALUES: 100,
  },
};
```

### Step 2: Create mcp-service.ts

**File**: `/Users/se_nishikawa/chore/cc-wf-studio/src/extension/services/mcp-service.ts`

```typescript
import { spawn } from 'node:child_process';
import { log } from '../extension';

export interface McpServerListEntry {
  name: string;
  command: string;
  args: string;
  status: 'connected' | 'disconnected';
}

export interface McpServerDetail {
  name: string;
  scope: 'user' | 'project' | 'enterprise';
  status: 'connected' | 'disconnected';
  type: 'stdio' | 'sse' | 'http';
  command: string;
  args: string[];
  environment?: Record<string, string>;
}

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
 */
async function executeMcpCommand(
  args: string[],
  timeoutMs = 5000
): Promise<McpCliResult> {
  const startTime = Date.now();
  let stdout = '';
  let stderr = '';

  return new Promise(resolve => {
    const process = spawn('claude', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      process.kill('SIGTERM');
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
      if (timedOut) return;

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
        log('ERROR', 'MCP CLI execution error', {
          errorCode: err.code,
          errorMessage: err.message
        });
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
      if (timedOut) return;

      if (code === 0) {
        log('INFO', 'MCP CLI command succeeded', {
          args,
          outputLength: stdout.length
        });
        resolve({
          success: true,
          data: stdout,
          executionTimeMs: Date.now() - startTime
        });
      } else {
        log('ERROR', 'MCP CLI command failed', {
          args,
          exitCode: code,
          stderr: stderr.substring(0, 200)
        });
        resolve({
          success: false,
          error: {
            code: 'COMMAND_FAILED',
            message: 'MCP command returned non-zero exit code',
            details: `Exit code: ${code}`
          },
          executionTimeMs: Date.now() - startTime
        });
      }
    });
  });
}

export async function listMcpServers(): Promise<McpCliResult> {
  return executeMcpCommand(['mcp', 'list']);
}

export async function getMcpServerDetails(serverName: string): Promise<McpCliResult> {
  return executeMcpCommand(['mcp', 'get', serverName]);
}

export function parseMcpListOutput(output: string): McpServerListEntry[] {
  const entries: McpServerListEntry[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim() || line.includes('Checking MCP')) {
      continue;
    }

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

export function parseMcpDetailOutput(output: string): McpServerDetail {
  const lines = output.split('\n');
  const detail: Partial<McpServerDetail> = {};

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith('  ')) {
      const [key, value] = line
        .trim()
        .split(':')
        .map(s => s.trim());

      if (key === 'Scope') {
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
      const serverName = line.split(':')[0];
      detail.name = serverName;
    }
  }

  return detail as McpServerDetail;
}
```

### Step 3: Extend validate-workflow.ts

**File**: `/Users/se_nishikawa/chore/cc-wf-studio/src/extension/utils/validate-workflow.ts`

```typescript
// Add to imports
import type {
  McpNode,
  McpNodeData,
  ToolParameter,
  ToolParameterValues
} from '../../shared/types/workflow-definition';

/**
 * Validate a single MCP node
 */
export function validateMcpNode(node: McpNode): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!node.data.serverId) {
    errors.push({
      code: 'MCP_MISSING_FIELD',
      message: 'Server ID is required'
    });
  }

  if (!node.data.toolName) {
    errors.push({
      code: 'MCP_MISSING_FIELD',
      message: 'Tool name is required'
    });
  }

  // Check name format
  if (!node.name.match(VALIDATION_RULES.MCP.NAME_PATTERN)) {
    errors.push({
      code: 'MCP_INVALID_NAME',
      message: `Node name must match pattern: ${VALIDATION_RULES.MCP.NAME_PATTERN}`
    });
  }

  // Check name length
  if (
    node.name.length < VALIDATION_RULES.MCP.NAME_MIN_LENGTH ||
    node.name.length > VALIDATION_RULES.MCP.NAME_MAX_LENGTH
  ) {
    errors.push({
      code: 'MCP_NAME_LENGTH',
      message: `Node name must be 1-64 characters`
    });
  }

  // Validate parameters
  const paramValidation = validateAllParameters(
    node.data.parameterValues,
    node.data.parameters
  );
  if (!paramValidation.valid) {
    for (const [paramName, error] of Object.entries(paramValidation.errors)) {
      errors.push({
        code: 'MCP_PARAMETER_INVALID',
        message: `Parameter "${paramName}": ${error}`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate all parameters for a tool
 */
export function validateAllParameters(
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

/**
 * Validate a single parameter value
 */
function validateParameterValue(
  value: unknown,
  parameter: ToolParameter
): { valid: boolean; error?: string } {
  // Type checking
  if (parameter.validation?.enum && !parameter.validation.enum.includes(value as any)) {
    return {
      valid: false,
      error: `Must be one of: ${parameter.validation.enum.join(', ')}`
    };
  }

  const validation = parameter.validation || {};

  // String validation
  if (parameter.type === 'string' && typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      return { valid: false, error: `Minimum length is ${validation.minLength}` };
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      return { valid: false, error: `Maximum length is ${validation.maxLength}` };
    }
    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
      return { valid: false, error: `Does not match required pattern` };
    }
  }

  // Number validation
  if ((parameter.type === 'number' || parameter.type === 'integer') && typeof value === 'number') {
    if (validation.minimum !== undefined && value < validation.minimum) {
      return { valid: false, error: `Minimum value is ${validation.minimum}` };
    }
    if (validation.maximum !== undefined && value > validation.maximum) {
      return { valid: false, error: `Maximum value is ${validation.maximum}` };
    }
  }

  return { valid: true };
}
```

---

## Phase 2: Webview UI (Frontend)

### McpBrowserDialog Component

**File**: `/Users/se_nishikawa/chore/cc-wf-studio/src/webview/src/components/dialogs/McpBrowserDialog.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { mcpGenerationService } from '../../services/mcp-generation-service';

export interface McpBrowserDialogProps {
  onToolSelected: (tool: McpToolInfo) => void;
  onClose: () => void;
}

interface McpServerInfo {
  id: string;
  displayName: string;
  status: 'connected' | 'disconnected';
}

interface McpToolInfo {
  serverId: string;
  name: string;
  description: string;
}

export function McpBrowserDialog({
  onToolSelected,
  onClose
}: McpBrowserDialogProps) {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  // Load tools when server selected
  useEffect(() => {
    if (selectedServerId) {
      loadTools(selectedServerId);
    } else {
      setTools([]);
    }
  }, [selectedServerId]);

  const loadServers = async () => {
    try {
      setLoading(true);
      const result = await mcpGenerationService.listMcpServers();
      setServers(result.servers);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  };

  const loadTools = async (serverId: string) => {
    try {
      setLoading(true);
      const result = await mcpGenerationService.getMcpTools(serverId);
      setTools(result.tools);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog className="mcp-browser-dialog">
      <h2>Browse MCP Tools</h2>

      {error && <div className="error">{error}</div>}

      <div className="dialog-content">
        {/* Server List */}
        <div className="server-list">
          <h3>MCP Servers</h3>
          {loading && !selectedServerId ? (
            <p>Loading servers...</p>
          ) : servers.length === 0 ? (
            <p>No MCP servers configured. Run "claude mcp add" to add one.</p>
          ) : (
            servers.map(server => (
              <div
                key={server.id}
                className={`server-item ${selectedServerId === server.id ? 'selected' : ''}`}
                onClick={() => setSelectedServerId(server.id)}
              >
                <span className={`status ${server.status}`}></span>
                <span>{server.displayName}</span>
              </div>
            ))
          )}
        </div>

        {/* Tool List */}
        <div className="tool-list">
          <h3>Tools</h3>
          {selectedServerId ? (
            loading ? (
              <p>Loading tools...</p>
            ) : tools.length === 0 ? (
              <p>No tools available for this server.</p>
            ) : (
              tools.map(tool => (
                <div
                  key={tool.name}
                  className="tool-item"
                  onClick={() => onToolSelected(tool)}
                >
                  <h4>{tool.name}</h4>
                  <p>{tool.description}</p>
                </div>
              ))
            )
          ) : (
            <p>Select a server to view its tools.</p>
          )}
        </div>
      </div>

      <div className="dialog-actions">
        <button onClick={onClose}>Cancel</button>
      </div>
    </dialog>
  );
}
```

### McpPropertyPanel Component

**File**: `/Users/se_nishikawa/chore/cc-wf-studio/src/webview/src/components/panels/McpPropertyPanel.tsx`

```typescript
import React, { useState } from 'react';
import { McpNodeData } from '../../types/workflow-definition';
import { ParameterForm } from '../forms/ParameterForm';

export interface McpPropertyPanelProps {
  node: McpNodeData;
  onUpdate: (updates: Partial<McpNodeData>) => void;
}

export function McpPropertyPanel({
  node,
  onUpdate
}: McpPropertyPanelProps) {
  const [values, setValues] = useState(node.parameterValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    // Validate all parameters
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    for (const param of node.parameters) {
      const value = values[param.name];

      if (param.required && (value === undefined || value === null)) {
        newErrors[param.name] = 'This parameter is required';
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    // Save to node
    onUpdate({ parameterValues: values });
    setErrors({});
  };

  return (
    <div className="mcp-property-panel">
      <h3>{node.toolName}</h3>
      <p className="server-info">Server: {node.serverId}</p>

      <div className="status-badge" data-status={node.validationStatus}>
        {node.validationStatus}
      </div>

      <ParameterForm
        parameters={node.parameters}
        values={values}
        errors={errors}
        onChange={setValues}
      />

      <div className="actions">
        <button onClick={handleSave} disabled={Object.keys(errors).length > 0}>
          Save Configuration
        </button>
      </div>
    </div>
  );
}
```

---

## Code Examples

### Example 1: Creating an MCP Node Programmatically

```typescript
import { McpNode, NodeType } from '../types/workflow-definition';

const mcpNode: McpNode = {
  id: 'node-mcp-1',
  type: NodeType.Mcp,
  name: 'aws-check',
  position: { x: 300, y: 200 },
  data: {
    serverId: 'aws-knowledge-mcp',
    toolName: 'aws___get_regional_availability',
    toolDescription: 'Retrieve AWS regional availability information',
    parameters: [
      {
        name: 'region',
        type: 'string',
        required: true,
        description: 'Target AWS region'
      }
    ],
    parameterValues: {
      region: 'us-east-1'
    },
    validationStatus: 'valid',
    outputPorts: 1
  }
};
```

### Example 2: Validating an MCP Node

```typescript
import { validateMcpNode } from '../utils/validate-workflow';

const result = validateMcpNode(mcpNode);
if (result.valid) {
  console.log('Node is valid!');
} else {
  console.log('Validation errors:', result.errors);
}
```

### Example 3: Calling MCP CLI from Extension Host

```typescript
import { listMcpServers, parseMcpListOutput } from '../services/mcp-service';

const result = await listMcpServers();
if (result.success) {
  const servers = parseMcpListOutput(result.data as string);
  console.log('Available servers:', servers);
} else {
  console.error('Error:', result.error);
}
```

### Example 4: Parameter Validation in Webview

```typescript
import { validateAllParameters } from '../services/validation-service';

const errors = validateAllParameters(
  { region: 'us-east-1', resource_type: 'product' },
  [
    {
      name: 'region',
      type: 'string',
      required: true
    },
    {
      name: 'resource_type',
      type: 'string',
      required: true,
      validation: { enum: ['product', 'api', 'cfn'] }
    }
  ]
);

if (Object.keys(errors).length === 0) {
  console.log('All parameters valid');
}
```

---

## Testing Strategy

### Unit Tests

**mcp-service.ts**:
```bash
# Test parsing functions with real CLI output samples
npm test -- src/extension/services/mcp-service.test.ts
```

**validate-workflow.ts**:
```bash
# Test parameter validation with various constraint types
npm test -- src/extension/utils/validate-workflow.test.ts
```

### Integration Tests

```bash
# Test message flow between Extension and Webview
npm test -- src/extension/commands/mcp-integration.test.ts
```

### Manual Testing Checklist

- [ ] MCP server list loads correctly
- [ ] Selecting server loads its tools
- [ ] Creating MCP node from tool works
- [ ] Parameter panel displays all parameters
- [ ] Parameter validation works (required, type, constraints)
- [ ] Saving node persists parameters
- [ ] Workflow export includes MCP nodes
- [ ] Workflow load validates MCP nodes
- [ ] Disconnected servers show warning

---

## Troubleshooting

### Issue: "Claude Code CLI not found"

**Cause**: CLI not installed or not in PATH

**Solution**:
```bash
# Check if CLI is installed
which claude
claude --version

# Add to PATH if needed
export PATH="$PATH:~/.local/bin"

# Install CLI
npm install -g @anthropic-ai/claude-code

# Verify MCP servers
claude mcp list
```

### Issue: "MCP server query timed out"

**Cause**: MCP server slow or unreachable

**Solution**:
- Check if MCP server is running
- Verify network connectivity
- Try refreshing the server list
- Check MCP server logs

```bash
# Check server status
claude mcp list
claude mcp get aws-knowledge-mcp
```

### Issue: Parameter validation not working

**Cause**: Constraint validation missing from parameter schema

**Solution**:
- Verify `ToolParameter.validation` is populated
- Check parameter `type` matches actual value type
- Test with sample parameter values

```typescript
// Debug parameter schema
console.log('Parameters:', node.data.parameters);
console.log('Values:', node.data.parameterValues);
```

### Issue: MCP node not showing in canvas

**Cause**: Node type not registered in workflow-definition.ts

**Solution**:
1. Verify `NodeType.Mcp = 'mcp'` is defined
2. Check `WorkflowNode` union includes `McpNode`
3. Ensure canvas renderer has case for NodeType.Mcp

---

## Feature Checklist

### Phase 1: Extension Host

- [ ] Add `Mcp` to `NodeType` enum
- [ ] Define `McpNodeData` and `ToolParameter` types
- [ ] Add `McpNode` to `WorkflowNode` union
- [ ] Add `VALIDATION_RULES.MCP` constant
- [ ] Create `mcp-service.ts`:
  - [ ] `executeMcpCommand()`
  - [ ] `listMcpServers()`
  - [ ] `getMcpServerDetails()`
  - [ ] `parseMcpListOutput()`
  - [ ] `parseMcpDetailOutput()`
  - [ ] Unit tests for all parsing functions
- [ ] Extend `validate-workflow.ts`:
  - [ ] `validateMcpNode()`
  - [ ] `validateAllParameters()`
  - [ ] `validateParameterValue()`
  - [ ] Unit tests for all validators
- [ ] Add message handlers:
  - [ ] `LIST_MCP_SERVERS` → `MCP_SERVERS_RESULT`
  - [ ] `GET_MCP_TOOLS` → `MCP_TOOLS_RESULT`
  - [ ] `VALIDATE_MCP_NODE` → `VALIDATE_MCP_NODE_RESULT`
  - [ ] `UPDATE_MCP_NODE` handler

### Phase 2: Webview UI

- [ ] Create `McpBrowserDialog.tsx`:
  - [ ] Server list rendering
  - [ ] Tool list rendering
  - [ ] Server selection
  - [ ] Tool selection
  - [ ] Error handling
  - [ ] i18n translations
- [ ] Create `McpNodeComponent.tsx`:
  - [ ] Node rendering
  - [ ] Visual differentiation
  - [ ] Connection handles
  - [ ] Validation status badge
  - [ ] Double-click to edit
- [ ] Create `McpPropertyPanel.tsx`:
  - [ ] Parameter form rendering
  - [ ] Type-specific input components
  - [ ] Real-time validation
  - [ ] Save/Cancel buttons
  - [ ] Error message display
- [ ] Create parameter input components:
  - [ ] `StringInput.tsx`
  - [ ] `NumberInput.tsx`
  - [ ] `BooleanInput.tsx`
  - [ ] `EnumSelect.tsx`
  - [ ] `ArrayInput.tsx`
  - [ ] `ObjectInput.tsx`
- [ ] Create `mcp-generation-service.ts`:
  - [ ] `listMcpServers()`
  - [ ] `getMcpTools()`
  - [ ] `validateMcpNode()`
  - [ ] Promise interface
  - [ ] Timeout handling

### Phase 3: Integration & Testing

- [ ] Workflow store integration:
  - [ ] `addMcpNode()`
  - [ ] `updateMcpNode()`
  - [ ] `deleteMcpNode()`
- [ ] Workflow load & validation:
  - [ ] Load MCP nodes from JSON
  - [ ] Validate server availability
  - [ ] Update `validationStatus`
- [ ] Workflow export:
  - [ ] Include MCP nodes in export
  - [ ] Format for slash command execution
- [ ] Testing:
  - [ ] Unit tests (all services)
  - [ ] Integration tests (message flow)
  - [ ] E2E tests (user workflows)
  - [ ] Manual testing with real servers

---

## References

- **Feature Spec**: `/Users/se_nishikawa/chore/cc-wf-studio/specs/001-mcp-node/spec.md`
- **Research**: `/Users/se_nishikawa/chore/cc-wf-studio/specs/001-mcp-node/research.md`
- **Data Model**: `/Users/se_nishikawa/chore/cc-wf-studio/specs/001-mcp-node/data-model.md`
- **API Contracts**: `/Users/se_nishikawa/chore/cc-wf-studio/specs/001-mcp-node/contracts/`
- **Existing Types**: `/Users/se_nishikawa/chore/cc-wf-studio/src/shared/types/workflow-definition.ts`
- **Skill Node Pattern**: Refer to existing Skill node implementation for UI/UX patterns

---

## Next Steps

1. **Week 1**: Complete Phase 1 (Extension Host)
   - Start with type definitions
   - Implement mcp-service.ts with comprehensive tests
   - Extend validation

2. **Week 2**: Complete Phase 2 (Webview UI)
   - Start with dialog components
   - Implement property panel with parameter inputs
   - Connect to Extension Host services

3. **Week 3**: Complete Phase 3 (Integration & Testing)
   - Integrate with workflow store
   - Test end-to-end workflows
   - Manual testing with real MCP servers
   - Prepare for code review and merging

---

**Good luck with implementation!** 🎉

For questions or blockers, refer to the feature spec and research documents.
