/**
 * Claude Code Workflow Studio - Webview Japanese Translations
 */

import type { WebviewTranslationKeys } from '../translation-keys';

export const jaWebviewTranslations: WebviewTranslationKeys = {
  // Toolbar
  'toolbar.workflowNamePlaceholder': 'ワークフロー名',
  'toolbar.save': '保存',
  'toolbar.saving': '保存中...',
  'toolbar.export': 'エクスポート',
  'toolbar.exporting': 'エクスポート中...',
  'toolbar.generateWithAI': 'AIで生成',
  'toolbar.selectWorkflow': 'ワークフローを選択...',
  'toolbar.load': '読み込み',
  'toolbar.refreshList': 'ワークフローリストを更新',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': 'ワークフロー名は必須です',
  'toolbar.error.workflowNameRequiredForExport': 'エクスポートにはワークフロー名が必要です',
  'toolbar.error.selectWorkflowToLoad': '読み込むワークフローを選択してください',
  'toolbar.error.validationFailed': 'ワークフローの検証に失敗しました',
  'toolbar.error.missingEndNode': 'ワークフローには最低1つのEndノードが必要です',

  // Node Palette
  'palette.title': 'ノードパレット',
  'palette.basicNodes': '基本ノード',
  'palette.controlFlow': '制御フロー',
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

  // Quick start instructions
  'palette.instruction.addNode': 'ノードをクリックしてキャンバスに追加',
  'palette.instruction.dragNode': 'ノードをドラッグして移動',
  'palette.instruction.connectNodes': '出力ハンドルから入力ハンドルへドラッグして接続',
  'palette.instruction.editProperties': 'ノードを選択してプロパティを編集',

  // Property Panel
  'property.title': 'プロパティ',
  'property.noSelection': 'ノードを選択してプロパティを表示',

  // Node type badges
  'property.nodeType.subAgent': 'Sub-Agent',
  'property.nodeType.askUserQuestion': 'Ask User Question',
  'property.nodeType.branch': 'Branch Node',
  'property.nodeType.ifElse': 'If/Else Node',
  'property.nodeType.switch': 'Switch Node',
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
  'property.nodeType.skill': 'Skillノード',
  'property.nodeType.unknown': '不明',

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

  // Skill properties
  'property.skillPath': 'Skillパス',
  'property.scope': 'スコープ',
  'property.scope.personal': 'パーソナル',
  'property.scope.project': 'プロジェクト',
  'property.validationStatus': '検証ステータス',
  'property.validationStatus.valid': '有効',
  'property.validationStatus.missing': '見つかりません',
  'property.validationStatus.invalid': '無効',
  'property.validationStatus.valid.tooltip': 'Skillは有効で使用可能です',
  'property.validationStatus.missing.tooltip': '指定されたパスにSKILL.mdファイルが見つかりません',
  'property.validationStatus.invalid.tooltip': 'SKILL.mdのYAMLフロントマターが無効です',
  'property.allowedTools': '許可ツール',

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
  'property.promptTemplate': 'プロンプトテンプレート',
  'property.promptTemplate.placeholder': '{{variables}}を含むプロンプトテンプレートを入力',
  'property.promptTemplate.help': '動的な値には{{variableName}}構文を使用',
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
  'default.promptTemplate':
    'ここにプロンプトテンプレートを入力してください。\n\n{{variableName}}のように変数を使用できます。',
  'default.branchTrue': 'True',
  'default.branchTrueCondition': '条件が真の場合',
  'default.branchFalse': 'False',
  'default.branchFalseCondition': '条件が偽の場合',
  'default.case1': 'Case 1',
  'default.case1Condition': '条件1の場合',
  'default.case2': 'Case 2',
  'default.case2Condition': '条件2の場合',
  'default.case3': 'Case 3',
  'default.case3Condition': '条件3の場合',
  'default.conditionPrefix': '条件',
  'default.conditionSuffix': 'の場合',

  // Tour
  'tour.welcome':
    'Claude Code Workflow Studioへようこそ！\n\nこのツアーでは、初めてのワークフロー作成を通じて、基本的な使い方をご案内します。',
  'tour.nodePalette':
    'ノードパレットには、ワークフローで使用できる様々なノードが用意されています。\n\nPrompt、Sub-Agent、AskUserQuestion、If/Else、Switchなどのノードをクリックしてキャンバスに追加できます。',
  'tour.addPrompt':
    '「Prompt」ボタンをクリックして、最初のノードを追加してみましょう。\n\nPromptノードは変数を使用できるテンプレートで、ワークフローの基本的な構成要素です。',
  'tour.canvas':
    'ここがキャンバスです。ノードをドラッグして配置を調整し、ハンドルをドラッグしてノード間を接続できます。\n\n既にStartノードとEndノードが配置されています。',
  'tour.propertyPanel':
    'プロパティパネルでは、選択したノードの詳細設定を行います。\n\nノード名、プロンプト、モデル選択などを編集できます。',
  'tour.addAskUserQuestion':
    '次に「AskUserQuestion」ノードを追加してみましょう。\n\nこのノードを使うと、ユーザーの選択に応じてワークフローを分岐できます。',
  'tour.connectNodes':
    'ノードを接続してワークフローを作りましょう。\n\nノードの右側の出力ハンドル(⚪)を別のノードの左側の入力ハンドルにドラッグして接続します。',
  'tour.workflowName':
    'ワークフローに名前を付けます。\n\n英数字、ハイフン、アンダースコアが使用できます。',
  'tour.saveWorkflow':
    '「保存」ボタンをクリックすると、ワークフローが`.vscode/workflows/`ディレクトリにJSON形式で保存されます。\n\n後で読み込んで編集を続けることができます。',
  'tour.loadWorkflow':
    '保存したワークフローを読み込むには、ドロップダウンメニューからワークフローを選択し、「読み込み」ボタンをクリックします。',
  'tour.exportWorkflow':
    '「エクスポート」ボタンをクリックすると、Claude Codeで実行可能な形式にエクスポートされます。\n\nSub-Agentは`.claude/agents/`に、SlashCommandは`.claude/commands/`に出力されます。',
  'tour.generateWithAI':
    '「AI生成」ボタンで、自然言語の説明からワークフローを自動生成できます。\n\n例：「コードをスキャンし、ユーザーに優先度を尋ねて修正案を生成するワークフロー」と入力するだけで、完全なワークフローが作成されます。',
  'tour.helpButton':
    'このツアーをもう一度見たい場合は、ヘルプボタン(?)をクリックしてください。\n\nそれでは、ワークフロー作成を楽しんでください！',

  // Tour buttons
  'tour.button.back': '戻る',
  'tour.button.close': '閉じる',
  'tour.button.finish': '完了',
  'tour.button.next': '次へ',
  'tour.button.skip': 'スキップ',

  // AI Generation Dialog
  'ai.dialogTitle': 'AIでワークフローを生成',
  'ai.dialogDescription':
    '作成したいワークフローを自然言語で説明してください。AIがノードと接続を含む完全なワークフローを生成します。',
  'ai.descriptionLabel': 'ワークフローの説明',
  'ai.descriptionPlaceholder':
    '例: コードをスキャンし、ユーザーに優先度レベルを尋ね、修正案を生成するコードレビューワークフローを作成',
  'ai.characterCount': '{count} / {max} 文字',
  'ai.generating': 'ワークフローを生成中... 最大90秒かかることがあります。',
  'ai.progressTime': '{elapsed}秒 / {max}秒',
  'ai.generateButton': '生成',
  'ai.cancelButton': 'キャンセル',
  'ai.cancelGenerationButton': '生成を中止',
  'ai.success': 'ワークフローが正常に生成されました！',
  'ai.usageNote': '※1 この機能はお使いの環境にインストールされたClaude Codeを使用します。',
  'ai.overwriteWarning':
    '※2 ワークフローを生成すると、現在のワークフローが完全に上書きされます。続行する前に作業内容を保存してください。',

  // AI Generation Errors
  'ai.error.emptyDescription': 'ワークフローの説明を入力してください',
  'ai.error.descriptionTooLong': '説明が長すぎます（最大{max}文字）',
  'ai.error.commandNotFound':
    'Claude Code CLIが見つかりません。AI生成機能を使用するにはClaude Codeをインストールしてください。',
  'ai.error.timeout':
    'リクエストがタイムアウトしました。もう一度試すか、説明を簡潔にしてください。',
  'ai.error.parseError': '生成に失敗しました - もう一度試すか、説明を言い換えてください',
  'ai.error.validationError': '生成されたワークフローの検証に失敗しました',
  'ai.error.unknown': '予期しないエラーが発生しました。もう一度お試しください。',

  // Delete Confirmation Dialog
  'dialog.deleteNode.title': 'ノードを削除',
  'dialog.deleteNode.message': 'このノードを削除してもよろしいですか？',
  'dialog.deleteNode.confirm': '削除',
  'dialog.deleteNode.cancel': 'キャンセル',

  // Skill Browser Dialog
  'skill.browser.title': 'Skillを参照',
  'skill.browser.description':
    'ワークフローに追加するClaude Code Skillを選択してください。\nSkillはClaude Codeが自動的に活用する専門的な能力です。',
  'skill.browser.personalTab': 'パーソナル',
  'skill.browser.projectTab': 'プロジェクト',
  'skill.browser.noSkills': 'このディレクトリにSkillが見つかりません',
  'skill.browser.loading': 'Skillを読み込み中...',
  'skill.browser.selectButton': 'ワークフローに追加',
  'skill.browser.cancelButton': 'キャンセル',
  'skill.browser.skillName': 'Skill名',
  'skill.browser.skillDescription': '説明',
  'skill.browser.skillPath': 'パス',
  'skill.browser.validationStatus': 'ステータス',

  // Skill Browser Errors
  'skill.error.loadFailed': 'Skillの読み込みに失敗しました。Skillディレクトリを確認してください。',
  'skill.error.noSelection': 'Skillを選択してください',
  'skill.error.unknown': '予期しないエラーが発生しました',

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
  'skill.creation.scopePersonal': 'パーソナル (~/.claude/skills/)',
  'skill.creation.scopeProject': 'プロジェクト (.claude/skills/)',
  'skill.creation.cancelButton': 'キャンセル',
  'skill.creation.createButton': 'Skillを作成',
  'skill.creation.creatingButton': '作成中...',
  'skill.creation.error.unknown': 'Skillの作成に失敗しました。もう一度お試しください。',

  // Skill Validation Errors
  'skill.validation.nameRequired': 'Skill名は必須です',
  'skill.validation.nameTooLong': 'Skill名は64文字以内にしてください',
  'skill.validation.nameInvalidFormat': 'Skill名は小文字、数字、ハイフンのみ使用できます',
  'skill.validation.descriptionRequired': '説明は必須です',
  'skill.validation.descriptionTooLong': '説明は1024文字以内にしてください',
  'skill.validation.instructionsRequired': '指示内容は必須です',
  'skill.validation.scopeRequired': 'スコープ（個人用/プロジェクト用）を選択してください',
};
