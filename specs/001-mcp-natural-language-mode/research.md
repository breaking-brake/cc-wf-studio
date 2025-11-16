# Research: MCP Node Natural Language Mode

**Feature**: MCP Node Natural Language Mode
**Branch**: `001-mcp-natural-language-mode`
**Phase**: 0 - Outline & Research
**Date**: 2025-11-16

## Research Objectives

This document consolidates research findings to resolve technical unknowns and guide implementation decisions for the MCP Node Natural Language Mode feature. The primary goal is to determine the optimal approach for extending the existing MCP node implementation to support natural language configuration while maintaining backwards compatibility and export functionality.

## 1. Mode Selection UI Pattern

### Decision: Multi-step wizard with mode selection as first step

**Context**: Users need to choose between three configuration modes (Detailed, Natural Language Parameter, Full Natural Language) when creating or editing an MCP node.

**Research Findings**:
- Existing McpNodeEditDialog uses a multi-step wizard pattern (server selection → tool selection → parameter configuration)
- Adding mode selection as the first step maintains consistency with current UX
- React state management via useState for tracking current mode
- Mode can be changed during editing with appropriate warning dialogs for data preservation

**Rationale**:
- Minimal disruption to existing user flows (backwards compatible)
- Clear decision point before committing to configuration approach
- Allows users to switch modes if they change their mind
- Follows VSCode extension UX patterns

**Alternatives Considered**:
- **Separate menu items for each mode**: Rejected because it splits the entry point and makes mode switching difficult
- **Inline mode toggle during configuration**: Rejected because it creates confusion about when to switch and loses the "commitment" aspect of mode selection

**Implementation Approach**:
- Insert ModeSelectionStep component before existing ServerSelectionStep
- Use Material Design-inspired card layout (3 cards, radio-group behavior)
- Display mode name, icon, description, typical use case in each card
- Store selected mode in component state and pass to subsequent steps

---

## 2. Natural Language Description Storage

### Decision: Extend McpNodeData with mode field and separate config objects

**Context**: Need to store natural language descriptions alongside existing detailed parameter configurations while supporting mode switching.

**Research Findings**:
- Current McpNodeData structure (src/shared/types/mcp-node.ts):
  ```typescript
  interface McpNodeData {
    serverId: string;
    toolName: string;
    toolDescription: string;
    parameters: ToolParameter[];
    parameterValues: Record<string, unknown>;
    validationStatus: 'valid' | 'missing' | 'invalid';
    outputPorts: 1;
  }
  ```
- Backwards compatibility requirement: existing nodes without mode field should default to 'detailed'
- TypeScript discriminated unions allow type-safe mode-specific data

**Rationale**:
- Non-breaking change: adding optional fields preserves existing workflow compatibility
- Type safety through discriminated unions prevents invalid data combinations
- Clear separation between mode metadata and mode-specific configuration
- Supports "preserve all data on mode switch" requirement (FR-016)

**Alternatives Considered**:
- **Single unified config object**: Rejected because it mixes concerns and makes validation complex
- **Separate node types for each mode**: Rejected because it breaks the "single MCP node type" abstraction and complicates workflow logic
- **Metadata-only approach (no structural changes)**: Rejected because it doesn't support type-safe access to mode-specific fields

**Implementation Approach**:
```typescript
type McpNodeMode = 'detailed' | 'naturalLanguageParam' | 'fullNaturalLanguage';

interface McpNodeData {
  // Existing fields
  serverId: string;
  toolName: string;  // Empty for fullNaturalLanguage mode
  toolDescription: string;  // Empty for fullNaturalLanguage mode
  parameters: ToolParameter[];
  parameterValues: Record<string, unknown>;
  validationStatus: 'valid' | 'missing' | 'invalid';
  outputPorts: 1;

  // New fields for mode support
  mode?: McpNodeMode;  // Default: 'detailed' if undefined
  naturalLanguageParamConfig?: {
    description: string;
    timestamp: string;
  };
  fullNaturalLanguageConfig?: {
    taskDescription: string;
    availableTools: McpToolReference[];  // Snapshot at config time
    timestamp: string;
  };
  // Preserve detailed config even when in natural language mode
  preservedDetailedConfig?: {
    parameterValues: Record<string, unknown>;
  };
}
```

