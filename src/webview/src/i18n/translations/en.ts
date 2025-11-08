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
  'toolbar.selectWorkflow': 'Select workflow...',
  'toolbar.load': 'Load',
  'toolbar.refreshList': 'Refresh workflow list',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': 'Workflow name is required',
  'toolbar.error.workflowNameRequiredForExport': 'Workflow name is required for export',
  'toolbar.error.selectWorkflowToLoad': 'Please select a workflow to load',
  'toolbar.error.validationFailed': 'Workflow validation failed',
  'toolbar.error.missingEndNode': 'Workflow must have at least one End node',

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
    'Welcome to Claude Code Workflow Studio!\n\nThis tour will guide you through creating your first workflow.',
  'tour.nodePalette':
    'The Node Palette contains various nodes you can use in your workflow.\n\nClick on Prompt, Sub-Agent, AskUserQuestion, If/Else, Switch, and other nodes to add them to the canvas.',
  'tour.addPrompt':
    'Click the "Prompt" button to add your first node.\n\nA Prompt node is a template that supports variables and is the basic building block of workflows.',
  'tour.canvas':
    'This is the canvas. Drag nodes to adjust their position and drag handles to connect nodes.\n\nStart and End nodes are already placed.',
  'tour.propertyPanel':
    'The Property Panel lets you configure the selected node.\n\nYou can edit node name, prompt, model selection, and more.',
  'tour.addAskUserQuestion':
    'Now add an "AskUserQuestion" node.\n\nThis node lets you branch the workflow based on user selection.',
  'tour.connectNodes':
    'Connect nodes to create your workflow.\n\nDrag from the output handle (⚪) on the right of a node to the input handle on the left of another node.',
  'tour.workflowName':
    'Name your workflow.\n\nYou can use letters, numbers, hyphens, and underscores.',
  'tour.saveWorkflow':
    'Click the "Save" button to save your workflow as JSON in the `.vscode/workflows/` directory.\n\nYou can load and continue editing later.',
  'tour.loadWorkflow':
    'To load a saved workflow, select it from the dropdown menu and click the "Load" button.',
  'tour.exportWorkflow':
    'Click the "Export" button to export in a format executable by Claude Code.\n\nSub-Agents go to `.claude/agents/` and SlashCommands to `.claude/commands/`.',
  'tour.generateWithAI':
    'Use the "Generate with AI" button to automatically create workflows from natural language descriptions.\n\nFor example: Simply input "Create a code review workflow that scans code, asks user for priority level, and generates fix suggestions" to generate a complete workflow.',
  'tour.helpButton':
    'To see this tour again, click the help button (?).\n\nEnjoy creating workflows!',

  // Tour buttons
  'tour.button.back': 'Back',
  'tour.button.close': 'Close',
  'tour.button.finish': 'Finish',
  'tour.button.next': 'Next',
  'tour.button.skip': 'Skip',

  // AI Generation Dialog
  'ai.dialogTitle': 'Generate Workflow with AI',
  'ai.dialogDescription':
    'Describe the workflow you want to create in natural language. The AI will generate a complete workflow with nodes and connections.',
  'ai.descriptionLabel': 'Workflow Description',
  'ai.descriptionPlaceholder':
    'Example: Create a code review workflow that scans code, asks user for priority level, and generates fix suggestions',
  'ai.characterCount': '{count} / {max} characters',
  'ai.generating': 'Generating workflow... This may take up to 90 seconds.',
  'ai.progressTime': '{elapsed}s / {max}s',
  'ai.generateButton': 'Generate',
  'ai.cancelButton': 'Cancel',
  'ai.cancelGenerationButton': 'Cancel Generation',
  'ai.success': 'Workflow generated successfully!',
  'ai.usageNote': '*1 This feature uses Claude Code installed in your environment.',
  'ai.overwriteWarning':
    '*2 Generating a workflow will completely replace your current workflow. Make sure to save your work before proceeding.',

  // AI Generation Errors
  'ai.error.emptyDescription': 'Please enter a workflow description',
  'ai.error.descriptionTooLong': 'Description is too long (max {max} characters)',
  'ai.error.commandNotFound':
    'Claude Code CLI not found. Please install Claude Code to use AI generation.',
  'ai.error.timeout': 'Request timed out. Please try again or simplify your description.',
  'ai.error.parseError': 'Generation failed - please try again or rephrase your description',
  'ai.error.validationError': 'Generated workflow failed validation',
  'ai.error.unknown': 'An unexpected error occurred. Please try again.',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': 'Delete Node',
  'dialog.deleteNode.message': 'Are you sure you want to delete this node?',
  'dialog.deleteNode.confirm': 'Delete',
  'dialog.deleteNode.cancel': 'Cancel',

  // Skill Browser Dialog
  'skill.browser.title': 'Browse Skills',
  'skill.browser.description':
    'Select a Claude Code Skill to add to your workflow. Skills are specialized tools that can be invoked by Claude Code.',
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
};
