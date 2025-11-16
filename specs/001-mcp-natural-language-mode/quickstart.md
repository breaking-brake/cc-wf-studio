# Quickstart: MCP Node Natural Language Mode

**Feature**: MCP Node Natural Language Mode
**Branch**: `001-mcp-natural-language-mode`
**Audience**: Workflow creators, developers, QA testers
**Last Updated**: 2025-11-16

## Overview

The MCP Node Natural Language Mode feature allows you to configure MCP (Model Context Protocol) tool nodes in workflows using three different modes that adapt to your skill level and use case:

- **Detailed Mode**: Configure server, tool, and all parameters explicitly (current implementation)
- **Natural Language Parameter Mode**: Select server and tool, then describe desired parameters in natural language
- **Full Natural Language Mode**: Select server only, then describe the entire task in natural language

This guide shows you how to use each mode effectively.

---

## Prerequisites

- Claude Code Workflow Studio extension installed (v2.5.0 or later)
- At least one MCP server configured in Claude Code
  - Run `claude mcp list` to verify MCP servers are available
  - See [Claude Code MCP documentation](https://code.claude.com/docs) for setup

---

## Mode 1: Detailed Mode (Current Implementation)

**Best for**: Users who know exactly which tool and parameters they need, or when maximum reproducibility is required.

### When to Use

- You have specific parameter values to configure
- You need to debug a workflow and want explicit control
- You're configuring a tool with complex parameter schemas
- You need to ensure exact reproducibility across workflow runs

### How to Use

1. **Create an MCP node**:
   - Open your workflow in the editor
   - Click "+ Add Node" → "MCP Node"
   - The mode selection dialog appears

2. **Select Detailed Mode**:
   - Click the "Detailed Mode" card
   - You'll see a description: "Configure server, tool, and all parameters explicitly. High reproducibility, best for technical users."
   - Click "Next"

3. **Select MCP Server**:
   - Choose from the list of available MCP servers (e.g., `aws-knowledge-mcp`)
   - Click "Next"

4. **Select Tool**:
   - Browse tools from the selected server
   - Click on a tool to see its description and parameters
   - Select the tool you want (e.g., `get_regional_availability`)
   - Click "Next"

5. **Configure Parameters**:
   - Fill out each parameter field individually
   - Required parameters are marked with an asterisk (*)
   - Example:
     - `region`: `us-east-1`
     - `resource_type`: `api`
     - `filters`: `["Lambda", "DynamoDB"]`
   - Click "Save"

6. **View on Canvas**:
   - The MCP node appears with a ⚙️ (gear) badge indicating Detailed Mode
   - Node label shows the tool name

### Example: AWS Documentation Search

**Goal**: Check if AWS Lambda is available in us-east-1

**Configuration**:
```
Mode: Detailed
Server: aws-knowledge-mcp
Tool: get_regional_availability
Parameters:
  - region: "us-east-1"
  - resource_type: "product"
  - filters: ["AWS Lambda"]
```

**Exported Slash Command**:
```markdown
Use the MCP tool `aws-knowledge-mcp::get_regional_availability` with the following parameters:

- region: "us-east-1"
- resource_type: "product"
- filters: ["AWS Lambda"]
```

---

## Mode 2: Natural Language Parameter Mode

**Best for**: Users who know which tool they need but prefer describing what they want instead of configuring individual parameters.

### When to Use

- You know which tool to use but find parameter configuration tedious
- You want faster configuration without losing tool selection control
- You're prototyping workflows and want to iterate quickly
- The tool has many optional parameters and you want Claude Code to infer sensible values

### How to Use

1. **Create an MCP node**:
   - Click "+ Add Node" → "MCP Node"

2. **Select Natural Language Parameter Mode**:
   - Click the "Natural Language Parameter Mode" card
   - Description: "Select server and tool, describe parameters in natural language. Balanced approach."
   - Click "Next"

3. **Select MCP Server and Tool**:
   - Choose server (e.g., `aws-knowledge-mcp`)
   - Choose tool (e.g., `get_regional_availability`)
   - Click "Next"

4. **Describe What You Want**:
   - A text area appears with placeholder text: "Describe what you want to do..."
   - Enter your natural language description (minimum 10 characters)
   - Example: `"Check if Lambda and DynamoDB APIs are available in us-east-1"`
   - Click "Save"

5. **View on Canvas**:
   - The MCP node appears with a ◐ (half-circle) badge indicating Natural Language Parameter Mode
   - Hover over the badge to see the description snippet

### Example: AWS Documentation Search

**Goal**: Same as Detailed Mode example, but using natural language

**Configuration**:
```
Mode: Natural Language Parameter
Server: aws-knowledge-mcp
Tool: get_regional_availability
Description: "Check if Lambda and DynamoDB APIs are available in us-east-1"
```

**Exported Slash Command**:
```markdown
<!-- MCP Tool Call: Natural Language Parameter Mode -->
<!-- Server: aws-knowledge-mcp -->
<!-- Tool: get_regional_availability -->
<!-- Parameter Schema: {...} -->
<!-- User Intent: "Check if Lambda and DynamoDB APIs are available in us-east-1" -->

Use the MCP tool `aws-knowledge-mcp::get_regional_availability` to accomplish the following:

> Check if Lambda and DynamoDB APIs are available in us-east-1

Map this natural language description to the tool's parameters according to the schema above.
```

### Tips for Writing Good Descriptions

✅ **Good descriptions**:
- "List all S3 buckets in the us-east-1 region"
- "Search for documentation about Lambda function URLs"
- "Get availability of EC2 and RDS products in eu-west-1"

❌ **Poor descriptions**:
- "Run it" (too vague)
- "Do AWS stuff" (no specific intent)
- "Check" (missing what to check and where)

**Rule of thumb**: Your description should answer "what?" and "where?" or "with what parameters?".

---

## Mode 3: Full Natural Language Mode

**Best for**: Beginners, rapid prototyping, or when you're not sure which tool is best for your task.

### When to Use

- You're new to MCP tools and don't know which one to use
- You want the simplest configuration possible
- You're rapidly prototyping a workflow and will refine later
- You want Claude Code to choose the most appropriate tool for your task

### How to Use

1. **Create an MCP node**:
   - Click "+ Add Node" → "MCP Node"

2. **Select Full Natural Language Mode**:
   - Click the "Full Natural Language Mode" card
   - Description: "Select server only, describe entire task in natural language. Simplest, lowest reproducibility."
   - Click "Next"

3. **Select MCP Server**:
   - Choose server (e.g., `aws-knowledge-mcp`)
   - Click "Next"
   - **Note**: Tool selection is skipped in this mode

4. **Describe Your Task**:
   - A text area appears with placeholder text: "Describe the task you want to accomplish..."
   - Enter your natural language description (minimum 20 characters)
   - Example: `"Find documentation about how to set up S3 bucket policies for public access"`
   - Click "Save"

5. **View on Canvas**:
   - The MCP node appears with a ● (full circle) badge indicating Full Natural Language Mode
   - Hover over the badge to see the task description snippet

### Example: AWS Documentation Search

**Goal**: Find documentation about S3 bucket policies (tool selection left to Claude Code)

**Configuration**:
```
Mode: Full Natural Language
Server: aws-knowledge-mcp
Task Description: "Find documentation about how to set up S3 bucket policies for public access"
```

**Exported Slash Command**:
```markdown
<!-- MCP Tool Selection: Full Natural Language Mode -->
<!-- Server: aws-knowledge-mcp -->
<!-- Available Tools: -->
<!-- - get_regional_availability (Check AWS resource availability) -->
<!-- - read_documentation (Read AWS docs) -->
<!-- - recommend (Get related docs) -->
<!-- - search_documentation (Search AWS docs) -->
<!-- User Intent: "Find documentation about how to set up S3 bucket policies for public access" -->

Use any appropriate tool from the MCP server `aws-knowledge-mcp` to accomplish the following:

> Find documentation about how to set up S3 bucket policies for public access

Select the most appropriate tool from the available tools listed above and set its parameters according to the user's intent.
```

### Tips for Writing Good Task Descriptions

✅ **Good task descriptions**:
- "Find documentation about how to set up S3 bucket policies for public access"
- "Search for AWS best practices for Lambda function error handling"
- "Get recommendations for related documentation about DynamoDB streams"

❌ **Poor task descriptions**:
- "AWS" (no specific task)
- "Help me with docs" (too vague)
- "S3" (no action specified)

**Rule of thumb**: Your task description should be a complete sentence describing a specific goal. Include the domain (AWS), the subject (S3 bucket policies), and the action (find documentation about).

---

## Switching Between Modes

You can switch modes when editing an existing MCP node. **All data is preserved** when switching, so you can experiment without losing work.

### Editing an Existing Node

1. **Select the node** on the canvas
2. **Click "Edit Node"** in the context menu
3. **The mode selection step appears** showing the current mode
4. **Choose a different mode** if desired
5. **Configure using the new mode's UI**
6. **Click "Save"**

### Data Preservation

- **Detailed → Natural Language**: Your parameter values are preserved. If you switch back to Detailed, they'll be restored.
- **Natural Language → Detailed**: You'll need to select a tool (if Full NL) and configure parameters, but your natural language description is preserved.
- **Between Natural Language modes**: Both descriptions are preserved.

### Warning Dialogs

When switching modes, you'll see a warning dialog:

```
⚠️ Mode Switch Warning

Switching from [Current Mode] to [New Mode] will change how this node is configured.

Your current configuration will be preserved but may not be visible in the new mode.
You can switch back to [Current Mode] at any time to restore the previous configuration.

[Continue] [Cancel]
```

---

## Exporting Workflows with Natural Language Modes

All three modes export to slash commands that Claude Code can execute.

### Export Process

1. **Open your workflow**
2. **Click "Export Workflow"** in the toolbar
3. **Choose export location**: `.claude/commands/`
4. **Click "Export"**

### Exported File Format

**File name**: `<workflow-name>.md` (e.g., `check-aws-availability.md`)

**Content structure**:
- Workflow description
- Execution instructions
- For each MCP node:
  - Mode-specific metadata (as HTML comments)
  - Claude Code interpretation instructions
  - User's intent (natural language description or explicit parameters)

### Using Exported Slash Commands

1. **Reload Claude Code** to recognize the new command
2. **Type `/check-aws-availability`** in Claude Code
3. **Claude Code executes** the workflow:
   - Detailed Mode: Calls MCP tools with explicit parameters
   - Natural Language Parameter Mode: Maps description to parameters using the provided schema
   - Full Natural Language Mode: Selects appropriate tool and maps description to parameters

---

## Troubleshooting

### Common Issues

**Issue**: "Natural language description is too short"

**Solution**: Provide at least 10 characters for Natural Language Parameter Mode, or 20 characters for Full Natural Language Mode. Be specific about what you want.

---

**Issue**: "No tools available from MCP server"

**Solution**:
1. Check if the MCP server is running: `claude mcp list`
2. Verify the server status is "connected"
3. If disconnected, check Claude Code MCP configuration

---

**Issue**: "Tool list may be outdated" warning in Full Natural Language Mode

**Solution**: This warning appears if the tool list snapshot is >7 days old. Edit the node and re-save to capture the latest available tools.

---

**Issue**: Exported slash command doesn't work as expected

**Solution**:
- For Natural Language Parameter Mode: Make your description more specific about parameter values
- For Full Natural Language Mode: Ensure your task description clearly indicates which type of tool is needed (e.g., "search" vs "read" documentation)

---

## Best Practices

### Choose the Right Mode

| Scenario | Recommended Mode | Why |
|----------|------------------|-----|
| Production workflows | Detailed | Maximum reproducibility and control |
| Rapid prototyping | Full Natural Language | Fastest configuration, least detail needed |
| Known tool, complex parameters | Natural Language Parameter | Balanced: explicit tool, flexible parameters |
| Debugging/troubleshooting | Detailed | Explicit control helps identify issues |
| Learning MCP tools | Full Natural Language | Discover tools without needing to know them |

### Workflow Organization

- **Use consistent modes within a workflow** if possible (easier to understand and maintain)
- **Document why you chose each mode** in node labels or workflow description
- **Start with Full Natural Language for exploration**, then refine to Natural Language Parameter or Detailed for production

### Exporting and Versioning

- **Export frequently** during development to test slash command execution
- **Use Detailed Mode for critical workflows** that must be reproducible
- **Version your exported slash commands** alongside your codebase (`.claude/commands/` directory)

---

## Next Steps

- **Try all three modes** on a simple workflow to get familiar with each approach
- **Experiment with mode switching** to see how data is preserved
- **Export a workflow with mixed modes** to see how the slash command handles different configurations
- **Read the full specification** at `specs/001-mcp-natural-language-mode/spec.md` for advanced use cases

---

## Related Documentation

- [MCP Node Implementation](../001-mcp-node/spec.md) - Base MCP node feature
- [Workflow Export Format](../001-cc-wf-studio/spec.md) - Details on slash command export
- [Claude Code MCP Documentation](https://code.claude.com/docs) - MCP server setup and usage
