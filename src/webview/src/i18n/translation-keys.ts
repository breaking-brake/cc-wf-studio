/**
 * Claude Code Workflow Studio - Webview Translation Keys
 */

export interface WebviewTranslationKeys {
  // Common
  loading: string;
  description: string;
  optional: string;
  cancel: string;
  'common.close': string;
  'common.cancel': string;
  'loading.importWorkflow': string;

  // Toolbar
  'toolbar.workflowNamePlaceholder': string;
  'toolbar.save': string;
  'toolbar.saving': string;
  'toolbar.convert': string;
  'toolbar.convert.tooltip': string;
  'toolbar.converting': string;
  'toolbar.generateWithAI': string;
  'toolbar.refineWithAI': string;
  'toolbar.selectWorkflow': string;
  'toolbar.load': string;
  'toolbar.refreshList': string;

  // Toolbar interaction mode
  'toolbar.interactionMode.panButton': string;
  'toolbar.interactionMode.rangeSelectionButton': string;
  'toolbar.interactionMode.switchToPan': string;
  'toolbar.interactionMode.switchToSelection': string;

  // Toolbar errors
  'toolbar.error.workflowNameRequired': string;
  'toolbar.error.workflowNameRequiredForExport': string;
  'toolbar.error.selectWorkflowToLoad': string;
  'toolbar.error.validationFailed': string;
  'toolbar.error.missingEndNode': string;
  'toolbar.error.noActiveWorkflow': string;

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
  'node.end.title': string;
  'node.end.description': string;
  'node.branch.title': string;
  'node.branch.description': string;
  'node.branch.deprecationNotice': string;
  'node.ifElse.title': string;
  'node.ifElse.description': string;
  'node.switch.title': string;
  'node.switch.description': string;
  'node.askUserQuestion.title': string;
  'node.askUserQuestion.description': string;
  'node.skill.title': string;
  'node.skill.description': string;

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
  'property.nodeType.skill': string;
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
  'properties.subAgent.color': string;
  'properties.subAgent.colorPlaceholder': string;
  'properties.subAgent.colorNone': string;
  'properties.subAgent.colorHelp': string;

  // Skill properties
  'property.skillPath': string;
  'property.scope': string;
  'property.scope.personal': string;
  'property.scope.project': string;
  'property.validationStatus': string;
  'property.validationStatus.valid': string;
  'property.validationStatus.missing': string;
  'property.validationStatus.invalid': string;
  'property.validationStatus.valid.tooltip': string;
  'property.validationStatus.missing.tooltip': string;
  'property.validationStatus.invalid.tooltip': string;
  'property.allowedTools': string;

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
  'property.prompt.label': string;
  'property.prompt.placeholder': string;
  'property.prompt.help': string;
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
  'default.prompt': string;
  'default.branchTrue': string;
  'default.branchTrueCondition': string;
  'default.branchFalse': string;
  'default.branchFalseCondition': string;
  'default.case1': string;
  'default.case1Condition': string;
  'default.case2': string;
  'default.case2Condition': string;
  'default.defaultBranch': string;
  'default.defaultBranchCondition': string;
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
  'tour.refineWithAI': string;
  'tour.slackShare': string;
  'tour.helpButton': string;

  // Tour buttons
  'tour.button.back': string;
  'tour.button.close': string;
  'tour.button.finish': string;
  'tour.button.next': string;
  'tour.button.skip': string;

  // Terms of Use
  'terms.title': string;
  'terms.introduction': string;
  'terms.prohibitedUse': string;
  'terms.cyberAttack': string;
  'terms.malware': string;
  'terms.personalDataTheft': string;
  'terms.otherIllegalActs': string;
  'terms.liability': string;
  'terms.agree': string;
  'terms.agreeButton': string;
  'terms.cancelButton': string;

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': string;
  'dialog.deleteNode.message': string;
  'dialog.deleteNode.confirm': string;
  'dialog.deleteNode.cancel': string;

  // Skill Browser Dialog
  'skill.browser.title': string;
  'skill.browser.description': string;
  'skill.browser.personalTab': string;
  'skill.browser.projectTab': string;
  'skill.browser.noSkills': string;
  'skill.browser.loading': string;
  'skill.browser.selectButton': string;
  'skill.browser.cancelButton': string;
  'skill.browser.skillName': string;
  'skill.browser.skillDescription': string;
  'skill.browser.skillPath': string;
  'skill.browser.validationStatus': string;

  // Skill Browser Actions
  'skill.action.refresh': string;
  'skill.refreshing': string;

  // Skill Browser Errors
  'skill.error.loadFailed': string;
  'skill.error.noSelection': string;
  'skill.error.unknown': string;
  'skill.error.refreshFailed': string;

