# Internationalization Keys Plan - MCP Node Natural Language Mode

**Feature**: MCP Node Natural Language Mode
**Branch**: `001-mcp-natural-language-mode`
**Phase**: 1 - Setup
**Task**: T003

## Overview

This document defines the new internationalization keys required for the Natural Language Mode feature. All keys must be added to 5 language files:
- `src/webview/src/i18n/translations/en.ts`
- `src/webview/src/i18n/translations/ja.ts`
- `src/webview/src/i18n/translations/ko.ts`
- `src/webview/src/i18n/translations/zh-CN.ts`
- `src/webview/src/i18n/translations/zh-TW.ts`

## Existing Structure

**Type Definition**: `src/webview/src/i18n/translation-keys.ts`
```typescript
export interface WebviewTranslationKeys {
  // Existing keys...
  'toolbar.save': string;
  'node.prompt.title': string;
  // ... etc
}
```

**Translation Files**: `src/webview/src/i18n/translations/*.ts`
```typescript
import type { WebviewTranslationKeys } from '../translation-keys';

export const enWebviewTranslations: WebviewTranslationKeys = {
  'toolbar.save': 'Save',
  'node.prompt.title': 'Prompt',
  // ... etc
};
```

---

## New Translation Keys

### 1. Mode Selection Dialog

#### Type Definition Extension

```typescript
export interface WebviewTranslationKeys {
  // ... existing keys

  // MCP Mode Selection
  'mcp.modeSelection.title': string;
  'mcp.modeSelection.description': string;
  'mcp.modeSelection.detailed.title': string;
  'mcp.modeSelection.detailed.description': string;
  'mcp.modeSelection.naturalLanguageParam.title': string;
  'mcp.modeSelection.naturalLanguageParam.description': string;
  'mcp.modeSelection.fullNaturalLanguage.title': string;
  'mcp.modeSelection.fullNaturalLanguage.description': string;
}
```

#### English Translations (en.ts)

```typescript
'mcp.modeSelection.title': 'Select Configuration Mode',
'mcp.modeSelection.description': 'Choose how you want to configure this MCP node',
'mcp.modeSelection.detailed.title': 'Detailed Mode',
'mcp.modeSelection.detailed.description': 'Configure server, tool, and all parameters explicitly. High reproducibility, best for technical users.',
'mcp.modeSelection.naturalLanguageParam.title': 'Natural Language Parameter Mode',
'mcp.modeSelection.naturalLanguageParam.description': 'Select server and tool, describe parameters in natural language. Balanced approach.',
'mcp.modeSelection.fullNaturalLanguage.title': 'Full Natural Language Mode',
'mcp.modeSelection.fullNaturalLanguage.description': 'Select server only, describe entire task in natural language. Simplest, lowest reproducibility.',
```

#### Japanese Translations (ja.ts)

```typescript
'mcp.modeSelection.title': '設定モードを選択',
'mcp.modeSelection.description': 'このMCPノードをどのように設定するか選択してください',
'mcp.modeSelection.detailed.title': '詳細モード',
'mcp.modeSelection.detailed.description': 'サーバー、ツール、すべてのパラメータを明示的に設定します。再現性が高く、技術的なユーザーに最適です。',
'mcp.modeSelection.naturalLanguageParam.title': '自然言語パラメータモード',
'mcp.modeSelection.naturalLanguageParam.description': 'サーバーとツールを選択し、パラメータを自然言語で記述します。バランスの取れたアプローチです。',
'mcp.modeSelection.fullNaturalLanguage.title': '完全自然言語モード',
'mcp.modeSelection.fullNaturalLanguage.description': 'サーバーのみを選択し、タスク全体を自然言語で記述します。最も簡単で、再現性は最も低いです。',
```

#### Korean Translations (ko.ts)

```typescript
'mcp.modeSelection.title': '구성 모드 선택',
'mcp.modeSelection.description': '이 MCP 노드를 구성할 방법을 선택하세요',
'mcp.modeSelection.detailed.title': '상세 모드',
'mcp.modeSelection.detailed.description': '서버, 도구 및 모든 매개변수를 명시적으로 구성합니다. 재현성이 높고 기술 사용자에게 적합합니다.',
'mcp.modeSelection.naturalLanguageParam.title': '자연어 매개변수 모드',
'mcp.modeSelection.naturalLanguageParam.description': '서버와 도구를 선택하고 매개변수를 자연어로 설명합니다. 균형 잡힌 접근 방식입니다.',
'mcp.modeSelection.fullNaturalLanguage.title': '완전 자연어 모드',
'mcp.modeSelection.fullNaturalLanguage.description': '서버만 선택하고 전체 작업을 자연어로 설명합니다. 가장 간단하지만 재현성이 가장 낮습니다.',
```

#### Simplified Chinese Translations (zh-CN.ts)

