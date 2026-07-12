---
name: code-review
description: WHEN reviewing a Pull Request (PR) or a code diff within this repository, or WHEN assigned a code review, THEN systematically verify adherence to team standards, consulting relevant `.claude/rules` documents.
---

## Workflow
Perform the following checks when reviewing a PR in this repository:

1.  **Consult `.claude/rules`:**
    *   Always check for new or updated documents in `.claude/rules/` that might be relevant to the PR's scope. These files (`.claude/rules/*.md`) codify the latest team standards.
    *   Familiarize yourself with their content before or during the review.

2.  **Verify UI/Webview Standards:**
    *   **Dialogs:** Refer to `.claude/rules/dialog-design.md` for guidelines on Radix UI, z-index hierarchy, and basic functionality (ESC key, overlay click).
    *   **Schema-Driven Property Panels:** Refer to `.claude/rules/schema-driven-panels.md` for implementation details (zod-based schemas), adding fields, FieldMeta scope, and type drift guards (`AssertAssignable`).
    *   **Internationalization (i18n):** Refer to `.claude/rules/translation.md` for guidance on hardcoded strings and dynamic keys.
    *   **External Links:** Refer to `.claude/rules/webview-patterns.md` for correct implementation using `openExternalUrl` and accessibility requirements.
    *   **General Accessibility:** Ensure decorative icons have `aria-hidden="true"` where appropriate (e.g., in `ValidationStatusValue.tsx`).

3.  **Verify Core/Backend Logic & Patterns:**
    *   **Error Handling (MCP):** Verify `EADDRINUSE` errors lead to an automatic retry on port 0 with a user-facing toast notification.
    *   **Zod Schema Constraints:** Do not propose redundant zod refinements if higher-level validation already enforces a constraint (e.g., single default branch for Switch node is enforced in `validate-workflow.ts`).
    *   **TypeScript Typing:** Prefer `Record<string, unknown>` over `Partial<unknown>` for object-like parameters where precise type representation is beneficial for data contracts (e.g., `updateNodeData` parameters).
    *   **Technical Debt/Pre-existing Behavior:** If an issue is identified as pre-existing (i.e., copied verbatim from legacy code and not a regression of the current PR), ensure it is explicitly acknowledged and tracked in a separate issue or deferred, rather than blocking the current PR.

## Checklist
- [ ] Have I checked for and reviewed relevant `.claude/rules` changes?
- [ ] Have I verified UI/Webview changes against `dialog-design.md`, `schema-driven-panels.md`, `translation.md`, and `webview-patterns.md`?
- [ ] Have I checked for correct MCP error handling and appropriate Zod/TypeScript usage?
- [ ] Have I identified and properly handled any pre-existing technical debt or behavior?
