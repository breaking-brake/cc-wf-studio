# Feature Specification: MCP Node Integration

**Feature Branch**: `001-mcp-node`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "MCPノードの実装: Claude CodeのMCPサーバーと連携し、ユーザーがワークフローエディタ上でMCPツールを選択・設定できるノードタイプを追加する。SkillノードのUIパターンを踏襲し、MCPサーバー一覧からツールを選択、パラメータを設定、ワークフローに統合できる機能を提供する。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - MCP Tool Discovery and Selection (Priority: P1)

As a workflow creator, I want to browse available MCP servers and their tools, select one tool, and add it to my workflow canvas, so that I can integrate external AI capabilities into my automation workflow.

**Why this priority**: This is the core MVP functionality. Without the ability to discover and add MCP tools, the feature provides no value. This story delivers immediate value by enabling users to access MCP tools in their workflows.

**Independent Test**: Can be fully tested by opening the MCP browser dialog, selecting any available MCP tool from any connected server, and verifying that an MCP node appears on the canvas with the correct tool name and description.

**Acceptance Scenarios**:

1. **Given** the workflow editor is open, **When** the user clicks "Add MCP Node" button, **Then** a dialog appears showing all available MCP servers
2. **Given** the MCP browser dialog is open, **When** the user selects a specific MCP server, **Then** the dialog displays all tools provided by that server
3. **Given** a list of MCP tools is displayed, **When** the user selects a specific tool and clicks "Add", **Then** an MCP node is added to the canvas with the tool's name and description
4. **Given** no MCP servers are configured, **When** the user opens the MCP browser dialog, **Then** the dialog displays a message indicating no servers are available with guidance on how to configure them

---

### User Story 2 - MCP Tool Parameter Configuration (Priority: P2)

As a workflow creator, I want to configure the required parameters for an MCP tool node, so that I can specify the inputs the tool needs when the workflow executes.

**Why this priority**: Parameter configuration is essential for making MCP tools functional, but the initial value comes from adding nodes (P1). Users can manually edit parameters even without a UI in P1, making this a natural second step.

**Independent Test**: Can be fully tested by selecting an MCP node on the canvas, opening its property panel, entering parameter values, saving, and verifying the values persist when the node is re-selected.

**Acceptance Scenarios**:

1. **Given** an MCP node is selected on the canvas, **When** the user opens the node's property panel, **Then** the panel displays all required and optional parameters for that tool
2. **Given** the property panel is open, **When** the user enters values for parameters, **Then** the values are validated according to the parameter's type and constraints
3. **Given** valid parameter values are entered, **When** the user saves the node configuration, **Then** the values are stored with the node and displayed when the node is re-selected
4. **Given** a parameter has a specific format requirement, **When** the user enters an invalid value, **Then** the system displays a clear error message explaining the correct format

---

### User Story 3 - MCP Node Workflow Integration (Priority: P3)

As a workflow creator, I want to connect MCP nodes to other workflow nodes and see the MCP tool's execution reflected in the workflow export, so that the configured MCP tools can be part of the automated workflow execution.

**Why this priority**: Integration with the broader workflow is the final step that makes MCP nodes actionable. However, users gain value from P1 and P2 even if workflow export is manual initially.

**Independent Test**: Can be fully tested by creating a workflow with an MCP node, connecting it to other nodes, exporting the workflow to a slash command, and verifying the exported format includes the MCP tool call with correct parameters.

**Acceptance Scenarios**:

1. **Given** an MCP node exists on the canvas, **When** the user connects it to another node, **Then** the connection is visually represented and stored in the workflow data
2. **Given** a workflow contains MCP nodes, **When** the user exports the workflow to a slash command, **Then** the exported command includes MCP tool invocation instructions
3. **Given** a workflow with MCP nodes is saved, **When** the workflow is reopened, **Then** all MCP nodes display their configured tools and parameters correctly
4. **Given** an MCP server becomes unavailable, **When** a workflow containing nodes from that server is opened, **Then** affected nodes display a warning status indicating the server is unreachable

---

### Edge Cases

