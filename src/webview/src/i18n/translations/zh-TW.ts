/**
 * Claude Code Workflow Studio - Webview Traditional Chinese Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const zhTWWebviewTranslations: WebviewTranslationKeys = {
  // Toolbar
  'toolbar.workflowNamePlaceholder': '工作流名稱',
  'toolbar.save': '儲存',
  'toolbar.saving': '儲存中...',
  'toolbar.export': '匯出',
  'toolbar.exporting': '匯出中...',
  'toolbar.selectWorkflow': '選擇工作流...',
  'toolbar.load': '載入',
  'toolbar.refreshList': '重新整理工作流清單',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '工作流名稱為必填',
  'toolbar.error.workflowNameRequiredForExport': '匯出需要工作流名稱',
  'toolbar.error.selectWorkflowToLoad': '請選擇要載入的工作流',
  'toolbar.error.validationFailed': '工作流驗證失敗',

  // Node Palette
  'palette.title': '節點面板',
  'palette.basicNodes': '基本節點',
  'palette.controlFlow': '控制流程',
  'palette.quickStart': '💡 快速入門',

  // Node types
  'node.prompt.title': 'Prompt',
  'node.prompt.description': '帶變數的範本',
  'node.subAgent.title': 'Sub-Agent',
  'node.subAgent.description': '執行專門任務',
  'node.branch.title': 'Branch',
  'node.branch.description': '條件分支邏輯',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': '根據使用者選擇分支',

  // Quick start instructions
  'palette.instruction.addNode': '點擊節點將其新增到畫布',
  'palette.instruction.dragNode': '拖動節點以重新定位',
  'palette.instruction.connectNodes': '從輸出拖動到輸入控點以連接節點',
  'palette.instruction.editProperties': '選擇節點以編輯其屬性',

  // Property Panel
  'property.title': '屬性',
  'property.noSelection': '選擇節點以檢視其屬性',

  // Node type badges
  'property.nodeType.subAgent': 'Sub-Agent',
  'property.nodeType.askUserQuestion': 'Ask User Question',
  'property.nodeType.branch': 'Branch Node',
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
  'property.nodeType.unknown': '未知',

  // Common property labels
  'property.nodeName': '節點名稱',
  'property.nodeName.placeholder': '輸入節點名稱',
  'property.nodeName.help': '用於匯出的檔案名稱（例如："data-analysis"）',
  'property.description': '描述',
  'property.prompt': '提示',
  'property.model': '模型',
  'property.label': '標籤',
  'property.label.placeholder': '輸入標籤',

  // Start/End node descriptions
  'property.startNodeDescription': 'Start節點標記工作流的開始。它不能被刪除且沒有可編輯的屬性。',
  'property.endNodeDescription': 'End節點標記工作流的完成。它不能被刪除且沒有可編輯的屬性。',
  'property.unknownNodeType': '未知節點類型：',

  // Sub-Agent properties
  'property.tools': '工具（逗號分隔）',
  'property.tools.placeholder': '例如：Read,Write,Bash',
  'property.tools.help': '留空表示所有工具',

  // AskUserQuestion properties
  'property.questionText': '問題',
  'property.multiSelect': '多選',
  'property.multiSelect.enabled': '使用者可以選擇多個選項（輸出選擇清單）',
  'property.multiSelect.disabled': '使用者選擇一個選項（分支到相應節點）',
  'property.aiSuggestions': 'AI建議選項',
  'property.aiSuggestions.enabled': 'AI將根據上下文動態生成選項',
  'property.aiSuggestions.disabled': '在下方手動定義選項',
  'property.options': '選項',
  'property.optionsCount': '選項（{count}/4）',
  'property.optionNumber': '選項 {number}',
  'property.addOption': '+ 新增選項',
  'property.remove': '刪除',
  'property.optionLabel.placeholder': '標籤',
  'property.optionDescription.placeholder': '描述',

  // Prompt properties
  'property.promptTemplate': '提示範本',
  'property.promptTemplate.placeholder': '輸入包含{{variables}}的提示範本',
  'property.promptTemplate.help': '對動態值使用{{variableName}}語法',
  'property.detectedVariables': '偵測到的變數（{count}）',
  'property.variablesSubstituted': '變數將在執行時替換',

  // Branch properties
  'property.branchType': '分支類型',
  'property.conditional': '條件（雙向）',
  'property.switch': '切換（多向）',
  'property.branchType.conditional.help': '2個分支（True/False）',
  'property.branchType.switch.help': '多個分支（2-N向）',
  'property.branches': '分支',
  'property.branchesCount': '分支（{count}）',
  'property.branchNumber': '分支 {number}',
  'property.addBranch': '+ 新增分支',
  'property.branchLabel': '標籤',
  'property.branchLabel.placeholder': '例如：成功，錯誤',
  'property.branchCondition': '條件（自然語言）',
  'property.branchCondition.placeholder': '例如：如果前一個過程成功',
  'property.minimumBranches': '至少需要2個分支',

  // Default node labels
  'default.newSubAgent': '新Sub-Agent',
  'default.enterPrompt': '在此輸入提示',
  'default.newQuestion': '新問題',
  'default.option': '選項',
  'default.firstOption': '第一個選項',
  'default.secondOption': '第二個選項',
  'default.newOption': '新選項',
  'default.newPrompt': '新Prompt',
  'default.promptTemplate': '在此輸入您的提示範本。\n\n您可以使用{{variableName}}這樣的變數。',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '條件為真時',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '條件為偽時',
  'default.newBranch': '分支',
  'default.newCondition': '新條件',

  // Tour
  'tour.welcome': '歡迎使用Claude Code Workflow Studio！\n\n本導覽將指導您建立第一個工作流程。',
  'tour.nodePalette':
    '節點面板包含可在工作流程中使用的各種節點。\n\n點擊Prompt、Sub-Agent、AskUserQuestion、Branch等節點將其新增到畫布。',
  'tour.addPrompt': '點擊「Prompt」按鈕新增第一個節點。\n\nPrompt節點是支援變數的範本，是工作流程的基本建置區塊。',
  'tour.canvas':
    '這是畫布。拖曳節點調整位置，拖曳手柄連接節點。\n\n已經放置了開始和結束節點。',
  'tour.propertyPanel':
    '屬性面板可以設定所選節點。\n\n您可以編輯節點名稱、提示、模型選擇等。',
  'tour.addAskUserQuestion':
    '現在新增「AskUserQuestion」節點。\n\n此節點允許根據使用者選擇分支工作流程。',
  'tour.connectNodes':
    '連接節點以建立工作流程。\n\n從節點右側的輸出手柄(⚪)拖曳到另一個節點左側的輸入手柄。',
  'tour.workflowName': '為工作流程命名。\n\n可以使用字母、數字、連字號和底線。',
  'tour.saveWorkflow':
    '點擊「儲存」按鈕將工作流程以JSON格式儲存到`.vscode/workflows/`目錄。\n\n稍後可以載入並繼續編輯。',
  'tour.exportWorkflow':
    '點擊「匯出」按鈕以Claude Code可執行的格式匯出。\n\nSub-Agent匯出到`.claude/agents/`，SlashCommand匯出到`.claude/commands/`。',
  'tour.helpButton': '要再次檢視此導覽，請點擊說明按鈕(?)。\n\n享受建立工作流程的樂趣！',

  // Tour buttons
  'tour.button.back': '返回',
  'tour.button.close': '關閉',
  'tour.button.finish': '完成',
  'tour.button.next': '下一步',
  'tour.button.skip': '略過',
};
