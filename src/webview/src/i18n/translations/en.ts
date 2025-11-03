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
  'toolbar.selectWorkflow': 'Select workflow...',
  'toolbar.load': 'Load',
  'toolbar.refreshList': 'Refresh workflow list',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': 'Workflow name is required',
  'toolbar.error.workflowNameRequiredForExport': 'Workflow name is required for export',
  'toolbar.error.selectWorkflowToLoad': 'Please select a workflow to load',
  'toolbar.error.validationFailed': 'Workflow validation failed',

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
  'node.branch.title': 'Branch',
  'node.branch.description': 'Conditional branching logic',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': 'Branch based on user choice',

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
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
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

  // Start/End node descriptions
  'property.startNodeDescription':
    'Start node marks the beginning of the workflow. It cannot be deleted and has no editable properties.',
  'property.endNodeDescription':
    'End node marks the completion of the workflow. It cannot be deleted and has no editable properties.',
  'property.unknownNodeType': 'Unknown node type:',

  // Sub-Agent properties
  'property.tools': 'Tools (comma-separated)',
  'property.tools.placeholder': 'e.g., Read,Write,Bash',
  'property.tools.help': 'Leave empty for all tools',

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
  'default.newBranch': 'Branch',
  'default.newCondition': 'New condition',

  // Tour
  'tour.welcome':
    'Welcome to Claude Code Workflow Studio!\n\nThis tour will guide you through creating your first workflow.',
  'tour.nodePalette':
    'The Node Palette contains various nodes you can use in your workflow.\n\nClick on Prompt, Sub-Agent, AskUserQuestion, Branch, and other nodes to add them to the canvas.',
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
  'tour.exportWorkflow':
    'Click the "Export" button to export in a format executable by Claude Code.\n\nSub-Agents go to `.claude/agents/` and SlashCommands to `.claude/commands/`.',
  'tour.helpButton':
    'To see this tour again, click the help button (?).\n\nEnjoy creating workflows!',

  // Tour buttons
  'tour.button.back': 'Back',
  'tour.button.close': 'Close',
  'tour.button.finish': 'Finish',
  'tour.button.next': 'Next',
  'tour.button.skip': 'Skip',
};