---

## 3. Export Format for Natural Language Modes

### Decision: Mode-specific metadata sections with Claude Code interpretation instructions

**Context**: Exported slash commands must contain sufficient information for Claude Code to interpret user intent in natural language modes.

**Research Findings**:
- Current export format (src/extension/services/export-service.ts):
  - Detailed mode: Explicit `mcp__<serverId>__<toolName>` invocation with parameter key-value pairs
  - Generated as markdown with code blocks containing tool calls
- Claude Code execution model: LLM interprets slash command markdown and makes tool calls
- Natural language descriptions need additional context (parameter schemas, available tools) to guide interpretation

**Rationale**:
- Claude Code can map natural language descriptions to structured parameters when given:
  1. The target tool name and parameter schema (Natural Language Parameter Mode)
  2. Available tools list with schemas (Full Natural Language Mode)
- Markdown format allows embedding metadata as structured comments or sections
- Instructions guide Claude Code on how to interpret the natural language description

**Alternatives Considered**:
- **JSON metadata block**: Rejected because it breaks markdown readability and doesn't match slash command conventions
- **Minimal metadata (description only)**: Rejected because it provides insufficient context for reliable interpretation
- **Inline parameter hints in natural language**: Rejected because it couples the user's description with technical hints

**Implementation Approach**:

**Natural Language Parameter Mode Export**:
```markdown
<!-- MCP Tool Call: Natural Language Parameter Mode -->
<!-- Server: aws-knowledge-mcp -->
<!-- Tool: get_regional_availability -->
<!-- Parameter Schema: ... (JSON schema) ... -->
<!-- User Intent: "List all S3 buckets in us-east-1 region" -->

Use the MCP tool `aws-knowledge-mcp::get_regional_availability` to accomplish the following:

> List all S3 buckets in us-east-1 region

Map this natural language description to the tool's parameters according to the schema above.
```

**Full Natural Language Mode Export**:
```markdown
<!-- MCP Tool Selection: Full Natural Language Mode -->
<!-- Server: aws-knowledge-mcp -->
<!-- Available Tools: -->
<!-- - get_regional_availability (Check AWS resource availability) -->
<!-- - read_documentation (Read AWS docs) -->
<!-- - recommend (Get related docs) -->
<!-- - search_documentation (Search AWS docs) -->
<!-- User Intent: "Find AWS documentation about S3 bucket policies" -->

Use any appropriate tool from the MCP server `aws-knowledge-mcp` to accomplish the following:

> Find AWS documentation about S3 bucket policies

Select the most appropriate tool from the available tools listed above and set its parameters according to the user's intent.
```

---

## 4. Natural Language Validation Rules

### Decision: Client-side validation with minimum length thresholds and debounced feedback

**Context**: Natural language descriptions must be sufficiently detailed for Claude Code to interpret user intent.

**Research Findings**:
- Minimum viable description lengths based on analysis of typical use cases:
  - Natural Language Parameter Mode: 10 characters (tool already selected, just need to describe parameter values)
  - Full Natural Language Mode: 20 characters (need to describe both tool selection and parameters)
- Validation timing: Real-time feedback with debounce to avoid interrupting typing
- Error messaging: 3-element format (what/why/how) per constitution

**Rationale**:
- Minimum length validation prevents empty or trivially short descriptions
- Debouncing (300ms) balances responsiveness with avoiding interruption
- Client-side validation provides immediate feedback without Extension Host round-trip
- Specific thresholds based on mode reflect different complexity requirements

**Alternatives Considered**:
- **Server-side validation only**: Rejected because it introduces latency and poor UX
- **Higher thresholds (50+ characters)**: Rejected because it's overly restrictive for simple tasks
- **No validation (trust user)**: Rejected because it allows unusable descriptions that will fail at execution time
- **LLM-based validation**: Rejected due to performance cost and unnecessary complexity

