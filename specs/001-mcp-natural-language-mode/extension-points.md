# MCP Node Natural Language Mode - Extension Points Analysis

**Date**: 2025-11-16
**Task**: T001 - Phase 1

## Overview

This document identifies the specific extension points in the existing MCP node implementation that need to be modified or extended to support the Natural Language Mode feature.

---

## 1. Type Definitions (src/shared/types/mcp-node.ts)

### Current Implementation

```typescript
export interface McpNodeData {
  serverId: string;
  toolName: string;
  toolDescription: string;
  parameters: ToolParameter[];
  parameterValues: Record<string, unknown>;
  validationStatus: 'valid' | 'missing' | 'invalid';
  outputPorts: 1;
}
```

**Characteristics**:
- Detailed mode only (explicit server, tool, and parameter configuration)
- No mode field (implicitly 'detailed')
- Parameter-focused data structure

### Extension Points

#### 1.1 Add New Type Definitions

```typescript
/**
 * MCP node configuration mode
 */
export type McpNodeMode = 'detailed' | 'naturalLanguageParam' | 'fullNaturalLanguage';

/**
 * Natural Language Parameter Mode configuration
 */
export interface NaturalLanguageParamConfig {
  description: string;
  timestamp: string; // ISO 8601
}

/**
 * Full Natural Language Mode configuration
 */
export interface FullNaturalLanguageConfig {
  taskDescription: string;
  availableTools: McpToolReference[];
  timestamp: string; // ISO 8601
}

/**
 * Preserved detailed mode configuration (for mode switching)
 */
export interface PreservedDetailedConfig {
  parameterValues: Record<string, unknown>;
  timestamp: string; // ISO 8601
}

/**
 * Mode-specific export metadata (discriminated union)
 */
export type ModeExportMetadata =
  | { mode: 'detailed' }
  | {
      mode: 'naturalLanguageParam';
      toolName: string;
      parameterSchema: object;
      userIntent: string;
      instructions: string;
    }
  | {
      mode: 'fullNaturalLanguage';
      serverId: string;
      availableTools: McpToolReference[];
      userIntent: string;
      instructions: string;
    };
```

#### 1.2 Extend McpNodeData Interface

```typescript
export interface McpNodeData {
  // Existing fields (unchanged)
  serverId: string;
  toolName: string;
  toolDescription: string;
  parameters: ToolParameter[];
  parameterValues: Record<string, unknown>;
  validationStatus: 'valid' | 'missing' | 'invalid';
  outputPorts: 1;

  // New fields for Natural Language Mode
  mode?: McpNodeMode; // Default: 'detailed' if undefined (backwards compatibility)
  naturalLanguageParamConfig?: NaturalLanguageParamConfig;
  fullNaturalLanguageConfig?: FullNaturalLanguageConfig;
  preservedDetailedConfig?: PreservedDetailedConfig;
}
```

**Implementation Notes**:
- `mode` is optional for backwards compatibility (v1.2.0 workflows)
- Mode-specific config fields are mutually exclusive (enforced by allOf schema constraints)
- `preservedDetailedConfig` preserves data when switching from detailed mode

---

## 2. Edit Dialog Component (src/webview/src/components/dialogs/McpNodeEditDialog.tsx)

### Current Implementation

**File**: `src/webview/src/components/dialogs/McpNodeEditDialog.tsx` (277 lines)

**Flow**:
1. Load tool schema via `getMcpToolSchema()`
2. Display `ParameterFormGenerator` for parameter configuration
3. Validate via `validateAllParameters()`
4. Save via `updateNodeData()`

**Characteristics**:
- Single-step dialog
- Assumes server and tool are already selected
- Parameter-focused UI

### Extension Points

#### 2.1 Convert to Multi-Step Wizard

