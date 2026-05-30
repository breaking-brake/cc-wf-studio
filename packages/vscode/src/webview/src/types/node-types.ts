/**
 * ノードタイプ拡張: Start, End, Promptノードの型定義
 *
 * このファイルはワークフローエディタの新しいノードタイプを定義します。
 * ReactFlowのNode型を拡張し、各ノードタイプに固有のデータ構造を提供します。
 */

import type { Node } from 'reactflow';

// ============================================================================
// Start Node
// ============================================================================

/**
 * Startノードのデータ構造
 *
 * ワークフローの開始点を明示的に表現するノードです。
 */
export interface StartNodeData {
  /**
   * ノードのラベル (省略可能)
   * デフォルト: "Start"
   */
  label?: string;
}

/**
 * Startノード型
 *
 * ワークフローの開始点を表すノード。入力接続を持たず、出力接続のみを持ちます。
 */
export type StartNode = Node<StartNodeData, 'start'>;

// ============================================================================
// End Node
// ============================================================================

/**
 * Endノードのデータ構造
 *
 * ワークフローの終了点を明示的に表現するノードです。
 */
export interface EndNodeData {
  /**
   * ノードのラベル (省略可能)
   * デフォルト: "End"
   */
  label?: string;
}

/**
 * Endノード型
 *
 * ワークフローの終了点を表すノード。出力接続を持たず、入力接続のみを持ちます。
 */
export type EndNode = Node<EndNodeData, 'end'>;

// ============================================================================
// Prompt Node
// ============================================================================

/**
 * Promptノードのデータ構造
 *
 * AIエージェントに送信するプロンプトテキストを定義するノードです。
 */
export interface PromptNodeData {
  /**
   * ノードのラベル (省略可能)
   * デフォルト: "Prompt"
   */
  label?: string;

  /**
   * プロンプトテキスト (必須)
   *
   * Mustache形式の変数 ({{variableName}}) をサポートします。
   * 実行時に変数が置換されます。
   *
   * @example
   * "Generate a {{language}} function that {{description}}"
   */
  prompt: string;

  /**
   * プレースホルダー変数のマッピング (省略可能)
   *
   * 実行時に前段のノードから値を受け取り、プロンプト内の変数を置換します。
   *
   * @example
   * { "language": "TypeScript", "description": "validates email addresses" }
   */
  variables?: Record<string, string>;
}

/**
 * Promptノード型
 *
 * AIエージェント用のプロンプトを定義するノード。入力と出力の両方の接続を持ちます。
 */
export type PromptNode = Node<PromptNodeData, 'prompt'>;

// ============================================================================
// Branch Node
// ============================================================================

/**
 * Branchノードの分岐条件
 */
export interface BranchCondition {
  /**
   * 分岐の一意識別子 (省略可能)
   */
  id?: string;

  /**
   * 分岐のラベル (必須)
   *
   * @example "Success", "Error", "Empty"
   */
  label: string;

  /**
   * 自然言語で記述された条件 (必須)
   *
   * @example "前の処理が成功した場合", "エラーが発生した場合"
   */
  condition: string;
}

/**
 * Branchノードのデータ構造
 *
 * 前処理の結果に応じて分岐を行うノードです。
 */
export interface BranchNodeData {
  /**
   * 分岐タイプ
   * - conditional: 2分岐 (true/false)
   * - switch: 複数分岐 (2-N分岐)
   */
  branchType: 'conditional' | 'switch';

  /**
   * 分岐条件のリスト
   * - conditional: 2つの分岐
   * - switch: 2-N個の分岐
   */
  branches: BranchCondition[];

  /**
   * 出力ポート数
   */
  outputPorts: number;
}

/**
 * Branchノード型
 *
 * 条件分岐を表すノード。入力と複数の出力接続を持ちます。
 */
export type BranchNode = Node<BranchNodeData, 'branch'>;

// ============================================================================
// Union Type
// ============================================================================

/**
 * ワークフローノードの統合型
 *
 * すべてのカスタムノードタイプを含むユニオン型です。
 * 既存のノードタイプと組み合わせて使用します。
 */
export type WorkflowNode = StartNode | EndNode | PromptNode | BranchNode;
