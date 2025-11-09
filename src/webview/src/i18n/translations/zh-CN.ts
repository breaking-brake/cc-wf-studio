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
  'toolbar.selectWorkflow': '选择工作流...',
  'toolbar.load': '加载',
  'toolbar.refreshList': '刷新工作流列表',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '工作流名称必填',
  'toolbar.error.workflowNameRequiredForExport': '导出需要工作流名称',
  'toolbar.error.selectWorkflowToLoad': '请选择要加载的工作流',
  'toolbar.error.validationFailed': '工作流验证失败',
  'toolbar.error.missingEndNode': '工作流必须至少包含一个End节点',

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
  'tour.welcome': '欢迎使用Claude Code Workflow Studio！\n\n本导览将指导您创建第一个工作流。',
  'tour.nodePalette':
    '节点面板包含可在工作流中使用的各种节点。\n\n点击Prompt、Sub-Agent、AskUserQuestion、If/Else、Switch等节点将其添加到画布。',
  'tour.addPrompt':
    '点击"Prompt"按钮添加第一个节点。\n\nPrompt节点是支持变量的模板，是工作流的基本构建块。',
  'tour.canvas': '这是画布。拖动节点调整位置，拖动手柄连接节点。\n\n已经放置了开始和结束节点。',
  'tour.propertyPanel': '属性面板可以配置所选节点。\n\n您可以编辑节点名称、提示、模型选择等。',
  'tour.addAskUserQuestion':
    '现在添加"AskUserQuestion"节点。\n\n此节点允许根据用户选择分支工作流。',
  'tour.connectNodes':
    '连接节点以创建工作流。\n\n从节点右侧的输出手柄(⚪)拖动到另一个节点左侧的输入手柄。',
  'tour.workflowName': '为工作流命名。\n\n可以使用字母、数字、连字符和下划线。',
  'tour.saveWorkflow':
    '点击"保存"按钮将工作流以JSON格式保存到`.vscode/workflows/`目录。\n\n稍后可以加载并继续编辑。',
  'tour.loadWorkflow': '要加载已保存的工作流，请从下拉菜单中选择工作流并点击"加载"按钮。',
  'tour.exportWorkflow':
    '点击"导出"按钮以Claude Code可执行的格式导出。\n\nSub-Agent导出到`.claude/agents/`，SlashCommand导出到`.claude/commands/`。',
  'tour.generateWithAI':
    '使用"AI生成"按钮从自然语言描述自动创建工作流。\n\n例如：只需输入"创建一个扫描代码、询问用户优先级并生成修复建议的代码审查工作流"，就会生成完整的工作流。',
  'tour.helpButton': '要再次查看此导览，请点击帮助按钮(?)。\n\n享受创建工作流的乐趣！',

  // Tour buttons
  'tour.button.back': '返回',
  'tour.button.close': '关闭',
  'tour.button.finish': '完成',
  'tour.button.next': '下一步',
  'tour.button.skip': '跳过',

  // AI Generation Dialog
  'ai.dialogTitle': '使用AI生成工作流',
  'ai.dialogDescription': '用自然语言描述您要创建的工作流。AI将生成包含节点和连接的完整工作流。',
  'ai.descriptionLabel': '工作流描述',
  'ai.descriptionPlaceholder':
    '示例：创建一个扫描代码、询问用户优先级并生成修复建议的代码审查工作流',
  'ai.characterCount': '{count} / {max} 字符',
  'ai.generating': '正在生成工作流... 可能需要最多90秒。',
  'ai.progressTime': '{elapsed}秒 / {max}秒',
  'ai.generateButton': '生成',
  'ai.cancelButton': '取消',
  'ai.cancelGenerationButton': '取消生成',
  'ai.success': '工作流生成成功！',
  'ai.usageNote': '*1 此功能使用您环境中安装的Claude Code。',
  'ai.overwriteWarning': '*2 生成工作流将完全替换您当前的工作流。请在继续之前保存您的工作。',

  // AI Generation Errors
  'ai.error.emptyDescription': '请输入工作流描述',
  'ai.error.descriptionTooLong': '描述过长（最多{max}字符）',
  'ai.error.commandNotFound': '未找到Claude Code CLI。请安装Claude Code以使用AI生成功能。',
  'ai.error.timeout': '请求超时。请重试或简化您的描述。',
  'ai.error.parseError': '生成失败 - 请重试或重新表述您的描述',
  'ai.error.validationError': '生成的工作流验证失败',
  'ai.error.unknown': '发生意外错误。请重试。',

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
};