```typescript
'mcp.modeSelection.title': '选择配置模式',
'mcp.modeSelection.description': '选择如何配置此 MCP 节点',
'mcp.modeSelection.detailed.title': '详细模式',
'mcp.modeSelection.detailed.description': '明确配置服务器、工具和所有参数。高可重复性，最适合技术用户。',
'mcp.modeSelection.naturalLanguageParam.title': '自然语言参数模式',
'mcp.modeSelection.naturalLanguageParam.description': '选择服务器和工具，用自然语言描述参数。平衡的方法。',
'mcp.modeSelection.fullNaturalLanguage.title': '完全自然语言模式',
'mcp.modeSelection.fullNaturalLanguage.description': '仅选择服务器，用自然语言描述整个任务。最简单，可重复性最低。',
```

#### Traditional Chinese Translations (zh-TW.ts)

```typescript
'mcp.modeSelection.title': '選擇配置模式',
'mcp.modeSelection.description': '選擇如何配置此 MCP 節點',
'mcp.modeSelection.detailed.title': '詳細模式',
'mcp.modeSelection.detailed.description': '明確配置伺服器、工具和所有參數。高可重複性，最適合技術使用者。',
'mcp.modeSelection.naturalLanguageParam.title': '自然語言參數模式',
'mcp.modeSelection.naturalLanguageParam.description': '選擇伺服器和工具，用自然語言描述參數。平衡的方法。',
'mcp.modeSelection.fullNaturalLanguage.title': '完全自然語言模式',
'mcp.modeSelection.fullNaturalLanguage.description': '僅選擇伺服器，用自然語言描述整個任務。最簡單，可重複性最低。',
```

---

### 2. Natural Language Input Fields

#### Type Definition Extension

```typescript
export interface WebviewTranslationKeys {
  // ... existing keys

  // Natural Language Input
  'mcp.naturalLanguage.parameterLabel': string;
  'mcp.naturalLanguage.parameterPlaceholder': string;
  'mcp.naturalLanguage.taskLabel': string;
  'mcp.naturalLanguage.taskPlaceholder': string;
  'mcp.naturalLanguage.helpText': string;
}
```

#### Translations

| Key | en | ja | ko | zh-CN | zh-TW |
|-----|----|----|----| ------|-------|
| `mcp.naturalLanguage.parameterLabel` | "Describe what you want" | "何をしたいか記述" | "원하는 것을 설명하세요" | "描述您想要什么" | "描述您想要什麼" |
| `mcp.naturalLanguage.parameterPlaceholder` | "e.g., List all S3 buckets in us-east-1 region" | "例: us-east-1リージョンのすべてのS3バケットを一覧表示" | "예: us-east-1 리전의 모든 S3 버킷 나열" | "例如：列出 us-east-1 区域中的所有 S3 存储桶" | "例如：列出 us-east-1 區域中的所有 S3 儲存桶" |
| `mcp.naturalLanguage.taskLabel` | "Describe the task" | "タスクを記述" | "작업 설명" | "描述任务" | "描述任務" |
| `mcp.naturalLanguage.taskPlaceholder` | "e.g., Find documentation about S3 bucket policies" | "例: S3バケットポリシーに関するドキュメントを検索" | "예: S3 버킷 정책에 대한 문서 찾기" | "例如：查找有关 S3 存储桶策略的文档" | "例如：查找有關 S3 儲存桶策略的文件" |
| `mcp.naturalLanguage.helpText` | "Be specific about what you want to accomplish. Minimum {min} characters." | "達成したいことを具体的に記述してください。最小 {min} 文字。" | "수행하려는 작업을 구체적으로 설명하세요. 최소 {min}자." | "请详细描述您想要完成的任务。最少 {min} 个字符。" | "請詳細描述您想要完成的任務。最少 {min} 個字符。" |

---

### 3. Mode Switch Warning Dialog

#### Type Definition Extension

```typescript
export interface WebviewTranslationKeys {
  // ... existing keys

  // Mode Switch Warning
  'mcp.modeSwitch.warning.title': string;
  'mcp.modeSwitch.warning.message': string;
  'mcp.modeSwitch.warning.dataPreserved': string;
  'mcp.modeSwitch.warning.canRevert': string;
  'mcp.modeSwitch.continueButton': string;
  'mcp.modeSwitch.cancelButton': string;
}
```

#### Translations