  // Skill Creation Dialog
  'skill.creation.title': string;
  'skill.creation.description': string;
  'skill.creation.nameLabel': string;
  'skill.creation.nameHint': string;
  'skill.creation.descriptionLabel': string;
  'skill.creation.descriptionPlaceholder': string;
  'skill.creation.instructionsLabel': string;
  'skill.creation.instructionsPlaceholder': string;
  'skill.creation.instructionsHint': string;
  'skill.creation.allowedToolsLabel': string;
  'skill.creation.allowedToolsHint': string;
  'skill.creation.scopeLabel': string;
  'skill.creation.scopePersonal': string;
  'skill.creation.scopeProject': string;
  'skill.creation.cancelButton': string;
  'skill.creation.createButton': string;
  'skill.creation.creatingButton': string;
  'skill.creation.error.unknown': string;

  // Skill Validation Errors
  'skill.validation.nameRequired': string;
  'skill.validation.nameTooLong': string;
  'skill.validation.nameInvalidFormat': string;
  'skill.validation.descriptionRequired': string;
  'skill.validation.descriptionTooLong': string;
  'skill.validation.instructionsRequired': string;
  'skill.validation.scopeRequired': string;

  // Workflow Refinement (001-ai-workflow-refinement)
  'refinement.toolbar.refineButton': string;
  'refinement.toolbar.refineButton.tooltip': string;

  // Refinement Chat Panel
  'refinement.title': string;
  'refinement.inputPlaceholder': string;
  'refinement.sendButton': string;
  'refinement.processing': string;
  'refinement.aiProcessing': string;
  'refinement.charactersRemaining': string;
  'refinement.iterationCounter': string;
  'refinement.iterationCounter.tooltip': string;
  'refinement.warning.title': string;
  'refinement.warning.message': string;
  'refinement.chat.title': string;
  'refinement.chat.description': string;
  'refinement.chat.inputPlaceholder': string;
  'refinement.chat.sendButton': string;
  'refinement.chat.sendButton.shortcut': string;
  'refinement.chat.sendButton.shortcutMac': string;
  'refinement.chat.cancelButton': string;
  'refinement.chat.closeButton': string;
  'refinement.cancelButton': string;
  'refinement.chat.clearButton': string;
  'refinement.chat.clearButton.tooltip': string;
  'refinement.chat.useSkillsCheckbox': string;

  // Timeout selector
  'refinement.timeout.label': string;
  'refinement.timeout.ariaLabel': string;

  'refinement.chat.claudeMdTip': string;
  'refinement.chat.refining': string;
  'refinement.chat.progressTime': string;
  'refinement.chat.characterCount': string;
  'refinement.chat.iterationCounter': string;
  'refinement.chat.iterationWarning': string;
  'refinement.chat.iterationLimitReached': string;
  'refinement.chat.noMessages': string;
  'refinement.chat.userMessageLabel': string;
  'refinement.chat.aiMessageLabel': string;
  'refinement.chat.success': string;
  'refinement.chat.changesSummary': string;

  // Refinement Success Messages
  'refinement.success.defaultMessage': string;

  // Refinement Errors
  'refinement.error.emptyMessage': string;
  'refinement.error.messageTooLong': string;
  'refinement.error.commandNotFound': string;
  'refinement.error.timeout': string;
  'refinement.error.parseError': string;
  'refinement.error.validationError': string;
  'refinement.error.iterationLimitReached': string;
  'refinement.error.unknown': string;

  // Refinement Error Display (Phase 3.8)
  'refinement.error.retryButton': string;

  // Processing Overlay (Phase 3.10)
  'refinement.processingOverlay': string;

  // Clear Conversation Confirmation
  'refinement.clearDialog.title': string;
  'refinement.clearDialog.message': string;
  'refinement.clearDialog.confirm': string;
  'refinement.clearDialog.cancel': string;

  // Initial instructional message (Phase 3.12)
  'refinement.initialMessage.description': string;
  'refinement.initialMessage.note': string;

  // MCP Node (Feature: 001-mcp-node)
  'node.mcp.title': string;
  'node.mcp.description': string;

  // MCP Server List
  'mcp.loading.servers': string;
  'mcp.error.serverLoadFailed': string;
  'mcp.empty.servers': string;
  'mcp.empty.servers.hint': string;

  // MCP Tool List
  'mcp.loading.tools': string;
  'mcp.error.toolLoadFailed': string;
  'mcp.empty.tools': string;

  // MCP Cache Actions
  'mcp.action.refresh': string;
  'mcp.refreshing': string;
  'mcp.error.refreshFailed': string;

  // MCP Tool Search
  'mcp.search.placeholder': string;
  'mcp.search.noResults': string;

