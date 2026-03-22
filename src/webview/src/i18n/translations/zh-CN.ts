/**
 * CC Workflow Studio - Webview Simplified Chinese Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const zhCNWebviewTranslations: WebviewTranslationKeys = {
  // Common
  loading: '加载中',
  description: '描述',
  optional: '可选',
  cancel: '取消',
  'common.close': '关闭',
  'common.cancel': '取消',
  'loading.importWorkflow': '正在导入工作流...',
  'loading.openWorkflow': '正在打开工作流...',

  // Preview mode
  'preview.label': '预览',
  'preview.loading': '正在加载工作流...',
  'preview.parseError': '工作流解析失败',
  'preview.openInEditor': '编辑',
  'preview.versionBefore': '修改前',
  'preview.versionAfter': '修改后',

  // Toolbar
  'toolbar.workflowNamePlaceholder': '工作流名称',
  'toolbar.save': '保存',
  'toolbar.saving': '保存中...',
  'toolbar.export': '导出',
  'toolbar.export.tooltip': '导出为 Slash Command 并保存到 .claude/commands/',
  'toolbar.exporting': '导出中...',
  'toolbar.refineWithAI': 'AI编辑',
  'toolbar.selectWorkflow': '选择工作流...',
  'toolbar.load': '加载',
  'toolbar.loading': '加载中...',
  'toolbar.refreshList': '刷新工作流列表',

  // Toolbar interaction mode
  'toolbar.interactionMode.panButton': '手掌',
  'toolbar.interactionMode.rangeSelectionButton': '范围选择',
  'toolbar.interactionMode.switchToPan': '切换到手掌模式',
  'toolbar.interactionMode.switchToSelection': '切换到选择模式',
  'toolbar.edgeAnimation.enable': '启用边动画',
  'toolbar.edgeAnimation.disable': '禁用边动画',
  'toolbar.highlight.enable': '启用组节点高亮',
  'toolbar.highlight.disable': '禁用组节点高亮',
  'toolbar.scrollMode.switchToClassic': '切换到Classic模式（滚动=缩放）',
  'toolbar.scrollMode.switchToFreehand': '切换到Freehand模式（滚动=平移）',

  // Toolbar minimap toggle
  'toolbar.minimapToggle.show': '显示迷你地图',
  'toolbar.minimapToggle.hide': '隐藏迷你地图',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '工作流名称必填',
  'toolbar.error.workflowNameInvalid': '只能使用英文小写字母(a-z)、数字、连字符和下划线',
  'toolbar.error.workflowNameRequiredForExport': '导出需要工作流名称',
  'toolbar.error.selectWorkflowToLoad': '请选择要加载的工作流',
  'toolbar.error.validationFailed': '工作流验证失败',
  'toolbar.error.missingEndNode': '工作流必须至少包含一个End节点',
  'toolbar.error.noActiveWorkflow': '请先加载工作流',
  'toolbar.error.invalidWorkflowFile': '无效的工作流文件。请选择有效的JSON工作流文件。',
  'toolbar.generateNameWithAI': '使用AI生成名称',
  'toolbar.error.nameGenerationFailed': '生成工作流名称失败。请重试或手动输入。',

  // Toolbar slash command group
  'toolbar.run': '执行',
  'toolbar.running': '执行中...',

  // Toolbar slash command options dropdown
  'toolbar.slashCommandOptions.frontmatterReferenceUrl':
    'https://code.claude.com/docs/zh-CN/slash-commands#前置事项',

  // Toolbar hooks configuration dropdown
  'hooks.title': 'Hooks',
  'hooks.preToolUse': 'PreToolUse',
  'hooks.postToolUse': 'PostToolUse',
  'hooks.stop': 'Stop',
  'hooks.addEntry': '添加',
  'hooks.removeEntry': '删除',
  'hooks.matcher.description': '要匹配的工具名称模式',
  'hooks.once.description': '每个会话只运行一次',
  'hooks.validation.commandRequired': 'command 是必填项',
  'hooks.validation.commandTooLong': 'command 超过最大长度',
  'hooks.validation.matcherRequired': '此钩子类型需要 matcher',

  // Argument Hint configuration
  'argumentHint.example': '示例:',
  'argumentHint.exampleAdd': '添加标签',
  'argumentHint.exampleRemove': '删除标签',
  'argumentHint.exampleList': '显示列表',

  // Toolbar more actions dropdown
  'toolbar.moreActions': '更多',
  'toolbar.help': '帮助',
  'toolbar.whatsNew': '更新内容',
  'whatsNew.title': '更新内容',
  'whatsNew.viewAllReleases': '查看所有更新内容',
  'whatsNew.showBadge': '未读徽章',

  // Copilot Execution Mode
  'copilot.mode.tooltip': '选择 Copilot 执行模式',
  'copilot.mode.cli': 'Copilot CLI',
  'copilot.mode.vscode': 'VSCode Copilot',

  // Node Palette
  'palette.title': '节点面板',
  'palette.basicNodes': '基本节点',
  'palette.specialNodes': '特殊节点',
  'palette.controlFlow': '控制流程',
  'palette.layout': '布局',
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

  // Group Node
  'node.group.title': 'Group',
  'node.group.description': '节点视觉分组容器',
  'property.group.members': '成员',
  'property.group.empty': '将节点拖入此分组以整理工作流。',

  // Codex Node (Feature: 518-codex-agent-node)
  'node.codex.title': 'Codex Agent',
  'node.codex.description': '执行OpenAI Codex CLI',
  'node.codex.untitled': '未命名Codex Agent',
  'node.codex.aiGenerated': 'AI生成',

  // Codex Dialog (Feature: 518-codex-agent-node)
  'codex.title': '创建Codex Agent',
  'codex.description': '为工作流配置OpenAI Codex CLI代理。',
  'codex.nameLabel': '名称',
  'codex.namePlaceholder': '例如: code-reviewer',
  'codex.promptModeLabel': '提示模式',
  'codex.promptMode.fixed': '固定',
  'codex.promptMode.aiGenerated': 'AI生成',
  'codex.promptMode.aiGeneratedHelp': '协调AI代理将根据上下文生成指令。',
  'codex.promptLabel': '提示词',
  'codex.promptPlaceholder': '输入Codex代理的指令...',
  'codex.promptGuidanceLabel': '引导（可选）',
  'codex.promptGuidancePlaceholder': 'AI生成时的提示（可选）...',
  'codex.modelLabel': '模型',
  'codex.model.custom': '自定义',
  'codex.customModelPlaceholder': '例如: gpt-6.0-codex',
  'codex.reasoningEffortLabel': '推理级别',
  'codex.reasoningEffort.low': '低',
  'codex.reasoningEffort.medium': '中',
  'codex.reasoningEffort.high': '高',
  'codex.sandboxLabel': '沙箱模式',
  'codex.sandbox.readOnly': '只读',
  'codex.sandbox.workspaceWrite': '工作区写入',
  'codex.sandbox.dangerFullAccess': '完全访问（危险）',
  'codex.sandboxHelp': '控制Codex代理的文件系统访问权限。',
  'codex.sandboxDefaultHelp': '使用Codex默认行为（无-s选项）。',
  'codex.advancedOptions': '高级选项',
  'codex.skipGitRepoCheckWarning': '工作流执行通常需要此选项。允许在受信任的Git仓库外执行。',
  'codex.createButton': '创建',
  'codex.cancelButton': '取消',
  'codex.error.nameRequired': '名称是必填项',
  'codex.error.nameTooLong': '名称不能超过64个字符',
  'codex.error.nameInvalidPattern': '名称只能包含字母、数字、连字符和下划线',
  'codex.error.promptRequired': '提示词是必填项',
  'codex.error.promptTooLong': '提示词不能超过10,000个字符',
  'codex.error.modelRequired': '模型名称是必填项',
  'codex.nameHelp': '只能使用字母、数字、连字符和下划线',

  // SubAgentFlow Node (Feature: 089-subworkflow)
  'node.subAgentFlow.title': 'Sub-Agent Flow',
  'node.subAgentFlow.description': '详细控制Sub-Agent并执行',
  'node.subAgentFlow.linked': '已链接',
  'node.subAgentFlow.notLinked': '未链接',
  'node.subAgentFlow.untitled': '未命名子代理流程',
  'node.subAgentFlow.subAgentFlowNotFound': '未找到子代理流程',
  'node.subAgentFlow.selectSubAgentFlow': '选择要执行的子代理流程',

  // SubAgentFlow Panel (Feature: 089-subworkflow)
  'subAgentFlow.panel.title': '子代理流程',
  'subAgentFlow.create': '新建',
  'subAgentFlow.delete': '删除',
  'subAgentFlow.mainWorkflow': '主工作流',
  'subAgentFlow.empty': '暂无子代理流程',
  'subAgentFlow.default.name': 'subagentflow',
  'subAgentFlow.editing': '编辑中:',
  'subAgentFlow.edit': '编辑 Sub-Agent Flow',
  'subAgentFlow.clickToEdit': '点击编辑名称',
  'subAgentFlow.namePlaceholder': '例如: data-processing',
  'subAgentFlow.dialog.close': '关闭并返回主工作流',
  'subAgentFlow.dialog.submit': '确认并添加到工作流',
  'subAgentFlow.dialog.cancel': '取消并放弃更改',
  'subAgentFlow.generateNameWithAI': '使用 AI 生成名称',

  // SubAgentFlow AI Edit
  'subAgentFlow.aiEdit.title': 'AI 编辑',
  'subAgentFlow.aiEdit.toggleButton': '切换 AI 编辑模式',

  // SubAgentFlow validation errors
  'error.subAgentFlow.nameRequired': '名称为必填项',
  'error.subAgentFlow.nameTooLong': '名称不能超过50个字符',
  'error.subAgentFlow.invalidName': '名称只能包含英文小写字母(a-z)、数字、连字符和下划线',

  // Quick start instructions
  'palette.nestedNotAllowed': '在子代理流程中不可用（不支持嵌套）',
  'palette.instruction.addNode': '点击节点将其添加到画布',
  'palette.instruction.dragNode': '拖动节点以重新定位',
  'palette.instruction.connectNodes': '从输出拖动到输入句柄以连接节点',
  'palette.instruction.editProperties': '选择节点以编辑其属性',

  // Property Panel
  'property.title': '属性',

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
  'property.memory': '记忆',
  'property.memory.referenceUrl': 'https://code.claude.com/docs/zh-CN/sub-agents#启用持久内存',
  'properties.subAgent.color': '颜色',
  'properties.subAgent.colorPlaceholder': '选择颜色...',
  'properties.subAgent.colorNone': '无',
  'properties.subAgent.colorHelp': '此子代理的视觉标识颜色',

  // Skill properties
  'property.skillPath': 'Skill路径',
  'property.scope': '范围',
  'property.scope.user': '用户',
  'property.scope.project': '项目',
  'property.scope.local': '本地',
  // Legacy key for backward compatibility
  'property.scope.personal': '个人',
  'property.validationStatus': '验证状态',
  'property.validationStatus.valid': '有效',
  'property.validationStatus.missing': '缺失',
  'property.validationStatus.invalid': '无效',
  'property.validationStatus.valid.tooltip': 'Skill有效且可以使用',
  'property.validationStatus.missing.tooltip': '在指定路径找不到SKILL.md文件',
  'property.validationStatus.invalid.tooltip': 'SKILL.md包含无效的YAML前置内容',
  'property.allowedTools': '允许的工具',

  // Codex Agent properties

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
  'property.prompt.label': '提示词',
  'property.prompt.placeholder': '输入包含{{variables}}的提示词',
  'property.prompt.help': '对动态值使用{{variableName}}语法',
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
  'default.prompt': '在此输入您的提示词。\n\n您可以使用{{variableName}}这样的变量。',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '条件为真时',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '条件为假时',
  'default.case1': 'Case 1',
  'default.case1Condition': '满足条件 1 时',
  'default.case2': 'Case 2',
  'default.case2Condition': '满足条件 2 时',
  'default.defaultBranch': 'default',
  'default.defaultBranchCondition': '其他情况',
  'default.conditionPrefix': '满足条件 ',
  'default.conditionSuffix': ' 时',

  // Tour
  'tour.welcome':
    '欢迎使用CC Workflow Studio！\n\n本导览将介绍主要功能的位置和作用。在创建第一个工作流之前，让我们先熟悉基础知识。',
  'tour.nodePalette':
    '节点面板包含可在工作流中使用的各种节点。\n\n点击Prompt、Sub-Agent、AskUserQuestion、If/Else、Switch等节点将其添加到画布。',
  'tour.addPrompt':
    '这个"Prompt"按钮可以将Prompt节点添加到画布。\n\nPrompt节点是支持变量的模板，是工作流的基本构建块。',
  'tour.addSubAgent':
    '"Sub-Agent"节点是执行特定任务的专业代理。\n\n配置提示和工具限制，创建具有单一职责的代理。',
  'tour.addSubAgentFlow':
    '「Sub-Agent Flow」可以可视化定义复杂的Sub-Agent处理流程。\n\n如果您想并行执行MCP或Skill，可以将各处理包含在Sub-Agent Flow中，然后创建并行执行这些Sub-Agent Flow的工作流来实现。',
  'tour.addSkill':
    '"Skill"节点调用Claude Code技能。\n\n可以选择并执行个人用（~/.claude/skills/）或项目用（.claude/skills/）的技能。',
  'tour.addMcp': '"MCP Tool"节点执行MCP服务器工具。\n\n可用于外部服务集成或自定义工具调用。',
  'tour.addAskUserQuestion':
    '"AskUserQuestion"节点用于根据用户选择分支工作流。\n\n可以使用此按钮将其添加到画布。',
  'tour.addEnd':
    '"End"节点表示工作流的结束点。\n\n可以放置多个End节点，根据不同结果设置不同的结束点。',
  'tour.addIfElse':
    '"If/Else"节点根据条件将工作流分成两个方向。\n\n设置真（True）或假（False）条件来控制处理流程。',
  'tour.addSwitch':
    '"Switch"节点根据多个条件将工作流分成多个方向。\n\n设置多个案例和默认案例来实现复杂的分支逻辑。',
  'tour.canvas': '这是画布。拖动节点调整位置，拖动手柄连接节点。\n\n已经放置了开始和结束节点。',
  'tour.propertyPanel': '属性面板可以配置所选节点。\n\n您可以编辑节点名称、提示、模型选择等。',
  'tour.connectNodes':
    '连接节点以创建工作流。\n\n从节点右侧的输出手柄(⚪)拖动到另一个节点左侧的输入手柄。',
  'tour.workflowName': '在这里可以为工作流命名。\n\n可以使用字母、数字、连字符和下划线。',
  'tour.saveWorkflow':
    '点击"保存"按钮将工作流以JSON格式保存到`.vscode/workflows/`目录。\n\n稍后可以加载并继续编辑。',
  'tour.loadWorkflow': '要加载已保存的工作流，请从下拉菜单中选择工作流并点击"加载"按钮。',
  'tour.exportWorkflow':
    '点击"Convert"按钮可将工作流转换为Slash Command格式。\n\n转换后的文件保存在.claude/commands/目录中。',
  'tour.runSlashCommand':
    '点击"Run"按钮可将工作流转换为Slash Command并立即在Claude Code中执行。\n\n一键完成转换和执行。',
  'tour.refineWithAI':
    '使用"AI编辑"按钮通过与AI对话创建或改进工作流。\n\n可以从空画布开始或以对话方式编辑现有工作流。',
  'tour.moreActions':
    '"更多"菜单提供以下功能：<br><br>• Claude API - 将工作流上传到Claude API<br>• 分享到Slack - 与团队分享工作流<br>• 重置 - 清空画布<br>• 专注模式 - 切换无干扰编辑模式<br>• AI代理 - 在其他AI代理中打开工作流<br>• 最新动态 - 查看最新更新<br>• 帮助 - 再次查看此导览<br><br>享受创建工作流的乐趣！',

  // Tour buttons
  'tour.button.back': '返回',
  'tour.button.close': '关闭',
  'tour.button.finish': '完成',
  'tour.button.next': '下一步',
  'tour.button.skip': '跳过',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': '删除节点',
  'dialog.deleteNode.message': '确定要删除此节点吗？',
  'dialog.deleteNode.confirm': '删除',
  'dialog.deleteNode.cancel': '取消',

  // Load Workflow Confirmation Dialog (when opening from preview with unsaved changes)
  'dialog.loadWorkflow.title': '未保存的更改',
  'dialog.loadWorkflow.message': '您有未保存的更改。加载新工作流将丢失这些更改。是否继续？',
  'dialog.loadWorkflow.confirm': '放弃并加载',
  'dialog.loadWorkflow.cancel': '取消',

  // Diff Preview Dialog (MCP apply_workflow)
  'dialog.diffPreview.title': '审核工作流变更',
  'dialog.diffPreview.description': 'AI 代理正在尝试对工作流进行以下更改:',
  'dialog.diffPreview.newWorkflow': 'AI 代理正在创建新的工作流:',
  'dialog.diffPreview.nameChange': '名称:',
  'dialog.diffPreview.nodes': '节点',
  'dialog.diffPreview.connections': '连接',
  'dialog.diffPreview.connectionsAdded': '添加',
  'dialog.diffPreview.connectionsRemoved': '删除',
  'dialog.diffPreview.noChanges': '未检测到更改。',
  'dialog.diffPreview.agentDescription': '代理说明',
  'dialog.diffPreview.filesToCreate': '将创建的文件',
  'dialog.diffPreview.accept': '接受',
  'dialog.diffPreview.reject': '拒绝',

  // Reset Workflow Confirmation Dialog
  'toolbar.resetWorkflow': '重置工作流',
  'toolbar.focusMode': '专注模式',
  'dialog.resetWorkflow.title': '重置工作流',
  'dialog.resetWorkflow.message': '确定要重置工作流吗？除 Start 和 End 外的所有节点都将被删除。',
  'dialog.resetWorkflow.confirm': '重置',

  // Skill Browser Dialog
  'skill.browser.title': '浏览Skill',
  'skill.browser.description': '选择要添加到工作流的Agent Skill。',
  'skill.browser.selectSkill': '选择Skill',
  'skill.browser.browseSkills': '浏览Skill',
  'skill.browser.userTab': '用户',
  'skill.browser.projectTab': '项目',
  'skill.browser.localTab': '本地',
  // Scope descriptions for beginners
  'skill.browser.userDescription': '可在所有项目中使用。',
  'skill.browser.projectDescription': '仅在此项目中可用（共享用）。',
  'skill.browser.localDescription': '仅在此项目中可用（个人用）。',
  'skill.browser.filterPlaceholder': '按Skill名称筛选...',
  // Legacy key for backward compatibility
  'skill.browser.personalTab': '个人',
  'skill.browser.noSkills': '在此目录中未找到Skill',
  'skill.browser.loading': '正在加载Skill...',
  'skill.browser.selectButton': '添加到工作流',
  'skill.browser.cancelButton': '取消',
  'skill.browser.skillName': 'Skill名称',
  'skill.browser.skillDescription': '描述',
  'skill.browser.skillPath': '路径',
  'skill.browser.validationStatus': '状态',

  // Skill Browser Settings Step
  'skill.browser.configureButton': '前往设置',
  'skill.browser.addButton': '添加到工作流',
  'skill.browser.backToList': '返回',

  // Skill Browser Actions
  'skill.action.refresh': '刷新',
  'skill.refreshing': '刷新中...',

  // Skill Browser Errors
  'skill.error.loadFailed': '加载Skill失败。请检查Skill目录。',
  'skill.error.noSelection': '请选择一个Skill',
  'skill.error.unknown': '发生意外错误',
  'skill.error.refreshFailed': '刷新Skill失败',

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
  'skill.creation.scopeUser': '用户 (~/.claude/skills/)',
  'skill.creation.scopeProject': '项目 (.claude/skills/)',
  // Legacy key for backward compatibility
  'skill.creation.scopePersonal': '个人 (~/.claude/skills/)',
  'skill.creation.cancelButton': '取消',
  'skill.creation.createButton': '创建技能',
  'skill.creation.creatingButton': '创建中...',
  'skill.creation.error.unknown': '创建技能失败。请重试。',

  // Skill Execution Mode
  'property.skill.executionMode': '执行模式',
  'property.skill.executionMode.execute': '执行',
  'property.skill.executionMode.load': '作为知识加载',
  'property.skill.executionMode.execute.description': '在工作流中将技能作为操作执行',
  'property.skill.executionMode.load.description': '将技能内容作为知识上下文加载（不执行）',
  'property.skill.executionPrompt': '提示词',
  'property.skill.executionPrompt.placeholder': '输入执行此技能时的附加指令...',

  // Skill Edit Dialog
  'skill.editDialog.title': '编辑技能设置',
  'skill.editDialog.saveButton': '保存',
  'skill.editDialog.cancelButton': '取消',

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
  'refinement.chat.useCodexNodesCheckbox': '包含Codex Agent节点',

  // Timeout selector
  'refinement.timeout.label': '超时',
  'refinement.timeout.ariaLabel': '选择AI优化超时时间',

  // Model selector
  'refinement.model.label': '模型',

  // Provider selector
  'refinement.provider.label': 'AI提供商',

  // Settings dropdown
  'refinement.settings.title': '设置',

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

  // Refinement Session Status
  'refinement.session.warningDialog.title': 'AI编辑会话已重新连接',
  'refinement.session.warningDialog.message':
    '由于切换AI提供商、加载他人共享的工作流或会话过期等原因，无法继续AI对话会话，已开始新的对话会话。\n\n之前对话会话中AI记住的额外上下文（文件内容、工具执行结果等）可能已丢失。\n\n如有需要，请在消息中重新分享相关信息。',
  'refinement.session.warningDialog.ok': 'OK',

  // Refinement Errors
  'refinement.error.emptyMessage': '请输入消息',
  'refinement.error.messageTooLong': '消息太长（最多{max}个字符）',
  'refinement.error.commandNotFound': '未找到Claude Code CLI。请安装Claude Code以使用AI优化功能。',
  'refinement.error.modelNotSupported':
    '所选模型不受支持或访问未启用。您可以在Copilot Chat中选择并使用该模型一次来启用访问权限。',
  'refinement.error.copilotNotAvailable':
    'Copilot 不可用。请确保已安装 VS Code 1.89 或更高版本以及 GitHub Copilot 扩展。',
  'refinement.error.timeout': 'AI优化超时。请调整超时设定值后重试。建议您也可以考虑简化请求内容。',
  'refinement.error.parseError': '无法解析AI响应。请重试或重新表述您的请求。',
  'refinement.error.validationError': '优化后的工作流验证失败。请尝试不同的请求。',
  'refinement.error.prohibitedNodeType':
    'SubAgent、SubAgentFlow 和 AskUserQuestion 节点不能在子代理流程中使用。',
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
  // Provider-specific notes
  'refinement.initialMessage.noteClaudeCode': '※ 此功能使用Claude Code。',
  'refinement.initialMessage.noteCodex': '※ 此功能使用Codex CLI。',
  // Copilot-specific note with link
  'refinement.initialMessage.noteCopilot':
    '※ 此功能通过 VSCode Language Model API 向您的 GitHub Copilot 发送请求。',

  // MCP Node (Feature: 001-mcp-node)
  'node.mcp.title': 'MCP Tool',
  'node.mcp.description': '执行MCP工具',

  // MCP Server List
  'mcp.loading.servers': '正在加载此项目中可用的MCP服务器...',
  'mcp.error.serverLoadFailed': '加载MCP服务器失败',
  'mcp.empty.servers': '此项目中没有可用的MCP服务器。',
  'mcp.empty.servers.hint': '请为Claude Code配置MCP服务器。',

  // MCP Tool List
  'mcp.loading.tools': '正在加载工具...',
  'mcp.error.toolLoadFailed': '从服务器加载工具失败',
  'mcp.empty.tools': '此服务器没有可用工具',

  // MCP Cache Actions
  'mcp.action.refresh': '刷新',
  'mcp.refreshing': '正在刷新...',
  'mcp.error.refreshFailed': 'MCP 缓存刷新失败',

  // MCP Tool Search
  'mcp.search.placeholder': '按名称或描述搜索工具...',
  'mcp.search.noResults': '未找到与"{query}"匹配的工具',
  'mcp.search.serverPlaceholder': '按名称筛选服务器...',
  'mcp.search.noServers': '未找到与"{query}"匹配的服务器',
  'mcp.browse.servers': '浏览MCP服务器',

  // MCP Node Dialog
  'mcp.dialog.title': 'MCP Tool配置',
  'mcp.dialog.selectServer': '选择MCP服务器',
  'mcp.dialog.selectTool': '选择工具',
  'mcp.dialog.addButton': '添加工具',
  'mcp.dialog.cancelButton': '取消',
  'mcp.dialog.nextButton': '下一步',
  'mcp.dialog.backButton': '返回',
  'mcp.dialog.saveButton': '创建节点',
  'mcp.dialog.error.noServerSelected': '请选择MCP服务器',
  'mcp.dialog.error.noToolSelected': '请选择工具',
  'mcp.dialog.error.incompleteWizard': '请完成所有必需步骤',
  'mcp.dialog.error.cannotProceed': '请填写所有必填字段以继续',
  'mcp.dialog.error.invalidMode': '选择了无效的模式',

  // MCP Property Panel
  'property.mcp.serverId': '服务器',
  'property.mcp.toolName': '工具名称',
  'property.mcp.toolDescription': '描述',
  'property.mcp.parameters': '参数',
  'property.mcp.parameterValues': '参数值',
  'property.mcp.parameterCount': '参数数量',
  'property.mcp.editParameters': '编辑参数',
  'property.mcp.edit.manualParameterConfig': '编辑参数',
  'property.mcp.edit.aiParameterConfig': '编辑参数内容',
  'property.mcp.edit.aiToolSelection': '编辑任务内容',
  'property.mcp.taskDescription': '任务内容',
  'property.mcp.parameterDescription': '参数内容',
  'property.mcp.configuredValues': '配置值',
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
  'mcp.editDialog.title': '配置MCP工具',
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
    '明确配置MCP服务器、MCP工具和所有参数。再现性高，最适合技术用户。',
  'mcp.modeSelection.aiParameterConfig.title': 'AI参数设置',
  'mcp.modeSelection.aiParameterConfig.description':
    '选择MCP服务器和MCP工具，用自然语言描述参数。平衡的方法。',
  'mcp.modeSelection.aiToolSelection.title': 'AI工具选择',
  'mcp.modeSelection.aiToolSelection.description':
    '仅选择MCP服务器，用自然语言描述整个任务。最简单，但再现性最低。',

  // Parameter Detailed Config Step
  'mcp.parameterDetailedConfig.title': '配置工具参数',

  // Natural Language Input
  'mcp.naturalLanguage.paramDescription.label': '参数内容',
  'mcp.naturalLanguage.paramDescription.placeholder':
    '描述您想用此工具做什么（例如："检查Lambda在us-east-1中是否可用"）...',
  'mcp.naturalLanguage.taskDescription.label': '任务内容',
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

  // Slack Integration
  'slack.connect': '连接到 Slack',
  'slack.disconnect': '断开连接',
  'slack.connecting': '连接中...',
  'slack.connected': '已连接到 {workspaceName}',
  'slack.notConnected': '未连接到 Slack',

  // Slack Manual Token
  'slack.manualToken.title': '连接到 Slack',
  'slack.manualToken.description': '通过您自己创建的 Slack 应用连接到工作区。',
  'slack.manualToken.howToGet.title': 'Slack App 设置方法',
  'slack.manualToken.howToGet.step1': '创建 Slack App (api.slack.com/apps)',
  'slack.manualToken.howToGet.step2': '添加 User Token Scopes (OAuth & Permissions):',
  'slack.manualToken.howToGet.step3': '将 App 安装到您的工作区 (OAuth & Permissions)',
  'slack.manualToken.howToGet.step4': '从 OAuth & Permissions 页面复制 User Token (xoxp-...)',
  'slack.manualToken.security.title': '安全和隐私',
  'slack.manualToken.security.notice': '注意：此功能与 Slack 服务器通信（非本地操作）',
  'slack.manualToken.security.storage': '令牌安全存储在 VSCode Secret Storage (OS 密钥链)',
  'slack.manualToken.security.transmission': '仅发送到 Slack API (api.slack.com) 用于验证',
  'slack.manualToken.security.deletion': '可以随时删除',
  'slack.manualToken.security.sharing': 'User Token 具有频道读写等权限。请仅在受信任的社区内共享。',
  'slack.manualToken.userToken.label': 'User OAuth Token',
  'slack.manualToken.error.tokenRequired': 'User Token 为必填项',
  'slack.manualToken.error.invalidTokenFormat': 'User Token 必须以 "xoxp-" 开头',
  'slack.manualToken.error.userTokenRequired': 'User Token 为必填项',
  'slack.manualToken.error.invalidUserTokenFormat': 'User Token 必须以 "xoxp-" 开头',
  'slack.manualToken.connecting': '连接中...',
  'slack.manualToken.connect': '连接',
  'slack.manualToken.deleteButton': '删除已保存的认证令牌',
  'slack.manualToken.deleteConfirm.title': '删除令牌',
  'slack.manualToken.deleteConfirm.message': '确定要删除已保存的认证令牌吗？',
  'slack.manualToken.deleteConfirm.confirm': '删除',
  'slack.manualToken.deleteConfirm.cancel': '取消',

  // Slack Share
  'slack.share.button': '分享',
  'slack.share.title': '分享到 Slack',
  'slack.share.selectChannel': '选择频道',
  'slack.share.selectChannelPlaceholder': '选择一个频道...',
  'slack.share.sharing': '分享中...',
  'slack.share.failed': '工作流分享失败',

  // Slack Description AI Generation
  'slack.description.generateFailed': '生成描述失败。请重试或手动输入。',

  // Slack Connect
  'slack.connect.button': '连接到 Slack',
  'slack.connect.connecting': '连接中...',
  'slack.connect.description': '连接您的 Slack 工作区以与团队共享工作流。',
  'slack.connect.success': '已成功连接到 {workspaceName}',
  'slack.connect.failed': '连接 Slack 失败',
  'slack.connect.title': '连接到 Slack',
  'slack.connect.tab.oauth': '将 Slack App 连接到工作区',
  'slack.connect.tab.manual': '使用自己的 Slack 应用连接',

  // Slack OAuth
  'slack.oauth.description':
    '点击连接到工作区按钮将显示允许"CC Workflow Studio"访问 Slack 的确认画面。\n授权后，连接用的 Slack App 将安装到您的工作区。',
  'slack.oauth.termsOfService': '服务条款',
  'slack.oauth.privacyPolicy': '隐私政策',
  'slack.oauth.supportPage': '支持页面',
  'slack.oauth.connectButton': '连接到工作区',
  'slack.oauth.status.initiated': '正在打开浏览器进行身份验证...',
  'slack.oauth.status.polling': '等待身份验证...',
  'slack.oauth.status.waitingHint': '在浏览器中完成身份验证后返回此处。',
  'slack.oauth.cancelled': '身份验证已取消',
  'slack.oauth.reviewNotice.message':
    '此 Slack 应用尚未提交至 Slack Marketplace。\n权限画面会显示警告。',

  // Slack Reconnect
  'slack.reconnect.button': 'Reconnect to Slack',
  'slack.reconnect.reconnecting': 'Reconnecting...',
  'slack.reconnect.description':
    'Re-authenticate with Slack to update permissions or refresh connection.',
  'slack.reconnect.success': 'Successfully reconnected to {workspaceName}',
  'slack.reconnect.failed': 'Failed to reconnect to Slack',

  // Slack Import
  'slack.import.title': '从 Slack 导入',
  'slack.import.importing': '导入中...',
  'slack.import.success': '工作流导入成功',
  'slack.import.failed': '工作流导入失败',
  'slack.import.confirmOverwrite': '已存在同名工作流。是否覆盖？',

  // Slack Search
  'slack.search.title': '搜索工作流',
  'slack.search.placeholder': '按名称、作者或频道搜索...',
  'slack.search.searching': '搜索中...',
  'slack.search.noResults': '未找到工作流',

  // Slack Scopes - reasons why each scope is required
  'slack.scopes.chatWrite.reason': '用于共享工作流',
  'slack.scopes.filesRead.reason': '用于导入工作流',
  'slack.scopes.filesWrite.reason': '用于附加工作流文件',
  'slack.scopes.channelsRead.reason': '用于选择目标频道',
  'slack.scopes.groupsRead.reason': '用于选择私有频道',

  // Slack Errors
  'slack.error.channelNotFound': '未找到频道',
  'slack.error.notInChannel': '共享目标频道未添加 Slack 应用。',
  'slack.error.networkError': '网络错误。请检查您的连接。',
  'slack.error.rateLimited': '超出速率限制。请在 {seconds} 秒后重试。',
  'slack.error.noWorkspaces': '没有连接的工作区',
  'slack.error.noChannels': '没有可用的频道',
  'slack.error.invalidAuth': 'Slack 令牌无效。',
  'slack.error.missingScope': '缺少必要权限。',
  'slack.error.fileTooLarge': '文件大小过大。',
  'slack.error.invalidFileType': '不支持的文件类型。',
  'slack.error.internalError': '发生 Slack 内部错误。',
  'slack.error.notAuthed': '未提供认证信息。',
  'slack.error.invalidCode': '认证码无效或已过期。',
  'slack.error.badClientSecret': '客户端密钥无效。',
  'slack.error.invalidGrantType': '无效的认证类型。',
  'slack.error.accountInactive': '账户已停用。',
  'slack.error.invalidQuery': '无效的搜索查询。',
  'slack.error.msgTooLong': '消息过长。',
  'slack.error.workspaceNotConnected': '未连接到源 Slack 工作区。',
  'slack.error.unknownError': '发生未知错误。',
  'slack.error.unknownApiError': '发生 Slack API 错误。',

  // Sensitive Data Warning
  'slack.sensitiveData.warning.title': '检测到敏感数据',
  'slack.sensitiveData.warning.message': '在您的工作流中检测到以下敏感数据:',
  'slack.sensitiveData.warning.continue': '仍然分享',
  'slack.sensitiveData.warning.cancel': '取消',

  // Slack Import Connection Required Dialog
  'slack.import.connectionRequired.title': '需要连接 Slack',
  'slack.import.connectionRequired.message':
    '要导入此工作流，请连接到源 Slack 工作区。工作流文件位于当前未连接的工作区中。',
  'slack.import.connectionRequired.workspaceInfo': '源工作区:',
  'slack.import.connectionRequired.connectButton': '连接到 Slack',

  // Edit in VSCode Editor
  'editor.openInEditor': '在编辑器中编辑',
  'editor.openInEditor.tooltip': '在 VSCode 编辑器中打开以使用完整编辑功能',

  // Workflow Settings / Memo Panel
  'workflow.settings.title': '工作流设置',
  'workflow.settings.description.label': '描述',
  'workflow.settings.description.placeholder': '输入此工作流的描述（例如：它做什么、何时使用）...',
  'workflow.settings.generateWithAI': 'AI生成',

  // MCP Server Section
  'mcpSection.description.line1': '通过与AI对话的方式编辑工作流。',
  'mcpSection.description.line2': '请选择要使用的代理。',
  'mcpSection.reviewBeforeApply': '应用前确认更改',

  // Description Panel (Canvas)
  'description.panel.title': '描述',
  'description.panel.show': '显示描述面板',
  'description.panel.hide': '隐藏描述面板',

  // Sub-Agent Creation Dialog (Feature: 636 - Use Existing Agent)
  'subAgent.dialog.title': '浏览 Sub-Agent',
  'subAgent.dialog.createNew': '新建',
  'subAgent.dialog.createNew.description': '从头创建新的 Sub-Agent',
  'subAgent.dialog.useExisting': '使用现有代理',
  'subAgent.dialog.useExisting.description': '重用现有的 .claude/agents/*.md 文件',
  'subAgent.dialog.selectCommand': '选择命令',
  'subAgent.dialog.userTab': '用户',
  'subAgent.dialog.projectTab': '项目',
  'subAgent.dialog.filterPlaceholder': '按名称过滤...',
  'subAgent.dialog.noCommands': '此目录中未找到命令',
  'subAgent.dialog.loading': '加载命令中...',
  'subAgent.dialog.addButton': '添加到工作流',
  'subAgent.dialog.cancelButton': '取消',
  'subAgent.dialog.backButton': '返回',
  'subAgent.dialog.loadFailed': '加载命令失败。请检查命令目录。',
  'subAgent.dialog.description': '选择要添加到工作流的 Sub-Agent。',
  'subAgent.dialog.selectSubAgent': '选择 Sub-Agent',
  'subAgent.dialog.browseSubAgents': '浏览 Sub-Agent',
  'subAgent.dialog.userDescription': '~/.claude/agents/ 中的命令 — 所有项目可用。',
  'subAgent.dialog.projectDescription': '.claude/agents/ 中的命令 — 仅限此项目。',
  'subAgent.dialog.localDescription':
    '由已安装的 Claude Code 插件提供的代理。这些代理为只读，由各自的插件管理。',
  'subAgent.property.linkedCommand': '关联命令',

  // Sub-Agent Form Dialog (Create New)
  'subAgent.form.title': '创建新 Sub-Agent',
  'subAgent.form.description': '使用自定义设置定义新的 Sub-Agent 节点。',
  'subAgent.form.agentTypeLabel': '代理类型',
  'subAgent.form.agentType.claudeCode': 'Claude Code',
  'subAgent.form.agentType.other': '其他',
  'subAgent.form.descriptionLabel': '描述',
  'subAgent.form.descriptionPlaceholder': '简要描述此代理...',
  'subAgent.form.promptLabel': '提示词',
  'subAgent.form.promptPlaceholder': '输入此代理的指令...',
  'subAgent.form.modelLabel': '模型',
  'subAgent.form.toolsLabel': '工具',
  'subAgent.form.toolsHint': '以逗号分隔的允许工具列表（例如：Read, Grep, Glob）',
  'subAgent.form.memoryLabel': '内存范围',
  'subAgent.form.memoryNone': '无',
  'subAgent.form.cancelButton': '取消',
  'subAgent.form.createButton': '创建',
  'subAgent.form.editTitle': '编辑 Sub-Agent',
  'subAgent.form.saveButton': '保存',
  'subAgent.property.editButton': '编辑',
  'subAgent.form.error.descriptionRequired': '描述为必填项。',
  'subAgent.form.error.promptRequired': '提示词为必填项。',

  // Claude API Upload Dialog
  'claudeApi.description':
    '将工作流作为 Agent Skills 上传到 Claude API，并通过 Messages API 运行。\n结合 MCP 服务器、代码执行和其他技能，您可以将专业 AI 代理作为 API 发布，用于文档处理、数据分析、客户支持等场景。',
};