**New Structure**:
```
Step 1: Mode Selection (NEW)
  ↓
Step 2: Server Selection (CONDITIONAL - depends on mode)
  ↓
Step 3: Tool Selection (CONDITIONAL - skipped in fullNaturalLanguage mode)
  ↓
Step 4: Configuration (MODE-SPECIFIC)
  - Detailed Mode: Existing ParameterFormGenerator
  - Natural Language Parameter Mode: NaturalLanguageInputField
  - Full Natural Language Mode: NaturalLanguageInputField (task description)
```

#### 2.2 New Components Required

- `ModeSelectionStep.tsx` (src/webview/src/components/mode-selection/)
  - Display 3 mode cards (Material Design-inspired layout)
  - Mode descriptions and icons
  - Radio group with ARIA attributes

- `NaturalLanguageInputField.tsx` (src/webview/src/components/mode-selection/)
  - Textarea with debounced validation (300ms)
  - Min length: 10 chars (naturalLanguageParam), 20 chars (fullNaturalLanguage)
  - Error message display

- Custom hook: `useMcpNodeWizard`
  - Wizard state management
  - Step navigation (next, back, canProceed)
  - Step-specific validation

#### 2.3 Mode Switch Warning Dialog

**When**: User changes mode on existing node
**Content**:
```
⚠️ Mode Switch Warning

Switching from [Current Mode] to [New Mode] will change how this node is configured.

Your current configuration will be preserved but may not be visible in the new mode.
You can switch back to [Current Mode] at any time to restore the previous configuration.

[Continue] [Cancel]
```

#### 2.4 Data Save Logic Extension

**Current**:
```typescript
updateNodeData(nodeId, {
  ...nodeData,
  parameterValues,
});
```

**Extended**:
```typescript
// Detailed Mode
updateNodeData(nodeId, {
  mode: 'detailed',
  serverId,
  toolName,
  toolDescription,
  parameters,
  parameterValues,
  validationStatus: 'valid',
  outputPorts: 1,
});

// Natural Language Parameter Mode
updateNodeData(nodeId, {
  mode: 'naturalLanguageParam',
  serverId,
  toolName,
  toolDescription,
  parameters,
  parameterValues: {}, // Empty or preserved
  naturalLanguageParamConfig: {
    description: naturalLanguageDescription,
    timestamp: new Date().toISOString(),
  },
  validationStatus: 'valid',
  outputPorts: 1,
  // Preserve detailed config if switching from detailed mode
  preservedDetailedConfig: previousMode === 'detailed' ? {
    parameterValues: nodeData.parameterValues,
    timestamp: new Date().toISOString(),
  } : undefined,
});

// Full Natural Language Mode
updateNodeData(nodeId, {
  mode: 'fullNaturalLanguage',
  serverId,
  toolName: '', // Empty for full NL mode
  toolDescription: '', // Empty for full NL mode
  parameters: [],
  parameterValues: {},
  fullNaturalLanguageConfig: {
    taskDescription: taskDescription,
    availableTools: await getAvailableToolsFromServer(serverId),
    timestamp: new Date().toISOString(),
  },
  validationStatus: 'valid',
  outputPorts: 1,
  // Preserve detailed config if switching from detailed mode
  preservedDetailedConfig: previousMode === 'detailed' ? {
    parameterValues: nodeData.parameterValues,
    timestamp: new Date().toISOString(),
  } : undefined,
});
```

---

## 3. Canvas Node Component (src/webview/src/components/nodes/McpNode/McpNode.tsx)

### Current Implementation

**File**: `src/webview/src/components/nodes/McpNode/McpNode.tsx` (197 lines)

**Display Elements**:
- Node header: "MCP TOOL"
- Validation status icon (✓, ⚠, ✗)
- Tool name
- Server badge
- Tool description (2-line clamp)
- Parameter count

### Extension Points

#### 3.1 Add Mode Indicator Badge

**New Component**: `ModeIndicatorBadge.tsx` (src/webview/src/components/mode-selection/)

