/**
 * Claude Code Workflow Studio - Webview Simplified Chinese Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const zhCNWebviewTranslations: WebviewTranslationKeys = {
  // Toolbar
  'toolbar.workflowNamePlaceholder': '工作流名称',
  'toolbar.save': '保存',
  'toolbar.saving': '保存中...',
  'toolbar.export': '导出',
  'toolbar.exporting': '导出中...',
  'toolbar.generateWithAI': 'AI生成',
  'toolbar.refineWithAI': 'AI编辑',
  'toolbar.selectWorkflow': '选择工作流...',
  'toolbar.load': '加载',
  'toolbar.refreshList': '刷新工作流列表',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '工作流名称必填',
  'toolbar.error.workflowNameRequiredForExport': '导出需要工作流名称',
  'toolbar.error.selectWorkflowToLoad': '请选择要加载的工作流',
  'toolbar.error.validationFailed': '工作流验证失败',
  'toolbar.error.missingEndNode': '工作流必须至少包含一个End节点',
  'toolbar.error.noActiveWorkflow': '请先加载工作流',

  // Node Palette
  'palette.title': '节点面板',
  'palette.basicNodes': '基本节点',
  'palette.controlFlow': '控制流程',
  'palette.quickStart': '💡 快速入门',

  // Node types
  'node.prompt.title': 'Prompt',
  'node.prompt.description': '带变量的模板',
  'node.subAgent.title': 'Sub-Agent',
  'node.subAgent.description': '执行专门任务',
  'node.end.title': 'End',
  'node.end.description': '工作流结束点',
  'node.branch.title': 'Branch',
  'node.branch.description': '条件分支逻辑',
  'node.branch.deprecationNotice': '已弃用。请迁移到If/Else或Switch节点',
  'node.ifElse.title': 'If/Else',
  'node.ifElse.description': '二元条件分支（真/假）',
  'node.switch.title': 'Switch',
  'node.switch.description': '多路条件分支（2-N 种情况）',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': '根据用户选择分支',
  'node.skill.title': 'Skill',
  'node.skill.description': '执行Claude Code Skill',

  // Quick start instructions
  'palette.instruction.addNode': '点击节点将其添加到画布',
  'palette.instruction.dragNode': '拖动节点以重新定位',
  'palette.instruction.connectNodes': '从输出拖动到输入句柄以连接节点',
  'palette.instruction.editProperties': '选择节点以编辑其属性',

  // Property Panel
  'property.title': '属性',
  'property.noSelection': '选择节点以查看其属性',

  // Node type badges
  'property.nodeType.subAgent': 'Sub-Agent',
  'property.nodeType.askUserQuestion': 'Ask User Question',
  'property.nodeType.branch': 'Branch Node',
  'property.nodeType.ifElse': 'If/Else Node',
  'property.nodeType.switch': 'Switch Node',
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
  'property.nodeType.skill': 'Skill节点',
  'property.nodeType.unknown': '未知',

  // Common property labels
  'property.nodeName': '节点名称',
  'property.nodeName.placeholder': '输入节点名称',
  'property.nodeName.help': '用于导出的文件名（例如："data-analysis"）',
  'property.description': '描述',
  'property.prompt': '提示',
  'property.model': '模型',
  'property.label': '标签',
  'property.label.placeholder': '输入标签',
  'property.evaluationTarget': '评估目标',
  'property.evaluationTarget.placeholder': '例如：前一步的执行结果',
  'property.evaluationTarget.help': '用自然语言描述分支条件中要评估的内容',

  // Start/End node descriptions
  'property.startNodeDescription': 'Start节点标记工作流的开始。它不能被删除且没有可编辑的属性。',
  'property.endNodeDescription': 'End节点标记工作流的完成。它不能被删除且没有可编辑的属性。',
  'property.unknownNodeType': '未知节点类型：',

  // Sub-Agent properties
  'property.tools': '工具（逗号分隔）',
  'property.tools.placeholder': '例如：Read,Write,Bash',
  'property.tools.help': '留空表示所有工具',

  // Skill properties
  'property.skillPath': 'Skill路径',
  'property.scope': '范围',
  'property.scope.personal': '个人',
  'property.scope.project': '项目',
  'property.validationStatus': '验证状态',
  'property.validationStatus.valid': '有效',
  'property.validationStatus.missing': '缺失',
  'property.validationStatus.invalid': '无效',
  'property.validationStatus.valid.tooltip': 'Skill有效且可以使用',
  'property.validationStatus.missing.tooltip': '在指定路径找不到SKILL.md文件',
  'property.validationStatus.invalid.tooltip': 'SKILL.md包含无效的YAML前置内容',
  'property.allowedTools': '允许的工具',

  // AskUserQuestion properties
  'property.questionText': '问题',
  'property.multiSelect': '多选',
  'property.multiSelect.enabled': '用户可以选择多个选项（输出选择列表）',
  'property.multiSelect.disabled': '用户选择一个选项（分支到相应节点）',
  'property.aiSuggestions': 'AI建议选项',
  'property.aiSuggestions.enabled': 'AI将根据上下文动态生成选项',
  'property.aiSuggestions.disabled': '在下方手动定义选项',
  'property.options': '选项',
  'property.optionsCount': '选项（{count}/4）',
  'property.optionNumber': '选项 {number}',
  'property.addOption': '+ 添加选项',
  'property.remove': '删除',
  'property.optionLabel.placeholder': '标签',
  'property.optionDescription.placeholder': '描述',

  // Prompt properties
  'property.promptTemplate': '提示模板',
  'property.promptTemplate.placeholder': '输入包含{{variables}}的提示模板',
  'property.promptTemplate.help': '对动态值使用{{variableName}}语法',
  'property.detectedVariables': '检测到的变量（{count}）',
  'property.variablesSubstituted': '变量将在运行时替换',

  // Branch properties
  'property.branchType': '分支类型',
  'property.conditional': '条件（双向）',
  'property.switch': '开关（多向）',
  'property.branchType.conditional.help': '2个分支（True/False）',
  'property.branchType.switch.help': '多个分支（2-N向）',
  'property.branches': '分支',
  'property.branchesCount': '分支（{count}）',
  'property.branchNumber': '分支 {number}',
  'property.addBranch': '+ 添加分支',
  'property.branchLabel': '标签',
  'property.branchLabel.placeholder': '例如：成功，错误',
  'property.branchCondition': '条件（自然语言）',
  'property.branchCondition.placeholder': '例如：如果前一个过程成功',
  'property.minimumBranches': '至少需要2个分支',

  // Default node labels
  'default.newSubAgent': '新Sub-Agent',
  'default.enterPrompt': '在此输入提示',
  'default.newQuestion': '新问题',
  'default.option': '选项',
  'default.firstOption': '第一个选项',
  'default.secondOption': '第二个选项',
  'default.newOption': '新选项',
  'default.newPrompt': '新Prompt',
  'default.promptTemplate': '在此输入您的提示模板。\n\n您可以使用{{variableName}}这样的变量。',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '条件为真时',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '条件为假时',
  'default.case1': 'Case 1',
  'default.case1Condition': '满足条件 1 时',
  'default.case2': 'Case 2',
  'default.case2Condition': '满足条件 2 时',
  'default.case3': 'Case 3',
  'default.case3Condition': '满足条件 3 时',
  'default.conditionPrefix': '满足条件 ',
  'default.conditionSuffix': ' 时',

  // Tour
  'tour.welcome':
    '欢迎使用Claude Code Workflow Studio！\n\n本导览将介绍主要功能的位置和作用。在创建第一个工作流之前，让我们先熟悉基础知识。',
  'tour.nodePalette':
    '节点面板包含可在工作流中使用的各种节点。\n\n点击Prompt、Sub-Agent、AskUserQuestion、If/Else、Switch等节点将其添加到画布。',
  'tour.addPrompt':
    '这个"Prompt"按钮可以将Prompt节点添加到画布。\n\nPrompt节点是支持变量的模板，是工作流的基本构建块。',
  'tour.canvas': '这是画布。拖动节点调整位置，拖动手柄连接节点。\n\n已经放置了开始和结束节点。',
  'tour.propertyPanel': '属性面板可以配置所选节点。\n\n您可以编辑节点名称、提示、模型选择等。',
  'tour.addAskUserQuestion':
    '"AskUserQuestion"节点用于根据用户选择分支工作流。\n\n可以使用此按钮将其添加到画布。',
  'tour.connectNodes':
    '连接节点以创建工作流。\n\n从节点右侧的输出手柄(⚪)拖动到另一个节点左侧的输入手柄。',
  'tour.workflowName': '在这里可以为工作流命名。\n\n可以使用字母、数字、连字符和下划线。',
  'tour.saveWorkflow':
    '点击"保存"按钮将工作流以JSON格式保存到`.vscode/workflows/`目录。\n\n稍后可以加载并继续编辑。',
  'tour.loadWorkflow': '要加载已保存的工作流，请从下拉菜单中选择工作流并点击"加载"按钮。',
  'tour.exportWorkflow':
    '点击"导出"按钮以Claude Code可执行的格式导出。\n\nSub-Agent导出到`.claude/agents/`，SlashCommand导出到`.claude/commands/`。',
  'tour.refineWithAI':
    '使用"AI编辑"按钮通过与AI对话创建或改进工作流。\n\n可以从空画布开始或以对话方式编辑现有工作流。',
  'tour.helpButton': '要再次查看此导览，请点击帮助按钮(?)。\n\n享受创建工作流的乐趣！',

  // Tour buttons
  'tour.button.back': '返回',
  'tour.button.close': '关闭',
  'tour.button.finish': '完成',
  'tour.button.next': '下一步 ({step}/{steps})',
  'tour.button.skip': '跳过',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': '删除节点',
  'dialog.deleteNode.message': '确定要删除此节点吗？',
  'dialog.deleteNode.confirm': '删除',
  'dialog.deleteNode.cancel': '取消',

  // Skill Browser Dialog
  'skill.browser.title': '浏览Skill',
  'skill.browser.description':
    '选择要添加到工作流的Claude Code Skill。\nSkill是Claude Code自动利用的专业能力。',
  'skill.browser.personalTab': '个人',
  'skill.browser.projectTab': '项目',
  'skill.browser.noSkills': '在此目录中未找到Skill',
  'skill.browser.loading': '正在加载Skill...',
  'skill.browser.selectButton': '添加到工作流',
  'skill.browser.cancelButton': '取消',
  'skill.browser.skillName': 'Skill名称',
  'skill.browser.skillDescription': '描述',
  'skill.browser.skillPath': '路径',
  'skill.browser.validationStatus': '状态',

  // Skill Browser Errors
  'skill.error.loadFailed': '加载Skill失败。请检查Skill目录。',
  'skill.error.noSelection': '请选择一个Skill',
  'skill.error.unknown': '发生意外错误',

  // Skill Creation Dialog
  'skill.creation.title': '创建新技能',
  'skill.creation.description':
    '创建新的Claude Code技能。技能是Claude Code可以调用以执行特定任务的专用工具。',
  'skill.creation.nameLabel': '技能名称',
  'skill.creation.nameHint': '仅小写字母、数字和连字符（最多64个字符）',
  'skill.creation.descriptionLabel': '描述',
  'skill.creation.descriptionPlaceholder': '此技能的功能和使用时机的简要描述',
  'skill.creation.instructionsLabel': '说明',
  'skill.creation.instructionsPlaceholder':
    '以Markdown格式输入详细说明。\n\n例如：\n# 我的技能\n\n此技能...',
  'skill.creation.instructionsHint': 'Claude Code的Markdown格式说明',
  'skill.creation.allowedToolsLabel': '允许的工具（可选）',
  'skill.creation.allowedToolsHint': '逗号分隔的工具名称列表（例如：Read, Grep, Glob）',
  'skill.creation.scopeLabel': '范围',
  'skill.creation.scopePersonal': '个人 (~/.claude/skills/)',
  'skill.creation.scopeProject': '项目 (.claude/skills/)',
  'skill.creation.cancelButton': '取消',
  'skill.creation.createButton': '创建技能',
  'skill.creation.creatingButton': '创建中...',
  'skill.creation.error.unknown': '创建技能失败。请重试。',

  // Skill Validation Errors
  'skill.validation.nameRequired': '技能名称是必需的',
  'skill.validation.nameTooLong': '技能名称不得超过64个字符',
  'skill.validation.nameInvalidFormat': '技能名称只能包含小写字母、数字和连字符',
  'skill.validation.descriptionRequired': '描述是必需的',
  'skill.validation.descriptionTooLong': '描述不得超过1024个字符',
  'skill.validation.instructionsRequired': '说明是必需的',
  'skill.validation.scopeRequired': '请选择范围（个人/项目）',

  // Workflow Refinement (001-ai-workflow-refinement)
  'refinement.toolbar.refineButton': '使用AI编辑',
  'refinement.toolbar.refineButton.tooltip': '与AI聊天以编辑此工作流',

  // Refinement Chat Panel (Short form keys for components)
  'refinement.title': 'AI编辑',
  'refinement.inputPlaceholder': '描述您想要的更改...',
  'refinement.sendButton': '发送',
  'refinement.cancelButton': '取消',
  'refinement.processing': '处理中...',
  'refinement.aiProcessing': 'AI正在处理您的请求...',
  'refinement.charactersRemaining': '剩余 {count} 字符',
  'refinement.iterationCounter': '编辑次数: {current}次',
  'refinement.iterationCounter.tooltip': '编辑次数过多可能导致保存·加载速度变慢，影响编辑工作',
  'refinement.warning.title': '对话较长',
  'refinement.warning.message':
    '对话历史记录变大,可能会增加文件大小并影响性能。建议清除对话历史记录。',

  // Refinement Chat Panel (Detailed keys)
  'refinement.chat.title': '工作流优化聊天',
  'refinement.chat.description':
    '与AI聊天以逐步改进您的工作流。描述您想要的更改，AI将自动更新工作流。',
  'refinement.chat.inputPlaceholder': '描述您想要的更改（例如："添加错误处理"）',
  'refinement.chat.sendButton': '发送',
  'refinement.chat.sendButton.shortcut': 'Ctrl+Enter发送',
  'refinement.chat.sendButton.shortcutMac': 'Cmd+Enter发送',
  'refinement.chat.cancelButton': '取消',
  'refinement.chat.closeButton': '关闭',
  'refinement.chat.clearButton': '清除对话',
  'refinement.chat.clearButton.tooltip': '清除对话历史记录并重新开始',
  'refinement.chat.useSkillsCheckbox': '包含Skill',

  // Timeout selector
  'refinement.timeout.label': '超时',
  'refinement.timeout.ariaLabel': '选择AI优化超时时间',

  'refinement.chat.claudeMdTip':
    '💡 提示：在 CLAUDE.md 中添加工作流特定的规则和约束，AI可以进行更准确的编辑',
  'refinement.chat.refining': 'AI正在优化工作流... 最多可能需要120秒。',
  'refinement.chat.progressTime': '{elapsed}秒 / {max}秒',
  'refinement.chat.characterCount': '{count} / {max} 字符',
  'refinement.chat.iterationCounter': '迭代 {current} / {max}',
  'refinement.chat.iterationWarning': '接近迭代限制 ({current}/{max})',
  'refinement.chat.iterationLimitReached': '已达到最大迭代限制 ({max})。请清除对话以继续。',
  'refinement.chat.noMessages': '还没有消息。开始描述您想要改进的内容。',
  'refinement.chat.userMessageLabel': '您',
  'refinement.chat.aiMessageLabel': 'AI',
  'refinement.chat.success': '工作流优化成功！',
  'refinement.chat.changesSummary': '更改：{summary}',

  // Refinement Success Messages
  'refinement.success.defaultMessage': '已编辑工作流。',

  // Refinement Errors
  'refinement.error.emptyMessage': '请输入消息',
  'refinement.error.messageTooLong': '消息太长（最多{max}个字符）',
  'refinement.error.commandNotFound': '未找到Claude Code CLI。请安装Claude Code以使用AI优化功能。',
  'refinement.error.timeout': 'AI优化超时。请调整超时设定值后重试。建议您也可以考虑简化请求内容。',
  'refinement.error.parseError': '无法解析AI响应。请重试或重新表述您的请求。',
  'refinement.error.validationError': '优化后的工作流验证失败。请尝试不同的请求。',
  'refinement.error.iterationLimitReached':
    '已达到最大迭代限制(20)。清除对话历史记录重新开始，或手动编辑工作流。',
  'refinement.error.unknown': '发生意外错误。请检查日志以获取详细信息。',

  // Refinement Error Display (Phase 3.8)
  'refinement.error.retryButton': '重试',

  // Processing Overlay (Phase 3.10)
  'refinement.processingOverlay': 'AI正在处理您的请求...',

  // Clear Conversation Confirmation
  'refinement.clearDialog.title': '清除对话',
  'refinement.clearDialog.message': '确定要清除对话历史记录吗？此操作无法撤消。',
  'refinement.clearDialog.confirm': '清除',
  'refinement.clearDialog.cancel': '取消',

  // Initial instructional message (Phase 3.12)
  'refinement.initialMessage.description': '用自然语言描述您要实现的工作流。',
  'refinement.initialMessage.note': '※ 此功能使用您环境中安装的Claude Code。',

  // MCP Node (Feature: 001-mcp-node)
  'node.mcp.title': 'MCP Tool',
  'node.mcp.description': '执行MCP工具',

  // MCP Server List
  'mcp.loading.servers': '正在加载MCP服务器...',
  'mcp.error.serverLoadFailed': '加载MCP服务器失败',
  'mcp.empty.servers': '未配置MCP服务器',

  // MCP Tool List
  'mcp.loading.tools': '正在加载工具...',
  'mcp.error.toolLoadFailed': '从服务器加载工具失败',
  'mcp.empty.tools': '此服务器没有可用工具',

  // MCP Tool Search
  'mcp.search.placeholder': '按名称或描述搜索工具...',
  'mcp.search.noResults': '未找到与"{query}"匹配的工具',

  // MCP Node Dialog
  'mcp.dialog.title': 'MCP Tool配置',
  'mcp.dialog.selectServer': '选择MCP服务器',
  'mcp.dialog.selectTool': '选择工具',
  'mcp.dialog.addButton': '添加工具',
  'mcp.dialog.cancelButton': '取消',
  'mcp.dialog.wizardStep': '第{{current}}步，共{{total}}步',
  'mcp.dialog.nextButton': '下一步',
  'mcp.dialog.backButton': '返回',
  'mcp.dialog.saveButton': '创建节点',
  'mcp.dialog.error.noServerSelected': '请选择MCP服务器',
  'mcp.dialog.error.noToolSelected': '请选择工具',
  'mcp.dialog.error.incompleteWizard': '请完成所有必需步骤',
  'mcp.dialog.error.cannotProceed': '请填写所有必填字段以继续',
  'mcp.dialog.error.invalidMode': '选择了无效的模式',

  // MCP Property Panel
  'property.nodeType.mcp': 'MCP Tool',
  'property.mcp.serverId': '服务器',
  'property.mcp.toolName': '工具名称',
  'property.mcp.toolDescription': '描述',
  'property.mcp.parameters': '参数',
  'property.mcp.parameterValues': '参数值',
  'property.mcp.parameterCount': '参数数量',
  'property.mcp.editParameters': '编辑参数',
  'property.mcp.edit.manualParameterConfig': '编辑参数',
  'property.mcp.edit.aiParameterConfig': '编辑参数配置说明',
  'property.mcp.edit.aiToolSelection': '编辑任务',
  'property.mcp.infoNote': 'MCP工具属性从服务器加载。点击"编辑参数"以配置参数值。',

  // MCP Parameter Form
  'mcp.parameter.formTitle': '工具参数',
  'mcp.parameter.noParameters': '此工具没有参数',
  'mcp.parameter.selectOption': '-- 选择选项 --',
  'mcp.parameter.enterValue': '输入值',
  'mcp.parameter.minLength': '最小长度',
  'mcp.parameter.maxLength': '最大长度',
  'mcp.parameter.pattern': '模式',
  'mcp.parameter.minimum': '最小值',
  'mcp.parameter.maximum': '最大值',
  'mcp.parameter.default': '默认值',
  'mcp.parameter.addItem': '添加项目',
  'mcp.parameter.add': '添加',
  'mcp.parameter.remove': '删除',
  'mcp.parameter.arrayCount': '项目',
  'mcp.parameter.jsonFormat': '需要JSON格式',
  'mcp.parameter.jsonInvalid': '无效的JSON格式',
  'mcp.parameter.objectInvalid': '值必须是JSON对象',
  'mcp.parameter.unsupportedType': '不支持的参数类型: {name}的{type}',
  'mcp.parameter.validationErrors': '请修复以下验证错误:',

  // MCP Edit Dialog
  'mcp.editDialog.title': '配置MCP工具参数',
  'mcp.editDialog.saveButton': '保存',
  'mcp.editDialog.cancelButton': '取消',
  'mcp.editDialog.loading': '正在加载工具架构...',
  'mcp.editDialog.error.schemaLoadFailed': '加载工具架构失败',

  // MCP Natural Language Mode (Feature: 001-mcp-natural-language-mode)

  // Mode Selection
  'mcp.modeSelection.title': '选择配置模式',
  'mcp.modeSelection.subtitle': '选择MCP工具的配置方式',
  'mcp.modeSelection.manualParameterConfig.title': '手动参数设置',
  'mcp.modeSelection.manualParameterConfig.description':
    '明确配置服务器、工具和所有参数。再现性高，最适合技术用户。',
  'mcp.modeSelection.aiParameterConfig.title': 'AI参数设置',
  'mcp.modeSelection.aiParameterConfig.description':
    '选择服务器和工具，用自然语言描述参数。平衡的方法。',
  'mcp.modeSelection.aiToolSelection.title': 'AI工具选择',
  'mcp.modeSelection.aiToolSelection.description':
    '仅选择服务器，用自然语言描述整个任务。最简单，但再现性最低。',

  // Tool Selection Mode (Step-by-step decision flow)
  'mcp.toolSelectionMode.title': '工具选择方式',
  'mcp.toolSelectionMode.subtitle': '选择如何为此MCP节点选择工具',
  'mcp.toolSelectionMode.manual.title': '手动选择工具',
  'mcp.toolSelectionMode.manual.description':
    '我将自己浏览并选择工具。适合明确知道要使用哪个工具时。',
  'mcp.toolSelectionMode.auto.title': '让AI选择工具',
  'mcp.toolSelectionMode.auto.description':
    'AI将根据任务描述自动选择最佳工具。适合探索或不确定时。',

  // Parameter Config Mode (Step-by-step decision flow)
  'mcp.parameterConfigMode.title': '参数配置方式',
  'mcp.parameterConfigMode.subtitle': '选择如何为此工具配置参数',
  'mcp.parameterConfigMode.manual.title': '手动配置',
  'mcp.parameterConfigMode.manual.description':
    '我将自己填写所有参数。适合需要精确控制和可重现性时。',
  'mcp.parameterConfigMode.auto.title': '让AI配置',
  'mcp.parameterConfigMode.auto.description': 'AI将根据自然语言描述配置参数。适合快速设置时。',

  // Parameter Detailed Config Step
  'mcp.parameterDetailedConfig.title': '配置工具参数',

  // Natural Language Input
  'mcp.naturalLanguage.paramDescription.label': '参数配置说明',
  'mcp.naturalLanguage.paramDescription.placeholder':
    '描述您想用此工具做什么（例如："检查Lambda在us-east-1中是否可用"）...',
  'mcp.naturalLanguage.taskDescription.label': '任务描述',
  'mcp.naturalLanguage.taskDescription.placeholder':
    '描述您想完成的任务（例如："查找有关S3存储桶策略的文档"）...',

  // Mode Switch Warnings
  'mcp.modeSwitch.warning.title': '模式切换警告',
  'mcp.modeSwitch.warning.message':
    '从{currentMode}切换到{newMode}将改变此节点的配置方式。您当前的配置将被保留，但在新模式下可能不可见。您可以随时切换回{currentMode}以恢复之前的配置。',
  'mcp.modeSwitch.warning.continueButton': '继续',
  'mcp.modeSwitch.warning.cancelButton': '取消',
  'mcp.modeSwitch.dataPreserved': '您的数据将被保留',
  'mcp.modeSwitch.canRevert': '您可以随时切换回来',

  // Validation Errors
  'mcp.error.paramDescRequired': '请提供参数描述。',
  'mcp.error.taskDescRequired': '请提供任务描述。',
  'mcp.error.noToolsAvailable': '所选MCP服务器没有可用工具',
  'mcp.error.toolListOutdated': '工具列表快照已超过7天。请重新编辑此节点以获取最新的可用工具。',
  'mcp.error.modeConfigMissing': '缺少模式配置。请重新配置此节点。',
  'mcp.error.invalidModeConfig': '模式配置无效。请检查您的自然语言描述或切换到详细模式。',

  // Mode Indicator Tooltips
  'mcp.mode.detailed.tooltip': '详细模式: 所有参数都已明确配置',
  'mcp.mode.naturalLanguageParam.tooltip': '自然语言参数模式: "{description}"',
  'mcp.mode.fullNaturalLanguage.tooltip': '完全自然语言模式: "{taskDescription}"',
};
