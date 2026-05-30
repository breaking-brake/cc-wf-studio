/**
 * テンプレート変数ユーティリティ
 *
 * Mustache形式のプレースホルダー変数 ({{variableName}}) の抽出と置換を提供します。
 * Promptノードでの使用を想定しています。
 */

/**
 * Mustache形式の変数パターン: {{variableName}}
 *
 * - 変数名は英数字とアンダースコアのみ許可
 * - グローバルフラグ付きで複数マッチをサポート
 */
export const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * プロンプトテキストからプレースホルダー変数を抽出します
 *
 * @param promptText - 抽出元のプロンプトテキスト
 * @returns 抽出された変数名の配列（重複なし、出現順）
 *
 * @example
 * ```typescript
 * extractVariables("Generate a {{language}} function that {{description}}")
 * // => ["language", "description"]
 *
 * extractVariables("Hello {{name}}! Welcome {{name}}!")
 * // => ["name"] (重複は除去される)
 *
 * extractVariables("No variables here")
 * // => []
 * ```
 */
export function extractVariables(promptText: string): string[] {
  const matches = promptText.matchAll(VARIABLE_PATTERN);
  const variables = Array.from(matches, (m) => m[1]);

  // 重複を除去しつつ順序を保持
  return [...new Set(variables)];
}

/**
 * プロンプトテキスト内のプレースホルダー変数を実際の値で置換します
 *
 * @param promptText - 置換対象のプロンプトテキスト
 * @param values - 変数名と値のマッピング
 * @returns 変数が置換されたテキスト
 *
 * @remarks
 * - 値が見つからない変数はプレースホルダーのまま残されます
 * - 大文字小文字を区別します
 *
 * @example
 * ```typescript
 * const template = "Generate a {{language}} function that {{description}}";
 * const values = {
 *   language: "TypeScript",
 *   description: "validates email addresses"
 * };
 *
 * substituteVariables(template, values)
 * // => "Generate a TypeScript function that validates email addresses"
 *
 * // 値が見つからない場合
 * substituteVariables("Hello {{name}}", {})
 * // => "Hello {{name}}" (プレースホルダーが残る)
 * ```
 */
export function substituteVariables(promptText: string, values: Record<string, string>): string {
  return promptText.replace(VARIABLE_PATTERN, (match, varName: string) => {
    // 値が存在する場合は置換、存在しない場合は元のプレースホルダーを保持
    return values[varName] ?? match;
  });
}

/**
 * プロンプトテキストに未定義の変数が含まれているかチェックします
 *
 * @param promptText - チェック対象のプロンプトテキスト
 * @param values - 変数名と値のマッピング
 * @returns 未定義の変数名の配列
 *
 * @example
 * ```typescript
 * const template = "Hello {{name}}, you are {{age}} years old";
 * const values = { name: "Alice" };
 *
 * getUndefinedVariables(template, values)
 * // => ["age"]
 * ```
 */
export function getUndefinedVariables(
  promptText: string,
  values: Record<string, string>
): string[] {
  const allVariables = extractVariables(promptText);
  return allVariables.filter((varName) => !(varName in values));
}

/**
 * プロンプトテキストの変数が完全に定義されているかチェックします
 *
 * @param promptText - チェック対象のプロンプトテキスト
 * @param values - 変数名と値のマッピング
 * @returns すべての変数が定義されている場合true
 *
 * @example
 * ```typescript
 * const template = "Hello {{name}}";
 *
 * isFullyDefined(template, { name: "Alice" })
 * // => true
 *
 * isFullyDefined(template, {})
 * // => false
 * ```
 */
export function isFullyDefined(promptText: string, values: Record<string, string>): boolean {
  return getUndefinedVariables(promptText, values).length === 0;
}
