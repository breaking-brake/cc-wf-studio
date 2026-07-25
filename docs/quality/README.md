# Quality Assurance Design

A three-layer, top-down definition of what quality assurance must protect in
cc-wf-studio, and what it deliberately must not.

```text
[Layer 1] Product value   →  Why the product exists, what it promises
    ↓
[Layer 2] Features        →  Which features deliver that value
    ↓
[Layer 3] Assurance       →  What proves those features still work
```

Read them in order. Each layer is the input to the one below it: if layer 1
stays vague, the lower layers drift into "test whatever is easy to test".

| # | Document | Contents |
|---|---|---|
| 1 | [`01-product-value.md`](./01-product-value.md) | Four value pillars, the ground they stand on, and what the product is deliberately not |
| 2 | [`02-feature-map.md`](./02-feature-map.md) | The implemented features hung off each pillar, each judged A / B / C by whether its failure is noticeable and recoverable |
| 3 | [`03-assurance-map.md`](./03-assurance-map.md) | What currently protects the A-rated features, the test-suite design (S0–S7), the order of work, and the explicit list of what is not protected |

## The sorting principle

The axis running through all three layers is **not** importance. It is:

> **Can the user detect the failure, and can they recover from it?**

A failure that is noticed instantly and worked around (a tooltip in the wrong
language, an ugly layout) is left to manual E2E — a human catches it for
free. A failure that is silent and irreversible (a corrupted workflow file, a
validator that reports success without checking) is what the automated suite
exists for, because no review pass reliably catches it.

## The structure is a DAG, not a tree

Layer 1 → layer 2 is close to a tree: one feature usually hangs off one
pillar. **Layer 2 → layer 3 is many-to-many.** Test suites are organized by
implementation layer (core validators, core generators, MCP tools, webview
stores), not by user-facing feature, because organizing them by feature would
mean writing the same checks repeatedly.

So one suite protects features across several pillars, and one feature is
protected by the combined effect of several suites. For example the
schema-driven property panel is covered by **S1** (its schema layer) and
**S6** (the store write-back layer), with rendering left to manual E2E.
Watch for features that are only protected in combination — those are easy to
misread as covered when reading a table.

## Relationship to the automation

The quality track runs as a pair of autonomous loops (`next-qa-idea` and
`next-qa`) on the `auto-qa` branch — see
[`../task-automation.md`](../task-automation.md). Layer 3 feeds that track's
queue: its A-rated gaps become `qa` issues, and `docs/qa-log.md` records what
has landed.
