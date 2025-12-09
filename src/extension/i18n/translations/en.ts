/**
 * Claude Code Workflow Studio - English Translations
 */

import type { TranslationKeys } from '../translation-keys';

export const enTranslations: TranslationKeys = {
  // Mermaid flowchart labels
  'mermaid.start': 'Start',
  'mermaid.end': 'End',
  'mermaid.question': 'Question',
  'mermaid.conditionalBranch': 'Conditional Branch',

  // Workflow execution guide
  'guide.title': '## Workflow Execution Guide',
  'guide.intro':
    'Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.',
  'guide.nodeTypesTitle': '### Execution Methods by Node Type',
  'guide.nodeTypes.subAgent': '- **Rectangle nodes**: Execute Sub-Agents using the Task tool',
  'guide.nodeTypes.askUserQuestion':
    '- **Diamond nodes (AskUserQuestion:...)**: Use the AskUserQuestion tool to prompt the user and branch based on their response',
  'guide.nodeTypes.branch':
    '- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on the results of previous processing (see details section)',
  'guide.nodeTypes.prompt':
    '- **Rectangle nodes (Prompt nodes)**: Execute the prompts described in the details section below',

  // Prompt node details
  'promptNode.title': '### Prompt Node Details',
  'promptNode.availableVariables': '**Available variables:**',
  'promptNode.variableNotSet': '(not set)',

  // AskUserQuestion node details
  'askNode.title': '### AskUserQuestion Node Details',
  'askNode.selectionMode': '**Selection mode:**',
  'askNode.aiSuggestions':
    'AI Suggestions (AI generates options dynamically based on context and presents them to the user)',
  'askNode.multiSelect': '**Multi-select:** Enabled (user can select multiple options)',
  'askNode.singleSelect': 'Single Select (branches based on the selected option)',
  'askNode.options': '**Options:**',
  'askNode.noDescription': '(no description)',
  'askNode.multiSelectExplanation':
    'Multi-select enabled (a list of selected options is passed to the next node)',

  // Branch node details (Legacy)
  'branchNode.title': '### Branch Node Details',
  'branchNode.binary': 'Binary Branch',
  'branchNode.multiple': 'Multiple Branch',
  'branchNode.conditions': '**Branch conditions:**',
  'branchNode.executionMethod':
    '**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.',

  // IfElse node details
  'ifElseNode.title': '### If/Else Node Details',
  'ifElseNode.binary': 'Binary Branch (True/False)',
  'ifElseNode.evaluationTarget': 'Evaluation Target',

  // Switch node details
  'switchNode.title': '### Switch Node Details',
  'switchNode.multiple': 'Multiple Branch (2-N)',
  'switchNode.evaluationTarget': 'Evaluation Target',

  // MCP node details
  'mcpNode.title': '## MCP Tool Nodes',
  'mcpNode.description': '**Description**',
  'mcpNode.server': '**MCP Server**',
  'mcpNode.toolName': '**Tool Name**',
  'mcpNode.validationStatus': '**Validation Status**',
  'mcpNode.configuredParameters': '**Configured Parameters**',
  'mcpNode.availableParameters': '**Available Parameters**',
  'mcpNode.required': 'required',
  'mcpNode.optional': 'optional',
  'mcpNode.noDescription': 'No description available',
  'mcpNode.executionMethod':
    'This node invokes an MCP (Model Context Protocol) tool. When executing this workflow, use the configured parameters to call the tool via the MCP server.',

  // Error messages
  'error.noWorkspaceOpen': 'Please open a folder or workspace first.',

  // File picker
  'filePicker.title': 'Select Workflow File',
  'filePicker.error.invalidWorkflow':
    'Invalid workflow file. Please select a valid JSON workflow file.',
  'filePicker.error.loadFailed': 'Failed to load workflow file.',
};
