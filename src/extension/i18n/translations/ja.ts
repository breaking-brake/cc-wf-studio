/**
 * Claude Code Workflow Studio - Japanese Translations
 */

import type { TranslationKeys } from '../translation-keys';

export const jaTranslations: TranslationKeys = {
  // Mermaid flowchart labels
  'mermaid.start': '開始',
  'mermaid.end': '終了',
  'mermaid.question': '質問',
  'mermaid.conditionalBranch': '条件分岐',

  // Workflow execution guide
  'guide.title': '## ワークフロー実行ガイド',
  'guide.intro':
    '上記のMermaidフローチャートに従ってワークフローを実行してください。各ノードタイプの実行方法は以下の通りです。',
  'guide.nodeTypesTitle': '### ノードタイプ別実行方法',
  'guide.nodeTypes.subAgent': '- **四角形のノード**: Taskツールを使用してSub-Agentを実行します',
  'guide.nodeTypes.askUserQuestion':
    '- **ひし形のノード(AskUserQuestion:...)**: AskUserQuestionツールを使用してユーザーに質問し、回答に応じて分岐します',
  'guide.nodeTypes.branch':
    '- **ひし形のノード(Branch/Switch:...)**: 前処理の結果に応じて自動的に分岐します(詳細セクション参照)',
  'guide.nodeTypes.prompt':
    '- **四角形のノード(Promptノード)**: 以下の詳細セクションに記載されたプロンプトを実行します',

  // Prompt node details
  'promptNode.title': '### Promptノード詳細',
  'promptNode.availableVariables': '**使用可能な変数:**',
  'promptNode.variableNotSet': '(未設定)',

  // AskUserQuestion node details
  'askNode.title': '### AskUserQuestionノード詳細',
  'askNode.selectionMode': '**選択モード:**',
  'askNode.aiSuggestions': 'AI提案(AIが文脈に基づいて選択肢を動的に生成し、ユーザーに提示します)',
  'askNode.multiSelect': '**複数選択:** 有効(ユーザーは複数の選択肢を選べます)',
  'askNode.singleSelect': '単一選択(選択された選択肢に応じて分岐します)',
  'askNode.options': '**選択肢:**',
  'askNode.noDescription': '(説明なし)',
  'askNode.multiSelectExplanation':
    '複数選択可能(選択された選択肢のリストが次のノードに渡されます)',

  // Branch node details (Legacy)
  'branchNode.title': '### Branchノード詳細',
  'branchNode.binary': '2分岐',
  'branchNode.multiple': '複数分岐',
  'branchNode.conditions': '**分岐条件:**',
  'branchNode.executionMethod':
    '**実行方法**: 前段の処理結果を評価し、上記の条件に基づいて自動的に適切な分岐を選択してください。',

  // IfElse node details
  'ifElseNode.title': '### If/Elseノード詳細',
  'ifElseNode.binary': '2分岐(True/False)',
  'ifElseNode.evaluationTarget': '評価対象',

  // Switch node details
  'switchNode.title': '### Switchノード詳細',
  'switchNode.multiple': '複数分岐(2-N)',
  'switchNode.evaluationTarget': '評価対象',

  // MCP node details
  'mcpNode.title': '## MCPツールノード',
  'mcpNode.description': '**説明**',
  'mcpNode.server': '**MCPサーバー**',
  'mcpNode.toolName': '**ツール名**',
  'mcpNode.validationStatus': '**検証状態**',
  'mcpNode.configuredParameters': '**設定済みパラメータ**',
  'mcpNode.availableParameters': '**利用可能なパラメータ**',
  'mcpNode.required': '必須',
  'mcpNode.optional': '任意',
  'mcpNode.noDescription': '説明なし',
  'mcpNode.executionMethod':
    'このノードはMCP(Model Context Protocol)ツールを呼び出します。ワークフロー実行時は、設定されたパラメータを使用してMCPサーバー経由でツールを呼び出してください。',

  // Error messages
  'error.noWorkspaceOpen': 'フォルダまたはワークスペースを開いてから実行してください。',

  // File picker
  'filePicker.title': 'ワークフローファイルを選択',
  'filePicker.error.invalidWorkflow':
    '無効なワークフローファイルです。有効なJSONワークフローファイルを選択してください。',
  'filePicker.error.loadFailed': 'ワークフローファイルの読み込みに失敗しました。',
};
