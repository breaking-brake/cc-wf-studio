/**
 * Claude Code Workflow Studio - Translation Keys Type Definition
 *
 * Defines the structure of translation keys for type safety
 */

export interface TranslationKeys {
  // Mermaid flowchart labels
  'mermaid.start': string;
  'mermaid.end': string;
  'mermaid.question': string;
  'mermaid.conditionalBranch': string;

  // Workflow execution guide
  'guide.title': string;
  'guide.intro': string;
  'guide.nodeTypesTitle': string;
  'guide.nodeTypes.subAgent': string;
  'guide.nodeTypes.askUserQuestion': string;
  'guide.nodeTypes.branch': string;
  'guide.nodeTypes.prompt': string;

  // Prompt node details
  'promptNode.title': string;
  'promptNode.availableVariables': string;
  'promptNode.variableNotSet': string;

  // AskUserQuestion node details
  'askNode.title': string;
  'askNode.selectionMode': string;
  'askNode.aiSuggestions': string;
  'askNode.multiSelect': string;
  'askNode.singleSelect': string;
  'askNode.options': string;
  'askNode.noDescription': string;
  'askNode.multiSelectExplanation': string;

  // Branch node details (Legacy)
  'branchNode.title': string;
  'branchNode.binary': string;
  'branchNode.multiple': string;
  'branchNode.conditions': string;
  'branchNode.executionMethod': string;

  // IfElse node details
  'ifElseNode.title': string;
  'ifElseNode.binary': string;
  'ifElseNode.evaluationTarget': string;

  // Switch node details
  'switchNode.title': string;
  'switchNode.multiple': string;
  'switchNode.evaluationTarget': string;

  // MCP node details
  'mcpNode.title': string;
  'mcpNode.description': string;
  'mcpNode.server': string;
  'mcpNode.toolName': string;
  'mcpNode.validationStatus': string;
  'mcpNode.configuredParameters': string;
  'mcpNode.availableParameters': string;
  'mcpNode.required': string;
  'mcpNode.optional': string;
  'mcpNode.noDescription': string;
  'mcpNode.executionMethod': string;

  // Error messages
  'error.noWorkspaceOpen': string;

  // File picker
  'filePicker.title': string;
  'filePicker.error.invalidWorkflow': string;
  'filePicker.error.loadFailed': string;
}
