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

## 2026-07-25 — Bootstrap the quality-assurance track
- **Protects**: nothing yet — this is the machinery that will.
- **Issue/PR**: (this bootstrap PR)
- **Outcome**: done — `auto-qa` integration branch, `next-qa` skill,
  CI trigger for `auto-qa`, testing-policy change in `CLAUDE.md` and
  `IMPLEMENTATION_PLAN.md`, and a seeded `qa` backlog.
- **Bugs filed**: none
