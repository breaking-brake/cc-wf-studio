/**
 * Claude Code Workflow Studio - Simplified Chinese Translations
 */

import type { TranslationKeys } from '../translation-keys';

export const zhCNTranslations: TranslationKeys = {
  // Mermaid flowchart labels
  'mermaid.start': '开始',
  'mermaid.end': '结束',
  'mermaid.question': '问题',
  'mermaid.conditionalBranch': '条件分支',

  // Workflow execution guide
  'guide.title': '## 工作流执行指南',
  'guide.intro': '按照上方的Mermaid流程图执行工作流。每种节点类型的执行方法如下所述。',
  'guide.nodeTypesTitle': '### 各节点类型的执行方法',
  'guide.nodeTypes.subAgent': '- **矩形节点**：使用Task工具执行子代理',
  'guide.nodeTypes.askUserQuestion':
    '- **菱形节点（AskUserQuestion:...）**：使用AskUserQuestion工具提示用户并根据其响应进行分支',
  'guide.nodeTypes.branch':
    '- **菱形节点（Branch/Switch:...）**：根据先前处理的结果自动分支（参见详细信息部分）',
  'guide.nodeTypes.prompt': '- **矩形节点（Prompt节点）**：执行下面详细信息部分中描述的提示',

  // Prompt node details
  'promptNode.title': '### Prompt节点详细信息',
  'promptNode.availableVariables': '**可用变量：**',
  'promptNode.variableNotSet': '（未设置）',

  // AskUserQuestion node details
  'askNode.title': '### AskUserQuestion节点详细信息',
  'askNode.selectionMode': '**选择模式：**',
  'askNode.aiSuggestions': 'AI建议（AI根据上下文动态生成选项并呈现给用户）',
  'askNode.multiSelect': '**多选：** 已启用（用户可以选择多个选项）',
  'askNode.singleSelect': '单选（根据所选选项进行分支）',
  'askNode.options': '**选项：**',
  'askNode.noDescription': '（无描述）',
  'askNode.multiSelectExplanation': '多选已启用（所选选项列表将传递到下一个节点）',

  // Branch node details (Legacy)
  'branchNode.title': '### Branch节点详细信息',
  'branchNode.binary': '二分支',
  'branchNode.multiple': '多分支',
  'branchNode.conditions': '**分支条件：**',
  'branchNode.executionMethod':
    '**执行方法**：评估先前处理的结果，并根据上述条件自动选择适当的分支。',

  // IfElse node details
  'ifElseNode.title': '### If/Else节点详细信息',
  'ifElseNode.binary': '二分支 (True/False)',
  'ifElseNode.evaluationTarget': '评估目标',

  // Switch node details
  'switchNode.title': '### Switch节点详细信息',
  'switchNode.multiple': '多分支 (2-N)',
  'switchNode.evaluationTarget': '评估目标',

  // MCP node details
  'mcpNode.title': '## MCP工具节点',
  'mcpNode.description': '**描述**',
  'mcpNode.server': '**MCP服务器**',
  'mcpNode.toolName': '**工具名称**',
  'mcpNode.validationStatus': '**验证状态**',
  'mcpNode.configuredParameters': '**已配置参数**',
  'mcpNode.availableParameters': '**可用参数**',
  'mcpNode.required': '必需',
  'mcpNode.optional': '可选',
  'mcpNode.noDescription': '无描述',
  'mcpNode.executionMethod':
    '此节点调用MCP（Model Context Protocol）工具。执行此工作流时，请使用已配置的参数通过MCP服务器调用该工具。',

  // Error messages
  'error.noWorkspaceOpen': '请先打开文件夹或工作区。',

  // File picker
  'filePicker.title': '选择工作流文件',
  'filePicker.error.invalidWorkflow': '无效的工作流文件。请选择有效的JSON工作流文件。',
  'filePicker.error.loadFailed': '加载工作流文件失败。',
};
