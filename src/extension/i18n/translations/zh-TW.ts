/**
 * Claude Code Workflow Studio - Traditional Chinese Translations
 */

import type { TranslationKeys } from '../translation-keys';

export const zhTWTranslations: TranslationKeys = {
  // Mermaid flowchart labels
  'mermaid.start': '開始',
  'mermaid.end': '結束',
  'mermaid.question': '問題',
  'mermaid.conditionalBranch': '條件分支',

  // Workflow execution guide
  'guide.title': '## 工作流執行指南',
  'guide.intro': '按照上方的Mermaid流程圖執行工作流。每種節點類型的執行方法如下所述。',
  'guide.nodeTypesTitle': '### 各節點類型的執行方法',
  'guide.nodeTypes.subAgent': '- **矩形節點**：使用Task工具執行子代理',
  'guide.nodeTypes.askUserQuestion':
    '- **菱形節點（AskUserQuestion:...）**：使用AskUserQuestion工具提示用戶並根據其響應進行分支',
  'guide.nodeTypes.branch':
    '- **菱形節點（Branch/Switch:...）**：根據先前處理的結果自動分支（參見詳細資訊部分）',
  'guide.nodeTypes.prompt': '- **矩形節點（Prompt節點）**：執行下面詳細資訊部分中描述的提示',

  // Prompt node details
  'promptNode.title': '### Prompt節點詳細資訊',
  'promptNode.availableVariables': '**可用變數：**',
  'promptNode.variableNotSet': '（未設置）',

  // AskUserQuestion node details
  'askNode.title': '### AskUserQuestion節點詳細資訊',
  'askNode.selectionMode': '**選擇模式：**',
  'askNode.aiSuggestions': 'AI建議（AI根據上下文動態生成選項並呈現給用戶）',
  'askNode.multiSelect': '**多選：** 已啟用（用戶可以選擇多個選項）',
  'askNode.singleSelect': '單選（根據所選選項進行分支）',
  'askNode.options': '**選項：**',
  'askNode.noDescription': '（無描述）',
  'askNode.multiSelectExplanation': '多選已啟用（所選選項列表將傳遞到下一個節點）',

  // Branch node details (Legacy)
  'branchNode.title': '### Branch節點詳細資訊',
  'branchNode.binary': '二分支',
  'branchNode.multiple': '多分支',
  'branchNode.conditions': '**分支條件：**',
  'branchNode.executionMethod':
    '**執行方法**：評估先前處理的結果，並根據上述條件自動選擇適當的分支。',

  // IfElse node details
  'ifElseNode.title': '### If/Else節點詳細資訊',
  'ifElseNode.binary': '二分支 (True/False)',
  'ifElseNode.evaluationTarget': '評估目標',

  // Switch node details
  'switchNode.title': '### Switch節點詳細資訊',
  'switchNode.multiple': '多分支 (2-N)',
  'switchNode.evaluationTarget': '評估目標',

  // MCP node details
  'mcpNode.title': '## MCP工具節點',
  'mcpNode.description': '**描述**',
  'mcpNode.server': '**MCP伺服器**',
  'mcpNode.toolName': '**工具名稱**',
  'mcpNode.validationStatus': '**驗證狀態**',
  'mcpNode.configuredParameters': '**已配置參數**',
  'mcpNode.availableParameters': '**可用參數**',
  'mcpNode.required': '必需',
  'mcpNode.optional': '可選',
  'mcpNode.noDescription': '無描述',
  'mcpNode.executionMethod':
    '此節點調用MCP（Model Context Protocol）工具。執行此工作流時，請使用已配置的參數通過MCP伺服器調用該工具。',

  // Error messages
  'error.noWorkspaceOpen': '請先開啟資料夾或工作區。',

  // File picker
  'filePicker.title': '選擇工作流程檔案',
  'filePicker.error.invalidWorkflow': '無效的工作流程檔案。請選擇有效的JSON工作流程檔案。',
  'filePicker.error.loadFailed': '載入工作流程檔案失敗。',
};