**Implementation Approach**:
```typescript
// src/webview/src/services/validation/natural-language-validator.ts

const MIN_LENGTH_NL_PARAM = 10;
const MIN_LENGTH_FULL_NL = 20;
const DEBOUNCE_MS = 300;

function validateNaturalLanguageDescription(
  description: string,
  mode: 'naturalLanguageParam' | 'fullNaturalLanguage'
): ValidationResult {
  const minLength = mode === 'naturalLanguageParam'
    ? MIN_LENGTH_NL_PARAM
    : MIN_LENGTH_FULL_NL;

  if (description.trim().length < minLength) {
    return {
      valid: false,
      errorCode: 'MCP_NL_DESC_TOO_SHORT',
      message: `Natural language description is too short (${description.length} characters). Please provide at least ${minLength} characters to help Claude Code understand your intent.`
    };
  }

  return { valid: true };
}
```

---

## 5. Mode Switching Data Preservation Strategy

### Decision: Preserve all data in separate fields, show mode-appropriate UI

**Context**: Users can switch between modes when editing an existing MCP node (FR-004). Need to preserve configured data to avoid data loss.

**Research Findings**:
- UX research: Data loss is a major frustration point when switching between UI modes
- Storage cost: Additional ~1KB per node for preserved data (well within 10KB constraint)
- Workflow file size impact: Minimal (<5% increase even with 50 nodes)

**Rationale**:
- Preserving all data allows users to experiment with modes without penalty
- Clear warning dialogs inform users about visibility changes (not data loss)
- Detailed mode configuration can be restored if user switches back
- Aligns with UX constitution principle (III: avoid data loss, provide clear feedback)

**Alternatives Considered**:
- **Discard incompatible data on switch**: Rejected due to data loss risk and poor UX
- **Block mode switching entirely**: Rejected because it removes user flexibility
- **Prompt user to confirm discard**: Rejected because preserved data approach is superior

**Implementation Approach**:
- When switching from Detailed → Natural Language:
  1. Store current parameterValues in preservedDetailedConfig
  2. Switch mode to natural language variant
  3. Show warning: "Detailed parameters are preserved but hidden. Switch back to Detailed Mode to edit them."
- When switching back to Detailed:
  1. Restore parameterValues from preservedDetailedConfig
  2. Clear natural language fields (but preserve in separate field for re-switching)
- UI only displays fields relevant to current mode

---

## 6. Visual Mode Indicators on Canvas

### Decision: Badge overlay on MCP node component showing mode icon

**Context**: Users need to identify which mode each MCP node is configured in at a glance (SC-005: <3 seconds).

**Research Findings**:
- Existing node components use React Flow custom node components
- Badge overlay pattern used in other VSCode extensions (e.g., Debugger breakpoint badges)
- Icon-based indicators more compact than text labels
- Accessibility: ARIA labels provide screen reader support

**Rationale**:
- Visual badge provides instant mode identification without cluttering node appearance
- Icon differentiation (detailed=cog, NL param=half-filled circle, full NL=circle) creates clear visual language
- Positioned in top-right corner to avoid interfering with node labels or connections
- Tooltip on hover provides full mode description

**Alternatives Considered**:
- **Different node colors per mode**: Rejected because color alone is not accessible and limits future color-based features
- **Text label on node**: Rejected due to space constraints on canvas
- **No visual indicator (mode visible only in property panel)**: Rejected because it fails SC-005 requirement

**Implementation Approach**:
```tsx
// src/webview/src/components/mode-selection/ModeIndicatorBadge.tsx

const MODE_ICONS = {
  detailed: '⚙️',  // Cog/gear icon
  naturalLanguageParam: '◐',  // Half-filled circle
  fullNaturalLanguage: '●'  // Full circle
};

function ModeIndicatorBadge({ mode }: { mode: McpNodeMode }) {
  return (
    <div
      className="mode-badge"
      role="img"
      aria-label={`Configuration mode: ${mode}`}
      title={getModeDescription(mode)}
    >
      {MODE_ICONS[mode]}
    </div>
  );
}
```

---

## 7. Best Practices for React Multi-Step Wizards

### Decision: Controlled component pattern with wizard state management hook

**Context**: McpNodeEditDialog will be extended with mode selection step. Need to manage wizard state cleanly.

**Research Findings**:
- Current implementation uses local useState for wizard step tracking
- React best practice: Custom hook for complex wizard logic
- Form validation: Validate each step before allowing progression
- Cancel/back behavior: Preserve partial state until dialog closes

**Rationale**:
- Custom hook (useMcpNodeWizard) encapsulates step navigation logic
- Controlled components ensure single source of truth for form state
- Step validation prevents invalid configurations from reaching later steps
- Aligns with React patterns used elsewhere in codebase