| Key | en | ja | ko | zh-CN | zh-TW |
|-----|----|----|----| ------|-------|
| `mcp.modeSwitch.warning.title` | "⚠️ Mode Switch Warning" | "⚠️ モード切り替え警告" | "⚠️ 모드 전환 경고" | "⚠️ 模式切换警告" | "⚠️ 模式切換警告" |
| `mcp.modeSwitch.warning.message` | "Switching from {from} to {to} will change how this node is configured." | "{from}から{to}へ切り替えると、このノードの設定方法が変更されます。" | "{from}에서 {to}(으)로 전환하면 이 노드의 구성 방식이 변경됩니다." | "从 {from} 切换到 {to} 将改变此节点的配置方式。" | "從 {from} 切換到 {to} 將改變此節點的配置方式。" |
| `mcp.modeSwitch.warning.dataPreserved` | "Your current configuration will be preserved but may not be visible in the new mode." | "現在の設定は保存されますが、新しいモードでは表示されない可能性があります。" | "현재 구성은 보존되지만 새 모드에서는 표시되지 않을 수 있습니다." | "您当前的配置将被保留，但在新模式下可能不可见。" | "您當前的配置將被保留，但在新模式下可能不可見。" |
| `mcp.modeSwitch.warning.canRevert` | "You can switch back to {from} at any time to restore the previous configuration." | "いつでも{from}に戻して、以前の設定を復元できます。" | "언제든지 {from}(으)로 다시 전환하여 이전 구성을 복원할 수 있습니다." | "您可以随时切换回 {from} 以恢复之前的配置。" | "您可以隨時切換回 {from} 以恢復之前的配置。" |
| `mcp.modeSwitch.continueButton` | "Continue" | "続行" | "계속" | "继续" | "繼續" |
| `mcp.modeSwitch.cancelButton` | "Cancel" | "キャンセル" | "취소" | "取消" | "取消" |

---

### 4. Validation Error Messages

#### Type Definition Extension

```typescript
export interface WebviewTranslationKeys {
  // ... existing keys

  // MCP Validation Errors
  'mcp.error.nlDescTooShort': string;
  'mcp.error.nlDescEmpty': string;
  'mcp.error.invalidMode': string;
  'mcp.error.modeConfigMismatch': string;
  'mcp.error.noToolsAvailable': string;
  'mcp.error.toolListStale': string;
}
```

#### English Translations (en.ts)

```typescript
'mcp.error.nlDescTooShort': 'Natural language description is too short ({length} characters). Please provide at least {min} characters to help Claude Code understand your intent.',
'mcp.error.nlDescEmpty': 'Natural language description cannot be empty. Please describe what you want to accomplish.',
'mcp.error.invalidMode': 'Invalid configuration mode. Please select Detailed, Natural Language Parameter, or Full Natural Language mode.',
'mcp.error.modeConfigMismatch': 'Configuration data does not match the selected mode. Please reconfigure the node.',
'mcp.error.noToolsAvailable': 'No tools available from the selected MCP server. Cannot configure Full Natural Language mode.',
'mcp.error.toolListStale': 'Tool list may be outdated (captured {days} days ago). Server may have new tools.',
```

#### Japanese Translations (ja.ts)

```typescript
'mcp.error.nlDescTooShort': '自然言語の説明が短すぎます（{length}文字）。Claude Codeがあなたの意図を理解できるよう、少なくとも{min}文字を入力してください。',
'mcp.error.nlDescEmpty': '自然言語の説明は空にできません。達成したいことを記述してください。',
'mcp.error.invalidMode': '無効な設定モードです。詳細モード、自然言語パラメータモード、または完全自然言語モードを選択してください。',
'mcp.error.modeConfigMismatch': '設定データが選択されたモードと一致しません。ノードを再設定してください。',
'mcp.error.noToolsAvailable': '選択されたMCPサーバーから利用可能なツールがありません。完全自然言語モードを設定できません。',
'mcp.error.toolListStale': 'ツールリストが古い可能性があります（{days}日前に取得）。サーバーに新しいツールが追加されている可能性があります。',
```

#### Korean Translations (ko.ts)

```typescript
'mcp.error.nlDescTooShort': '자연어 설명이 너무 짧습니다({length}자). Claude Code가 귀하의 의도를 이해할 수 있도록 최소 {min}자를 입력하세요.',
'mcp.error.nlDescEmpty': '자연어 설명은 비워 둘 수 없습니다. 수행하려는 작업을 설명하세요.',
'mcp.error.invalidMode': '유효하지 않은 구성 모드입니다. 상세 모드, 자연어 매개변수 모드 또는 완전 자연어 모드를 선택하세요.',
'mcp.error.modeConfigMismatch': '구성 데이터가 선택한 모드와 일치하지 않습니다. 노드를 다시 구성하세요.',
'mcp.error.noToolsAvailable': '선택한 MCP 서버에서 사용 가능한 도구가 없습니다. 완전 자연어 모드를 구성할 수 없습니다.',
'mcp.error.toolListStale': '도구 목록이 오래되었을 수 있습니다({days}일 전에 캡처됨). 서버에 새 도구가 있을 수 있습니다.',
```

#### Simplified Chinese Translations (zh-CN.ts)

