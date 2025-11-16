/**
 * Claude Code Workflow Studio - Webview English Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const enWebviewTranslations: WebviewTranslationKeys = {
  // Toolbar
  'toolbar.workflowNamePlaceholder': 'Workflow name',
  'toolbar.save': 'Save',
  'toolbar.saving': 'Saving...',
  'toolbar.export': 'Export',
  'toolbar.exporting': 'Exporting...',
  'toolbar.generateWithAI': 'Generate with AI',
  'toolbar.refineWithAI': 'Edit with AI',
  'toolbar.selectWorkflow': 'Select workflow...',
  'toolbar.load': 'Load',
  'toolbar.refreshList': 'Refresh workflow list',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': 'Workflow name is required',
  'toolbar.error.workflowNameRequiredForExport': 'Workflow name is required for export',
  'toolbar.error.selectWorkflowToLoad': 'Please select a workflow to load',
  'toolbar.error.validationFailed': 'Workflow validation failed',
  'toolbar.error.missingEndNode': 'Workflow must have at least one End node',
  'toolbar.error.noActiveWorkflow': 'Please load a workflow first',

  // Node Palette
  'palette.title': 'Node Palette',
  'palette.basicNodes': 'Basic Nodes',
  'palette.controlFlow': 'Control Flow',
  'palette.quickStart': '💡 Quick Start',

  // Node types
  'node.prompt.title': 'Prompt',
  'node.prompt.description': 'Template with variables',
  'node.subAgent.title': 'Sub-Agent',
  'node.subAgent.description': 'Execute a specialized task',
  'node.end.title': 'End',
  'node.end.description': 'Workflow termination point',
  'node.branch.title': 'Branch',
  'node.branch.description': 'Conditional branching logic',
  'node.branch.deprecationNotice': 'Deprecated. Please migrate to If/Else or Switch nodes',
  'node.ifElse.title': 'If/Else',
  'node.ifElse.description': 'Binary conditional branch (True/False)',
  'node.switch.title': 'Switch',
  'node.switch.description': 'Multi-way conditional branch (2-N cases)',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': 'Branch based on user choice',
  'node.skill.title': 'Skill',
  'node.skill.description': 'Execute a Claude Code Skill',

  // Quick start instructions
  'palette.instruction.addNode': 'Click a node to add it to the canvas',
  'palette.instruction.dragNode': 'Drag nodes to reposition them',
  'palette.instruction.connectNodes': 'Connect nodes by dragging from output to input handles',
  'palette.instruction.editProperties': 'Select a node to edit its properties',

  // Property Panel
  'property.title': 'Properties',
  'property.noSelection': 'Select a node to view its properties',

  // Node type badges
  'property.nodeType.subAgent': 'Sub-Agent',
  'property.nodeType.askUserQuestion': 'Ask User Question',
  'property.nodeType.branch': 'Branch Node',
  'property.nodeType.ifElse': 'If/Else Node',
  'property.nodeType.switch': 'Switch Node',
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
  'property.nodeType.skill': 'Skill Node',
  'property.nodeType.unknown': 'Unknown',

  // Common property labels
  'property.nodeName': 'Node Name',
  'property.nodeName.placeholder': 'Enter node name',
  'property.nodeName.help': 'Used for exported file name (e.g., "data-analysis")',
  'property.description': 'Description',
  'property.prompt': 'Prompt',
  'property.model': 'Model',
  'property.label': 'Label',
  'property.label.placeholder': 'Enter label',
  'property.evaluationTarget': 'Evaluation Target',
  'property.evaluationTarget.placeholder': 'e.g., Result of the previous step',
  'property.evaluationTarget.help': 'Describe what to evaluate in the branch condition',

  // Start/End node descriptions
  'property.startNodeDescription':
    'Start node marks the beginning of the workflow. It cannot be deleted and has no editable properties.',
  'property.endNodeDescription':
    'End node marks the completion of the workflow. At least one End node is required for export.',
  'property.unknownNodeType': 'Unknown node type:',

  // Sub-Agent properties
  'property.tools': 'Tools (comma-separated)',
  'property.tools.placeholder': 'e.g., Read,Write,Bash',
  'property.tools.help': 'Leave empty for all tools',

  // Skill properties
  'property.skillPath': 'Skill Path',
  'property.scope': 'Scope',
  'property.scope.personal': 'Personal',
  'property.scope.project': 'Project',
  'property.validationStatus': 'Validation Status',
  'property.validationStatus.valid': 'Valid',
  'property.validationStatus.missing': 'Missing',
  'property.validationStatus.invalid': 'Invalid',
  'property.validationStatus.valid.tooltip': 'Skill is valid and ready to use',
  'property.validationStatus.missing.tooltip': 'SKILL.md file not found at specified path',
  'property.validationStatus.invalid.tooltip': 'SKILL.md has invalid YAML frontmatter',
  'property.allowedTools': 'Allowed Tools',

  // AskUserQuestion properties
  'property.questionText': 'Question',
  'property.multiSelect': 'Multiple Selection',
  'property.multiSelect.enabled': 'User can select multiple options (outputs selected list)',
  'property.multiSelect.disabled': 'User selects one option (branches to corresponding node)',
  'property.aiSuggestions': 'AI Suggests Options',
  'property.aiSuggestions.enabled': 'AI will dynamically generate options based on context',
  'property.aiSuggestions.disabled': 'Manually define options below',
  'property.options': 'Options',
  'property.optionsCount': 'Options ({count}/4)',
  'property.optionNumber': 'Option {number}',
  'property.addOption': '+ Add Option',
  'property.remove': 'Remove',
  'property.optionLabel.placeholder': 'Label',
  'property.optionDescription.placeholder': 'Description',

  // Prompt properties
  'property.promptTemplate': 'Prompt Template',
  'property.promptTemplate.placeholder': 'Enter prompt template with {{variables}}',
  'property.promptTemplate.help': 'Use {{variableName}} syntax for dynamic values',
  'property.detectedVariables': 'Detected Variables ({count})',
  'property.variablesSubstituted': 'Variables will be substituted at runtime',

  // Branch properties
  'property.branchType': 'Branch Type',
  'property.conditional': 'Conditional (2-way)',
  'property.switch': 'Switch (Multi-way)',
  'property.branchType.conditional.help': '2 branches (True/False)',
  'property.branchType.switch.help': 'Multiple branches (2-N way)',
  'property.branches': 'Branches',
  'property.branchesCount': 'Branches ({count})',
  'property.branchNumber': 'Branch {number}',
  'property.addBranch': '+ Add Branch',
  'property.branchLabel': 'Label',
  'property.branchLabel.placeholder': 'e.g., Success, Error',
  'property.branchCondition': 'Condition (natural language)',
  'property.branchCondition.placeholder': 'e.g., If the previous process succeeded',
  'property.minimumBranches': 'Minimum 2 branches required',

  // Default node labels
  'default.newSubAgent': 'New Sub-Agent',
  'default.enterPrompt': 'Enter your prompt here',
  'default.newQuestion': 'New Question',
  'default.option': 'Option',
  'default.firstOption': 'First option',
  'default.secondOption': 'Second option',
  'default.newOption': 'New option',
  'default.newPrompt': 'New Prompt',
  'default.promptTemplate':
    'Enter your prompt template here.\n\nYou can use variables like {{variableName}}.',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': 'When condition is true',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': 'When condition is false',
  'default.case1': 'Case 1',
  'default.case1Condition': 'When condition 1 is met',
  'default.case2': 'Case 2',
  'default.case2Condition': 'When condition 2 is met',
  'default.case3': 'Case 3',
  'default.case3Condition': 'When condition 3 is met',
  'default.conditionPrefix': 'When condition ',
  'default.conditionSuffix': ' is met',

  // Tour
  'tour.welcome':
    "Welcome to Claude Code Workflow Studio!\n\nThis tour will introduce the key features and show you where everything is. Let's get familiar with the basics before creating your first workflow.",
  'tour.nodePalette':
    'The Node Palette contains various nodes you can use in your workflow.\n\nClick on Prompt, Sub-Agent, AskUserQuestion, If/Else, Switch, and other nodes to add them to the canvas.',
  'tour.addPrompt':
    'This "Prompt" button lets you add Prompt nodes to the canvas.\n\nA Prompt node is a template that supports variables and is the basic building block of workflows.',
  'tour.canvas':
    'This is the canvas. Drag nodes to adjust their position and drag handles to connect nodes.\n\nStart and End nodes are already placed.',
  'tour.propertyPanel':
    'The Property Panel lets you configure the selected node.\n\nYou can edit node name, prompt, model selection, and more.',
  'tour.addAskUserQuestion':
    'The "AskUserQuestion" node lets you branch the workflow based on user selection.\n\nYou can add it to the canvas using this button.',
  'tour.connectNodes':
    'Connect nodes to create your workflow.\n\nDrag from the output handle (⚪) on the right of a node to the input handle on the left of another node.',
  'tour.workflowName':
    'This is where you name your workflow.\n\nYou can use letters, numbers, hyphens, and underscores.',
  'tour.saveWorkflow':
    'Click the "Save" button to save your workflow as JSON in the `.vscode/workflows/` directory.\n\nYou can load and continue editing later.',
  'tour.loadWorkflow':
    'To load a saved workflow, select it from the dropdown menu and click the "Load" button.',
  'tour.exportWorkflow':
    'Click the "Export" button to export in a format executable by Claude Code.\n\nSub-Agents go to `.claude/agents/` and SlashCommands to `.claude/commands/`.',
  'tour.refineWithAI':
    'Use the "Edit with AI" button to create or improve workflows through an interactive chat with AI.\n\nYou can start from an empty canvas or edit existing workflows conversationally.',
  'tour.helpButton':
    'To see this tour again, click the help button (?).\n\nEnjoy creating workflows!',

  // Tour buttons
  'tour.button.back': 'Back',
  'tour.button.close': 'Close',
  'tour.button.finish': 'Finish',
  'tour.button.next': 'Next ({step}/{steps})',
  'tour.button.skip': 'Skip',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': 'Delete Node',
  'dialog.deleteNode.message': 'Are you sure you want to delete this node?',
  'dialog.deleteNode.confirm': 'Delete',
  'dialog.deleteNode.cancel': 'Cancel',

  // Skill Browser Dialog
  'skill.browser.title': 'Browse Skills',
  'skill.browser.description':
    'Select a Claude Code Skill to add to your workflow.\nSkills are specialized capabilities that Claude Code automatically utilizes.',
  'skill.browser.personalTab': 'Personal',
  'skill.browser.projectTab': 'Project',
  'skill.browser.noSkills': 'No Skills found in this directory',
  'skill.browser.loading': 'Loading Skills...',
  'skill.browser.selectButton': 'Add to Workflow',
  'skill.browser.cancelButton': 'Cancel',
  'skill.browser.skillName': 'Skill Name',
  'skill.browser.skillDescription': 'Description',
  'skill.browser.skillPath': 'Path',
  'skill.browser.validationStatus': 'Status',

  // Skill Browser Errors
  'skill.error.loadFailed': 'Failed to load Skills. Please check your Skill directories.',
  'skill.error.noSelection': 'Please select a Skill',
  'skill.error.unknown': 'An unexpected error occurred',

  // Skill Creation Dialog
  'skill.creation.title': 'Create New Skill',
  'skill.creation.description':
    'Create a new Claude Code Skill. Skills are specialized tools that can be invoked by Claude Code to perform specific tasks.',
  'skill.creation.nameLabel': 'Skill Name',
  'skill.creation.nameHint': 'Lowercase letters, numbers, and hyphens only (max 64 characters)',
  'skill.creation.descriptionLabel': 'Description',
  'skill.creation.descriptionPlaceholder':
    'Brief description of what this Skill does and when to use it',
  'skill.creation.instructionsLabel': 'Instructions',
  'skill.creation.instructionsPlaceholder':
    'Enter detailed instructions in Markdown format.\n\nExample:\n# My Skill\n\nThis Skill performs...',
  'skill.creation.instructionsHint': 'Markdown-formatted instructions for Claude Code',
  'skill.creation.allowedToolsLabel': 'Allowed Tools (optional)',
  'skill.creation.allowedToolsHint': 'Comma-separated list of tool names (e.g., Read, Grep, Glob)',
  'skill.creation.scopeLabel': 'Scope',
  'skill.creation.scopePersonal': 'Personal (~/.claude/skills/)',
  'skill.creation.scopeProject': 'Project (.claude/skills/)',
  'skill.creation.cancelButton': 'Cancel',
  'skill.creation.createButton': 'Create Skill',
  'skill.creation.creatingButton': 'Creating...',
  'skill.creation.error.unknown': 'Failed to create Skill. Please try again.',

  // Skill Validation Errors
  'skill.validation.nameRequired': 'Skill name is required',
  'skill.validation.nameTooLong': 'Skill name must be 64 characters or less',
  'skill.validation.nameInvalidFormat':
    'Skill name must contain only lowercase letters, numbers, and hyphens',
  'skill.validation.descriptionRequired': 'Description is required',
  'skill.validation.descriptionTooLong': 'Description must be 1024 characters or less',
  'skill.validation.instructionsRequired': 'Instructions are required',
  'skill.validation.scopeRequired': 'Please select a scope (Personal or Project)',

  // Workflow Refinement (001-ai-workflow-refinement)
  'refinement.toolbar.refineButton': 'Edit with AI',
  'refinement.toolbar.refineButton.tooltip': 'Open chat to edit this workflow with AI assistance',

  // Refinement Chat Panel (Short form keys for components)
  'refinement.title': 'Edit with AI',
  'refinement.inputPlaceholder': 'Describe the changes you want to make...',
  'refinement.sendButton': 'Send',
  'refinement.cancelButton': 'Cancel',
  'refinement.processing': 'Processing...',
  'refinement.aiProcessing': 'AI is processing your request...',
  'refinement.charactersRemaining': '{count} characters remaining',
  'refinement.iterationCounter': 'Edits: {current}',
  'refinement.iterationCounter.tooltip':
    'High edit counts may slow down save/load operations and impact editing workflow',
  'refinement.warning.title': 'Long Conversation',
  'refinement.warning.message':
    'The conversation history is getting large, which may increase file size and impact performance. Consider clearing the conversation history.',

  // Refinement Chat Panel (Detailed keys)
  'refinement.chat.title': 'Workflow Refinement Chat',
  'refinement.chat.description':
    'Chat with AI to iteratively improve your workflow. Describe what changes you want, and the AI will update the workflow automatically.',
  'refinement.chat.inputPlaceholder': 'Describe the changes you want (e.g., "Add error handling")',
  'refinement.chat.sendButton': 'Send',
  'refinement.chat.sendButton.shortcut': 'Ctrl+Enter to send',
  'refinement.chat.sendButton.shortcutMac': 'Cmd+Enter to send',
  'refinement.chat.cancelButton': 'Cancel',
  'refinement.chat.closeButton': 'Close',
  'refinement.chat.clearButton': 'Clear Conversation',
  'refinement.chat.clearButton.tooltip': 'Clear conversation history and start fresh',
  'refinement.chat.useSkillsCheckbox': 'Include Skills',

  // Timeout selector
  'refinement.timeout.label': 'Timeout',
  'refinement.timeout.ariaLabel': 'Select AI refinement timeout duration',

  'refinement.chat.claudeMdTip':
    '💡 Tip: Add workflow-specific rules and constraints to CLAUDE.md for more accurate AI edits',
  'refinement.chat.refining': 'AI is refining workflow... This may take up to 120 seconds.',
  'refinement.chat.progressTime': '{elapsed}s / {max}s',
  'refinement.chat.characterCount': '{count} / {max} characters',
  'refinement.chat.iterationCounter': 'Iteration {current} / {max}',
  'refinement.chat.iterationWarning': 'Approaching iteration limit ({current}/{max})',
  'refinement.chat.iterationLimitReached':
    'Maximum iteration limit reached ({max}). Please clear conversation to continue.',
  'refinement.chat.noMessages': 'No messages yet. Start by describing what you want to improve.',
  'refinement.chat.userMessageLabel': 'You',
  'refinement.chat.aiMessageLabel': 'AI',
  'refinement.chat.success': 'Workflow refined successfully!',
  'refinement.chat.changesSummary': 'Changes: {summary}',

  // Refinement Success Messages
  'refinement.success.defaultMessage': 'Workflow has been updated.',

  // Refinement Errors
  'refinement.error.emptyMessage': 'Please enter a message',
  'refinement.error.messageTooLong': 'Message is too long (max {max} characters)',
  'refinement.error.commandNotFound':
    'Claude Code CLI not found. Please install Claude Code to use AI refinement.',
  'refinement.error.timeout':
    'AI refinement timed out. Please adjust the timeout value and try again. Simplifying the request is also recommended.',
  'refinement.error.parseError':
    'Failed to parse AI response. Please try again or rephrase your request.',
  'refinement.error.validationError':
    'Refined workflow failed validation. Please try a different request.',
  'refinement.error.iterationLimitReached':
    'Maximum iteration limit (20) has been reached. Clear conversation history to start fresh, or manually edit the workflow.',
  'refinement.error.unknown': 'An unexpected error occurred. Check logs for details.',

  // Refinement Error Display (Phase 3.8)
  'refinement.error.retryButton': 'Retry',

  // Processing Overlay (Phase 3.10)
  'refinement.processingOverlay': 'AI is processing your request...',

  // Clear Conversation Confirmation
  'refinement.clearDialog.title': 'Clear Conversation',
  'refinement.clearDialog.message':
    'Are you sure you want to clear the conversation history? This cannot be undone.',
  'refinement.clearDialog.confirm': 'Clear',
  'refinement.clearDialog.cancel': 'Cancel',

  // Initial instructional message (Phase 3.12)
  'refinement.initialMessage.description':
    'Describe the workflow you want to achieve in natural language.',
  'refinement.initialMessage.note':
    '※ This feature uses Claude Code installed in your environment.',

  // MCP Node (Feature: 001-mcp-node)
  'node.mcp.title': 'MCP Tool',
  'node.mcp.description': 'Execute MCP tool',

  // MCP Server List
  'mcp.loading.servers': 'Loading MCP servers...',
  'mcp.error.serverLoadFailed': 'Failed to load MCP servers',
  'mcp.empty.servers': 'No MCP servers configured',

  // MCP Tool List
  'mcp.loading.tools': 'Loading tools...',
  'mcp.error.toolLoadFailed': 'Failed to load tools from server',
  'mcp.empty.tools': 'No tools available for this server',

  // MCP Tool Search
  'mcp.search.placeholder': 'Search tools by name or description...',
  'mcp.search.noResults': 'No tools found matching "{query}"',

  // MCP Node Dialog
  'mcp.dialog.title': 'MCP Tool Configuration',
  'mcp.dialog.selectServer': 'Select MCP Server',
  'mcp.dialog.selectTool': 'Select Tool',
  'mcp.dialog.addButton': 'Add Tool',
  'mcp.dialog.cancelButton': 'Cancel',
  'mcp.dialog.wizardStep': 'Step {{current}} of {{total}}',
  'mcp.dialog.nextButton': 'Next',
  'mcp.dialog.backButton': 'Back',
  'mcp.dialog.saveButton': 'Create Node',
  'mcp.dialog.error.noServerSelected': 'Please select an MCP server',
  'mcp.dialog.error.noToolSelected': 'Please select a tool',
  'mcp.dialog.error.incompleteWizard': 'Please complete all required steps',
  'mcp.dialog.error.cannotProceed': 'Please fill in all required fields to proceed',
  'mcp.dialog.error.invalidMode': 'Invalid mode selected',

  // MCP Property Panel
  'property.nodeType.mcp': 'MCP Tool',
  'property.mcp.serverId': 'Server',
  'property.mcp.toolName': 'Tool Name',
  'property.mcp.toolDescription': 'Description',
  'property.mcp.parameters': 'Parameters',
  'property.mcp.parameterValues': 'Parameter Values',
  'property.mcp.parameterCount': 'Parameter Count',
  'property.mcp.editParameters': 'Edit Parameters',
  'property.mcp.edit.manualParameterConfig': 'Edit Parameters',
  'property.mcp.edit.aiParameterConfig': 'Edit Parameter Config Description',
  'property.mcp.edit.aiToolSelection': 'Edit Task',
  'property.mcp.infoNote':
    'MCP tool properties are loaded from the server. Click "Edit Parameters" to configure parameter values.',

  // MCP Parameter Form
  'mcp.parameter.formTitle': 'Tool Parameters',
  'mcp.parameter.noParameters': 'This tool has no parameters',
  'mcp.parameter.selectOption': '-- Select an option --',
  'mcp.parameter.enterValue': 'Enter value',
  'mcp.parameter.minLength': 'Min length',
  'mcp.parameter.maxLength': 'Max length',
  'mcp.parameter.pattern': 'Pattern',
  'mcp.parameter.minimum': 'Min',
  'mcp.parameter.maximum': 'Max',
  'mcp.parameter.default': 'Default',
  'mcp.parameter.addItem': 'Add item',
  'mcp.parameter.add': 'Add',
  'mcp.parameter.remove': 'Remove',
  'mcp.parameter.arrayCount': 'Items',
  'mcp.parameter.jsonFormat': 'JSON format required',
  'mcp.parameter.jsonInvalid': 'Invalid JSON format',
  'mcp.parameter.objectInvalid': 'Value must be a JSON object',
  'mcp.parameter.unsupportedType': 'Unsupported parameter type: {type} for {name}',
  'mcp.parameter.validationErrors': 'Please fix the following validation errors:',

  // MCP Edit Dialog
  'mcp.editDialog.title': 'Configure MCP Tool Parameters',
  'mcp.editDialog.saveButton': 'Save',
  'mcp.editDialog.cancelButton': 'Cancel',
  'mcp.editDialog.loading': 'Loading tool schema...',
  'mcp.editDialog.error.schemaLoadFailed': 'Failed to load tool schema',

  // MCP Natural Language Mode (Feature: 001-mcp-natural-language-mode)

  // Mode Selection
  'mcp.modeSelection.title': 'Select Configuration Mode',
  'mcp.modeSelection.subtitle': 'Choose how you want to configure this MCP tool',
  'mcp.modeSelection.manualParameterConfig.title': 'Manual Parameter Configuration',
  'mcp.modeSelection.manualParameterConfig.description':
    'Configure server, tool, and all parameters explicitly. High reproducibility, best for technical users.',
  'mcp.modeSelection.aiParameterConfig.title': 'AI Parameter Configuration',
  'mcp.modeSelection.aiParameterConfig.description':
    'Select server and tool, describe parameters in natural language. Balanced approach.',
  'mcp.modeSelection.aiToolSelection.title': 'AI Tool Selection',
  'mcp.modeSelection.aiToolSelection.description':
    'Select server only, describe entire task in natural language. Simplest, lowest reproducibility.',

  // Tool Selection Mode (Step-by-step decision flow)
  'mcp.toolSelectionMode.title': 'How to Select Tool',
  'mcp.toolSelectionMode.subtitle': 'Choose how you want to select the tool for this MCP node',
  'mcp.toolSelectionMode.manual.title': 'Select Tool Manually',
  'mcp.toolSelectionMode.manual.description':
    'I will browse and select the tool myself. Good for when you know exactly which tool to use.',
  'mcp.toolSelectionMode.auto.title': 'Let AI Select Tool',
  'mcp.toolSelectionMode.auto.description':
    'AI will automatically select the best tool based on my task description. Good for exploring or when unsure.',

  // Parameter Config Mode (Step-by-step decision flow)
  'mcp.parameterConfigMode.title': 'How to Configure Parameters',
  'mcp.parameterConfigMode.subtitle':
    'Choose how you want to configure the parameters for this tool',
  'mcp.parameterConfigMode.manual.title': 'Configure Manually',
  'mcp.parameterConfigMode.manual.description':
    'I will fill in all parameters myself. Good for precise control and reproducibility.',
  'mcp.parameterConfigMode.auto.title': 'Let AI Configure',
  'mcp.parameterConfigMode.auto.description':
    'AI will configure parameters based on my natural language description. Good for quick setup.',

  // Parameter Detailed Config Step
  'mcp.parameterDetailedConfig.title': 'Configure Tool Parameters',

  // Natural Language Input
  'mcp.naturalLanguage.paramDescription.label': 'Parameter Configuration Description',
  'mcp.naturalLanguage.paramDescription.placeholder':
    'Describe what you want to do with this tool (e.g., "Check if Lambda is available in us-east-1")...',
  'mcp.naturalLanguage.taskDescription.label': 'Task Description',
  'mcp.naturalLanguage.taskDescription.placeholder':
    'Describe the task you want to accomplish (e.g., "Find documentation about S3 bucket policies")...',

  // Mode Switch Warnings
  'mcp.modeSwitch.warning.title': 'Mode Switch Warning',
  'mcp.modeSwitch.warning.message':
    'Switching from {currentMode} to {newMode} will change how this node is configured. Your current configuration will be preserved but may not be visible in the new mode. You can switch back to {currentMode} at any time to restore the previous configuration.',
  'mcp.modeSwitch.warning.continueButton': 'Continue',
  'mcp.modeSwitch.warning.cancelButton': 'Cancel',
  'mcp.modeSwitch.dataPreserved': 'Your data will be preserved',
  'mcp.modeSwitch.canRevert': 'You can switch back at any time',

  // Validation Errors
  'mcp.error.paramDescRequired':
    'Please provide a parameter description to help Claude Code understand your intent.',
  'mcp.error.taskDescRequired': 'Please provide a task description with a clear goal.',
  'mcp.error.noToolsAvailable': 'No tools available from the selected MCP server',
  'mcp.error.toolListOutdated':
    'Tool list snapshot is more than 7 days old. Please re-edit this node to capture the latest available tools.',
  'mcp.error.modeConfigMissing': 'Mode configuration is missing. Please reconfigure this node.',
  'mcp.error.invalidModeConfig':
    'Mode configuration is invalid. Please check your natural language description or switch to Detailed Mode.',

  // Mode Indicator Tooltips
  'mcp.mode.detailed.tooltip': 'Detailed Mode: All parameters explicitly configured',
  'mcp.mode.naturalLanguageParam.tooltip': 'Natural Language Parameter Mode: "{description}"',
  'mcp.mode.fullNaturalLanguage.tooltip': 'Full Natural Language Mode: "{taskDescription}"',
};