**Implementation Approach**:
```typescript
// src/webview/src/hooks/useMcpNodeWizard.ts

function useMcpNodeWizard(initialNode?: McpNode) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    mode: initialNode?.data.mode ?? 'detailed',
    serverId: initialNode?.data.serverId ?? '',
    toolName: initialNode?.data.toolName ?? '',
    // ... other fields
  });

  const canProceed = (step: number): boolean => {
    // Validation logic for each step
  };

  const nextStep = () => {
    if (canProceed(currentStep)) {
      setCurrentStep(current => current + 1);
    }
  };

  return { currentStep, wizardData, setWizardData, nextStep, previousStep, canProceed };
}
```

---

## 8. Backwards Compatibility Testing Strategy

### Decision: Snapshot-based workflow migration tests

**Context**: Existing workflows with MCP nodes (Detailed Mode) must continue to work after upgrade (SC-007).

**Research Findings**:
- Workflow schema versioning: Current version 1.2.0, upgrade to 1.3.0
- Migration strategy: No migration needed (mode field is optional, defaults to 'detailed')
- Test coverage: Golden file snapshots of workflows created in v1.2.0

**Rationale**:
- Optional mode field with default value ensures zero-migration upgrade path
- Snapshot tests catch unintended changes to export format
- Real workflow files provide comprehensive backwards compatibility validation

**Implementation Approach**:
```typescript
// tests/extension/integration/backwards-compatibility.test.ts

describe('Backwards Compatibility', () => {
  it('should load v1.2.0 workflow with MCP nodes as Detailed Mode', () => {
    const v120Workflow = loadTestWorkflow('fixtures/workflows/mcp-node-v1.2.0.json');
    const loaded = loadWorkflow(v120Workflow);

    const mcpNode = loaded.nodes.find(n => n.type === 'mcp') as McpNode;
    expect(mcpNode.data.mode).toBe('detailed');  // Default applied
    expect(mcpNode.data.parameterValues).toEqual(v120Workflow.nodes[0].data.parameterValues);
  });

  it('should export v1.2.0-loaded workflow in v1.3.0 format preserving all data', () => {
    const v120Workflow = loadTestWorkflow('fixtures/workflows/mcp-node-v1.2.0.json');
    const exported = exportWorkflow(v120Workflow);

    expect(exported).toMatchSnapshot();  // Ensure no breaking changes
  });
});
```

---

## Summary of Key Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Mode Selection UI | Multi-step wizard with mode as first step | Maintains UX consistency, supports mode switching |
| Data Storage | Extend McpNodeData with optional mode fields | Type-safe, backwards compatible, preserves all data |
| Export Format | Mode-specific metadata with Claude Code instructions | Provides context for NL interpretation |
| Validation | Client-side, min 10/20 chars, debounced | Immediate feedback, mode-appropriate thresholds |
| Mode Switching | Preserve all data in separate fields | Prevents data loss, flexible user experience |
| Visual Indicators | Badge overlay with mode icon | Fast identification (<3s), accessible |
| Wizard Pattern | Custom hook with controlled components | Clean state management, step validation |
| Backwards Compatibility | Optional fields with defaults, snapshot tests | Zero-migration upgrade, comprehensive validation |

---

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Natural language descriptions too vague for Claude Code | High (execution failure) | Medium | Validation rules + user guidance in UI placeholders |
| Export format incompatible with Claude Code execution model | High (feature unusable) | Low | Early validation with Claude Code team, integration tests |
| Mode switching data loss | Medium (user frustration) | Low | Comprehensive data preservation + warning dialogs |
| UI complexity increase | Medium (user confusion) | Low | Clear mode descriptions + optional mode (default: detailed) |
| Performance degradation with large tool lists | Low (slow Full NL Mode) | Medium | Tool list caching + pagination if >100 tools |

---

## Next Steps (Phase 1)

With research complete, proceed to Phase 1 (Design & Contracts):

1. **data-model.md**: Define TypeScript interfaces for mode-related types
2. **contracts/**: Create JSON schemas for extended McpNodeData and export metadata
3. **quickstart.md**: Write guide for using each configuration mode
4. **Update CLAUDE.md**: Add new technologies and patterns to project context
