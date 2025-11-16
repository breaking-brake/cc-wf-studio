# Feature Specification: MCP Node Natural Language Mode

**Feature Branch**: `001-mcp-natural-language-mode`
**Created**: 2025-11-16
**Status**: Draft
**Input**: User description: "MCPツールノードを、技術的な詳細を知らないユーザーでも簡単に使えるようにしたい。現在、MCPツールノードは各パラメータを個別に設定する必要があり、MCPツールのスキーマやパラメータの型を理解していないと使いにくい。しかし、実際にはスラッシュコマンド実行時にClaude Codeがパラメータを柔軟に設定できるため、ユーザーは自然言語で「やりたいこと」を書くだけで済むはず。ユーザーが自分の習熟度や目的に応じて、以下の3つのモードから選択できるようにしたい: 1. 詳細モード(現在の実装): MCPサーバー、ツール、すべてのパラメータを明示的に設定。再現性が高く、デバッグしやすい。技術的に詳しいユーザー向け。2. 自然言語パラメータモード: MCPサーバーとツールは選択するが、パラメータは自然言語で「やりたいこと」を記述。ツール選択の確実性を保ちつつ、パラメータ設定の手間を省く。最もバランスの取れたモード。3. 完全自然言語モード: MCPサーバーのみ選択し、どのツールを使うかもパラメータも、すべて自然言語で「やりたいこと」を記述。最もシンプルだが、実行時に動的にツールが選択されるため再現性は低い。初心者や素早くプロトタイプを作りたいユーザー向け。どのモードでも、ユーザーは「何をしたいか」を明確に伝えられ、Claude Codeがその意図を理解して適切に実行できるようにしたい。エクスポートされたスラッシュコマンドには、Claude Codeが必要な情報(意図、パラメータスキーマ、利用可能なツール一覧など)がすべて含まれているようにする。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Between Configuration Modes (Priority: P1)

As a workflow creator, I want to select one of three configuration modes when setting up an MCP node, so that I can choose the level of detail appropriate for my skill level and use case.

**Why this priority**: Mode selection is the foundation of the feature. Without the ability to choose between modes, users cannot access the simplified configuration experience. This story delivers immediate value by providing a clear choice point that adapts to different user needs.

**Independent Test**: Can be fully tested by opening an MCP node configuration dialog, verifying that three mode options are presented with clear descriptions, selecting each mode, and confirming that the UI changes to reflect the selected mode's configuration requirements.

**Acceptance Scenarios**:

1. **Given** the user creates a new MCP node, **When** the configuration dialog opens, **Then** three mode options are displayed: "Detailed Mode", "Natural Language Parameter Mode", and "Full Natural Language Mode"
2. **Given** the mode selection screen is displayed, **When** the user hovers over each mode option, **Then** a tooltip or description explains the mode's purpose, benefits, and typical use cases
3. **Given** the user selects "Detailed Mode", **When** the configuration screen advances, **Then** the UI displays server selection, tool selection, and individual parameter fields (current implementation)
4. **Given** the user selects "Natural Language Parameter Mode", **When** the configuration screen advances, **Then** the UI displays server selection, tool selection, and a text area for natural language parameter description
5. **Given** the user selects "Full Natural Language Mode", **When** the configuration screen advances, **Then** the UI displays only server selection and a text area for natural language task description
6. **Given** an existing MCP node is configured in any mode, **When** the user edits the node, **Then** the dialog shows the current mode and allows switching to a different mode while preserving applicable configuration

---

### User Story 2 - Configure MCP Node in Natural Language Parameter Mode (Priority: P2)

As a workflow creator who knows which tool I need, I want to describe what I want to accomplish in natural language instead of filling out individual parameter fields, so that I can configure MCP tools quickly without understanding parameter schemas.

**Why this priority**: This mode provides the optimal balance between control and ease of use. Users get the reliability of explicit tool selection while avoiding the complexity of parameter configuration. It addresses the most common use case where users know which tool they need but find parameter configuration tedious.

**Independent Test**: Can be fully tested by selecting an MCP server, choosing a specific tool, entering a natural language description of the desired task, saving the node, exporting the workflow, and verifying that the exported slash command contains both the selected tool and the natural language description.