- What happens when an MCP server is configured but not currently running or accessible?
- How does the system handle MCP tools with complex nested parameter schemas (objects, arrays)?
- What happens when an MCP server updates and changes its available tools or parameter schemas?
- How does the system behave when attempting to configure parameters for a tool that requires authentication?
- What happens if the user saves a workflow with MCP nodes but the MCP server is removed from their configuration later?
- How does the system handle MCP tools that have parameters with large enumerations (e.g., 100+ options)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST retrieve the list of configured MCP servers from the user's Claude Code configuration
- **FR-002**: System MUST display MCP servers organized by scope (user-level, project-level, enterprise-level)
- **FR-003**: System MUST retrieve and display all tools provided by each MCP server
- **FR-004**: Users MUST be able to browse and select one MCP tool from the available tools
- **FR-005**: System MUST create a new MCP node on the canvas when a tool is selected
- **FR-006**: System MUST store the following information for each MCP node: server identifier, tool name, tool description, and configured parameters
- **FR-007**: System MUST provide a property panel for MCP nodes where users can view and edit tool parameters
- **FR-008**: System MUST validate parameter values according to each parameter's type and constraints
- **FR-009**: System MUST display parameter descriptions and format requirements in the property panel
- **FR-010**: System MUST persist MCP node configurations when workflows are saved
- **FR-011**: System MUST validate MCP server availability when a workflow containing MCP nodes is loaded
- **FR-012**: System MUST indicate validation status for each MCP node (valid/missing/invalid)
- **FR-013**: System MUST export MCP node configurations in a format compatible with slash command execution
- **FR-014**: Users MUST be able to connect MCP nodes to other workflow nodes using the standard connection mechanism
- **FR-015**: System MUST provide visual differentiation between MCP nodes and other node types on the canvas

### Key Entities

- **MCP Node**: Represents an MCP tool in the workflow. Key attributes include: node ID, node type (MCP), tool name, tool description, server identifier, configured parameters, validation status, position on canvas
- **MCP Server Reference**: Represents a configured MCP server. Key attributes include: server identifier, server name, server description, scope (user/project/enterprise), connection status, available tools list
- **MCP Tool Reference**: Represents an available tool from an MCP server. Key attributes include: tool name, tool description, parameter schema, server identifier
- **Tool Parameter**: Represents a configurable parameter for an MCP tool. Key attributes include: parameter name, parameter type, description, required/optional flag, default value, validation constraints

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add an MCP node to the workflow canvas in under 3 clicks (open browser → select tool → add)
- **SC-002**: Users can configure all parameters for an MCP tool through the visual property panel without editing JSON or code
- **SC-003**: Users receive clear feedback when an MCP server is unavailable or a tool is missing, with guidance on how to resolve the issue
- **SC-004**: Workflows containing MCP nodes can be successfully saved, reopened, and exported without data loss
- **SC-005**: Users can successfully integrate MCP tools into workflows alongside existing node types (SubAgent, AskUserQuestion, etc.)
- **SC-006**: 90% of MCP tool parameter configurations are completed successfully on the first attempt without validation errors

## Assumptions

- Claude Code CLI provides a reliable interface for retrieving MCP server and tool information (`claude mcp list`, `claude mcp get`)
- MCP servers follow a consistent parameter schema format that can be parsed and rendered in a generic UI
- The Skill node implementation pattern (directory scanning, browser dialog, property panel) is applicable to MCP nodes with minimal adaptation
- Users have basic familiarity with MCP servers and their purpose from Claude Code usage
- MCP server connections can be validated asynchronously without blocking the UI
- The workflow export format supports embedding MCP tool invocation instructions (similar to how Skill nodes are handled)
- Error messages from MCP servers are user-friendly enough to display directly to end users, or can be translated into user-friendly messages
- Parameter validation can be performed client-side based on parameter type information without requiring server-side validation calls

## Dependencies

- Claude Code CLI must be installed and accessible from the VSCode extension environment
- MCP server configuration must be properly set up in the user's Claude Code settings
- Existing workflow editor infrastructure (canvas, node management, connection handling) must support adding new node types
- Message passing infrastructure between Extension Host and Webview must support MCP-related operations