**Implementation**:
```typescript
interface ModeIndicatorBadgeProps {
  mode: McpNodeMode;
  naturalLanguageConfig?: NaturalLanguageParamConfig | FullNaturalLanguageConfig;
}

export function ModeIndicatorBadge({ mode, naturalLanguageConfig }: ModeIndicatorBadgeProps) {
  const icon = mode === 'detailed' ? '⚙️' : mode === 'naturalLanguageParam' ? '◐' : '●';
  const tooltip = mode === 'detailed'
    ? 'Detailed Mode'
    : mode === 'naturalLanguageParam'
    ? `Natural Language Parameter Mode\n${naturalLanguageConfig?.description?.substring(0, 50)}...`
    : `Full Natural Language Mode\n${naturalLanguageConfig?.taskDescription?.substring(0, 50)}...`;

  return (
    <span
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        fontSize: '12px',
        opacity: 0.7,
      }}
      title={tooltip}
    >
      {icon}
    </span>
  );
}
```

#### 3.2 Update McpNode Component

**Insertion Point**: After node header, before tool name (around line 106)

```typescript
{/* Mode Indicator Badge */}
<ModeIndicatorBadge
  mode={data.mode || 'detailed'}
  naturalLanguageConfig={data.naturalLanguageParamConfig || data.fullNaturalLanguageConfig}
/>
```

---

## 4. Workflow Store (src/webview/src/stores/workflow-store.ts)

### Current Implementation

**File**: `src/webview/src/stores/workflow-store.ts` (404 lines)

**Key Functions**:
- `updateNodeData(nodeId, data)` - Update node data (line 241-247)
- `addGeneratedWorkflow(workflow)` - Add AI-generated workflow (line 310-343)
- `updateWorkflow(workflow)` - Update existing workflow (line 345-372)

### Extension Points

#### 4.1 Backwards Compatibility Handling

**Where**: In `addGeneratedWorkflow()` and `updateWorkflow()`

**Current**:
```typescript
const newNodes: Node[] = workflow.nodes.map((node) => ({
  id: node.id,
  type: node.type,
  position: { x: node.position.x, y: node.position.y },
  data: node.data,
}));
```

**Extended**:
```typescript
const newNodes: Node[] = workflow.nodes.map((node) => {
  const nodeData = node.data;

  // For MCP nodes: ensure mode field exists (backwards compatibility with v1.2.0)
  if (node.type === 'mcp') {
    const mcpData = nodeData as McpNodeData;
    if (!mcpData.mode) {
      mcpData.mode = 'detailed'; // Default for v1.2.0 workflows
    }
  }

  return {
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: nodeData,
  };
});
```

**Note**: No additional changes required. The existing `updateNodeData()` function already supports updating any fields in node data.

---

## 5. Export Service (src/extension/services/export-service.ts)

### Current Implementation

**File**: `src/extension/services/export-service.ts` (644 lines)

**MCP Node Export**: In `generateWorkflowExecutionLogic()` function (lines 452-499)

**Current Output Format**:
```markdown
## MCP Nodes

#### node_id(toolName)

**Description**: toolDescription

**Server**: serverId

**Tool Name**: toolName

**Validation Status**: valid

**Configured Parameters**:

- `paramName` (type): value

**Available Parameters**:

- `paramName` (type) (required): description

Use the MCP tool `serverId::toolName` with the configured parameters listed above.
```

### Extension Points

#### 5.1 Add Mode Detection Logic

**Replace**: Current MCP node formatting (lines 452-499)

**With**:
```typescript
// MCP node details
if (mcpNodes.length > 0) {
  sections.push(translate('mcpNode.title'));
  sections.push('');
  for (const node of mcpNodes) {
    const mode = node.data.mode || 'detailed';

    // Dispatch to mode-specific formatter
    if (mode === 'detailed') {
      sections.push(...formatDetailedModeMcpNode(node));
    } else if (mode === 'naturalLanguageParam') {
      sections.push(...formatNaturalLanguageParamModeMcpNode(node));
    } else if (mode === 'fullNaturalLanguage') {
      sections.push(...formatFullNaturalLanguageModeMcpNode(node));
    }
    sections.push('');
  }
}
```