```typescript
'mcp.error.nlDescTooShort': '自然语言描述太短（{length} 个字符）。请至少提供 {min} 个字符以帮助 Claude Code 理解您的意图。',
'mcp.error.nlDescEmpty': '自然语言描述不能为空。请描述您想要完成的任务。',
'mcp.error.invalidMode': '配置模式无效。请选择详细模式、自然语言参数模式或完全自然语言模式。',
'mcp.error.modeConfigMismatch': '配置数据与选定模式不匹配。请重新配置节点。',
'mcp.error.noToolsAvailable': '所选 MCP 服务器没有可用工具。无法配置完全自然语言模式。',
'mcp.error.toolListStale': '工具列表可能已过时（{days} 天前捕获）。服务器可能有新工具。',
```

#### Traditional Chinese Translations (zh-TW.ts)

```typescript
'mcp.error.nlDescTooShort': '自然語言描述太短（{length} 個字符）。請至少提供 {min} 個字符以幫助 Claude Code 理解您的意圖。',
'mcp.error.nlDescEmpty': '自然語言描述不能為空。請描述您想要完成的任務。',
'mcp.error.invalidMode': '配置模式無效。請選擇詳細模式、自然語言參數模式或完全自然語言模式。',
'mcp.error.modeConfigMismatch': '配置數據與選定模式不匹配。請重新配置節點。',
'mcp.error.noToolsAvailable': '所選 MCP 伺服器沒有可用工具。無法配置完全自然語言模式。',
'mcp.error.toolListStale': '工具清單可能已過時（{days} 天前捕獲）。伺服器可能有新工具。',
```

---

### 5. Mode Indicator Badges

#### Type Definition Extension

```typescript
export interface WebviewTranslationKeys {
  // ... existing keys

  // Mode Indicator Tooltips
  'mcp.mode.detailed.tooltip': string;
  'mcp.mode.naturalLanguageParam.tooltip': string;
  'mcp.mode.fullNaturalLanguage.tooltip': string;
}
```

#### Translations

| Key | en | ja | ko | zh-CN | zh-TW |
|-----|----|----|----| ------|-------|
| `mcp.mode.detailed.tooltip` | "Detailed Mode: Explicitly configured parameters" | "詳細モード: 明示的に設定されたパラメータ" | "상세 모드: 명시적으로 구성된 매개변수" | "详细模式：显式配置的参数" | "詳細模式：顯式配置的參數" |
| `mcp.mode.naturalLanguageParam.tooltip` | "Natural Language Parameter Mode: {description}" | "自然言語パラメータモード: {description}" | "자연어 매개변수 모드: {description}" | "自然语言参数模式：{description}" | "自然語言參數模式：{description}" |
| `mcp.mode.fullNaturalLanguage.tooltip` | "Full Natural Language Mode: {taskDescription}" | "完全自然言語モード: {taskDescription}" | "완전 자연어 모드: {taskDescription}" | "完全自然语言模式：{taskDescription}" | "完全自然語言模式：{taskDescription}" |

---

## Implementation Notes

### Variable Interpolation

Some translation strings contain variables in `{variable}` format:
- `{length}` - Current description length
- `{min}` - Minimum required length
- `{from}` - Current mode name
- `{to}` - Target mode name
- `{days}` - Number of days
- `{description}` - Natural language description
- `{taskDescription}` - Task description

These must be replaced at runtime using the i18n service's interpolation function.

### Mode Name Mapping

For mode switch warnings, use mode titles from `mcp.modeSelection.*.title` keys:

```typescript
const modeNames = {
  detailed: t('mcp.modeSelection.detailed.title'),
  naturalLanguageParam: t('mcp.modeSelection.naturalLanguageParam.title'),
  fullNaturalLanguage: t('mcp.modeSelection.fullNaturalLanguage.title'),
};

const message = t('mcp.modeSwitch.warning.message', {
  from: modeNames[currentMode],
  to: modeNames[targetMode],
});
```

---

## File Modification Summary

**Files to be modified in Phase 2 (Task T011)**:

1. `src/webview/src/i18n/translation-keys.ts` - Add ~30 new key definitions
2. `src/webview/src/i18n/translations/en.ts` - Add ~30 English translations
3. `src/webview/src/i18n/translations/ja.ts` - Add ~30 Japanese translations
4. `src/webview/src/i18n/translations/ko.ts` - Add ~30 Korean translations
5. `src/webview/src/i18n/translations/zh-CN.ts` - Add ~30 Simplified Chinese translations
6. `src/webview/src/i18n/translations/zh-TW.ts` - Add ~30 Traditional Chinese translations

**Total New Keys**: ~30 keys × 5 languages = 150 translations

---

## Next Steps

**Phase 2 (Foundation)**: Implement all translations in Task T011
