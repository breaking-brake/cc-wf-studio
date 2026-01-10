/**
 * Claude Code Workflow Studio - Webview Traditional Chinese Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const zhTWWebviewTranslations: WebviewTranslationKeys = {
  // Common
  loading: '載入中',
  description: '描述',
  optional: '選填',
  cancel: '取消',
  'common.close': '關閉',
  'common.cancel': '取消',
  'loading.importWorkflow': '正在匯入工作流程...',
  'loading.openWorkflow': '正在開啟工作流程...',

  // Preview mode
  'preview.label': '預覽',
  'preview.loading': '正在載入工作流程...',
  'preview.parseError': '工作流程解析失敗',
  'preview.openInEditor': '編輯',
  'preview.versionBefore': '修改前',
  'preview.versionAfter': '修改後',

  // Toolbar
  'toolbar.workflowNamePlaceholder': '工作流名稱',
  'toolbar.save': '儲存',
  'toolbar.saving': '儲存中...',
  'toolbar.export': '匯出',
  'toolbar.export.tooltip': '匯出為 Slash Command 並儲存到 .claude/commands/',
  'toolbar.exporting': '匯出中...',
  'toolbar.refineWithAI': 'AI編輯',
  'toolbar.selectWorkflow': '選擇工作流...',
  'toolbar.load': '載入',
  'toolbar.loading': '載入中...',
  'toolbar.refreshList': '重新整理工作流清單',

  // Toolbar interaction mode
  'toolbar.interactionMode.panButton': '手掌',
  'toolbar.interactionMode.rangeSelectionButton': '範圍選擇',
  'toolbar.interactionMode.switchToPan': '切換到手掌模式',
  'toolbar.interactionMode.switchToSelection': '切換到選擇模式',

  // Toolbar minimap toggle
  'toolbar.minimapToggle.show': '顯示迷你地圖',
  'toolbar.minimapToggle.hide': '隱藏迷你地圖',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': '工作流名稱為必填',
  'toolbar.error.workflowNameInvalid': '只能使用英文小寫字母(a-z)、數字、連字號和底線',
  'toolbar.error.workflowNameRequiredForExport': '匯出需要工作流名稱',
  'toolbar.error.selectWorkflowToLoad': '請選擇要載入的工作流',
  'toolbar.error.validationFailed': '工作流驗證失敗',
  'toolbar.error.missingEndNode': '工作流必須至少包含一個End節點',
  'toolbar.error.noActiveWorkflow': '請先載入工作流',
  'toolbar.error.invalidWorkflowFile': '無效的工作流程檔案。請選擇有效的JSON工作流程檔案。',
  'toolbar.generateNameWithAI': '使用AI生成名稱',
  'toolbar.error.nameGenerationFailed': '生成工作流名稱失敗。請重試或手動輸入。',

  // Toolbar slash command group
  'toolbar.run': '執行',
  'toolbar.running': '執行中...',

  // Toolbar more actions dropdown
  'toolbar.moreActions': '更多',
  'toolbar.help': '說明',

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

  // SubAgentFlow Node (Feature: 089-subworkflow)
  'node.subAgentFlow.title': 'Sub-Agent Flow',
  'node.subAgentFlow.description': '詳細控制Sub-Agent並執行',
  'node.subAgentFlow.linked': '已連結',
  'node.subAgentFlow.notLinked': '未連結',
  'node.subAgentFlow.untitled': '未命名子代理流程',
  'node.subAgentFlow.subAgentFlowNotFound': '找不到子代理流程',
  'node.subAgentFlow.selectSubAgentFlow': '選擇要執行的子代理流程',

  // SubAgentFlow Panel (Feature: 089-subworkflow)
  'subAgentFlow.panel.title': '子代理流程',
  'subAgentFlow.create': '新增',
  'subAgentFlow.delete': '刪除',
  'subAgentFlow.mainWorkflow': '主工作流程',
  'subAgentFlow.empty': '尚無子代理流程',
  'subAgentFlow.default.name': 'subagentflow',
  'subAgentFlow.editing': '編輯中:',
  'subAgentFlow.edit': '編輯 Sub-Agent Flow',
  'subAgentFlow.clickToEdit': '點擊編輯名稱',
  'subAgentFlow.namePlaceholder': '例如: data-processing',
  'subAgentFlow.dialog.close': '關閉並返回主工作流程',
  'subAgentFlow.dialog.submit': '確認並新增到工作流程',
  'subAgentFlow.dialog.cancel': '取消並捨棄變更',
  'subAgentFlow.generateNameWithAI': '使用 AI 生成名稱',

  // SubAgentFlow AI Edit
  'subAgentFlow.aiEdit.title': 'AI 編輯',
  'subAgentFlow.aiEdit.toggleButton': '切換 AI 編輯模式',

  // SubAgentFlow validation errors
  'error.subAgentFlow.nameRequired': '名稱為必填項',
  'error.subAgentFlow.nameTooLong': '名稱不能超過50個字元',
  'error.subAgentFlow.invalidName': '名稱只能包含英文小寫字母(a-z)、數字、連字號和底線',

  // Quick start instructions
  'palette.nestedNotAllowed': '在子代理流程中不可用（不支援巢狀）',
  'palette.instruction.addNode': '點擊節點將其新增到畫布',
  'palette.instruction.dragNode': '拖動節點以重新定位',
  'palette.instruction.connectNodes': '從輸出拖動到輸入控點以連接節點',
  'palette.instruction.editProperties': '選擇節點以編輯其屬性',

  // Property Panel
  'property.title': '屬性',

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
  'properties.subAgent.color': '顏色',
  'properties.subAgent.colorPlaceholder': '選擇顏色...',
  'properties.subAgent.colorNone': '無',
  'properties.subAgent.colorHelp': '此子代理的視覺識別顏色',

  // Skill properties
  'property.skillPath': 'Skill路徑',
  'property.scope': '範圍',
  'property.scope.user': '使用者',
  'property.scope.project': '專案',
  'property.scope.local': '本地',
  // Legacy key for backward compatibility
  'property.scope.personal': '個人',
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
  'property.prompt.label': '提示詞',
  'property.prompt.placeholder': '輸入包含{{variables}}的提示詞',
  'property.prompt.help': '對動態值使用{{variableName}}語法',
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
  'default.prompt': '在此輸入您的提示詞。\n\n您可以使用{{variableName}}這樣的變數。',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '條件為真時',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '條件為偽時',
  'default.case1': 'Case 1',
  'default.case1Condition': '滿足條件 1 時',
  'default.case2': 'Case 2',
  'default.case2Condition': '滿足條件 2 時',
  'default.defaultBranch': 'default',
  'default.defaultBranchCondition': '其他情況',
  'default.conditionPrefix': '滿足條件 ',
  'default.conditionSuffix': ' 時',

  // Tour
  'tour.welcome':
    '歡迎使用Claude Code Workflow Studio！\n\n本導覽將介紹主要功能的位置和作用。在建立第一個工作流程之前，讓我們先熟悉基礎知識。',
  'tour.nodePalette':
    '節點面板包含可在工作流程中使用的各種節點。\n\n點擊Prompt、Sub-Agent、AskUserQuestion、If/Else、Switch等節點將其新增到畫布。',
  'tour.addPrompt':
    '這個「Prompt」按鈕可以將Prompt節點新增到畫布。\n\nPrompt節點是支援變數的範本，是工作流程的基本建置區塊。',
  'tour.addSubAgent':
    '「Sub-Agent」節點是執行特定任務的專業代理。\n\n配置提示和工具限制，建立具有單一職責的代理。',
  'tour.addSubAgentFlow':
    '「Sub-Agent Flow」可以視覺化定義複雜的Sub-Agent處理流程。\n\n如果您想並行執行MCP或Skill，可以將各處理包含在Sub-Agent Flow中，然後建立並行執行這些Sub-Agent Flow的工作流程來實現。',
  'tour.addSkill':
    '「Skill」節點呼叫Claude Code技能。\n\n可以選擇並執行個人用（~/.claude/skills/）或專案用（.claude/skills/）的技能。',
  'tour.addMcp': '「MCP Tool」節點執行MCP伺服器工具。\n\n可用於外部服務整合或自訂工具呼叫。',
  'tour.addAskUserQuestion':
    '「AskUserQuestion」節點用於根據使用者選擇分支工作流程。\n\n可以使用此按鈕將其新增到畫布。',
  'tour.addEnd':
    '「End」節點表示工作流程的結束點。\n\n可以放置多個End節點，根據不同結果設定不同的結束點。',
  'tour.addIfElse':
    '「If/Else」節點根據條件將工作流程分成兩個方向。\n\n設定真（True）或假（False）條件來控制處理流程。',
  'tour.addSwitch':
    '「Switch」節點根據多個條件將工作流程分成多個方向。\n\n設定多個案例和預設案例來實現複雜的分支邏輯。',
  'tour.canvas': '這是畫布。拖曳節點調整位置，拖曳手柄連接節點。\n\n已經放置了開始和結束節點。',
  'tour.propertyPanel': '屬性面板可以設定所選節點。\n\n您可以編輯節點名稱、提示、模型選擇等。',
  'tour.connectNodes':
    '連接節點以建立工作流程。\n\n從節點右側的輸出手柄(⚪)拖曳到另一個節點左側的輸入手柄。',
  'tour.workflowName': '在這裡可以為工作流程命名。\n\n可以使用字母、數字、連字號和底線。',
  'tour.saveWorkflow':
    '點擊「儲存」按鈕將工作流程以JSON格式儲存到`.vscode/workflows/`目錄。\n\n稍後可以載入並繼續編輯。',
  'tour.loadWorkflow': '要載入已儲存的工作流程，請從下拉選單中選擇工作流程並點擊「載入」按鈕。',
  'tour.exportWorkflow':
    '點擊「Convert」按鈕可將工作流程轉換為Slash Command格式。\n\n轉換後的檔案儲存在.claude/commands/目錄中。',
  'tour.runSlashCommand':
    '點擊「Run」按鈕可將工作流程轉換為Slash Command並立即在Claude Code中執行。\n\n一鍵完成轉換和執行。',
  'tour.refineWithAI':
    '使用「AI編輯」按鈕透過與AI對話建立或改善工作流程。\n\n可以從空白畫布開始或以對話方式編輯現有工作流程。',
  'tour.moreActions':
    '「更多」選單提供以下功能：<br><br>• 分享到Slack - 與團隊分享工作流程<br>• 重置 - 清空畫布<br>• 說明 - 再次檢視此導覽<br><br>享受建立工作流程的樂趣！',

  // Tour buttons
  'tour.button.back': '返回',
  'tour.button.close': '關閉',
  'tour.button.finish': '完成',
  'tour.button.next': '下一步',
  'tour.button.skip': '略過',

  // Terms of Use
  'terms.title': 'Claude Code Workflow Studio - 使用條款',
  'terms.introduction': '本工具支援合法目的的工作流創建。',
  'terms.prohibitedUse': '禁止以下用途：',
  'terms.cyberAttack': '網路攻擊（DDoS攻擊、未經授權的訪問等）',
  'terms.malware': '惡意軟體和勒索軟體的創建',
  'terms.personalDataTheft': '未經授權收集或濫用個人資訊',
  'terms.otherIllegalActs': '其他非法活動或對他人造成傷害的行為',
  'terms.liability': '違規時用戶將承擔全部責任。',
  'terms.agree': '我同意以上內容',
  'terms.agreeButton': '同意並開始',
  'terms.cancelButton': '取消',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': '刪除節點',
  'dialog.deleteNode.message': '確定要刪除此節點嗎？',
  'dialog.deleteNode.confirm': '刪除',
  'dialog.deleteNode.cancel': '取消',

  // Load Workflow Confirmation Dialog (when opening from preview with unsaved changes)
  'dialog.loadWorkflow.title': '未儲存的變更',
  'dialog.loadWorkflow.message': '您有未儲存的變更。載入新工作流程將會丟失這些變更。是否繼續？',
  'dialog.loadWorkflow.confirm': '捨棄並載入',
  'dialog.loadWorkflow.cancel': '取消',

  // Reset Workflow Confirmation Dialog
  'toolbar.resetWorkflow': '重設工作流程',
  'toolbar.focusMode': '專注模式',
  'dialog.resetWorkflow.title': '重設工作流程',
  'dialog.resetWorkflow.message': '確定要重設工作流程嗎？除 Start 和 End 外的所有節點都將被刪除。',
  'dialog.resetWorkflow.confirm': '重設',

  // Skill Browser Dialog
  'skill.browser.title': '瀏覽Skill',
  'skill.browser.description':
    '選擇要新增到工作流的Claude Code Skill。\nSkill是Claude Code自動利用的專業能力。',
  'skill.browser.userTab': '使用者',
  'skill.browser.projectTab': '專案',
  'skill.browser.localTab': '本機',
  // Scope descriptions for beginners
  'skill.browser.userDescription': '可在所有專案中使用。',
  'skill.browser.projectDescription': '僅在此專案中可用（共享用）。',
  'skill.browser.localDescription': '僅在此專案中可用（個人用）。',
  'skill.browser.filterPlaceholder': '按Skill名稱篩選...',
  // Legacy key for backward compatibility
  'skill.browser.personalTab': '個人',
  'skill.browser.noSkills': '在此目錄中未找到Skill',
  'skill.browser.loading': '正在載入Skill...',
  'skill.browser.selectButton': '新增到工作流',
  'skill.browser.cancelButton': '取消',
  'skill.browser.skillName': 'Skill名稱',
  'skill.browser.skillDescription': '描述',
  'skill.browser.skillPath': '路徑',
  'skill.browser.validationStatus': '狀態',

  // Skill Browser Actions
  'skill.action.refresh': '重新整理',
  'skill.refreshing': '重新整理中...',

  // Skill Browser Errors
  'skill.error.loadFailed': '載入Skill失敗。請檢查Skill目錄。',
  'skill.error.noSelection': '請選擇一個Skill',
  'skill.error.unknown': '發生意外錯誤',
  'skill.error.refreshFailed': '重新整理Skill失敗',

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
  'skill.creation.scopeUser': '使用者 (~/.claude/skills/)',
  'skill.creation.scopeProject': '專案 (.claude/skills/)',
  // Legacy key for backward compatibility
  'skill.creation.scopePersonal': '個人 (~/.claude/skills/)',
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
  'refinement.chat.useSkillsCheckbox': '包含Skill',

  // Timeout selector
  'refinement.timeout.label': '逾時',
  'refinement.timeout.ariaLabel': '選擇AI優化逾時時間',

  // Model selector
  'refinement.model.label': '模型',

  // Settings dropdown
  'refinement.settings.title': '設定',

  'refinement.chat.claudeMdTip':
    '💡 提示：在 CLAUDE.md 中新增工作流程特定的規則和約束，AI可以進行更準確的編輯',
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

  // Refinement Success Messages
  'refinement.success.defaultMessage': '已編輯工作流程。',

  // Refinement Session Status
  'refinement.session.warningDialog.title': 'AI編輯會話已重新連接',
  'refinement.session.warningDialog.message':
    '由於載入他人共享的工作流程或會話過期等原因，無法繼續AI對話會話，已開始新的對話會話。\n\n之前對話會話中AI記住的額外上下文（檔案內容、工具執行結果等）可能已遺失。\n\n如有需要，請在訊息中重新分享相關資訊。',
  'refinement.session.warningDialog.ok': 'OK',

  // Refinement Errors
  'refinement.error.emptyMessage': '請輸入訊息',
  'refinement.error.messageTooLong': '訊息太長（最多{max}個字元）',
  'refinement.error.commandNotFound': '未找到Claude Code CLI。請安裝Claude Code以使用AI優化功能。',
  'refinement.error.timeout': 'AI優化逾時。請調整逾時設定值後重試。建議您也可以考慮簡化請求內容。',
  'refinement.error.parseError': '無法解析AI回應。請重試或重新表述您的請求。',
  'refinement.error.validationError': '優化後的工作流程驗證失敗。請嘗試不同的請求。',
  'refinement.error.prohibitedNodeType':
    'SubAgent、SubAgentFlow 和 AskUserQuestion 節點無法在子代理流程中使用。',
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

  // MCP Node (Feature: 001-mcp-node)
  'node.mcp.title': 'MCP Tool',
  'node.mcp.description': '執行MCP工具',

  // MCP Server List
  'mcp.loading.servers': '正在載入此專案中可用的MCP伺服器...',
  'mcp.error.serverLoadFailed': '載入MCP伺服器失敗',
  'mcp.empty.servers': '此專案中沒有可用的MCP伺服器。',
  'mcp.empty.servers.hint': '請為Claude Code設定MCP伺服器。',

  // MCP Tool List
  'mcp.loading.tools': '正在載入工具...',
  'mcp.error.toolLoadFailed': '從伺服器載入工具失敗',
  'mcp.empty.tools': '此伺服器沒有可用工具',

  // MCP Cache Actions
  'mcp.action.refresh': '重新整理',
  'mcp.refreshing': '正在重新整理...',
  'mcp.error.refreshFailed': 'MCP 快取重新整理失敗',

  // MCP Tool Search
  'mcp.search.placeholder': '按名稱或描述搜尋工具...',
  'mcp.search.noResults': '未找到與"{query}"匹配的工具',
  'mcp.search.serverPlaceholder': '按名稱篩選伺服器...',
  'mcp.search.noServers': '未找到與"{query}"匹配的伺服器',

  // MCP Node Dialog
  'mcp.dialog.title': 'MCP Tool配置',
  'mcp.dialog.selectServer': '選擇MCP伺服器',
  'mcp.dialog.selectTool': '選擇工具',
  'mcp.dialog.addButton': '新增工具',
  'mcp.dialog.cancelButton': '取消',
  'mcp.dialog.wizardStep': '第{{current}}步，共{{total}}步',
  'mcp.dialog.nextButton': '下一步',
  'mcp.dialog.backButton': '返回',
  'mcp.dialog.saveButton': '建立節點',
  'mcp.dialog.error.noServerSelected': '請選擇MCP伺服器',
  'mcp.dialog.error.noToolSelected': '請選擇工具',
  'mcp.dialog.error.incompleteWizard': '請完成所有必要步驟',
  'mcp.dialog.error.cannotProceed': '請填寫所有必填欄位以繼續',
  'mcp.dialog.error.invalidMode': '選擇了無效的模式',

  // MCP Property Panel
  'property.mcp.serverId': '伺服器',
  'property.mcp.toolName': '工具名稱',
  'property.mcp.toolDescription': '描述',
  'property.mcp.parameters': '參數',
  'property.mcp.parameterValues': '參數值',
  'property.mcp.parameterCount': '參數數量',
  'property.mcp.editParameters': '編輯參數',
  'property.mcp.edit.manualParameterConfig': '編輯參數',
  'property.mcp.edit.aiParameterConfig': '編輯參數內容',
  'property.mcp.edit.aiToolSelection': '編輯任務內容',
  'property.mcp.taskDescription': '任務內容',
  'property.mcp.parameterDescription': '參數內容',
  'property.mcp.configuredValues': '配置值',
  'property.mcp.infoNote': 'MCP工具屬性從伺服器載入。點擊「編輯參數」以設定參數值。',

  // MCP Parameter Form
  'mcp.parameter.formTitle': '工具參數',
  'mcp.parameter.noParameters': '此工具沒有參數',
  'mcp.parameter.selectOption': '-- 選擇選項 --',
  'mcp.parameter.enterValue': '輸入值',
  'mcp.parameter.minLength': '最小長度',
  'mcp.parameter.maxLength': '最大長度',
  'mcp.parameter.pattern': '模式',
  'mcp.parameter.minimum': '最小值',
  'mcp.parameter.maximum': '最大值',
  'mcp.parameter.default': '預設值',
  'mcp.parameter.addItem': '新增項目',
  'mcp.parameter.add': '新增',
  'mcp.parameter.remove': '刪除',
  'mcp.parameter.arrayCount': '項目',
  'mcp.parameter.jsonFormat': '需要JSON格式',
  'mcp.parameter.jsonInvalid': '無效的JSON格式',
  'mcp.parameter.objectInvalid': '值必須是JSON物件',
  'mcp.parameter.unsupportedType': '不支援的參數類型: {name}的{type}',
  'mcp.parameter.validationErrors': '請修正以下驗證錯誤:',

  // MCP Edit Dialog
  'mcp.editDialog.title': '配置MCP工具',
  'mcp.editDialog.saveButton': '儲存',
  'mcp.editDialog.cancelButton': '取消',
  'mcp.editDialog.loading': '正在載入工具架構...',
  'mcp.editDialog.error.schemaLoadFailed': '載入工具架構失敗',

  // MCP Natural Language Mode (Feature: 001-mcp-natural-language-mode)

  // Mode Selection
  'mcp.modeSelection.title': '選擇配置模式',
  'mcp.modeSelection.subtitle': '選擇MCP工具的配置方式',
  'mcp.modeSelection.manualParameterConfig.title': '手動參數設定',
  'mcp.modeSelection.manualParameterConfig.description':
    '明確配置伺服器、工具和所有參數。再現性高，最適合技術使用者。',
  'mcp.modeSelection.aiParameterConfig.title': 'AI參數設定',
  'mcp.modeSelection.aiParameterConfig.description':
    '選擇伺服器和工具，用自然語言描述參數。平衡的方法。',
  'mcp.modeSelection.aiToolSelection.title': 'AI工具選擇',
  'mcp.modeSelection.aiToolSelection.description':
    '僅選擇伺服器，用自然語言描述整個任務。最簡單，但再現性最低。',

  // Tool Selection Mode (Step-by-step decision flow)
  'mcp.toolSelectionMode.title': '工具選擇方式',
  'mcp.toolSelectionMode.subtitle': '選擇如何為此MCP節點選擇工具',
  'mcp.toolSelectionMode.manual.title': '手動選擇工具',
  'mcp.toolSelectionMode.manual.description':
    '我將自己瀏覽並選擇工具。適合明確知道要使用哪個工具時。',
  'mcp.toolSelectionMode.auto.title': '讓AI選擇工具',
  'mcp.toolSelectionMode.auto.description':
    'AI將根據任務描述自動選擇最佳工具。適合探索或不確定時。',

  // Parameter Config Mode (Step-by-step decision flow)
  'mcp.parameterConfigMode.title': '參數配置方式',
  'mcp.parameterConfigMode.subtitle': '選擇如何為此工具配置參數',
  'mcp.parameterConfigMode.manual.title': '手動配置',
  'mcp.parameterConfigMode.manual.description':
    '我將自己填寫所有參數。適合需要精確控制和可重現性時。',
  'mcp.parameterConfigMode.auto.title': '讓AI配置',
  'mcp.parameterConfigMode.auto.description': 'AI將根據自然語言描述配置參數。適合快速設定時。',

  // Parameter Detailed Config Step
  'mcp.parameterDetailedConfig.title': '設定工具參數',

  // Natural Language Input
  'mcp.naturalLanguage.paramDescription.label': '參數內容',
  'mcp.naturalLanguage.paramDescription.placeholder':
    '描述您想用此工具做什麼（例如：「檢查Lambda在us-east-1中是否可用」）...',
  'mcp.naturalLanguage.taskDescription.label': '任務內容',
  'mcp.naturalLanguage.taskDescription.placeholder':
    '描述您想完成的任務（例如：「查找有關S3儲存貯體原則的文件」）...',

  // Mode Switch Warnings
  'mcp.modeSwitch.warning.title': '模式切換警告',
  'mcp.modeSwitch.warning.message':
    '從{currentMode}切換到{newMode}將改變此節點的配置方式。您目前的配置將被保留，但在新模式下可能不可見。您可以隨時切換回{currentMode}以恢復之前的配置。',
  'mcp.modeSwitch.warning.continueButton': '繼續',
  'mcp.modeSwitch.warning.cancelButton': '取消',
  'mcp.modeSwitch.dataPreserved': '您的資料將被保留',
  'mcp.modeSwitch.canRevert': '您可以隨時切換回來',

  // Validation Errors
  'mcp.error.paramDescRequired': '請提供參數描述。',
  'mcp.error.taskDescRequired': '請提供任務描述。',
  'mcp.error.noToolsAvailable': '所選MCP伺服器沒有可用工具',
  'mcp.error.toolListOutdated': '工具清單快照已超過7天。請重新編輯此節點以取得最新的可用工具。',
  'mcp.error.modeConfigMissing': '缺少模式配置。請重新配置此節點。',
  'mcp.error.invalidModeConfig': '模式配置無效。請檢查您的自然語言描述或切換到詳細模式。',

  // Mode Indicator Tooltips
  'mcp.mode.detailed.tooltip': '詳細模式: 所有參數都已明確配置',
  'mcp.mode.naturalLanguageParam.tooltip': '自然語言參數模式: "{description}"',
  'mcp.mode.fullNaturalLanguage.tooltip': '完全自然語言模式: "{taskDescription}"',

  // Slack Integration
  'slack.connect': '連接到 Slack',
  'slack.disconnect': '斷開連接',
  'slack.connecting': '連接中...',
  'slack.connected': '已連接到 {workspaceName}',
  'slack.notConnected': '未連接到 Slack',

  // Slack Manual Token
  'slack.manualToken.title': '連接到 Slack',
  'slack.manualToken.description': '透過您自己建立的 Slack 應用連接到工作區。',
  'slack.manualToken.howToGet.title': 'Slack App 設定方法',
  'slack.manualToken.howToGet.step1': '建立 Slack App (api.slack.com/apps)',
  'slack.manualToken.howToGet.step2': '新增 User Token Scopes (OAuth & Permissions):',
  'slack.manualToken.howToGet.step3': '將 App 安裝到您的工作區 (OAuth & Permissions)',
  'slack.manualToken.howToGet.step4': '從 OAuth & Permissions 頁面複製 User Token (xoxp-...)',
  'slack.manualToken.security.title': '安全與隱私',
  'slack.manualToken.security.notice': '注意：此功能與 Slack 伺服器通信（非本地操作）',
  'slack.manualToken.security.storage': '令牌安全儲存於 VSCode Secret Storage (OS 金鑰鏈)',
  'slack.manualToken.security.transmission': '僅傳送至 Slack API (api.slack.com) 用於驗證',
  'slack.manualToken.security.deletion': '可隨時刪除',
  'slack.manualToken.security.sharing': 'User Token 具有頻道讀寫等權限。請僅在受信任的社群內分享。',
  'slack.manualToken.userToken.label': 'User OAuth Token',
  'slack.manualToken.error.tokenRequired': 'User Token 為必填',
  'slack.manualToken.error.invalidTokenFormat': 'User Token 必須以 "xoxp-" 開頭',
  'slack.manualToken.error.userTokenRequired': 'User Token 為必填',
  'slack.manualToken.error.invalidUserTokenFormat': 'User Token 必須以 "xoxp-" 開頭',
  'slack.manualToken.connecting': '連接中...',
  'slack.manualToken.connect': '連接',
  'slack.manualToken.deleteButton': '刪除已儲存的認證令牌',
  'slack.manualToken.deleteConfirm.title': '刪除令牌',
  'slack.manualToken.deleteConfirm.message': '確定要刪除已儲存的認證令牌嗎？',
  'slack.manualToken.deleteConfirm.confirm': '刪除',
  'slack.manualToken.deleteConfirm.cancel': '取消',

  // Slack Share
  'slack.share.button': '分享',
  'slack.share.title': '分享到 Slack',
  'slack.share.selectChannel': '選擇頻道',
  'slack.share.selectChannelPlaceholder': '選擇一個頻道...',
  'slack.share.sharing': '分享中...',
  'slack.share.failed': '工作流分享失敗',

  // Slack Description AI Generation
  'slack.description.generateFailed': '產生描述失敗。請重試或手動輸入。',

  // Slack Connect
  'slack.connect.button': '連接到 Slack',
  'slack.connect.connecting': '連接中...',
  'slack.connect.description': '連接您的 Slack 工作區以與團隊共享工作流。',
  'slack.connect.success': '已成功連接到 {workspaceName}',
  'slack.connect.failed': '連接 Slack 失敗',
  'slack.connect.title': '連接到 Slack',
  'slack.connect.tab.oauth': '將 Slack App 連接到工作區',
  'slack.connect.tab.manual': '使用自己的 Slack 應用連接',

  // Slack OAuth
  'slack.oauth.description':
    '點擊連接到工作區按鈕將顯示允許「Claude Code Workflow Studio」訪問 Slack 的確認畫面。\n授權後，連接用的 Slack App 將安裝到您的工作區。',
  'slack.oauth.termsOfService': '服務條款',
  'slack.oauth.privacyPolicy': '隱私政策',
  'slack.oauth.supportPage': '支援頁面',
  'slack.oauth.connectButton': '連接到工作區',
  'slack.oauth.status.initiated': '正在開啟瀏覽器進行身份驗證...',
  'slack.oauth.status.polling': '等待身份驗證...',
  'slack.oauth.status.waitingHint': '在瀏覽器中完成身份驗證後返回此處。',
  'slack.oauth.cancelled': '身份驗證已取消',
  'slack.oauth.reviewNotice.message':
    '用於共享的 Slack 應用計劃進行 Slack 審核。\n在審核通過之前，權限畫面會顯示警告。',

  // Slack Reconnect
  'slack.reconnect.button': 'Reconnect to Slack',
  'slack.reconnect.reconnecting': 'Reconnecting...',
  'slack.reconnect.description':
    'Re-authenticate with Slack to update permissions or refresh connection.',
  'slack.reconnect.success': 'Successfully reconnected to {workspaceName}',
  'slack.reconnect.failed': 'Failed to reconnect to Slack',

  // Slack Import
  'slack.import.title': '從 Slack 匯入',
  'slack.import.importing': '匯入中...',
  'slack.import.success': '工作流匯入成功',
  'slack.import.failed': '工作流匯入失敗',
  'slack.import.confirmOverwrite': '已存在同名工作流。是否覆蓋？',

  // Slack Search
  'slack.search.title': '搜尋工作流',
  'slack.search.placeholder': '按名稱、作者或頻道搜尋...',
  'slack.search.searching': '搜尋中...',
  'slack.search.noResults': '未找到工作流',

  // Slack Scopes - reasons why each scope is required
  'slack.scopes.chatWrite.reason': '用於共享工作流',
  'slack.scopes.filesRead.reason': '用於匯入工作流',
  'slack.scopes.filesWrite.reason': '用於附加工作流檔案',
  'slack.scopes.channelsRead.reason': '用於選擇目標頻道',
  'slack.scopes.groupsRead.reason': '用於選擇私有頻道',

  // Slack Errors
  'slack.error.channelNotFound': '未找到頻道',
  'slack.error.notInChannel': '共享目標頻道未添加 Slack 應用。',
  'slack.error.networkError': '網路錯誤。請檢查您的連接。',
  'slack.error.rateLimited': '超出速率限制。請在 {seconds} 秒後重試。',
  'slack.error.noWorkspaces': '沒有連接的工作區',
  'slack.error.noChannels': '沒有可用的頻道',
  'slack.error.invalidAuth': 'Slack 令牌無效。',
  'slack.error.missingScope': '缺少必要權限。',
  'slack.error.fileTooLarge': '檔案大小過大。',
  'slack.error.invalidFileType': '不支援的檔案類型。',
  'slack.error.internalError': '發生 Slack 內部錯誤。',
  'slack.error.notAuthed': '未提供認證資訊。',
  'slack.error.invalidCode': '認證碼無效或已過期。',
  'slack.error.badClientSecret': '用戶端密鑰無效。',
  'slack.error.invalidGrantType': '無效的認證類型。',
  'slack.error.accountInactive': '帳戶已停用。',
  'slack.error.invalidQuery': '無效的搜尋查詢。',
  'slack.error.msgTooLong': '訊息過長。',
  'slack.error.workspaceNotConnected': '未連接到來源 Slack 工作區。',
  'slack.error.unknownError': '發生未知錯誤。',
  'slack.error.unknownApiError': '發生 Slack API 錯誤。',

  // Sensitive Data Warning
  'slack.sensitiveData.warning.title': '檢測到敏感資料',
  'slack.sensitiveData.warning.message': '在您的工作流中檢測到以下敏感資料:',
  'slack.sensitiveData.warning.continue': '仍然分享',
  'slack.sensitiveData.warning.cancel': '取消',

  // Slack Import Connection Required Dialog
  'slack.import.connectionRequired.title': '需要連接 Slack',
  'slack.import.connectionRequired.message':
    '要匯入此工作流程，請連接到來源 Slack 工作區。工作流程檔案位於目前未連接的工作區中。',
  'slack.import.connectionRequired.workspaceInfo': '來源工作區:',
  'slack.import.connectionRequired.connectButton': '連接到 Slack',

  // Edit in VSCode Editor
  'editor.openInEditor': '在編輯器中編輯',
  'editor.openInEditor.tooltip': '在 VSCode 編輯器中開啟以使用完整編輯功能',

  // Workflow Settings / Memo Panel
  'workflow.settings.title': '工作流程設定',
  'workflow.settings.description.label': '描述',
  'workflow.settings.description.placeholder':
    '輸入此工作流程的描述（例如：它做什麼、何時使用）...',
  'workflow.settings.generateWithAI': 'AI生成',

  // Description Panel (Canvas)
  'description.panel.title': '描述',
  'description.panel.show': '顯示描述面板',
  'description.panel.hide': '隱藏描述面板',
};