#### 5.2 Create Mode-Specific Formatter Functions

**5.2.1 Detailed Mode Formatter** (existing implementation moved to function)

```typescript
function formatDetailedModeMcpNode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);

  sections.push(`#### ${nodeId}(${node.data.toolName})`);
  sections.push('');
  sections.push(`${translate('mcpNode.description')}: ${node.data.toolDescription}`);
  // ... (existing implementation)
  sections.push(translate('mcpNode.executionMethod'));

  return sections;
}
```

**5.2.2 Natural Language Parameter Mode Formatter**

```typescript
function formatNaturalLanguageParamModeMcpNode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);
  const config = node.data.naturalLanguageParamConfig!;

  // HTML comment metadata for Claude Code
  sections.push('<!-- MCP Tool Call: Natural Language Parameter Mode -->');
  sections.push(`<!-- Server: ${node.data.serverId} -->`);
  sections.push(`<!-- Tool: ${node.data.toolName} -->`);
  sections.push(`<!-- Parameter Schema: ${JSON.stringify(node.data.parameters)} -->`);
  sections.push(`<!-- User Intent: "${config.description}" -->`);
  sections.push('');

  sections.push(`#### ${nodeId}(${node.data.toolName})`);
  sections.push('');
  sections.push(`Use the MCP tool \`${node.data.serverId}::${node.data.toolName}\` to accomplish the following:`);
  sections.push('');
  sections.push(`> ${config.description}`);
  sections.push('');
  sections.push('Map this natural language description to the tool\'s parameters according to the schema above.');

  return sections;
}
```

**5.2.3 Full Natural Language Mode Formatter**

```typescript
function formatFullNaturalLanguageModeMcpNode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);
  const config = node.data.fullNaturalLanguageConfig!;

  // HTML comment metadata for Claude Code
  sections.push('<!-- MCP Tool Selection: Full Natural Language Mode -->');
  sections.push(`<!-- Server: ${node.data.serverId} -->`);
  sections.push('<!-- Available Tools: -->');
  for (const tool of config.availableTools) {
    sections.push(`<!-- - ${tool.name} (${tool.description}) -->`);
  }
  sections.push(`<!-- User Intent: "${config.taskDescription}" -->`);
  sections.push('');

  sections.push(`#### ${nodeId}(${node.data.serverId})`);
  sections.push('');
  sections.push(`Use any appropriate tool from the MCP server \`${node.data.serverId}\` to accomplish the following:`);
  sections.push('');
  sections.push(`> ${config.taskDescription}`);
  sections.push('');
  sections.push('Select the most appropriate tool from the available tools listed above and set its parameters according to the user\'s intent.');

  return sections;
}
```

#### 5.3 Export Metadata Format

**Detailed Mode**: No metadata (existing behavior)

**Natural Language Parameter Mode**:
```html
<!-- MCP Tool Call: Natural Language Parameter Mode -->
<!-- Server: aws-knowledge-mcp -->
<!-- Tool: get_regional_availability -->
<!-- Parameter Schema: {...JSON Schema...} -->
<!-- User Intent: "Check if Lambda and DynamoDB APIs are available in us-east-1" -->
```

**Full Natural Language Mode**:
```html
<!-- MCP Tool Selection: Full Natural Language Mode -->
<!-- Server: aws-knowledge-mcp -->
<!-- Available Tools: -->
<!-- - get_regional_availability (Check AWS resource availability) -->
<!-- - read_documentation (Read AWS docs) -->
<!-- - recommend (Get related docs) -->
<!-- - search_documentation (Search AWS docs) -->
<!-- User Intent: "Find documentation about how to set up S3 bucket policies for public access" -->
```

---

## 6. Validation Logic (src/extension/utils/validate-workflow.ts)

### Extension Points

#### 6.1 Add Mode-Specific Validation

**New Validation Rules**:

```typescript
// For Natural Language Parameter Mode
if (mcpNode.data.mode === 'naturalLanguageParam') {
  if (!mcpNode.data.naturalLanguageParamConfig) {
    errors.push({
      code: 'MCP_NL_CONFIG_MISSING',
      message: 'Natural language parameter configuration is missing',
      nodeId: mcpNode.id,
    });
  } else if (mcpNode.data.naturalLanguageParamConfig.description.length < 10) {
    errors.push({
      code: 'MCP_NL_DESC_TOO_SHORT',
      message: 'Natural language description must be at least 10 characters',
      nodeId: mcpNode.id,
    });
  }
}