  // MCP Node Dialog
  'mcp.dialog.title': string;
  'mcp.dialog.selectServer': string;
  'mcp.dialog.selectTool': string;
  'mcp.dialog.addButton': string;
  'mcp.dialog.cancelButton': string;
  'mcp.dialog.wizardStep': string;
  'mcp.dialog.nextButton': string;
  'mcp.dialog.backButton': string;
  'mcp.dialog.saveButton': string;
  'mcp.dialog.error.noServerSelected': string;
  'mcp.dialog.error.noToolSelected': string;
  'mcp.dialog.error.incompleteWizard': string;
  'mcp.dialog.error.cannotProceed': string;
  'mcp.dialog.error.invalidMode': string;

  // MCP Property Panel
  'property.nodeType.mcp': string;
  'property.mcp.serverId': string;
  'property.mcp.toolName': string;
  'property.mcp.toolDescription': string;
  'property.mcp.parameters': string;
  'property.mcp.parameterValues': string;
  'property.mcp.parameterCount': string;
  'property.mcp.editParameters': string;
  'property.mcp.edit.manualParameterConfig': string;
  'property.mcp.edit.aiParameterConfig': string;
  'property.mcp.edit.aiToolSelection': string;
  'property.mcp.taskDescription': string;
  'property.mcp.parameterDescription': string;
  'property.mcp.configuredValues': string;
  'property.mcp.infoNote': string;

  // MCP Parameter Form
  'mcp.parameter.formTitle': string;
  'mcp.parameter.noParameters': string;
  'mcp.parameter.selectOption': string;
  'mcp.parameter.enterValue': string;
  'mcp.parameter.minLength': string;
  'mcp.parameter.maxLength': string;
  'mcp.parameter.pattern': string;
  'mcp.parameter.minimum': string;
  'mcp.parameter.maximum': string;
  'mcp.parameter.default': string;
  'mcp.parameter.addItem': string;
  'mcp.parameter.add': string;
  'mcp.parameter.remove': string;
  'mcp.parameter.arrayCount': string;
  'mcp.parameter.jsonFormat': string;
  'mcp.parameter.jsonInvalid': string;
  'mcp.parameter.objectInvalid': string;
  'mcp.parameter.unsupportedType': string;
  'mcp.parameter.validationErrors': string;

  // MCP Edit Dialog
  'mcp.editDialog.title': string;
  'mcp.editDialog.saveButton': string;
  'mcp.editDialog.cancelButton': string;
  'mcp.editDialog.loading': string;
  'mcp.editDialog.error.schemaLoadFailed': string;

  // MCP Natural Language Mode (Feature: 001-mcp-natural-language-mode)

  // Mode Selection
  'mcp.modeSelection.title': string;
  'mcp.modeSelection.subtitle': string;
  'mcp.modeSelection.manualParameterConfig.title': string;
  'mcp.modeSelection.manualParameterConfig.description': string;
  'mcp.modeSelection.aiParameterConfig.title': string;
  'mcp.modeSelection.aiParameterConfig.description': string;
  'mcp.modeSelection.aiToolSelection.title': string;
  'mcp.modeSelection.aiToolSelection.description': string;

  // Tool Selection Mode (Step-by-step decision flow)
  'mcp.toolSelectionMode.title': string;
  'mcp.toolSelectionMode.subtitle': string;
  'mcp.toolSelectionMode.manual.title': string;
  'mcp.toolSelectionMode.manual.description': string;
  'mcp.toolSelectionMode.auto.title': string;
  'mcp.toolSelectionMode.auto.description': string;

  // Parameter Config Mode (Step-by-step decision flow)
  'mcp.parameterConfigMode.title': string;
  'mcp.parameterConfigMode.subtitle': string;
  'mcp.parameterConfigMode.manual.title': string;
  'mcp.parameterConfigMode.manual.description': string;
  'mcp.parameterConfigMode.auto.title': string;
  'mcp.parameterConfigMode.auto.description': string;

  // Parameter Detailed Config Step
  'mcp.parameterDetailedConfig.title': string;

  // Natural Language Input
  'mcp.naturalLanguage.paramDescription.label': string;
  'mcp.naturalLanguage.paramDescription.placeholder': string;
  'mcp.naturalLanguage.taskDescription.label': string;
  'mcp.naturalLanguage.taskDescription.placeholder': string;

  // Mode Switch Warnings
  'mcp.modeSwitch.warning.title': string;
  'mcp.modeSwitch.warning.message': string;
  'mcp.modeSwitch.warning.continueButton': string;
  'mcp.modeSwitch.warning.cancelButton': string;
  'mcp.modeSwitch.dataPreserved': string;
  'mcp.modeSwitch.canRevert': string;

  // Validation Errors
  'mcp.error.paramDescRequired': string;
  'mcp.error.taskDescRequired': string;
  'mcp.error.noToolsAvailable': string;
  'mcp.error.toolListOutdated': string;
  'mcp.error.modeConfigMissing': string;
  'mcp.error.invalidModeConfig': string;