**Acceptance Scenarios**:

1. **Given** the user selects "Natural Language Parameter Mode", **When** the user chooses an MCP server and tool, **Then** a text area labeled "Describe what you want to do" appears with helpful placeholder text
2. **Given** the natural language description field is displayed, **When** the user types a description (e.g., "List all S3 buckets in us-east-1 region"), **Then** the description is validated for minimum length (e.g., 10 characters)
3. **Given** valid natural language description is entered, **When** the user saves the node, **Then** the node stores: mode type, server ID, tool name, and natural language description
4. **Given** a node configured in Natural Language Parameter Mode, **When** the workflow is exported to a slash command, **Then** the export includes: the selected tool name, the natural language description, and metadata indicating this is a natural language parameter configuration

---

### User Story 3 - Configure MCP Node in Full Natural Language Mode (Priority: P3)

As a beginner workflow creator, I want to simply describe what I want to accomplish without selecting specific tools or understanding MCP server capabilities, so that I can quickly prototype workflows and let Claude Code determine the best tool to use.

**Why this priority**: This mode provides the simplest user experience but has lower reproducibility. It's valuable for rapid prototyping and beginners, but users gain significant value from P1 and P2 before needing this level of abstraction. The technical complexity of dynamic tool selection also makes this a natural later-stage feature.

**Independent Test**: Can be fully tested by selecting an MCP server, entering a natural language task description without choosing a tool, saving the node, exporting the workflow, and verifying that the exported slash command contains the server ID, available tools list, and the natural language task description.

**Acceptance Scenarios**:

1. **Given** the user selects "Full Natural Language Mode", **When** the user chooses an MCP server, **Then** the tool selection step is skipped and a text area for task description appears
2. **Given** the task description field is displayed, **When** the user types a description (e.g., "Find AWS documentation about S3 bucket policies"), **Then** the description is validated for minimum length (e.g., 20 characters for this mode)
3. **Given** valid task description is entered, **When** the user saves the node, **Then** the node stores: mode type, server ID, natural language task description, and a list of available tools from the selected server
4. **Given** a node configured in Full Natural Language Mode, **When** the workflow is exported to a slash command, **Then** the export includes: the server ID, available tools list from that server, the natural language task description, and metadata indicating dynamic tool selection is required
5. **Given** a workflow contains a Full Natural Language Mode MCP node, **When** the node is displayed on the canvas, **Then** a visual indicator (e.g., icon or badge) shows that this node uses dynamic tool selection

---

### User Story 4 - Export Natural Language Configurations to Executable Slash Commands (Priority: P2)

As a workflow creator, I want workflows containing natural language MCP nodes to export as slash commands that Claude Code can execute, so that my configured workflows function correctly regardless of which mode I used.

**Why this priority**: Export functionality is essential for making workflows actionable, but it depends on P1 (mode selection) and P2/P3 (configuration). This priority reflects that it must work before users can truly validate the feature, but comes after the core configuration experience.

**Independent Test**: Can be fully tested by creating workflows with MCP nodes in each of the three modes, exporting each workflow to a slash command, reviewing the exported command file, and verifying that each contains the appropriate metadata and instructions for Claude Code to interpret the user's intent.

**Acceptance Scenarios**:

1. **Given** a workflow contains an MCP node in Detailed Mode, **When** the workflow is exported, **Then** the slash command contains explicit tool name and parameter key-value pairs (current export format)
2. **Given** a workflow contains an MCP node in Natural Language Parameter Mode, **When** the workflow is exported, **Then** the slash command contains: the tool name, parameter schema, and natural language description with instructions for Claude Code to map the description to parameter values
3. **Given** a workflow contains an MCP node in Full Natural Language Mode, **When** the workflow is exported, **Then** the slash command contains: the server ID, available tools list with their schemas, natural language task description, and instructions for Claude Code to select appropriate tool(s) and set parameters
4. **Given** exported slash commands include natural language descriptions, **When** Claude Code executes the command, **Then** Claude Code has sufficient context to interpret the user's intent and make appropriate tool/parameter decisions
5. **Given** a workflow with multiple MCP nodes in different modes, **When** the workflow is exported, **Then** each node's export format correctly reflects its configuration mode

---

