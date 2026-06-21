---
name: code-review
description: Use when reviewing a PR or a diff in this repo, or when asked to do a code review here. Focus on the team's recurring quality standards, particularly around UI/UX, data integrity, and documentation.
---

Ensure pull requests adhere to team-specific quality standards and conventions.

## Checklist
- **UI/UX & Accessibility:**
  - Use semantic HTML elements (e.g., `<button>` instead of `<div role="button">`) for interactive controls. If a non-semantic element must be used, verify it fully implements accessibility features (e.g., keyboard activation for Enter/Space keys).
  - Avoid hijacking common system or browser keyboard shortcuts (e.g., `Ctrl/Alt/Meta/Shift + Arrow` keys).
- **Data Integrity & Persistence:**
  - Verify that data is correctly preserved and not silently dropped across serialization, deserialization, and round-trip operations (e.g., fetching, editing, and reapplying data through different system components).
- **Robust UI State Management:**
  - Check for mechanisms to handle stale or invalid UI states or selections, especially when underlying data or available options change. Ensure proper fallback or invalidation to prevent unexpected behavior.
- **Documentation Quality & Consistency:**
  - Enforce consistent casing for proper nouns and brand names (e.g., `GitHub` not `GITHUB`).
  - Ensure Markdown files follow linting rules, including correct fenced code block language identifiers and proper spacing within code spans.
- **Naming & Branding Consistency:**
  - Confirm that all code, comments, and documentation reflect current product names and branding, and update outdated references.
