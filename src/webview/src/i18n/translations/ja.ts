/**
 * Claude Code Workflow Studio - Webview Japanese Translations
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

  // Toolbar
  'toolbar.workflowNamePlaceholder': 'ワークフロー名',
  'toolbar.save': '保存',
  'toolbar.saving': '保存中...',
  'toolbar.convert': 'Slash Commandに変換',
  'toolbar.convert.tooltip': 'Slash Commandに変換して.claude/commands/に保存',
  'toolbar.converting': '変換中...',
  'toolbar.generateWithAI': 'AIで生成',
  'toolbar.refineWithAI': 'AI編集',
  'toolbar.selectWorkflow': 'ワークフローを選択...',
  'toolbar.load': '読み込み',
  'toolbar.refreshList': 'ワークフローリストを更新',

  // Toolbar interaction mode
  'toolbar.interactionMode.panButton': '手のひら',
  'toolbar.interactionMode.rangeSelectionButton': '範囲選択',
  'toolbar.interactionMode.switchToPan': '手のひらモードに切り替え',
  'toolbar.interactionMode.switchToSelection': '範囲選択モードに切り替え',

  // Toolbar errors
  'toolbar.error.workflowNameRequired': 'ワークフロー名は必須です',
  'toolbar.error.workflowNameRequiredForExport': 'エクスポートにはワークフロー名が必要です',
  'toolbar.error.selectWorkflowToLoad': '読み込むワークフローを選択してください',
  'toolbar.error.validationFailed': 'ワークフローの検証に失敗しました',
  'toolbar.error.missingEndNode': 'ワークフローには最低1つのEndノードが必要です',
  'toolbar.error.noActiveWorkflow': 'ワークフローを読み込んでください',

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
  'properties.subAgent.color': '色',
  'properties.subAgent.colorPlaceholder': '色を選択...',
  'properties.subAgent.colorNone': 'なし',
  'properties.subAgent.colorHelp': 'このサブエージェントの視覚的な識別色',

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
    'Claude Code Workflow Studioへようこそ！\n\nこのツアーでは、各機能の場所と役割をご紹介します。基本的な使い方を理解して、ワークフロー作成を始めましょう。',
  'tour.nodePalette':
    'ノードパレットには、ワークフローで使用できる様々なノードが用意されています。\n\nPrompt、Sub-Agent、AskUserQuestion、If/Else、Switchなどのノードをクリックしてキャンバスに追加できます。',
  'tour.addPrompt':
    'この「Prompt」ボタンから、Promptノードをキャンバスに追加できます。\n\nPromptノードは変数を使用できるテンプレートで、ワークフローの基本的な構成要素です。',
  'tour.canvas':
    'ここがキャンバスです。ノードをドラッグして配置を調整し、ハンドルをドラッグしてノード間を接続できます。\n\n既にStartノードとEndノードが配置されています。',
  'tour.propertyPanel':
    'プロパティパネルでは、選択したノードの詳細設定を行います。\n\nノード名、プロンプト、モデル選択などを編集できます。',
  'tour.addAskUserQuestion':
    '「AskUserQuestion」ノードは、ユーザーの選択に応じてワークフローを分岐させるために使用します。\n\nこのボタンからキャンバスに追加できます。',
  'tour.connectNodes':
    'ノードを接続してワークフローを作りましょう。\n\nノードの右側の出力ハンドル(⚪)を別のノードの左側の入力ハンドルにドラッグして接続します。',
  'tour.workflowName':
    'ここでワークフローに名前を付けることができます。\n\n英数字、ハイフン、アンダースコアが使用できます。',
  'tour.saveWorkflow':
    '「保存」ボタンをクリックすると、ワークフローが`.vscode/workflows/`ディレクトリにJSON形式で保存されます。\n\n後で読み込んで編集を続けることができます。',
  'tour.loadWorkflow':
    '保存したワークフローを読み込むには、ドロップダウンメニューからワークフローを選択し、「読み込み」ボタンをクリックします。',
  'tour.exportWorkflow':
    '「エクスポート」ボタンをクリックすると、Claude Codeで実行可能な形式にエクスポートされます。\n\nSub-Agentは`.claude/agents/`に、SlashCommandは`.claude/commands/`に出力されます。',
  'tour.refineWithAI':
    '「AI編集」ボタンで、AIとチャットしながらワークフローを生成・改善できます。\n\n空のキャンバスから新規作成も、既存のワークフローの修正も対話的に行えます。',
  'tour.slackShare':
    '「Slackに共有」ボタンをクリックすると、チームとワークフローを共有できます。\n\nSlackチャンネルにワークフローを投稿して、簡単にコラボレーションできます。',
  'tour.helpButton':
    'このツアーをもう一度見たい場合は、ヘルプボタン(?)をクリックしてください。\n\nそれでは、ワークフロー作成を楽しんでください！',

  // Tour buttons
  'tour.button.back': '戻る',
  'tour.button.close': '閉じる',
  'tour.button.finish': '完了',
  'tour.button.next': '次へ',
  'tour.button.skip': 'スキップ',

  // Terms of Use
  'terms.title': 'Claude Code Workflow Studio - 利用規約',
  'terms.introduction': '本ツールは正当な目的でのワークフロー作成を支援します。',
  'terms.prohibitedUse': '以下の用途での使用を禁止します：',
  'terms.cyberAttack': 'サイバー攻撃（DDoS攻撃、不正アクセス等）',
  'terms.malware': 'マルウェア・ランサムウェアの作成',
  'terms.personalDataTheft': '個人情報の不正取得・悪用',
  'terms.otherIllegalActs': 'その他の違法行為や他者への損害行為',
  'terms.liability': '違反した場合、利用者が全責任を負います。',
  'terms.agree': '上記に同意します',
  'terms.agreeButton': '同意して開始',
  'terms.cancelButton': 'キャンセル',

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
  'refinement.charactersRemaining': '残り {count} 文字',
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

  // Timeout selector
  'refinement.timeout.label': 'タイムアウト',
  'refinement.timeout.ariaLabel': 'AIリファインメントのタイムアウト時間を選択',

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

  // Refinement Errors
  'refinement.error.emptyMessage': 'メッセージを入力してください',
  'refinement.error.messageTooLong': 'メッセージが長すぎます（最大{max}文字）',
  'refinement.error.commandNotFound':
    'Claude Code CLIが見つかりません。AI改善機能を使用するにはClaude Codeをインストールしてください。',
  'refinement.error.timeout':
    'AI改善がタイムアウトしました。タイムアウト設定値を調整してもう一度試してみてください。リクエスト内容の簡略化もご検討ください。',
  'refinement.error.parseError':
    'AI応答の解析に失敗しました。もう一度試すか、リクエストを言い換えてください。',
  'refinement.error.validationError':
    '改善されたワークフローが検証に失敗しました。別のリクエストを試してください。',
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
  'refinement.initialMessage.note':
    '※ この機能はお使いの環境にインストールされたClaude Codeを使用します。',

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

  // MCP Node Dialog
  'mcp.dialog.title': 'MCP Toolの設定',
  'mcp.dialog.selectServer': 'MCPサーバーを選択',
  'mcp.dialog.selectTool': 'ツールを選択',
  'mcp.dialog.addButton': 'ツールを追加',
  'mcp.dialog.cancelButton': 'キャンセル',
  'mcp.dialog.wizardStep': 'ステップ {{current}} / {{total}}',
  'mcp.dialog.nextButton': '次へ',
  'mcp.dialog.backButton': '戻る',
  'mcp.dialog.saveButton': 'ノードを作成',
  'mcp.dialog.error.noServerSelected': 'MCPサーバーを選択してください',
  'mcp.dialog.error.noToolSelected': 'ツールを選択してください',
  'mcp.dialog.error.incompleteWizard': '必要なステップをすべて完了してください',
  'mcp.dialog.error.cannotProceed': '進むには必要なフィールドをすべて入力してください',
  'mcp.dialog.error.invalidMode': '無効なモードが選択されました',

  // MCP Property Panel
  'property.nodeType.mcp': 'MCP Tool',
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
    'サーバー、ツール、すべてのパラメータを明示的に設定します。再現性が高く、技術的なユーザーに最適です。',
  'mcp.modeSelection.aiParameterConfig.title': 'AIパラメータ設定',
  'mcp.modeSelection.aiParameterConfig.description':
    'サーバーとツールを選択し、パラメータを自然言語で記述します。バランスの取れたアプローチです。',
  'mcp.modeSelection.aiToolSelection.title': 'AIツール選択',
  'mcp.modeSelection.aiToolSelection.description':
    'サーバーのみを選択し、タスク全体を自然言語で記述します。最もシンプルですが、再現性は低いです。',

  // Tool Selection Mode (Step-by-step decision flow)
  'mcp.toolSelectionMode.title': 'ツール選択方法',
  'mcp.toolSelectionMode.subtitle': 'MCPノードのツールをどのように選択するか選んでください',
  'mcp.toolSelectionMode.manual.title': 'ツールを自分で選ぶ',
  'mcp.toolSelectionMode.manual.description':
    '自分でツールを参照して選択します。使用したいツールが明確な場合に最適です。',
  'mcp.toolSelectionMode.auto.title': 'AIにツールを選んでもらう',
  'mcp.toolSelectionMode.auto.description':
    'タスクの説明に基づいて、AIが自動的に最適なツールを選択します。探索中や不確実な場合に最適です。',

  // Parameter Config Mode (Step-by-step decision flow)
  'mcp.parameterConfigMode.title': 'パラメータ設定方法',
  'mcp.parameterConfigMode.subtitle': 'このツールのパラメータをどのように設定するか選んでください',
  'mcp.parameterConfigMode.manual.title': 'パラメータを自分で設定する',
  'mcp.parameterConfigMode.manual.description':
    '自分ですべてのパラメータを入力します。正確な制御と再現性が必要な場合に最適です。',
  'mcp.parameterConfigMode.auto.title': 'AIにパラメータを設定してもらう',
  'mcp.parameterConfigMode.auto.description':
    '自然言語の説明に基づいて、AIがパラメータを設定します。素早く設定したい場合に最適です。',

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
  'slack.manualToken.howToGet.step2':
    'Bot Token Scopesを追加（OAuth & Permissions）: chat:write, files:read, files:write',
  'slack.manualToken.howToGet.step3':
    'User Token Scopesを追加（OAuth & Permissions）: channels:read, groups:read',
  'slack.manualToken.howToGet.step4': 'Appをワークスペースにインストール（OAuth & Permissions）',
  'slack.manualToken.howToGet.step5': 'Appをワークフロー共有先のチャンネルに追加（Slack内）',
  'slack.manualToken.howToGet.step6':
    'Bot Token（xoxb-...）とUser Token（xoxp-...）をOAuth & Permissionsページからコピー',
  'slack.manualToken.security.title': 'セキュリティーとプライバシー',
  'slack.manualToken.security.notice':
    '注意：この機能はSlackサーバーと通信します（ローカル動作ではありません）',
  'slack.manualToken.security.storage':
    'トークンはVSCode Secret Storage（OSのキーチェーン）に安全に保存されます',
  'slack.manualToken.security.transmission': 'Slack API（api.slack.com）への検証時のみ送信されます',
  'slack.manualToken.security.deletion': '保存したトークンはいつでも削除できます',
  'slack.manualToken.security.sharing':
    'Bot Tokenにはチャンネルの読み取り・書き込み権限等があるため、信頼できるコミュニティ内でのみ共有してください',
  'slack.manualToken.botToken.label': 'Bot User OAuth Token',
  'slack.manualToken.userToken.label': 'User OAuth Token',
  'slack.manualToken.error.tokenRequired': 'Bot Tokenは必須です',
  'slack.manualToken.error.invalidTokenFormat': 'Bot Tokenは"xoxb-"で始まる必要があります',
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
  'slack.share.selectWorkspace': 'ワークスペース選択',
  'slack.share.selectWorkspacePlaceholder': 'ワークスペースを選択...',
  'slack.share.selectChannel': 'チャンネル選択',
  'slack.share.selectChannelPlaceholder': 'チャンネルを選択...',
  'slack.share.sharing': '共有中...',
  'slack.share.success': 'ワークフローを共有しました',
  'slack.share.failed': 'ワークフローの共有に失敗しました',
  'slack.share.descriptionPlaceholder': '説明を追加（任意）...',
  'slack.share.checkingBotMembership': 'Slack Appがチャンネルにいるか確認中...',
  'slack.share.botNotInChannelMessage':
    'このチャンネルにはSlack Appがまだ追加されていません。\n共有する前にSlack Appを追加してください。',

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
    'ワークスペースに接続ボタンをクリックすると、「Claude Code Workflow Studio」にSlackへのアクセスを許可する確認画面が表示されます。\n許可を行うとワークスペースに連携用のSlack Appがインストールされます。',
  'slack.oauth.termsOfService': '利用規約',
  'slack.oauth.privacyPolicy': 'プライバシーポリシー',
  'slack.oauth.supportPage': 'サポートページ',
  'slack.oauth.connectButton': 'ワークスペースに接続',
  'slack.oauth.status.initiated': 'ブラウザを開いて認証中...',
  'slack.oauth.status.polling': '認証を待っています...',
  'slack.oauth.status.waitingHint': 'ブラウザで認証を完了し、こちらに戻ってください。',
  'slack.oauth.cancelled': '認証がキャンセルされました',
  'slack.oauth.reviewNotice.message':
    '共有に使用するSlack AppはSlackへの審査を予定しています。\n審査の承認が下りるまで、許可画面で警告が表示されます。',

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

  // Slack Errors
  'slack.error.notAuthenticated': '先にSlackに接続してください',
  'slack.error.channelNotFound': 'チャンネルが見つかりません',
  'slack.error.notInChannel':
    'Slack Appがこのチャンネルのメンバーではありません。先にSlack Appを招待してください。',
  'slack.error.networkError': 'ネットワークエラー。接続を確認してください。',
  'slack.error.rateLimited': 'レート制限を超過しました。{seconds}秒後に再試行してください。',
  'slack.error.noWorkspaces': '接続されているワークスペースがありません',
  'slack.error.noChannels': '利用可能なチャンネルがありません',
  'slack.error.noChannelsHelp':
    'Slack Appがどのチャンネルにも参加していません。Slackで /invite @Claude Code Workflow Studio を実行してSlack Appをチャンネルに招待してください。',

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
};