### Edge Cases

- What happens when a user switches from Detailed Mode to Natural Language Parameter Mode after configuring specific parameters?
- How does the system handle natural language descriptions that are ambiguous or too vague to execute?
- What happens when an MCP server's available tools change after a Full Natural Language Mode node is configured?
- How does the system behave when a natural language description conflicts with the selected tool's capabilities in Natural Language Parameter Mode?
- What happens if a user provides an empty or very short natural language description?
- How does the system handle mode switching when the user has partially configured a node?
- What happens when exporting a workflow if the MCP server referenced by a Full Natural Language Mode node is no longer available?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide three distinct configuration modes for MCP nodes: Detailed Mode, Natural Language Parameter Mode, and Full Natural Language Mode
- **FR-002**: System MUST present mode selection as the first step when creating or editing an MCP node
- **FR-003**: System MUST display clear descriptions of each mode's purpose, benefits, and typical use cases
- **FR-004**: System MUST allow users to switch between modes when editing an existing MCP node
- **FR-005**: In Detailed Mode, system MUST provide the existing UI for server selection, tool selection, and individual parameter configuration
- **FR-006**: In Natural Language Parameter Mode, system MUST provide UI for server selection, tool selection, and a text field for natural language parameter description
- **FR-007**: In Full Natural Language Mode, system MUST provide UI for server selection and a text field for natural language task description
- **FR-008**: System MUST validate natural language descriptions for minimum length: 10 characters for Natural Language Parameter Mode, 20 characters for Full Natural Language Mode
- **FR-009**: System MUST store mode type with each MCP node configuration
- **FR-010**: System MUST store natural language descriptions with appropriate metadata (mode type, selected server/tool, timestamp)
- **FR-011**: For Full Natural Language Mode nodes, system MUST retrieve and store the list of available tools from the selected server at configuration time
- **FR-012**: System MUST provide visual indicators on the canvas to distinguish between configuration modes
- **FR-013**: When exporting Detailed Mode nodes, system MUST use the existing export format with explicit parameters
- **FR-014**: When exporting Natural Language Parameter Mode nodes, system MUST include: tool name, parameter schema, natural language description, and instructions for Claude Code
- **FR-015**: When exporting Full Natural Language Mode nodes, system MUST include: server ID, available tools list with schemas, natural language task description, and instructions for Claude Code
- **FR-016**: System MUST preserve all configuration data when users switch between modes (store but don't display incompatible data)
- **FR-017**: System MUST validate that selected MCP server is still available when loading workflows with natural language mode nodes

### Key Entities

- **MCP Node Mode Configuration**: Represents the selected mode and its associated data. Key attributes include: mode type (detailed/naturalLanguageParam/fullNaturalLanguage), timestamp of last mode change, original detailed configuration (preserved when switching modes)
- **Natural Language Parameter Configuration**: Represents configuration in Natural Language Parameter Mode. Key attributes include: selected server ID, selected tool name, natural language description, parameter schema reference (for export), configuration timestamp
- **Full Natural Language Configuration**: Represents configuration in Full Natural Language Mode. Key attributes include: selected server ID, natural language task description, available tools list (captured at configuration time), tools schema reference (for export), configuration timestamp
- **Export Metadata**: Additional data included in slash command exports. Key attributes include: configuration mode indicator, Claude Code interpretation instructions, parameter schemas (for natural language modes), available tools list (for full natural language mode)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select and configure MCP nodes in all three modes within 2 minutes per node
- **SC-002**: 90% of exported slash commands with natural language configurations contain all required metadata for Claude Code execution
- **SC-003**: Users can switch between modes without losing configured data (data is preserved but may not be visible in the new mode)
- **SC-004**: Natural language descriptions are validated with clear error messages when below minimum length thresholds
- **SC-005**: Visual indicators on the canvas allow users to identify node configuration modes at a glance (within 3 seconds)
- **SC-006**: Full Natural Language Mode nodes capture complete tool schema information at configuration time (100% of available tools from selected server)
- **SC-007**: Exported workflows maintain backwards compatibility with Detailed Mode nodes (existing workflows continue to work)
- **SC-008**: Mode selection UI presents all three options with descriptions visible without scrolling or additional clicks
