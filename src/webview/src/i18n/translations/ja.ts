/**
 * CC Workflow Studio - Webview Japanese Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const jaWebviewTranslations: WebviewTranslationKeys = {
  // Common
  loading: '読み込み中',
  description: '説明',
  optional: '任意',
  cancel: 'キャンセル',
  'common.close': '閉じる',
  'common.cancel': 'キャンセル',
  'loading.importWorkflow': 'ワークフローをインポート中...',
  'loading.openWorkflow': 'ワークフローを開いています...',

  // Preview mode
  'preview.label': 'プレビュー',
  'preview.loading': 'ワークフローを読み込み中...',
  'preview.parseError': 'ワークフローの解析に失敗しました',
  'preview.openInEditor': '編集',
  'preview.versionBefore': '修正前',
  'preview.versionAfter': '修正後',

  // Toolbar
  'toolbar.workflowNamePlaceholder': 'ワークフロー名',
  'toolbar.save': '保存',
  'toolbar.saving': '保存中...',
  'toolbar.export': '変換',
  'toolbar.export.tooltip': 'Slash Commandに変換して.claude/commands/に保存',
  'toolbar.exporting': '変換中...',
  'toolbar.refineWithAI': 'AI編集',
  'toolbar.selectWorkflow': 'ワークフローを選択...',
  'toolbar.load': '読み込み',
  'toolbar.loading': '読み込み中...',
  'toolbar.refreshList': 'ワークフローリストを更新',

  // Toolbar interaction mode
  'toolbar.interactionMode.panButton': '手のひら',
  'toolbar.interactionMode.rangeSelectionButton': '範囲選択',
  'toolbar.interactionMode.switchToPan': '手のひらモードに切り替え',
  'toolbar.interactionMode.switchToSelection': '範囲選択モードに切り替え',
  'toolbar.edgeAnimation.enable': 'エッジアニメーションを有効化',
  'toolbar.edgeAnimation.disable': 'エッジアニメーションを無効化',
  'toolbar.highlight.enable': 'グループノードハイライトを有効化',
  'toolbar.highlight.disable': 'グループノードハイライトを無効化',
  'toolbar.highlight.confirmDisable.title': 'グループノードハイライトを無効化',
  'toolbar.highlight.confirmDisable.message':
    '現在グループノードがハイライトされています。ハイライトを無効化しますか？',
  'toolbar.highlight.confirmDisable.confirm': '無効化',
  'toolbar.highlight.confirmDisable.cancel': 'キャンセル',
  'toolbar.undo': '元に戻す',
  'toolbar.redo': 'やり直し',
  'toolbar.scrollMode.switchToClassic': 'Classicモードに切り替え（スクロール=ズーム）',
  'toolbar.scrollMode.switchToFreehand': 'Freehandモードに切り替え（スクロール=パン）',

  // Toolbar minimap toggle
  'toolbar.minimapToggle.hidden': '非表示',
  'toolbar.minimapToggle.auto': 'スクロール時に表示',
  'toolbar.minimapToggle.always': '常に表示',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': 'ワークフロー名は必須です',
  'toolbar.error.workflowNameInvalid':
    '半角英小文字(a-z)、数字、ハイフン、アンダースコアのみ使用可能です',
  'toolbar.error.workflowNameRequiredForExport': 'エクスポートにはワークフロー名が必要です',
  'toolbar.error.selectWorkflowToLoad': '読み込むワークフローを選択してください',
  'toolbar.error.validationFailed': 'ワークフローの検証に失敗しました',
  'toolbar.error.missingEndNode': 'ワークフローには最低1つのEndノードが必要です',
  'toolbar.error.noActiveWorkflow': 'ワークフローを読み込んでください',
  'toolbar.error.invalidWorkflowFile':
    '無効なワークフローファイルです。有効なJSONワークフローファイルを選択してください。',
  'toolbar.generateNameWithAI': 'AIで名前を生成',
  'toolbar.error.nameGenerationFailed':
    'ワークフロー名の生成に失敗しました。再度お試しいただくか、手動で入力してください。',

  // Toolbar slash command group
  'toolbar.run': '実行',
  'toolbar.running': '実行中...',

  // Toolbar slash command options dropdown
  'toolbar.slashCommandOptions.frontmatterReferenceUrl':
    'https://code.claude.com/docs/ja/slash-commands#フロントマター',

  // Toolbar hooks configuration dropdown
  'hooks.title': 'Hooks',
  'hooks.preToolUse': 'PreToolUse',
  'hooks.postToolUse': 'PostToolUse',
  'hooks.stop': 'Stop',
  'hooks.addEntry': '追加',
  'hooks.removeEntry': '削除',
  'hooks.matcher.description': 'マッチするツール名パターン',
  'hooks.once.description': 'セッションごとに一度だけ実行',
  'hooks.validation.commandRequired': 'command は必須です',
  'hooks.validation.commandTooLong': 'command が最大長を超えています',
  'hooks.validation.matcherRequired': 'このフックタイプには matcher が必須です',

  // Argument Hint configuration
  'argumentHint.example': '例:',
  'argumentHint.exampleAdd': 'タグを追加',
  'argumentHint.exampleRemove': 'タグを削除',
  'argumentHint.exampleList': '一覧を表示',

  // Toolbar more actions dropdown
  'toolbar.moreActions': 'その他',
  'toolbar.help': 'ヘルプ',
  'toolbar.whatsNew': '更新情報',
  'whatsNew.title': '更新情報',
  'whatsNew.viewAllReleases': 'すべての更新情報を見る',
  'whatsNew.showBadge': '未読バッジ',

  // Copilot Execution Mode
  'copilot.mode.tooltip': 'Copilot実行モードを選択',
  'copilot.mode.cli': 'Copilot CLI',
  'copilot.mode.vscode': 'VSCode Copilot',

  // Node Palette
  'palette.title': 'ノードパレット',
  'palette.basicNodes': '基本ノード',
  'palette.specialNodes': '特殊ノード',
  'palette.controlFlow': '制御フロー',
  'palette.layout': 'レイアウト',
  'palette.quickStart': '💡 クイックスタート',

  // Node types
  'node.prompt.title': 'Prompt',
  'node.prompt.description': '変数を使用できるテンプレート',
  'node.subAgent.title': 'Sub-Agent',
  'node.subAgent.description': '専門タスクを実行',
  'node.end.title': 'End',
  'node.end.description': 'ワークフロー終了地点',
  'node.branch.title': 'Branch',
  'node.branch.description': '条件分岐ロジック',
  'node.branch.deprecationNotice': '廃止予定。If/ElseまたはSwitchノードへの移行を推奨します',
  'node.ifElse.title': 'If/Else',
  'node.ifElse.description': '2分岐条件分岐（真/偽）',
  'node.switch.title': 'Switch',
  'node.switch.description': '複数分岐条件分岐（2-N個）',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': 'ユーザーの選択に基づいて分岐',
  'node.skill.title': 'Skill',
  'node.skill.description': 'Claude Code Skillを実行',

  // Group Node
  'node.group.title': 'Group',
  'node.group.description': 'ノードの視覚的グループ化',
  'property.group.members': 'メンバー',
  'property.group.empty': 'ノードをこのグループにドラッグして整理できます。',

  // Codex Node (Feature: 518-codex-agent-node)
  'node.codex.title': 'Codex Agent',
  'node.codex.description': 'OpenAI Codex CLIを実行',
  'node.codex.untitled': '無題のCodex Agent',
  'node.codex.aiGenerated': 'AI生成',

  // Codex Dialog (Feature: 518-codex-agent-node)
  'codex.title': 'Codex Agentを作成',
  'codex.description': 'ワークフロー用のOpenAI Codex CLIエージェントを設定します。',
  'codex.nameLabel': '名前',
  'codex.namePlaceholder': '例: code-reviewer',
  'codex.promptModeLabel': 'プロンプトモード',
  'codex.promptMode.fixed': '固定',
  'codex.promptMode.aiGenerated': 'AI生成',
  'codex.promptMode.aiGeneratedHelp': 'オーケストレーターAIが文脈に応じて指示を生成します。',
  'codex.promptLabel': 'プロンプト',
  'codex.promptPlaceholder': 'Codexエージェントへの指示を入力...',
  'codex.promptGuidanceLabel': 'ガイダンス（任意）',
  'codex.promptGuidancePlaceholder': 'AI生成時のヒント（任意）...',
  'codex.modelLabel': 'モデル',
  'codex.model.custom': 'カスタム',
  'codex.customModelPlaceholder': '例: gpt-6.0-codex',
  'codex.reasoningEffortLabel': '推論レベル',
  'codex.reasoningEffort.low': '低',
  'codex.reasoningEffort.medium': '中',
  'codex.reasoningEffort.high': '高',
  'codex.sandboxLabel': 'サンドボックスモード',
  'codex.sandbox.readOnly': '読み取り専用',
  'codex.sandbox.workspaceWrite': 'ワークスペース書き込み',
  'codex.sandbox.dangerFullAccess': 'フルアクセス（危険）',
  'codex.sandboxHelp': 'Codexエージェントのファイルシステムアクセス権限を制御します。',
  'codex.sandboxDefaultHelp': 'Codexのデフォルト動作を使用します（-sオプションなし）。',
  'codex.advancedOptions': '詳細設定',
  'codex.skipGitRepoCheckWarning':
    'ワークフロー実行時は通常このオプションが必要です。信頼されたGitリポジトリ外での実行を許可します。',
  'codex.createButton': '作成',
  'codex.cancelButton': 'キャンセル',
  'codex.error.nameRequired': '名前は必須です',
  'codex.error.nameTooLong': '名前は64文字以内で入力してください',
  'codex.error.nameInvalidPattern': '名前は英数字、ハイフン、アンダースコアのみ使用可能です',
  'codex.error.promptRequired': 'プロンプトは必須です',
  'codex.error.promptTooLong': 'プロンプトは10,000文字以内で入力してください',
  'codex.error.modelRequired': 'モデル名は必須です',
  'codex.nameHelp': '英数字、ハイフン、アンダースコアのみ使用可能',

  // SubAgentFlow Node (Feature: 089-subworkflow)
  'node.subAgentFlow.title': 'Sub-Agent Flow',
  'node.subAgentFlow.description': 'Sub-Agentを詳細に制御して実行',
  'node.subAgentFlow.linked': 'リンク済み',
  'node.subAgentFlow.notLinked': '未リンク',
  'node.subAgentFlow.untitled': '無題のサブエージェントフロー',
  'node.subAgentFlow.subAgentFlowNotFound': 'サブエージェントフローが見つかりません',
  'node.subAgentFlow.selectSubAgentFlow': '実行するサブエージェントフローを選択',

  // SubAgentFlow Panel (Feature: 089-subworkflow)
  'subAgentFlow.panel.title': 'サブエージェントフロー',
  'subAgentFlow.create': '新規',
  'subAgentFlow.delete': '削除',
  'subAgentFlow.mainWorkflow': 'メインワークフロー',
  'subAgentFlow.empty': 'サブエージェントフローがありません',
  'subAgentFlow.default.name': 'subagentflow',
  'subAgentFlow.editing': '編集中:',
  'subAgentFlow.edit': 'Sub-Agent Flowを編集',
  'subAgentFlow.clickToEdit': 'クリックして名前を編集',
  'subAgentFlow.namePlaceholder': '例: data-processing',
  'subAgentFlow.dialog.close': '閉じてメインワークフローに戻る',
  'subAgentFlow.dialog.submit': '確定してワークフローに追加',
  'subAgentFlow.dialog.cancel': 'キャンセルして変更を破棄',
  'subAgentFlow.generateNameWithAI': 'AIで名前を生成',

  // SubAgentFlow AI Edit
  'subAgentFlow.aiEdit.title': 'AI編集',
  'subAgentFlow.aiEdit.toggleButton': 'AI編集モードを切替',

  // SubAgentFlow validation errors
  'error.subAgentFlow.nameRequired': '名前は必須です',
  'error.subAgentFlow.nameTooLong': '名前は50文字以内で入力してください',
  'error.subAgentFlow.invalidName':
    '名前は半角英小文字(a-z)、数字、ハイフン、アンダースコアのみ使用できます',

  // Quick start instructions
  'palette.nestedNotAllowed': 'サブエージェントフロー内では使用できません（ネスト非対応）',
  'palette.instruction.addNode': 'ノードをクリックしてキャンバスに追加',
  'palette.instruction.dragNode': 'ノードをドラッグして移動',
  'palette.instruction.connectNodes': '出力ハンドルから入力ハンドルへドラッグして接続',
  'palette.instruction.editProperties': 'ノードを選択してプロパティを編集',

  // Property Panel
  'property.title': 'プロパティ',

  // Common property labels
  'property.nodeName': 'ノード名',
  'property.nodeName.placeholder': 'ノード名を入力',
  'property.nodeName.help': 'エクスポート時のファイル名に使用されます（例: "data-analysis"）',
  'property.description': '説明',
  'property.prompt': 'プロンプト',
  'property.model': 'モデル',
  'property.label': 'ラベル',
  'property.label.placeholder': 'ラベルを入力',
  'property.evaluationTarget': '評価対象',
  'property.evaluationTarget.placeholder': '例：前のステップの実行結果',
  'property.evaluationTarget.help': '分岐条件で評価する対象を自然言語で記述',

  // Start/End node descriptions
  'property.startNodeDescription':
    'Startノードはワークフローの開始地点です。削除できず、編集可能なプロパティはありません。',
  'property.endNodeDescription':
    'Endノードはワークフローの終了地点です。編集可能なプロパティはありません。エクスポート時に最低1つのEndノードが必要です。',
  'property.unknownNodeType': '不明なノードタイプ:',

  // Sub-Agent properties
  'property.tools': 'ツール（カンマ区切り）',
  'property.tools.placeholder': '例: Read,Write,Bash',
  'property.tools.help': '空欄で全てのツールを使用',
  'property.memory': 'メモリ',
  'property.memory.referenceUrl':
    'https://code.claude.com/docs/ja/sub-agents#永続メモリを有効にする',
  'properties.subAgent.color': '色',
  'properties.subAgent.colorPlaceholder': '色を選択...',
  'properties.subAgent.colorNone': 'なし',
  'properties.subAgent.colorHelp': 'このサブエージェントの視覚的な識別色',

  // Skill properties
  'property.skillPath': 'Skillパス',
  'property.scope': 'スコープ',
  'property.scope.user': 'ユーザー',
  'property.scope.project': 'プロジェクト',
  'property.scope.local': 'ローカル',
  // Legacy key for backward compatibility
  'property.scope.personal': 'パーソナル',
  'property.validationStatus': '検証ステータス',
  'property.validationStatus.valid': '有効',
  'property.validationStatus.missing': '見つかりません',
  'property.validationStatus.invalid': '無効',
  'property.validationStatus.valid.tooltip': 'Skillは有効で使用可能です',
  'property.validationStatus.missing.tooltip': '指定されたパスにSKILL.mdファイルが見つかりません',
  'property.validationStatus.invalid.tooltip': 'SKILL.mdのYAMLフロントマターが無効です',
  'property.allowedTools': '許可ツール',

  // Codex Agent properties

  // AskUserQuestion properties
  'property.questionText': '質問',
  'property.multiSelect': '複数選択',
  'property.multiSelect.enabled': 'ユーザーは複数の選択肢を選択可能（選択リストを出力）',
  'property.multiSelect.disabled': 'ユーザーは1つの選択肢を選択（対応するノードに分岐）',
  'property.aiSuggestions': 'AI が選択肢を提案',
  'property.aiSuggestions.enabled': 'AIが文脈に基づいて選択肢を動的に生成します',
  'property.aiSuggestions.disabled': '以下で選択肢を手動定義',
  'property.options': '選択肢',
  'property.optionsCount': '選択肢（{count}/4）',
  'property.optionNumber': '選択肢 {number}',
  'property.addOption': '+ 選択肢を追加',
  'property.remove': '削除',
  'property.optionLabel.placeholder': 'ラベル',
  'property.optionDescription.placeholder': '説明',

  // Prompt properties
  'property.prompt.label': 'プロンプト',
  'property.prompt.placeholder': '{{variables}}を含むプロンプトを入力',
  'property.prompt.help': '動的な値には{{variableName}}構文を使用',
  'property.detectedVariables': '検出された変数（{count}）',
  'property.variablesSubstituted': '変数は実行時に置換されます',

  // Branch properties
  'property.branchType': '分岐タイプ',
  'property.conditional': '条件分岐（2分岐）',
  'property.switch': 'スイッチ（多分岐）',
  'property.branchType.conditional.help': '2つの分岐（True/False）',
  'property.branchType.switch.help': '複数の分岐（2-N分岐）',
  'property.branches': '分岐',
  'property.branchesCount': '分岐（{count}）',
  'property.branchNumber': '分岐 {number}',
  'property.addBranch': '+ 分岐を追加',
  'property.branchLabel': 'ラベル',
  'property.branchLabel.placeholder': '例: 成功, エラー',
  'property.branchCondition': '条件（自然言語）',
  'property.branchCondition.placeholder': '例: 前の処理が成功した場合',
  'property.minimumBranches': '最低2つの分岐が必要です',

  // Default node labels
  'default.newSubAgent': '新しいSub-Agent',
  'default.enterPrompt': 'ここにプロンプトを入力',
  'default.newQuestion': '新しい質問',
  'default.option': '選択肢',
  'default.firstOption': '最初の選択肢',
  'default.secondOption': '2番目の選択肢',
  'default.newOption': '新しい選択肢',
  'default.newPrompt': '新しいPrompt',
  'default.prompt':
    'ここにプロンプトを入力してください。\n\n{{variableName}}のように変数を使用できます。',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '条件が真の場合',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '条件が偽の場合',
  'default.case1': 'Case 1',
  'default.case1Condition': '条件1の場合',
  'default.case2': 'Case 2',
  'default.case2Condition': '条件2の場合',
  'default.defaultBranch': 'default',
  'default.defaultBranchCondition': '上記以外',
  'default.conditionPrefix': '条件',
  'default.conditionSuffix': 'の場合',

  // Tour
  'tour.welcome':
    'CC Workflow Studioへようこそ！\n\nサンプルワークフローを使って、基本的な操作方法をご紹介します。',
  'tour.canvas':
    'これがワークフローのキャンバスです。ノードが接続されて処理フローを構成しています。\n\nノードをドラッグして移動、ハンドル(⚪)をドラッグしてノード間を接続できます。',
  'tour.propertyPanel':
    'ノードをクリックすると、プロパティパネルが表示されます。\n\nここでノード名、プロンプト、モデル選択などの詳細設定を行います。',
  'tour.nodePalette':
    'ノードパレットから、ワークフローにノードを追加できます。\n\nPrompt、Sub-Agent、Skill、MCP Tool、If/Else、Switchなど様々なノードが用意されています。',
  'tour.toolbarActions':
    'ツールバーからワークフローの保存・読み込み・変換・実行ができます。\n\n「Run」ボタンで、ワークフローをそのままClaude Codeで実行できます。',
  'tour.refineWithAI':
    '「AI編集」ボタンで、AIにワークフローの生成や改善を依頼できます。\n\n空のキャンバスからの新規作成も、既存ワークフローの修正も対話的に行えます。',
  'tour.finish':
    'ツアーは以上です！\n\nこのサンプルを編集して試してみるか、リセットして新しく作成してみてください。\nツアーは「その他」メニューの「ヘルプ」からいつでも再表示できます。',

  // Tour buttons
  'tour.button.back': '戻る',
  'tour.button.close': '閉じる',
  'tour.button.finish': '完了',
  'tour.button.next': '次へ',
  'tour.button.skip': 'スキップ',
  'tour.button.minimize': '最小化',
  'tour.button.resume': 'ツアーを再開',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': 'ノードを削除',
  'dialog.deleteNode.message': 'このノードを削除してもよろしいですか？',
  'dialog.deleteNode.confirm': '削除',
  'dialog.deleteNode.cancel': 'キャンセル',

  // Load Workflow Confirmation Dialog (when opening from preview with unsaved changes)
  'dialog.loadWorkflow.title': '未保存の変更',
  'dialog.loadWorkflow.message':
    '未保存の変更があります。新しいワークフローを読み込むと、現在の変更は失われます。続行しますか？',
  'dialog.loadWorkflow.confirm': '破棄して読み込む',
  'dialog.loadWorkflow.cancel': 'キャンセル',

  // Diff Preview Dialog (MCP apply_workflow)
  'dialog.diffPreview.title': 'ワークフロー変更の確認',
  'dialog.diffPreview.description':
    'AIエージェントがワークフローに以下の変更を適用しようとしています:',
  'dialog.diffPreview.newWorkflow': 'AIエージェントが新しいワークフローを作成しようとしています:',
  'dialog.diffPreview.nameChange': '名前:',
  'dialog.diffPreview.nodes': 'ノード',
  'dialog.diffPreview.connections': '接続',
  'dialog.diffPreview.connectionsAdded': '追加',
  'dialog.diffPreview.connectionsRemoved': '削除',
  'dialog.diffPreview.noChanges': '変更はありません。',
  'dialog.diffPreview.agentDescription': 'エージェントの説明',
  'dialog.diffPreview.filesToCreate': '作成されるファイル',
  'dialog.diffPreview.accept': '適用',
  'dialog.diffPreview.reject': '却下',
  'dialog.diffPreview.revisionConflict':
    '警告: AIがワークフローを取得した後にキャンバスが変更されています。変更内容を慎重に確認してください。',
  'dialog.diffPreview.applyAnyway': '変更を適用',
  'dialog.diffPreview.retryWithLatest': '最新で再試行',

  // Reset Workflow Confirmation Dialog
  'toolbar.resetWorkflow': 'ワークフローをリセット',
  'toolbar.focusMode': '集中モード',
  'dialog.resetWorkflow.title': 'ワークフローをリセット',
  'dialog.resetWorkflow.message':
    'ワークフローをリセットしてもよろしいですか？Start と End 以外のすべてのノードが削除されます。',
  'dialog.resetWorkflow.confirm': 'リセット',

  // Skill Browser Dialog
  'skill.browser.title': 'Skillを参照',
  'skill.browser.description': 'ワークフローに追加するAgent Skillを選択してください。',
  'skill.browser.selectSkill': 'Skillを選択',
  'skill.browser.browseSkills': 'Skillを探す',
  'skill.browser.userTab': 'ユーザー',
  'skill.browser.projectTab': 'プロジェクト',
  'skill.browser.localTab': 'ローカル',
  // Scope descriptions for beginners
  'skill.browser.userDescription': 'すべてのプロジェクトで利用可能。',
  'skill.browser.projectDescription': 'このプロジェクトでのみ利用可能（共有用）。',
  'skill.browser.localDescription': 'このプロジェクトでのみ利用可能（個人用）。',
  'skill.browser.filterPlaceholder': 'Skill名でフィルタ...',
  // Legacy key for backward compatibility
  'skill.browser.personalTab': 'パーソナル',
  'skill.browser.noSkills': 'このディレクトリにSkillが見つかりません',
  'skill.browser.loading': 'Skillを読み込み中...',
  'skill.browser.selectButton': 'ワークフローに追加',
  'skill.browser.cancelButton': 'キャンセル',
  'skill.browser.skillName': 'Skill名',
  'skill.browser.skillDescription': '説明',
  'skill.browser.skillPath': 'パス',
  'skill.browser.validationStatus': 'ステータス',

  // Skill Browser Settings Step
  'skill.browser.configureButton': '設定へ',
  'skill.browser.addButton': 'ワークフローに追加',
  'skill.browser.backToList': '戻る',

  // Skill Browser Actions
  'skill.action.refresh': '再読み込み',
  'skill.refreshing': '再読み込み中...',

  // Skill Browser Errors
  'skill.error.loadFailed': 'Skillの読み込みに失敗しました。Skillディレクトリを確認してください。',
  'skill.error.noSelection': 'Skillを選択してください',
  'skill.error.unknown': '予期しないエラーが発生しました',
  'skill.error.refreshFailed': 'Skillの再読み込みに失敗しました',

  // Skill Creation Dialog
  'skill.creation.title': '新しいSkillを作成',
  'skill.creation.description':
    '新しいClaude Code Skillを作成します。SkillはClaude Codeが特定のタスクを実行するために呼び出せる専門ツールです。',
  'skill.creation.nameLabel': 'Skill名',
  'skill.creation.nameHint': '小文字、数字、ハイフンのみ（最大64文字）',
  'skill.creation.descriptionLabel': '説明',
  'skill.creation.descriptionPlaceholder': 'このSkillが何をするか、いつ使うかの簡単な説明',
  'skill.creation.instructionsLabel': '指示内容',
  'skill.creation.instructionsPlaceholder':
    'Markdown形式で詳細な指示を入力してください。\n\n例：\n# My Skill\n\nこのSkillは...',
  'skill.creation.instructionsHint': 'Claude Code用のMarkdown形式の指示',
  'skill.creation.allowedToolsLabel': '許可ツール（オプション）',
  'skill.creation.allowedToolsHint': 'カンマ区切りのツール名リスト（例：Read, Grep, Glob）',
  'skill.creation.scopeLabel': 'スコープ',
  'skill.creation.scopeUser': 'ユーザー (~/.claude/skills/)',
  'skill.creation.scopeProject': 'プロジェクト (.claude/skills/)',
  // Legacy key for backward compatibility
  'skill.creation.scopePersonal': 'パーソナル (~/.claude/skills/)',
  'skill.creation.cancelButton': 'キャンセル',
  'skill.creation.createButton': 'Skillを作成',
  'skill.creation.creatingButton': '作成中...',
  'skill.creation.error.unknown': 'Skillの作成に失敗しました。もう一度お試しください。',

  // Skill Execution Mode
  'property.skill.executionMode': '実行モード',
  'property.skill.executionMode.execute': '実行する',
  'property.skill.executionMode.load': '知識として読み込む',
  'property.skill.executionMode.execute.description':
    'ワークフロー内でSkillをアクションとして実行します',
  'property.skill.executionMode.load.description':
    'Skillの内容を知識コンテキストとして読み込みます（実行はしません）',
  'property.skill.executionPrompt': 'プロンプト',
  'property.skill.executionPrompt.placeholder':
    'このSkillを実行する際の追加指示を入力してください...',

  // Skill Edit Dialog
  'skill.editDialog.title': 'Skill設定の編集',
  'skill.editDialog.saveButton': '保存',
  'skill.editDialog.cancelButton': 'キャンセル',

  // Skill Validation Errors
  'skill.validation.nameRequired': 'Skill名は必須です',
  'skill.validation.nameTooLong': 'Skill名は64文字以内にしてください',
  'skill.validation.nameInvalidFormat': 'Skill名は小文字、数字、ハイフンのみ使用できます',
  'skill.validation.descriptionRequired': '説明は必須です',
  'skill.validation.descriptionTooLong': '説明は1024文字以内にしてください',
  'skill.validation.instructionsRequired': '指示内容は必須です',
  'skill.validation.scopeRequired': 'スコープ（個人用/プロジェクト用）を選択してください',

  // Workflow Refinement (001-ai-workflow-refinement)
  'refinement.toolbar.refineButton': 'AI編集',
  'refinement.toolbar.refineButton.tooltip': 'AIとチャットしてワークフローを編集します',

  // Refinement Chat Panel (Short form keys for components)
  'refinement.title': 'AI編集',
  'refinement.inputPlaceholder': 'ワークフローの編集内容を入力してください...',
  'refinement.sendButton': '送信',
  'refinement.cancelButton': 'キャンセル',
  'refinement.processing': '処理中...',
  'refinement.aiProcessing': 'AIがリクエストを処理中です...',
  'refinement.iterationCounter': '編集回数: {current}回',
  'refinement.iterationCounter.tooltip':
    '編集回数が多いと保存・読み込みが遅くなり、編集作業に支障が出る可能性があります',
  'refinement.warning.title': '会話が長くなっています',
  'refinement.warning.message':
    'ファイルサイズが大きくなりパフォーマンスが低下する可能性があります。会話履歴のクリアをご検討ください。',

  // Refinement Chat Panel (Detailed keys)
  'refinement.chat.title': 'ワークフロー改善チャット',
  'refinement.chat.description':
    'AIとチャットして、ワークフローを段階的に改善できます。希望する変更内容を入力すると、AIが自動的にワークフローを更新します。',
  'refinement.chat.inputPlaceholder':
    '変更内容を入力してください（例：「エラーハンドリングを追加して」）',
  'refinement.chat.sendButton': '送信',
  'refinement.chat.sendButton.shortcut': 'Ctrl+Enterで送信',
  'refinement.chat.sendButton.shortcutMac': 'Cmd+Enterで送信',
  'refinement.chat.cancelButton': 'キャンセル',
  'refinement.chat.closeButton': '閉じる',
  'refinement.chat.clearButton': '会話をクリア',
  'refinement.chat.clearButton.tooltip': '会話履歴をクリアして最初からやり直します',
  'refinement.chat.useSkillsCheckbox': 'Skillを含める',
  'refinement.chat.useCodexNodesCheckbox': 'Codex Agentノードを含める',

  // Timeout selector
  'refinement.timeout.label': 'タイムアウト',
  'refinement.timeout.ariaLabel': 'AIリファインメントのタイムアウト時間を選択',

  // Model selector
  'refinement.model.label': 'モデル',

  // Provider selector
  'refinement.provider.label': 'AIプロバイダー',

  // Settings dropdown
  'refinement.settings.title': '設定',

  'refinement.chat.claudeMdTip':
    '💡 Tip: ワークフロー固有のルールや制約をCLAUDE.mdに記載すると、AIがより的確な編集を行えます',
  'refinement.chat.refining': 'AIがワークフローを改善中... 最大120秒かかる場合があります。',
  'refinement.chat.progressTime': '{elapsed}秒 / {max}秒',
  'refinement.chat.characterCount': '{count} / {max} 文字',
  'refinement.chat.iterationCounter': '反復 {current} / {max}',
  'refinement.chat.iterationWarning': '反復回数の上限に近づいています ({current}/{max})',
  'refinement.chat.iterationLimitReached':
    '最大反復回数に達しました ({max})。会話をクリアして続けてください。',
  'refinement.chat.noMessages': 'メッセージはまだありません。改善したい内容を入力してください。',
  'refinement.chat.userMessageLabel': 'あなた',
  'refinement.chat.aiMessageLabel': 'AI',
  'refinement.chat.success': 'ワークフローの改善が完了しました！',
  'refinement.chat.changesSummary': '変更内容: {summary}',

  // Refinement Success Messages
  'refinement.success.defaultMessage': 'ワークフローを編集しました。',

  // Refinement Session Status
  'refinement.session.warningDialog.title': 'AI編集のセッションが再接続されました',
  'refinement.session.warningDialog.message':
    'AIプロバイダーの切り替え、他者から共有されたワークフローの読み込み、セッションの有効期限切れなどの理由で、AI会話セッションを継続できなかったため、新しい会話セッションを開始しました。\n\n前の会話セッションでAIが記憶していた追加のコンテキスト（ファイルの内容、ツール実行結果など）は失われている可能性があります。\n\n必要に応じて、関連する情報を改めてメッセージで伝えてください。',
  'refinement.session.warningDialog.ok': 'OK',

  // Refinement Errors
  'refinement.error.emptyMessage': 'メッセージを入力してください',
  'refinement.error.messageTooLong': 'メッセージが長すぎます（最大{max}文字）',
  'refinement.error.commandNotFound':
    'Claude Code CLIが見つかりません。AI改善機能を使用するにはClaude Codeをインストールしてください。',
  'refinement.error.modelNotSupported':
    '選択されたモデルはサポートされていないか、アクセスが有効になっていません。Copilot Chatで該当モデルを一度選択して使用することで、アクセス許可を有効にできます。',
  'refinement.error.copilotNotAvailable':
    'Copilotが利用できません。VS Code 1.89以上とGitHub Copilot拡張機能がインストールされていることを確認してください。',
  'refinement.error.timeout':
    'AI改善がタイムアウトしました。タイムアウト設定値を調整してもう一度試してみてください。リクエスト内容の簡略化もご検討ください。',
  'refinement.error.parseError':
    'AI応答の解析に失敗しました。もう一度試すか、リクエストを言い換えてください。',
  'refinement.error.validationError':
    '改善されたワークフローが検証に失敗しました。別のリクエストを試してください。',
  'refinement.error.prohibitedNodeType':
    'SubAgent、SubAgentFlow、AskUserQuestionノードはサブエージェントフローでは使用できません。',
  'refinement.error.iterationLimitReached':
    '最大反復回数(20)に達しました。会話履歴をクリアして最初からやり直すか、手動でワークフローを編集してください。',
  'refinement.error.unknown': '予期しないエラーが発生しました。ログを確認してください。',

  // Refinement Error Display (Phase 3.8)
  'refinement.error.retryButton': 'リトライ',

  // Processing Overlay (Phase 3.10)
  'refinement.processingOverlay': 'AIが処理中です...',

  // Clear Conversation Confirmation
  'refinement.clearDialog.title': '会話をクリア',
  'refinement.clearDialog.message':
    '会話履歴をクリアしてもよろしいですか？この操作は取り消せません。',
  'refinement.clearDialog.confirm': 'クリア',
  'refinement.clearDialog.cancel': 'キャンセル',

  // Initial instructional message (Phase 3.12)
  'refinement.initialMessage.description': '実現したいワークフローを自然言語で説明してください。',
  // Provider-specific notes
  'refinement.initialMessage.noteClaudeCode': '※ この機能はClaude Codeを使用します。',
  'refinement.initialMessage.noteCodex': '※ この機能はCodex CLIを使用します。',
  // Copilot-specific note with link
  'refinement.initialMessage.noteCopilot':
    '※ この機能はVSCode Language Model APIを通じて、あなたのGitHub Copilotにリクエストします。',

  // MCP Node (Feature: 001-mcp-node)
  'node.mcp.title': 'MCP Tool',
  'node.mcp.description': 'MCPツールを実行',

  // MCP Server List
  'mcp.loading.servers': 'このプロジェクトで利用可能なMCPサーバーを読み込み中...',
  'mcp.error.serverLoadFailed': 'MCPサーバーの読み込みに失敗しました',
  'mcp.empty.servers': 'このプロジェクトで利用可能なMCPサーバーがありません。',
  'mcp.empty.servers.hint': 'Claude Codeで利用できるMCPサーバーを設定してください。',

  // MCP Tool List
  'mcp.loading.tools': 'ツールを読み込み中...',
  'mcp.error.toolLoadFailed': 'サーバーからツールの読み込みに失敗しました',
  'mcp.empty.tools': 'このサーバーで利用可能なツールがありません',

  // MCP Cache Actions
  'mcp.action.refresh': '再読み込み',
  'mcp.refreshing': '再読み込み中...',
  'mcp.error.refreshFailed': 'MCPキャッシュの再読み込みに失敗しました',

  // MCP Tool Search
  'mcp.search.placeholder': 'ツール名または説明で検索...',
  'mcp.search.noResults': '"{query}" に一致するツールが見つかりません',
  'mcp.search.serverPlaceholder': 'サーバー名でフィルタ...',
  'mcp.search.noServers': '"{query}" に一致するサーバーが見つかりません',
  'mcp.browse.servers': 'MCPサーバーを探す',

  // MCP Node Dialog
  'mcp.dialog.title': 'MCP Toolの設定',
  'mcp.dialog.selectServer': 'MCPサーバーを選択',
  'mcp.dialog.selectTool': 'ツールを選択',
  'mcp.dialog.addButton': 'ツールを追加',
  'mcp.dialog.cancelButton': 'キャンセル',
  'mcp.dialog.nextButton': '次へ',
  'mcp.dialog.backButton': '戻る',
  'mcp.dialog.saveButton': 'ノードを作成',
  'mcp.dialog.error.noServerSelected': 'MCPサーバーを選択してください',
  'mcp.dialog.error.noToolSelected': 'ツールを選択してください',
  'mcp.dialog.error.incompleteWizard': '必要なステップをすべて完了してください',
  'mcp.dialog.error.cannotProceed': '進むには必要なフィールドをすべて入力してください',
  'mcp.dialog.error.invalidMode': '無効なモードが選択されました',

  // MCP Property Panel
  'property.mcp.serverId': 'サーバー',
  'property.mcp.toolName': 'ツール名',
  'property.mcp.toolDescription': '説明',
  'property.mcp.parameters': 'パラメータ',
  'property.mcp.parameterValues': 'パラメータ値',
  'property.mcp.parameterCount': 'パラメータ数',
  'property.mcp.editParameters': 'パラメータを編集',
  'property.mcp.edit.manualParameterConfig': 'パラメータを編集',
  'property.mcp.edit.aiParameterConfig': 'パラメータ内容を編集',
  'property.mcp.edit.aiToolSelection': 'タスク内容を編集',
  'property.mcp.taskDescription': 'タスク内容',
  'property.mcp.parameterDescription': 'パラメータ内容',
  'property.mcp.configuredValues': '設定値',
  'property.mcp.infoNote':
    'MCPツールのプロパティはサーバーから読み込まれます。「パラメータを編集」をクリックしてパラメータ値を設定してください。',

  // MCP Parameter Form
  'mcp.parameter.formTitle': 'ツールパラメータ',
  'mcp.parameter.noParameters': 'このツールにはパラメータがありません',
  'mcp.parameter.selectOption': '-- オプションを選択 --',
  'mcp.parameter.enterValue': '値を入力',
  'mcp.parameter.minLength': '最小長',
  'mcp.parameter.maxLength': '最大長',
  'mcp.parameter.pattern': 'パターン',
  'mcp.parameter.minimum': '最小値',
  'mcp.parameter.maximum': '最大値',
  'mcp.parameter.default': 'デフォルト',
  'mcp.parameter.addItem': '項目を追加',
  'mcp.parameter.add': '追加',
  'mcp.parameter.remove': '削除',
  'mcp.parameter.arrayCount': '項目数',
  'mcp.parameter.jsonFormat': 'JSON形式が必要です',
  'mcp.parameter.jsonInvalid': '無効なJSON形式です',
  'mcp.parameter.objectInvalid': '値はJSONオブジェクトである必要があります',
  'mcp.parameter.unsupportedType': 'サポートされていないパラメータ型: {name}の{type}',
  'mcp.parameter.validationErrors': '以下の検証エラーを修正してください:',

  // MCP Edit Dialog
  'mcp.editDialog.title': 'MCPツールの設定',
  'mcp.editDialog.saveButton': '保存',
  'mcp.editDialog.cancelButton': 'キャンセル',
  'mcp.editDialog.loading': 'ツールスキーマを読み込み中...',
  'mcp.editDialog.error.schemaLoadFailed': 'ツールスキーマの読み込みに失敗しました',

  // MCP Natural Language Mode (Feature: 001-mcp-natural-language-mode)

  // Mode Selection
  'mcp.modeSelection.title': '設定モードを選択',
  'mcp.modeSelection.subtitle': 'MCPツールの設定方法を選択してください',
  'mcp.modeSelection.manualParameterConfig.title': '手動パラメータ設定',
  'mcp.modeSelection.manualParameterConfig.description':
    'MCPサーバー、MCPツール、すべてのパラメータを明示的に設定します。再現性が高く、技術的なユーザーに最適です。',
  'mcp.modeSelection.aiParameterConfig.title': 'AIパラメータ設定',
  'mcp.modeSelection.aiParameterConfig.description':
    'MCPサーバーとMCPツールを選択し、パラメータを自然言語で記述します。バランスの取れたアプローチです。',
  'mcp.modeSelection.aiToolSelection.title': 'AIツール選択',
  'mcp.modeSelection.aiToolSelection.description':
    'MCPサーバーのみを選択し、タスク全体を自然言語で記述します。最もシンプルですが、再現性は低いです。',

  // Parameter Detailed Config Step
  'mcp.parameterDetailedConfig.title': 'ツールパラメータの設定',

  // Natural Language Input
  'mcp.naturalLanguage.paramDescription.label': 'パラメータ内容',
  'mcp.naturalLanguage.paramDescription.placeholder':
    'このツールで何をしたいか説明してください（例:「us-east-1でLambdaが利用可能か確認する」）...',
  'mcp.naturalLanguage.taskDescription.label': 'タスク内容',
  'mcp.naturalLanguage.taskDescription.placeholder':
    '実現したいタスクを説明してください（例:「S3バケットポリシーに関するドキュメントを検索する」）...',

  // Mode Switch Warnings
  'mcp.modeSwitch.warning.title': 'モード切り替えの警告',
  'mcp.modeSwitch.warning.message':
    '{currentMode}から{newMode}に切り替えると、このノードの設定方法が変わります。現在の設定は保持されますが、新しいモードでは表示されない場合があります。いつでも{currentMode}に戻して以前の設定を復元できます。',
  'mcp.modeSwitch.warning.continueButton': '続行',
  'mcp.modeSwitch.warning.cancelButton': 'キャンセル',
  'mcp.modeSwitch.dataPreserved': 'データは保持されます',
  'mcp.modeSwitch.canRevert': 'いつでも元に戻せます',

  // Validation Errors
  'mcp.error.paramDescRequired': 'パラメータの説明を入力してください。',
  'mcp.error.taskDescRequired': 'タスクの説明を入力してください。',
  'mcp.error.noToolsAvailable': '選択したMCPサーバーから利用可能なツールがありません',
  'mcp.error.toolListOutdated':
    'ツールリストのスナップショットが7日以上古くなっています。最新の利用可能なツールを取得するため、このノードを再編集してください。',
  'mcp.error.modeConfigMissing': 'モード設定が見つかりません。このノードを再設定してください。',
  'mcp.error.invalidModeConfig':
    'モード設定が無効です。自然言語の説明を確認するか、詳細モードに切り替えてください。',

  // Mode Indicator Tooltips
  'mcp.mode.detailed.tooltip': '詳細モード: すべてのパラメータを明示的に設定',
  'mcp.mode.naturalLanguageParam.tooltip': '自然言語パラメータモード: 「{description}」',
  'mcp.mode.fullNaturalLanguage.tooltip': '完全自然言語モード: 「{taskDescription}」',

  // Slack Integration
  'slack.connect': 'Slackに接続',
  'slack.disconnect': '切断',
  'slack.connecting': '接続中...',
  'slack.connected': '{workspaceName}に接続済み',
  'slack.notConnected': 'Slackに未接続',

  // Slack Manual Token
  'slack.manualToken.title': 'Slackに接続',
  'slack.manualToken.description': '自分で作成したSlack Appを通じてワークスペースに接続します。',
  'slack.manualToken.howToGet.title': 'Slack Appの設定方法',
  'slack.manualToken.howToGet.step1': 'Slack Appを作成（api.slack.com/apps）',
  'slack.manualToken.howToGet.step2': 'User Token Scopesを追加（OAuth & Permissions）:',
  'slack.manualToken.howToGet.step3': 'Appをワークスペースにインストール（OAuth & Permissions）',
  'slack.manualToken.howToGet.step4': 'User Token（xoxp-...）をOAuth & Permissionsページからコピー',
  'slack.manualToken.security.title': 'セキュリティーとプライバシー',
  'slack.manualToken.security.notice':
    '注意：この機能はSlackサーバーと通信します（ローカル動作ではありません）',
  'slack.manualToken.security.storage':
    'トークンはVSCode Secret Storage（OSのキーチェーン）に安全に保存されます',
  'slack.manualToken.security.transmission': 'Slack API（api.slack.com）への検証時のみ送信されます',
  'slack.manualToken.security.deletion': '保存したトークンはいつでも削除できます',
  'slack.manualToken.security.sharing':
    'User Tokenにはチャンネルの読み取り・書き込み権限等があるため、信頼できるコミュニティ内でのみ共有してください',
  'slack.manualToken.userToken.label': 'User OAuth Token',
  'slack.manualToken.error.tokenRequired': 'User Tokenは必須です',
  'slack.manualToken.error.invalidTokenFormat': 'User Tokenは"xoxp-"で始まる必要があります',
  'slack.manualToken.error.userTokenRequired': 'セキュアなチャンネル一覧表示にUser Tokenが必要です',
  'slack.manualToken.error.invalidUserTokenFormat': 'User Tokenは"xoxp-"で始まる必要があります',
  'slack.manualToken.connecting': '接続中...',
  'slack.manualToken.connect': '接続',
  'slack.manualToken.deleteButton': '保存した認証トークンを削除',
  'slack.manualToken.deleteConfirm.title': 'トークンの削除',
  'slack.manualToken.deleteConfirm.message': '保存した認証トークンを削除しますか？',
  'slack.manualToken.deleteConfirm.confirm': '削除',
  'slack.manualToken.deleteConfirm.cancel': 'キャンセル',

  // Slack Share
  'slack.share.button': '共有',
  'slack.share.title': 'Slack共有',
  'slack.share.selectChannel': 'チャンネル選択',
  'slack.share.selectChannelPlaceholder': 'チャンネルを選択...',
  'slack.share.sharing': '共有中...',
  'slack.share.failed': 'ワークフローの共有に失敗しました',

  // Slack Description AI Generation
  'slack.description.generateFailed':
    '説明の生成に失敗しました。再度お試しいただくか、手動で入力してください。',

  // Slack Connect
  'slack.connect.button': 'Slackに接続',
  'slack.connect.connecting': '接続中...',
  'slack.connect.description':
    'Slackワークスペースに接続して、チームとワークフローを共有しましょう。',
  'slack.connect.success': '{workspaceName}に接続しました',
  'slack.connect.failed': 'Slackへの接続に失敗しました',
  'slack.connect.title': 'Slackに接続',
  'slack.connect.tab.oauth': 'Slack Appをワークスペースに接続',
  'slack.connect.tab.manual': 'Slack Appを自分で用意して接続',

  // Slack OAuth
  'slack.oauth.description':
    'ワークスペースに接続ボタンをクリックすると、「CC Workflow Studio」にSlackへのアクセスを許可する確認画面が表示されます。\n許可を行うとワークスペースに連携用のSlack Appがインストールされます。',
  'slack.oauth.termsOfService': '利用規約',
  'slack.oauth.privacyPolicy': 'プライバシーポリシー',
  'slack.oauth.supportPage': 'サポートページ',
  'slack.oauth.connectButton': 'ワークスペースに接続',
  'slack.oauth.status.initiated': 'ブラウザを開いて認証中...',
  'slack.oauth.status.polling': '認証を待っています...',
  'slack.oauth.status.waitingHint': 'ブラウザで認証を完了し、こちらに戻ってください。',
  'slack.oauth.cancelled': '認証がキャンセルされました',
  'slack.oauth.reviewNotice.message':
    'このSlack AppはSlack Marketplaceに未申請です。\n許可画面で警告が表示されます。',

  // Slack Reconnect
  'slack.reconnect.button': 'Slackに再接続',
  'slack.reconnect.reconnecting': '再接続中...',
  'slack.reconnect.description': '権限を更新または接続を更新するために再認証します。',
  'slack.reconnect.success': '{workspaceName}に再接続しました',
  'slack.reconnect.failed': 'Slackへの再接続に失敗しました',

  // Slack Import
  'slack.import.title': 'Slackからインポート',
  'slack.import.importing': 'インポート中...',
  'slack.import.success': 'ワークフローをインポートしました',
  'slack.import.failed': 'ワークフローのインポートに失敗しました',
  'slack.import.confirmOverwrite': '同名のワークフローが既に存在します。上書きしますか？',

  // Slack Search
  'slack.search.title': 'ワークフロー検索',
  'slack.search.placeholder': '名前、作成者、チャンネルで検索...',
  'slack.search.searching': '検索中...',
  'slack.search.noResults': 'ワークフローが見つかりませんでした',

  // Slack Scopes - reasons why each scope is required
  'slack.scopes.chatWrite.reason': 'ワークフロー共有用',
  'slack.scopes.filesRead.reason': 'ワークフロー取り込み用',
  'slack.scopes.filesWrite.reason': 'ワークフローファイル添付用',
  'slack.scopes.channelsRead.reason': '共有先チャンネル選択用',
  'slack.scopes.groupsRead.reason': 'プライベートチャンネル選択用',

  // Slack Errors
  'slack.error.channelNotFound': 'チャンネルが見つかりません',
  'slack.error.notInChannel': '共有先のチャンネルにSlack Appが追加されていません。',
  'slack.error.networkError': 'ネットワークエラー。接続を確認してください。',
  'slack.error.rateLimited': 'レート制限を超過しました。{seconds}秒後に再試行してください。',
  'slack.error.noWorkspaces': '接続されているワークスペースがありません',
  'slack.error.noChannels': '利用可能なチャンネルがありません',
  'slack.error.invalidAuth': 'Slackトークンが無効です。',
  'slack.error.missingScope': '必要な権限がありません。',
  'slack.error.fileTooLarge': 'ファイルサイズが大きすぎます。',
  'slack.error.invalidFileType': 'サポートされていないファイルタイプです。',
  'slack.error.internalError': 'Slack内部エラーが発生しました。',
  'slack.error.notAuthed': '認証情報が提供されていません。',
  'slack.error.invalidCode': '認証コードが無効または期限切れです。',
  'slack.error.badClientSecret': 'クライアントシークレットが無効です。',
  'slack.error.invalidGrantType': '無効な認証タイプです。',
  'slack.error.accountInactive': 'アカウントが無効化されています。',
  'slack.error.invalidQuery': '無効な検索クエリです。',
  'slack.error.msgTooLong': 'メッセージが長すぎます。',
  'slack.error.workspaceNotConnected': 'インポート元のSlackワークスペースに接続されていません。',
  'slack.error.unknownError': '不明なエラーが発生しました。',
  'slack.error.unknownApiError': 'Slack APIエラーが発生しました。',

  // Sensitive Data Warning
  'slack.sensitiveData.warning.title': '機密情報が検出されました',
  'slack.sensitiveData.warning.message': 'ワークフローに以下の機密情報が検出されました:',
  'slack.sensitiveData.warning.continue': 'それでも共有',
  'slack.sensitiveData.warning.cancel': 'キャンセル',

  // Slack Import Connection Required Dialog
  'slack.import.connectionRequired.title': 'Slack接続が必要です',
  'slack.import.connectionRequired.message':
    'このワークフローをインポートするには、インポート元のSlackワークスペースに接続してください。ワークフローファイルは現在接続されていないワークスペースにあります。',
  'slack.import.connectionRequired.workspaceInfo': 'インポート元ワークスペース:',
  'slack.import.connectionRequired.connectButton': 'Slackに接続',

  // Edit in VSCode Editor
  'editor.openInEditor': 'エディタで編集',
  'editor.openInEditor.tooltip': 'VSCodeエディタで開いて編集',

  // Workflow Settings / Memo Panel
  'workflow.settings.title': 'ワークフロー設定',
  'workflow.settings.description.label': '説明',
  'workflow.settings.description.placeholder':
    'このワークフローの説明を入力してください（例：何をするか、いつ使うか）...',
  'workflow.settings.generateWithAI': 'AIで生成',

  // MCP Server Section
  'mcpSection.description.line1': 'AIとの対話形式でワークフロー編集します。',
  'mcpSection.description.line2': '使用するエージェントを選択してください。',
  'mcpSection.reviewBeforeApply': '適用前に変更を確認する',

  // Description Panel (Canvas)
  'description.panel.title': '説明',
  'description.panel.show': '説明パネルを表示',
  'description.panel.hide': '説明パネルを非表示',

  // Sub-Agent Creation Dialog (Feature: 636 - Use Existing Agent)
  'subAgent.dialog.title': 'Sub-Agentを参照',
  'subAgent.dialog.createNew': '新規作成',
  'subAgent.dialog.createNew.description': '新しいSub-Agentをゼロから作成',
  'subAgent.dialog.useExisting': '既存エージェントを使用',
  'subAgent.dialog.useExisting.description': '既存の.claude/agents/*.mdファイルを再利用',
  'subAgent.dialog.selectCommand': 'コマンドを選択',
  'subAgent.dialog.userTab': 'ユーザー',
  'subAgent.dialog.projectTab': 'プロジェクト',
  'subAgent.dialog.filterPlaceholder': '名前でフィルタ...',
  'subAgent.dialog.noCommands': 'このディレクトリにコマンドが見つかりません',
  'subAgent.dialog.loading': 'コマンドを読み込み中...',
  'subAgent.dialog.addButton': 'ワークフローに追加',
  'subAgent.dialog.cancelButton': 'キャンセル',
  'subAgent.dialog.backButton': '戻る',
  'subAgent.dialog.loadFailed':
    'コマンドの読み込みに失敗しました。コマンドディレクトリを確認してください。',
  'subAgent.dialog.description': 'ワークフローに追加するSub-Agentを選択してください。',
  'subAgent.dialog.selectSubAgent': 'Sub-Agentを選択',
  'subAgent.dialog.browseSubAgents': 'Sub-Agentを探す',
  'subAgent.dialog.userDescription':
    '~/.claude/agents/ のコマンド — すべてのプロジェクトで利用可能。',
  'subAgent.dialog.projectDescription': '.claude/agents/ のコマンド — このプロジェクト固有。',
  'subAgent.dialog.localDescription':
    'インストール済みの Claude Code プラグインが提供するエージェント。読み取り専用で、各プラグインによって管理されます。',
  'subAgent.property.linkedCommand': 'リンク済みコマンド',

  // Sub-Agent Form Dialog (Create New)
  'subAgent.form.title': '新しいSub-Agentを作成',
  'subAgent.form.description': 'カスタム設定で新しいSub-Agentノードを定義します。',
  'subAgent.form.agentTypeLabel': 'エージェントタイプ',
  'subAgent.form.agentType.claudeCode': 'Claude Code',
  'subAgent.form.agentType.other': 'その他',
  'subAgent.form.descriptionLabel': '説明',
  'subAgent.form.descriptionPlaceholder': 'このエージェントの簡単な説明...',
  'subAgent.form.agentDefinitionLabel': 'エージェント定義',
  'subAgent.form.agentDefinitionPlaceholder': 'このエージェントの能力、役割、振る舞いを定義...',
  'subAgent.form.promptLabel': 'プロンプト',
  'subAgent.form.promptPlaceholder': 'このエージェントに何をさせるかを入力...',
  'subAgent.form.modelLabel': 'モデル',
  'subAgent.form.toolsLabel': 'ツール',
  'subAgent.form.toolsHint': '許可するツールをカンマ区切りで入力（例: Read, Grep, Glob）',
  'subAgent.form.memoryLabel': 'メモリスコープ',
  'subAgent.form.memoryNone': 'なし',
  'subAgent.form.cancelButton': 'キャンセル',
  'subAgent.form.createButton': '作成',
  'subAgent.form.editTitle': 'サブエージェントの編集',
  'subAgent.form.saveButton': '保存',
  'subAgent.property.editButton': '編集',
  'subAgent.form.error.descriptionRequired': '説明は必須です。',
  'subAgent.form.error.agentDefinitionRequired': 'エージェント定義は必須です。',
  'subAgent.form.error.promptRequired': 'プロンプトは必須です。',

  // Sub-Agent Built-in Presets
  'subAgent.dialog.builtInTab': 'ビルトイン',
  'subAgent.dialog.builtInDescription':
    'Claude Codeのビルトインサブエージェントを選択します。\n他のAIエージェントでは、同様の振る舞いを再現するようにエクスポートされます。',
  'subAgent.builtIn.controlledByPreset': 'プリセットが制御',
  'subAgent.builtIn.generalPurpose.description':
    '複雑な調査、コード検索、マルチステップタスクの実行に対応する汎用エージェント。',
  'subAgent.builtIn.generalPurpose.defaultAgentDefinition':
    '複雑な調査、コード検索、マルチステップタスクの実行に対応する汎用エージェント。全ツールへのアクセス権を持つ。',
  'subAgent.builtIn.generalPurpose.defaultPrompt': '以下のタスクを調査して完了してください：',
  'subAgent.builtIn.explore.description':
    'コードベース探索に特化した高速読み取り専用エージェント。ファイル検索、コード検索、質問回答が可能。',
  'subAgent.builtIn.explore.defaultAgentDefinition':
    'コードベース探索に特化した高速エージェント。ファイル検索、キーワード検索、コードベースに関する質問回答に使用。読み取り専用 — Write/Editツール不可。',
  'subAgent.builtIn.explore.defaultPrompt':
    'コードベースを探索して、以下の質問に回答してください：',
  'subAgent.builtIn.plan.description':
    '実装計画の設計と重要ファイルの特定を行うソフトウェアアーキテクトエージェント。',
  'subAgent.builtIn.plan.defaultAgentDefinition':
    '実装計画を設計するソフトウェアアーキテクトエージェント。ステップバイステップの計画を返し、重要ファイルを特定し、アーキテクチャのトレードオフを検討する。読み取り専用 — Write/Editツール不可。',
  'subAgent.builtIn.plan.defaultPrompt': '以下の要件に対する実装計画を設計してください：',

  // Claude API Upload Dialog
  'claudeApi.description':
    'ワークフローを Agent Skills として Claude API にアップロードし、Messages API 経由で実行できます。\nMCP サーバー、コード実行、他のスキルと組み合わせることで、ドキュメント処理・データ分析・カスタマーサポートなど、専門的な AI エージェントを API として公開できます。',

  // Commentary AI
  'commentary.toggle': 'Commentary AI の ON/OFF',
  'commentary.waiting': 'エージェントの活動を待機中...',
  'commentary.inactive':
    'Commentary を有効にしてワークフローを実行すると、リアルタイム実況が表示されます。',
  'commentary.providerSelect': 'Commentary AI プロバイダーを選択',

  // Sample Workflows
  'toolbar.sampleWorkflows': 'サンプルワークフロー',
  'sample.dialog.title': 'サンプルワークフロー',
  'sample.dialog.description':
    'サンプルワークフローを読み込んで、どんなものが作れるか体験しましょう。',
  'sample.dialog.nodeCount': '{{count}} ノード',
  'sample.dialog.loadButton': '読み込む',
  'sample.githubIssuePlanning.name': 'GitHub Issue プランニング',
  'sample.githubIssuePlanning.description':
    'GitHub Issueに対するプランニングワークフロー：Issue取得、現状コード分析、修正の検証確認、振り返り。',
};
