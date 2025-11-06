/**
 * Claude Code Workflow Studio - Webview Translation Keys
 */

export interface WebviewTranslationKeys {
  // Toolbar
  'toolbar.workflowNamePlaceholder': string;
  'toolbar.save': string;
  'toolbar.saving': string;
  'toolbar.export': string;
  'toolbar.exporting': string;
  'toolbar.generateWithAI': string;
  'toolbar.selectWorkflow': string;
  'toolbar.load': string;
  'toolbar.refreshList': string;

  // Toolbar errors
  'toolbar.error.workflowNameRequired': string;
  'toolbar.error.workflowNameRequiredForExport': string;
  'toolbar.error.selectWorkflowToLoad': string;
  'toolbar.error.validationFailed': string;

  // Node Palette
  'palette.title': string;
  'palette.basicNodes': string;
  'palette.controlFlow': string;
  'palette.quickStart': string;

  // Node types
  'node.prompt.title': string;
  'node.prompt.description': string;
  'node.subAgent.title': string;
  'node.subAgent.description': string;
  'node.branch.title': string;
  'node.branch.description': string;
  'node.branch.deprecationNotice': string;
  'node.ifElse.title': string;
  'node.ifElse.description': string;
  'node.switch.title': string;
  'node.switch.description': string;
  'node.askUserQuestion.title': string;
  'node.askUserQuestion.description': string;

  // Quick start instructions
  'palette.instruction.addNode': string;
  'palette.instruction.dragNode': string;
  'palette.instruction.connectNodes': string;
  'palette.instruction.editProperties': string;

  // Property Panel
  'property.title': string;
  'property.noSelection': string;

  // Node type badges
  'property.nodeType.subAgent': string;
  'property.nodeType.askUserQuestion': string;
  'property.nodeType.branch': string;
  'property.nodeType.ifElse': string;
  'property.nodeType.switch': string;
  'property.nodeType.prompt': string;
  'property.nodeType.start': string;
  'property.nodeType.end': string;
  'property.nodeType.unknown': string;

  // Common property labels
  'property.nodeName': string;
  'property.nodeName.placeholder': string;
  'property.nodeName.help': string;
  'property.description': string;
  'property.prompt': string;
  'property.model': string;
  'property.label': string;
  'property.label.placeholder': string;
  'property.evaluationTarget': string;
  'property.evaluationTarget.placeholder': string;
  'property.evaluationTarget.help': string;

  // Start/End node descriptions
  'property.startNodeDescription': string;
  'property.endNodeDescription': string;
  'property.unknownNodeType': string;

  // Sub-Agent properties
  'property.tools': string;
  'property.tools.placeholder': string;
  'property.tools.help': string;

  // AskUserQuestion properties
  'property.questionText': string;
  'property.multiSelect': string;
  'property.multiSelect.enabled': string;
  'property.multiSelect.disabled': string;
  'property.aiSuggestions': string;
  'property.aiSuggestions.enabled': string;
  'property.aiSuggestions.disabled': string;
  'property.options': string;
  'property.optionsCount': string;
  'property.optionNumber': string;
  'property.addOption': string;
  'property.remove': string;
  'property.optionLabel.placeholder': string;
  'property.optionDescription.placeholder': string;

  // Prompt properties
  'property.promptTemplate': string;
  'property.promptTemplate.placeholder': string;
  'property.promptTemplate.help': string;
  'property.detectedVariables': string;
  'property.variablesSubstituted': string;

  // Branch properties
  'property.branchType': string;
  'property.conditional': string;
  'property.switch': string;
  'property.branchType.conditional.help': string;
  'property.branchType.switch.help': string;
  'property.branches': string;
  'property.branchesCount': string;
  'property.branchNumber': string;
  'property.addBranch': string;
  'property.branchLabel': string;
  'property.branchLabel.placeholder': string;
  'property.branchCondition': string;
  'property.branchCondition.placeholder': string;
  'property.minimumBranches': string;

  // Default node labels
  'default.newSubAgent': string;
  'default.enterPrompt': string;
  'default.newQuestion': string;
  'default.option': string;
  'default.firstOption': string;
  'default.secondOption': string;
  'default.newOption': string;
  'default.newPrompt': string;
  'default.promptTemplate': string;
  'default.branchTrue': string;
  'default.branchTrueCondition': string;
  'default.branchFalse': string;
  'default.branchFalseCondition': string;
  'default.case1': string;
  'default.case1Condition': string;
  'default.case2': string;
  'default.case2Condition': string;
  'default.case3': string;
  'default.case3Condition': string;
  'default.conditionPrefix': string;
  'default.conditionSuffix': string;

  // Tour
  'tour.welcome': string;
  'tour.nodePalette': string;
  'tour.addPrompt': string;
  'tour.canvas': string;
  'tour.propertyPanel': string;
  'tour.addAskUserQuestion': string;
  'tour.connectNodes': string;
  'tour.workflowName': string;
  'tour.saveWorkflow': string;
  'tour.loadWorkflow': string;
  'tour.exportWorkflow': string;
  'tour.generateWithAI': string;
  'tour.helpButton': string;

  // Tour buttons
  'tour.button.back': string;
  'tour.button.close': string;
  'tour.button.finish': string;
  'tour.button.next': string;
  'tour.button.skip': string;

  // AI Generation Dialog
  'ai.dialogTitle': string;
  'ai.dialogDescription': string;
  'ai.descriptionLabel': string;
  'ai.descriptionPlaceholder': string;
  'ai.characterCount': string;
  'ai.generating': string;
  'ai.generateButton': string;
  'ai.cancelButton': string;
  'ai.success': string;
  'ai.usageNote': string;
  'ai.overwriteWarning': string;

  // AI Generation Errors
  'ai.error.emptyDescription': string;
  'ai.error.descriptionTooLong': string;
  'ai.error.commandNotFound': string;
  'ai.error.timeout': string;
  'ai.error.parseError': string;
  'ai.error.validationError': string;
  'ai.error.unknown': string;
}
