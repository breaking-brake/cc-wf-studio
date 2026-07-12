---
paths:
  - "packages/vscode/src/webview/src/i18n/**"
  - "packages/core/src/schema/nodes/**"
---

# Translation Rules (webview i18n)

Rules for editing `packages/vscode/src/webview/src/i18n/translations/{en,ja,ko,zh-CN,zh-TW}.ts`.

## Do NOT translate (keep identical English text across ALL locales)

The following items are product terms and must stay in English in every translation file:

- **Node palette titles** — every `node.<type>.title` key (e.g. `node.prompt.title: 'Prompt'`, `node.codex.title: 'Codex Agent'`, `node.branchSession.title: 'Branch Session'`). Node type names are product terms; only `node.<type>.description` is translated.
- **Node type names inside default node labels** — `default.new<Type>` keys localize only the "New" prefix and keep the node type name in English (ja: `新しいPrompt`, ko: `새 Prompt`, zh-CN: `新Prompt`, zh-TW: `新Prompt`).
- **Product / agent names** — Claude Code, Copilot, Codex, Gemini, Cursor, Zoo Code, Antigravity, MCP, Skill, Sub-Agent, etc.
- **Slash commands and CLI commands** — `/branch`, `/resume`, `ccwf`, etc.
- **Technical identifiers** — file paths, JSON field names, node type strings (`branchSession`), URLs.

## Checklist when adding a new node type's i18n keys

1. `node.<type>.title`: same English string in all 5 files.
2. `node.<type>.description`: translated per locale.
3. `default.new<Type>`: localized prefix + English node type name, following the existing `default.newPrompt` pattern in each locale.
4. Dialog/property strings: translated per locale, but keep product terms and commands (see list above) untranslated.

## Schema-driven property panel keys (dynamic — resolved at runtime)

The schema-driven property panels (see `.claude/rules/schema-driven-panels.md`)
resolve several key families by string construction at runtime. **A plain grep
for the full key finds nothing — never delete these as "unused":**

- `<nodeType>.field.<fieldName>` (+ `.help`, `.placeholder`) — field labels,
  referenced as `labelKey`/`helpKey`/`placeholderKey` strings in
  `packages/core/src/schema/nodes/*-schema.ts` (i.e. outside the webview).
- `<labelKey>.option.<value>` — select/radio option labels. Resolved by
  convention: if the key exists it is shown, otherwise the raw value renders
  verbatim (product terms like model names stay English by omitting the key).
- `<labelKey>.item` / `<labelKey>.add` — objectArray editor row titles
  (`{number}` param) and add-button labels; the header uses `<labelKey>`
  itself with a `{count}` param.
- `<i18nNamespace>.section.<sectionKey>` (+ `.hint`) — CollapsibleSection
  titles, built from the panel config's `i18nNamespace`.

When adding a node field: add `<nodeType>.field.<name>` to
`translation-keys.ts` and all 5 locale files (copy existing translations when
the string already exists under a legacy key).

## Background

The node palette intentionally shows English node type names regardless of UI language (they match the canvas node headers, docs, and generated markdown). A translated palette title (e.g. `ブランチセッション`) is a bug, not a localization improvement — this happened once when the branchSession node was added.