// For Full Natural Language Mode
if (mcpNode.data.mode === 'fullNaturalLanguage') {
  if (!mcpNode.data.fullNaturalLanguageConfig) {
    errors.push({
      code: 'MCP_FULL_NL_CONFIG_MISSING',
      message: 'Full natural language configuration is missing',
      nodeId: mcpNode.id,
    });
  } else if (mcpNode.data.fullNaturalLanguageConfig.taskDescription.length < 20) {
    errors.push({
      code: 'MCP_TASK_DESC_TOO_SHORT',
      message: 'Task description must be at least 20 characters',
      nodeId: mcpNode.id,
    });
  }

  if (mcpNode.data.toolName !== '') {
    errors.push({
      code: 'MCP_FULL_NL_TOOL_SET',
      message: 'Full natural language mode should not have toolName set',
      nodeId: mcpNode.id,
    });
  }
}
```

---

## 7. MCP Cache Service (src/extension/services/mcp-cache-service.ts)

### Extension Points

#### 7.1 Add Available Tools Fetching

**New Function**:
```typescript
/**
 * Get all available tools from a specific MCP server
 *
 * @param serverId - MCP server identifier
 * @returns Array of tool references with schemas
 */
export async function getAvailableToolsFromServer(
  serverId: string
): Promise<McpToolReference[]> {
  // Implementation: Call 'claude mcp get' for the server
  // Cache results for performance
  // Return tool list with parameter schemas
}
```

**Usage**: Called when saving a Full Natural Language Mode node to capture available tools snapshot.

---

## Summary of Extension Points

| Component | File Path | Extension Type | Priority |
|-----------|-----------|---------------|----------|
| Type Definitions | `src/shared/types/mcp-node.ts` | Add new types, extend interface | P1 (Blocker) |
| Edit Dialog | `src/webview/src/components/dialogs/McpNodeEditDialog.tsx` | Convert to wizard | P1 (MVP) |
| Mode Selection Step | `src/webview/src/components/mode-selection/ModeSelectionStep.tsx` | New component | P1 (MVP) |
| NL Input Field | `src/webview/src/components/mode-selection/NaturalLanguageInputField.tsx` | New component | P2 |
| Mode Indicator Badge | `src/webview/src/components/mode-selection/ModeIndicatorBadge.tsx` | New component | P3 |
| Canvas Node | `src/webview/src/components/nodes/McpNode/McpNode.tsx` | Add badge display | P3 |
| Workflow Store | `src/webview/src/stores/workflow-store.ts` | Add backwards compatibility | P1 (Blocker) |
| Export Service | `src/extension/services/export-service.ts` | Add mode formatters | P2 (Export) |
| Validation | `src/extension/utils/validate-workflow.ts` | Add mode validation | P2 (Export) |
| MCP Cache Service | `src/extension/services/mcp-cache-service.ts` | Add tool fetching | P3 |

**Total Extension Points**: 10 files
- **New Files**: 3 (ModeSelectionStep, NaturalLanguageInputField, ModeIndicatorBadge)
- **Modified Files**: 7

---

## Next Steps

**Phase 2 (Foundation)**: Implement core type definitions and data model extensions (Tasks T004-T011)
