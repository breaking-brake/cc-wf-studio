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
  'toolbar.generateWithAI': 'AI生成',
  'toolbar.refineWithAI': 'AI編輯',
  'toolbar.selectWorkflow': '選擇工作流...',
  'toolbar.load': '載入',
  'toolbar.refreshList': '重新整理工作流清單',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '工作流名稱為必填',
  'toolbar.error.workflowNameRequiredForExport': '匯出需要工作流名稱',
  'toolbar.error.selectWorkflowToLoad': '請選擇要載入的工作流',
  'toolbar.error.validationFailed': '工作流驗證失敗',
  'toolbar.error.missingEndNode': '工作流必須至少包含一個End節點',
  'toolbar.error.noActiveWorkflow': '請先載入工作流',

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
  'node.end.title': 'End',
  'node.end.description': '工作流程結束點',
  'node.branch.title': 'Branch',
  'node.branch.description': '條件分支邏輯',
  'node.branch.deprecationNotice': '已棄用。請遷移到If/Else或Switch節點',
  'node.ifElse.title': 'If/Else',
  'node.ifElse.description': '二元條件分支（真/假）',
  'node.switch.title': 'Switch',
  'node.switch.description': '多路條件分支（2-N 種情況）',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': '根據使用者選擇分支',
  'node.skill.title': 'Skill',
  'node.skill.description': '執行Claude Code Skill',

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
  'property.nodeType.ifElse': 'If/Else Node',
  'property.nodeType.switch': 'Switch Node',
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
  'property.nodeType.skill': 'Skill節點',
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
  'property.evaluationTarget': '評估目標',
  'property.evaluationTarget.placeholder': '例如：前一步驟的執行結果',
  'property.evaluationTarget.help': '用自然語言描述分支條件中要評估的內容',

  // Start/End node descriptions
  'property.startNodeDescription': 'Start節點標記工作流的開始。它不能被刪除且沒有可編輯的屬性。',
  'property.endNodeDescription': 'End節點標記工作流的完成。它不能被刪除且沒有可編輯的屬性。',
  'property.unknownNodeType': '未知節點類型：',

  // Sub-Agent properties
  'property.tools': '工具（逗號分隔）',
  'property.tools.placeholder': '例如：Read,Write,Bash',
  'property.tools.help': '留空表示所有工具',

  // Skill properties
  'property.skillPath': 'Skill路徑',
  'property.scope': '範圍',
  'property.scope.personal': '個人',
  'property.scope.project': '專案',
  'property.validationStatus': '驗證狀態',
  'property.validationStatus.valid': '有效',
  'property.validationStatus.missing': '缺失',
  'property.validationStatus.invalid': '無效',
  'property.validationStatus.valid.tooltip': 'Skill有效且可以使用',
  'property.validationStatus.missing.tooltip': '在指定路徑找不到SKILL.md檔案',
  'property.validationStatus.invalid.tooltip': 'SKILL.md包含無效的YAML前置內容',
  'property.allowedTools': '允許的工具',

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
  'default.case1': 'Case 1',
  'default.case1Condition': '滿足條件 1 時',
  'default.case2': 'Case 2',
  'default.case2Condition': '滿足條件 2 時',
  'default.case3': 'Case 3',
  'default.case3Condition': '滿足條件 3 時',
  'default.conditionPrefix': '滿足條件 ',
  'default.conditionSuffix': ' 時',

  // Tour
  'tour.welcome':
    '歡迎使用Claude Code Workflow Studio！\n\n本導覽將介紹主要功能的位置和作用。在建立第一個工作流程之前，讓我們先熟悉基礎知識。',
  'tour.nodePalette':
    '節點面板包含可在工作流程中使用的各種節點。\n\n點擊Prompt、Sub-Agent、AskUserQuestion、If/Else、Switch等節點將其新增到畫布。',
  'tour.addPrompt':
    '這個「Prompt」按鈕可以將Prompt節點新增到畫布。\n\nPrompt節點是支援變數的範本，是工作流程的基本建置區塊。',
  'tour.canvas': '這是畫布。拖曳節點調整位置，拖曳手柄連接節點。\n\n已經放置了開始和結束節點。',
  'tour.propertyPanel': '屬性面板可以設定所選節點。\n\n您可以編輯節點名稱、提示、模型選擇等。',
  'tour.addAskUserQuestion':
    '「AskUserQuestion」節點用於根據使用者選擇分支工作流程。\n\n可以使用此按鈕將其新增到畫布。',
  'tour.connectNodes':
    '連接節點以建立工作流程。\n\n從節點右側的輸出手柄(⚪)拖曳到另一個節點左側的輸入手柄。',
  'tour.workflowName': '在這裡可以為工作流程命名。\n\n可以使用字母、數字、連字號和底線。',
  'tour.saveWorkflow':
    '點擊「儲存」按鈕將工作流程以JSON格式儲存到`.vscode/workflows/`目錄。\n\n稍後可以載入並繼續編輯。',
  'tour.loadWorkflow': '要載入已儲存的工作流程，請從下拉選單中選擇工作流程並點擊「載入」按鈕。',
  'tour.exportWorkflow':
    '點擊「匯出」按鈕以Claude Code可執行的格式匯出。\n\nSub-Agent匯出到`.claude/agents/`，SlashCommand匯出到`.claude/commands/`。',
  'tour.refineWithAI':
    '使用「AI編輯」按鈕透過與AI對話建立或改善工作流程。\n\n可以從空白畫布開始或以對話方式編輯現有工作流程。',
  'tour.helpButton': '要再次檢視此導覽，請點擊說明按鈕(?)。\n\n享受建立工作流程的樂趣！',

  // Tour buttons
  'tour.button.back': '返回',
  'tour.button.close': '關閉',
  'tour.button.finish': '完成',
  'tour.button.next': '下一步 ({step}/{steps})',
  'tour.button.skip': '略過',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': '刪除節點',
  'dialog.deleteNode.message': '確定要刪除此節點嗎？',
  'dialog.deleteNode.confirm': '刪除',
  'dialog.deleteNode.cancel': '取消',

  // Skill Browser Dialog
  'skill.browser.title': '瀏覽Skill',
  'skill.browser.description':
    '選擇要新增到工作流的Claude Code Skill。\nSkill是Claude Code自動利用的專業能力。',
  'skill.browser.personalTab': '個人',
  'skill.browser.projectTab': '專案',
  'skill.browser.noSkills': '在此目錄中未找到Skill',
  'skill.browser.loading': '正在載入Skill...',
  'skill.browser.selectButton': '新增到工作流',
  'skill.browser.cancelButton': '取消',
  'skill.browser.skillName': 'Skill名稱',
  'skill.browser.skillDescription': '描述',
  'skill.browser.skillPath': '路徑',
  'skill.browser.validationStatus': '狀態',

  // Skill Browser Errors
  'skill.error.loadFailed': '載入Skill失敗。請檢查Skill目錄。',
  'skill.error.noSelection': '請選擇一個Skill',
  'skill.error.unknown': '發生意外錯誤',

  // Skill Creation Dialog
  'skill.creation.title': '建立新技能',
  'skill.creation.description':
    '建立新的Claude Code技能。技能是Claude Code可以呼叫以執行特定任務的專用工具。',
  'skill.creation.nameLabel': '技能名稱',
  'skill.creation.nameHint': '僅小寫字母、數字和連字符（最多64個字元）',
  'skill.creation.descriptionLabel': '描述',
  'skill.creation.descriptionPlaceholder': '此技能的功能和使用時機的簡要描述',
  'skill.creation.instructionsLabel': '說明',
  'skill.creation.instructionsPlaceholder':
    '以Markdown格式輸入詳細說明。\n\n例如：\n# 我的技能\n\n此技能...',
  'skill.creation.instructionsHint': 'Claude Code的Markdown格式說明',
  'skill.creation.allowedToolsLabel': '允許的工具（可選）',
  'skill.creation.allowedToolsHint': '逗號分隔的工具名稱列表（例如：Read, Grep, Glob）',
  'skill.creation.scopeLabel': '範圍',
  'skill.creation.scopePersonal': '個人 (~/.claude/skills/)',
  'skill.creation.scopeProject': '專案 (.claude/skills/)',
  'skill.creation.cancelButton': '取消',
  'skill.creation.createButton': '建立技能',
  'skill.creation.creatingButton': '建立中...',
  'skill.creation.error.unknown': '建立技能失敗。請重試。',

  // Skill Validation Errors
  'skill.validation.nameRequired': '技能名稱為必填',
  'skill.validation.nameTooLong': '技能名稱不得超過64個字元',
  'skill.validation.nameInvalidFormat': '技能名稱只能包含小寫字母、數字和連字符',
  'skill.validation.descriptionRequired': '描述為必填',
  'skill.validation.descriptionTooLong': '描述不得超過1024個字元',
  'skill.validation.instructionsRequired': '說明為必填',
  'skill.validation.scopeRequired': '請選擇範圍（個人/專案）',

  // Workflow Refinement (001-ai-workflow-refinement)
  'refinement.toolbar.refineButton': '使用AI編輯',
  'refinement.toolbar.refineButton.tooltip': '與AI聊天以編輯此工作流程',

  // Refinement Chat Panel (Short form keys for components)
  'refinement.title': 'AI編輯',
  'refinement.inputPlaceholder': '描述您想要的變更...',
  'refinement.sendButton': '傳送',
  'refinement.cancelButton': '取消',
  'refinement.processing': '處理中...',
  'refinement.aiProcessing': 'AI正在處理您的請求...',
  'refinement.charactersRemaining': '剩餘 {count} 字元',
  'refinement.iterationCounter': '編輯次數: {current}次',
  'refinement.iterationCounter.tooltip': '編輯次數過多可能導致儲存·載入速度變慢，影響編輯工作',
  'refinement.warning.title': '對話較長',
  'refinement.warning.message':
    '對話歷史記錄變大,可能會增加檔案大小並影響效能。建議清除對話歷史記錄。',

  // Refinement Chat Panel (Detailed keys)
  'refinement.chat.title': '工作流程優化聊天',
  'refinement.chat.description':
    '與AI聊天以逐步改進您的工作流程。描述您想要的更改，AI將自動更新工作流程。',
  'refinement.chat.inputPlaceholder': '描述您想要的更改（例如：「新增錯誤處理」）',
  'refinement.chat.sendButton': '傳送',
  'refinement.chat.sendButton.shortcut': 'Ctrl+Enter傳送',
  'refinement.chat.sendButton.shortcutMac': 'Cmd+Enter傳送',
  'refinement.chat.cancelButton': '取消',
  'refinement.chat.closeButton': '關閉',
  'refinement.chat.clearButton': '清除對話',
  'refinement.chat.clearButton.tooltip': '清除對話歷史記錄並重新開始',
  'refinement.chat.refining': 'AI正在優化工作流程... 最多可能需要120秒。',
  'refinement.chat.progressTime': '{elapsed}秒 / {max}秒',
  'refinement.chat.characterCount': '{count} / {max} 字元',
  'refinement.chat.iterationCounter': '迭代 {current} / {max}',
  'refinement.chat.iterationWarning': '接近迭代限制 ({current}/{max})',
  'refinement.chat.iterationLimitReached': '已達到最大迭代限制 ({max})。請清除對話以繼續。',
  'refinement.chat.noMessages': '還沒有訊息。開始描述您想要改進的內容。',
  'refinement.chat.userMessageLabel': '您',
  'refinement.chat.aiMessageLabel': 'AI',
  'refinement.chat.success': '工作流程優化成功！',
  'refinement.chat.changesSummary': '更改：{summary}',

  // Refinement Errors
  'refinement.error.emptyMessage': '請輸入訊息',
  'refinement.error.messageTooLong': '訊息太長（最多{max}個字元）',
  'refinement.error.commandNotFound': '未找到Claude Code CLI。請安裝Claude Code以使用AI優化功能。',
  'refinement.error.timeout': 'AI優化逾時。請重試或簡化您的請求。',
  'refinement.error.parseError': '無法解析AI回應。請重試或重新表述您的請求。',
  'refinement.error.validationError': '優化後的工作流程驗證失敗。請嘗試不同的請求。',
  'refinement.error.iterationLimitReached':
    '已達到最大迭代限制(20)。清除對話歷史記錄重新開始，或手動編輯工作流程。',
  'refinement.error.unknown': '發生意外錯誤。請檢查日誌以取得詳細資訊。',

  // Refinement Error Display (Phase 3.8)
  'refinement.error.retryButton': '重試',

  // Processing Overlay (Phase 3.10)
  'refinement.processingOverlay': 'AI正在處理您的請求...',

  // Clear Conversation Confirmation
  'refinement.clearDialog.title': '清除對話',
  'refinement.clearDialog.message': '確定要清除對話歷史記錄嗎？此操作無法復原。',
  'refinement.clearDialog.confirm': '清除',
  'refinement.clearDialog.cancel': '取消',

  // Initial instructional message (Phase 3.12)
  'refinement.initialMessage.description': '用自然語言描述您要實現的工作流。',
  'refinement.initialMessage.note': '※ 此功能使用您環境中安裝的Claude Code。',
};
