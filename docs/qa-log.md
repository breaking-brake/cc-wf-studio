# QA Log

Append-only memory of the quality-assurance loop (`next-qa`). One entry per
iteration, newest first. Kept separate from `docs/progress-log.md` on
purpose: the QA and feature tracks are promoted to `main` independently, so
sharing a log file would make every promotion conflict.

Entry format:

```markdown
## YYYY-MM-DD — <short task title>
- **Protects**: <one sentence — "if this breaks, a user would hit X">
- **Issue/PR**: #NN / #MM
- **Outcome**: done | abandoned (<why>) | blocked (<on what>)
- **Bugs filed**: <#NN, or none — issues opened for failures this test found>
```

---

## 2026-07-25 — S0: vitest foundation and the CI test gate
- **Protects**: nothing on its own — it is the gate every other suite needs.
  Until this landed, CI proved only that the code compiled, so a behavioral
  regression could merge unopposed on `auto-dev` and `auto-qa`.
- **Issue/PR**: #993 / PR from `claude/qa-vitest-foundation`
- **Outcome**: done — `vitest.config.ts` + the `vitest` devDependency added to
  `core`, `cli`, and `mcp`; every `test` script (including the webview's) set
  to `vitest run --passWithNoTests` so an empty suite doesn't fail the run;
  `pnpm test` added to `ci.yml` after `pnpm check`.
  Also wired the **pre-existing MCP smoke test** into CI — it was a real
  behavioral check that no workflow ever executed, so connecting it was the
  cheapest assurance available.
  Verified the gate actually bites: breaking an assertion by hand makes the
  run exit 1.
- **Bugs filed**: none
- **Note for the next iteration**: the first test
  (`packages/core/src/services/workflow-export.test.ts`, covering
  `nodeNameToFileName`) exists to prove the wiring, not to cover S2. It is
  deliberately checked against the naming rule written in
  `packages/vscode/specs/001-cc-wf-studio/spec.md`, not against the
  implementation — per `docs/quality/03-assurance-map.md`, a test read off
  the code it tests is a transcription, not a check.

## 2026-07-25 — Bootstrap the quality-assurance track
- **Protects**: nothing yet — this is the machinery that will.
- **Issue/PR**: (this bootstrap PR)
- **Outcome**: done — `auto-qa` integration branch, `next-qa` skill,
  CI trigger for `auto-qa`, testing-policy change in `CLAUDE.md` and
  `IMPLEMENTATION_PLAN.md`, and a seeded `qa` backlog.
- **Bugs filed**: none
