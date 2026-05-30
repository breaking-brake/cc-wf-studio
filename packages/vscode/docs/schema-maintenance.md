# Workflow Schema Maintenance Guide

## Overview

This guide explains how to maintain synchronization between TypeScript type definitions and the AI workflow schema documentation.

## Key Files

### Source of Truth: TypeScript Type Definitions
- **File**: `src/shared/types/workflow-definition.ts`
- **Contains**:
  - `NodeType` enum - All supported node types
  - Node data interfaces (SubAgentData, AskUserQuestionData, etc.)
  - `VALIDATION_RULES` - Validation constraints

### AI Documentation: Workflow Schema JSON
- **File**: `resources/workflow-schema.json`
- **Purpose**: Machine-readable schema for AI to generate workflows
- **Contains**:
  - Node type definitions with fields and constraints
  - Validation rules (maxNodes, field lengths, patterns)
  - Example workflows
  - Connection rules

## When to Update

Update `resources/workflow-schema.json` whenever you:

1. **Add a new node type** to `NodeType` enum
2. **Modify node data interfaces** (add/remove/change fields)
3. **Change VALIDATION_RULES** (maxNodes, maxLength, patterns, etc.)
4. **Deprecate node types** (e.g., Branch → IfElse/Switch)

## Update Procedure

### 1. Modify TypeScript Type Definitions

Edit `src/shared/types/workflow-definition.ts`:

```typescript
// Example: Adding a new node type
export enum NodeType {
  // ... existing types
  NewNodeType = 'newNodeType',
}

// Example: Updating validation rules
export const VALIDATION_RULES = {
  WORKFLOW: {
    MAX_NODES: 50, // Changed from 30
  },
  // ... other rules
};
```

### 2. Update Workflow Schema JSON

Edit `resources/workflow-schema.json`:

#### Adding a New Node Type

```json
{
  "nodeTypes": {
    "newNodeType": {
      "description": "Brief description of what this node does",
      "fields": {
        "fieldName": {
          "type": "string",
          "required": true,
          "maxLength": 100
        }
      },
      "inputPorts": 1,
      "outputPorts": 1
    }
  }
}
```

#### Updating Validation Rules

```json
{
  "metadata": {
    "maxNodes": 50  // Match VALIDATION_RULES.WORKFLOW.MAX_NODES
  },
  "nodeTypes": {
    "subAgent": {
      "fields": {
        "prompt": {
          "maxLength": 10000  // Match VALIDATION_RULES.SUB_AGENT.PROMPT_MAX_LENGTH
        }
      }
    }
  }
}
```

#### Adding Example Workflows

Update the `examples` array with relevant examples demonstrating the new features:

```json
{
  "examples": [
    {
      "name": "Example showing new node type",
      "nodes": [...],
      "connections": [...]
    }
  ]
}
```

### 3. Verify Synchronization

Run the verification script (if available) or manually check:

```bash
# Check that all NodeType values are documented
grep -o "NodeType\.[A-Za-z]*" src/shared/types/workflow-definition.ts

# Check nodeTypes in schema
cat resources/workflow-schema.json | python3 -m json.tool | grep -A 1 '"nodeTypes"'
```

### 4. Test AI Generation

1. Build the extension: `npm run build`
2. Test AI workflow generation with the new schema
3. Verify generated workflows are valid

## Validation Rules Mapping

| TypeScript Constant | Schema Location | Purpose |
|---------------------|----------------|---------|
| `VALIDATION_RULES.WORKFLOW.MAX_NODES` | `metadata.maxNodes` | Maximum nodes per workflow |
| `VALIDATION_RULES.NODE.NAME_MAX_LENGTH` | Node-specific field constraints | Max length for node names |
| `VALIDATION_RULES.SUB_AGENT.PROMPT_MAX_LENGTH` | `nodeTypes.subAgent.fields.prompt.maxLength` | Max prompt length |
| `VALIDATION_RULES.ASK_USER_QUESTION.QUESTION_MAX_LENGTH` | `nodeTypes.askUserQuestion.fields.questionText.maxLength` | Max question length |
| `VALIDATION_RULES.ASK_USER_QUESTION.OPTIONS_MAX_COUNT` | `nodeTypes.askUserQuestion.fields.options.maxItems` | Max number of options |

## Common Maintenance Tasks

### Deprecating a Node Type

1. Mark as deprecated in TypeScript:
   ```typescript
   export enum NodeType {
     Branch = 'branch', // @deprecated Use IfElse or Switch instead
   }
   ```

2. **Do NOT remove** from schema immediately (backward compatibility)
3. Add deprecation notice in schema:
   ```json
   {
     "branch": {
       "description": "DEPRECATED: Use ifElse or switch instead. Maintained for backward compatibility.",
       "deprecated": true
     }
   }
   ```

### Changing Field Constraints

1. Update `VALIDATION_RULES` in TypeScript
2. Update corresponding `maxLength`, `minLength`, `pattern`, etc. in schema
3. Update example workflows if needed to comply with new constraints

### Optimizing Schema Size

The schema is used as AI context, so keep it under 15KB:

- Use concise descriptions
- Avoid redundant examples
- Compress JSON (no pretty-printing for production)
- Remove deprecated nodes after grace period (6+ months)

## File Size Target

- **Target**: < 10KB (allows room for growth)
- **Current**: ~11KB (acceptable)
- **Maximum**: 15KB (beyond this, consider splitting)

If schema exceeds 15KB, consider:
- Moving examples to separate file
- Creating focused schemas per use case
- Removing legacy/deprecated content

## Checklist

When making schema changes, verify:

- [ ] All `NodeType` enum values are documented in schema
- [ ] All `VALIDATION_RULES` values match schema constraints
- [ ] Example workflows use valid node types and connections
- [ ] Schema is valid JSON (`python3 -m json.tool < resources/workflow-schema.json`)
- [ ] File size is acceptable (< 15KB)
- [ ] AI generation tests pass
- [ ] TypeScript compilation succeeds (`npm run compile`)

## Related Files

- `src/extension/services/schema-loader-service.ts` - Loads schema for AI context
- `src/extension/utils/validate-workflow.ts` - Validates AI-generated workflows
- `src/extension/commands/ai-generation.ts` - Constructs prompts with schema

## Questions?

For questions or issues with schema maintenance, refer to:
- Design doc: `/specs/001-ai-workflow-generation/plan.md`
- Type definitions: `src/shared/types/workflow-definition.ts`
- Validation logic: `src/extension/utils/validate-workflow.ts`