  // Mode Indicator Tooltips
  'mcp.mode.detailed.tooltip': string;
  'mcp.mode.naturalLanguageParam.tooltip': string;
  'mcp.mode.fullNaturalLanguage.tooltip': string;

  // Slack Integration
  'slack.connect': string;
  'slack.disconnect': string;
  'slack.connecting': string;
  'slack.connected': string;
  'slack.notConnected': string;

  // Slack Share
  'slack.share.button': string;
  'slack.share.title': string;
  'slack.share.selectWorkspace': string;
  'slack.share.selectWorkspacePlaceholder': string;
  'slack.share.selectChannel': string;
  'slack.share.selectChannelPlaceholder': string;
  'slack.share.descriptionPlaceholder': string;
  'slack.share.sharing': string;
  'slack.share.success': string;
  'slack.share.failed': string;
  'slack.share.checkingBotMembership': string;
  'slack.share.botNotInChannelMessage': string;

  // Slack Connect
  'slack.connect.button': string;
  'slack.connect.connecting': string;
  'slack.connect.description': string;
  'slack.connect.success': string;
  'slack.connect.failed': string;

  // Slack Reconnect
  'slack.reconnect.button': string;
  'slack.reconnect.reconnecting': string;
  'slack.reconnect.description': string;
  'slack.reconnect.success': string;
  'slack.reconnect.failed': string;

  // Slack Import
  'slack.import.title': string;
  'slack.import.importing': string;
  'slack.import.success': string;
  'slack.import.failed': string;
  'slack.import.confirmOverwrite': string;

  // Slack Search
  'slack.search.title': string;
  'slack.search.placeholder': string;
  'slack.search.searching': string;
  'slack.search.noResults': string;

  // Slack Errors
  'slack.error.notAuthenticated': string;
  'slack.error.channelNotFound': string;
  'slack.error.noChannels': string;
  'slack.error.noChannelsHelp': string;
  'slack.error.noWorkspaces': string;
  'slack.error.notInChannel': string;
  'slack.error.networkError': string;
  'slack.error.rateLimited': string;

  // Slack Connection Dialog
  'slack.connect.title': string;
  'slack.connect.tab.oauth': string;
  'slack.connect.tab.manual': string;

  // Slack OAuth
  'slack.oauth.description': string;
  'slack.oauth.termsOfService': string;
  'slack.oauth.privacyPolicy': string;
  'slack.oauth.supportPage': string;
  'slack.oauth.connectButton': string;
  'slack.oauth.status.initiated': string;
  'slack.oauth.status.polling': string;
  'slack.oauth.status.waitingHint': string;
  'slack.oauth.cancelled': string;
  'slack.oauth.reviewNotice.message': string;

  // Slack Manual Token
  'slack.manualToken.title': string;
  'slack.manualToken.description': string;
  'slack.manualToken.howToGet.title': string;
  'slack.manualToken.howToGet.step1': string;
  'slack.manualToken.howToGet.step2': string;
  'slack.manualToken.howToGet.step3': string;
  'slack.manualToken.howToGet.step4': string;
  'slack.manualToken.howToGet.step5': string;
  'slack.manualToken.howToGet.step6': string;
  'slack.manualToken.security.title': string;
  'slack.manualToken.security.notice': string;
  'slack.manualToken.security.storage': string;
  'slack.manualToken.security.transmission': string;
  'slack.manualToken.security.deletion': string;
  'slack.manualToken.security.sharing': string;
  'slack.manualToken.botToken.label': string;
  'slack.manualToken.userToken.label': string;
  'slack.manualToken.error.tokenRequired': string;
  'slack.manualToken.error.invalidTokenFormat': string;
  'slack.manualToken.error.userTokenRequired': string;
  'slack.manualToken.error.invalidUserTokenFormat': string;
  'slack.manualToken.connecting': string;
  'slack.manualToken.connect': string;
  'slack.manualToken.deleteButton': string;
  'slack.manualToken.deleteConfirm.title': string;
  'slack.manualToken.deleteConfirm.message': string;
  'slack.manualToken.deleteConfirm.confirm': string;
  'slack.manualToken.deleteConfirm.cancel': string;

  // Sensitive Data Warning
  'slack.sensitiveData.warning.title': string;
  'slack.sensitiveData.warning.message': string;
  'slack.sensitiveData.warning.continue': string;
  'slack.sensitiveData.warning.cancel': string;

  // Slack Import Connection Required Dialog
  'slack.import.connectionRequired.title': string;
  'slack.import.connectionRequired.message': string;
  'slack.import.connectionRequired.workspaceInfo': string;
  'slack.import.connectionRequired.connectButton': string;
}
