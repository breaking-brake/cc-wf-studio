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
  'toolbar.selectWorkflow': 'ワークフローを選択...',
  'toolbar.load': '読み込み',
  'toolbar.refreshList': 'ワークフローリストを更新',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': 'ワークフロー名は必須です',
  'toolbar.error.workflowNameRequiredForExport': 'エクスポートにはワークフロー名が必要です',
  'toolbar.error.selectWorkflowToLoad': '読み込むワークフローを選択してください',
  'toolbar.error.validationFailed': 'ワークフローの検証に失敗しました',

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
  'node.branch.title': 'Branch',
  'node.branch.description': '条件分岐ロジック',
  'node.askUserQuestion.title': 'Ask User Question',
  'node.askUserQuestion.description': 'ユーザーの選択に基づいて分岐',

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
  'property.nodeType.prompt': 'Prompt Node',
  'property.nodeType.start': 'Start Node',
  'property.nodeType.end': 'End Node',
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

  // Start/End node descriptions
  'property.startNodeDescription':
    'Startノードはワークフローの開始地点です。削除できず、編集可能なプロパティはありません。',
  'property.endNodeDescription':
    'Endノードはワークフローの終了地点です。削除できず、編集可能なプロパティはありません。',
  'property.unknownNodeType': '不明なノードタイプ:',

  // Sub-Agent properties
  'property.tools': 'ツール（カンマ区切り）',
  'property.tools.placeholder': '例: Read,Write,Bash',
  'property.tools.help': '空欄で全てのツールを使用',

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
  'default.newBranch': '分岐',
  'default.newCondition': '新しい条件',

  // Tour
  'tour.welcome':
    'Claude Code Workflow Studioへようこそ！\n\nこのツアーでは、初めてのワークフロー作成を通じて、基本的な使い方をご案内します。',
  'tour.nodePalette':
    'ノードパレットには、ワークフローで使用できる様々なノードが用意されています。\n\nPrompt、Sub-Agent、AskUserQuestion、Branchなどのノードをクリックしてキャンバスに追加できます。',
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
  'tour.exportWorkflow':
    '「エクスポート」ボタンをクリックすると、Claude Codeで実行可能な形式にエクスポートされます。\n\nSub-Agentは`.claude/agents/`に、SlashCommandは`.claude/commands/`に出力されます。',
  'tour.helpButton':
    'このツアーをもう一度見たい場合は、ヘルプボタン(?)をクリックしてください。\n\nそれでは、ワークフロー作成を楽しんでください！',

  // Tour buttons
  'tour.button.back': '戻る',
  'tour.button.close': '閉じる',
  'tour.button.finish': '完了',
  'tour.button.next': '次へ',
  'tour.button.skip': 'スキップ',
};
