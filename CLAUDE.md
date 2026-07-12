# cc-wf-studio Development Guidelines

Core conventions live here; topic-specific rules are in `.claude/rules/`
(loaded automatically): `schema-driven-panels.md`, `translation.md`,
`dialog-design.md`, `webview-patterns.md`. Reference material that is not a
rule lives in `docs/` (e.g. `docs/architecture.md` for the main data-flow
sequence diagrams, `docs/release-flow.md`).

## Language

- GitHub Issues and Pull Requests (titles, bodies, and comments) MUST be written in English.
- This applies regardless of the conversation language used with Claude.

## Project Structure

pnpm monorepo. Four packages under `packages/`:

```text
packages/
  core/      # @cc-wf-studio/core  — shared types, validators, Mermaid/Markdown generators, schema (no fs/UI/network)
  mcp/       # @cc-wf-studio/mcp   — MCP server toolkit + ccwf-mcp stdio bin
  cli/       # @cc-wf-studio/cli   — ccwf CLI (render/validate/export/run/preview/canvas/mcp), bundles the webview
  vscode/    # cc-wf-studio        — VSCode extension (canvas, Slack share, in-canvas AI editing)
    src/
    src/webview/   # cc-wf-studio-webview — React webview UI (bundled into the extension + cli)
    resources/     # workflow-schema.{json,toon} synced from core at build time
```

### Schema Files — two systems, two purposes

1. **AI-authoring guide**: `packages/core/resources/workflow-schema.json` —
   hand-tuned prose/JSON that instructs AI agents generating workflows
   (see the workflow-schema-tuning skill). It is **NOT generated from code**.
   - `workflow-schema.toon` is auto-generated from the `.json` at build time
     (`generate:toon`). **Do not edit it manually.**
   - `packages/vscode/resources/workflow-schema.{json,toon}` are synced from
     core during the extension build (`sync:schema`) — do not edit there either.
2. **UI/validation SSoT**: zod-based node property schemas in
   `packages/core/src/schema/nodes/` — drive the property panels, export
   warnings, and workflow validation. See `.claude/rules/schema-driven-panels.md`.

Cross-reference rule: when you add a node field to a zod schema that AI agents
should also author, update `workflow-schema.json` as well (and vice versa).

## Development Workflow & Commands

### Commit Message Guidelines

**IMPORTANT: Keep commit messages simple for squash merge workflow.**

#### Format
```
<type>: <subject>

<optional body with bullet points>
```

#### Example
```
fix: add missing MCP node definition to workflow schema

- Added 'mcp' to supportedNodeTypes
- Added complete MCP node type definition with field constraints
- Fixes MCP_INVALID_PARAMETERS and MCP_INVALID_MODE validation errors
```

#### Rules
- **Subject**: 50 characters max, imperative mood, no period
- **Body**: 3-5 bullet points max, "what" changed only
- **Details**: Put "why" and "how" in PR description, NOT commit message

#### Types
- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)
- `improvement:` - Minor enhancement to existing feature (patch version bump)
- `docs:` - Documentation only
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

#### What to Avoid
❌ Long explanations (Problem/Solution/Impact sections)
❌ Multiple paragraphs
❌ Code blocks
❌ Test results with checkboxes

✅ Simple 3-5 line summary of changes

### Code Quality Checks (Required Before Commit/PR)

**This is a pnpm monorepo — use `pnpm`, not `npm`. Always run these from the repo root after code modifications:**

```bash
pnpm check   # pnpm -r run check across all packages (Biome lint+format on vscode, tsc on others)
pnpm build   # pnpm -r run build across all packages (verify compilation)
```

To target a single package, filter: `pnpm -F @cc-wf-studio/cli run check` / `pnpm -F cc-wf-studio run build`.

### Command Execution Timing

#### During Development
1. **After code modification**:
   ```bash
   pnpm check
   ```
   - Runs lint + format (vscode) and type-checks every package

2. **Before manual E2E testing**:
   ```bash
   pnpm build
   ```
   - Compiles all packages; required for testing the extension / CLI

3. **Before git commit**:
   ```bash
   pnpm check
   ```
   - Ensures all code quality standards are met
   - Prevents committing code with linting/formatting issues

#### Testing
- **Unit/Integration tests**: Not required (manual E2E testing only)
- **Manual E2E testing**: Required for all feature changes and bug fixes
  - Run `pnpm build` first
  - Test in VSCode Extension Development Host

## Version Update & Release Procedure

**IMPORTANT: Versioning is driven by [Changesets](https://github.com/changesets/changesets). A release is cut manually (you open the Release PR) and publishes automatically when that PR merges into `main`. Do NOT hand-edit `version` fields in `package.json`.**

> **Releasing is a human-only action — AI agents must not self-trigger it.** Do not run the "Release — Create Release PR" workflow, do not merge the Release PR into `main`, and do not dispatch publish workflows. Merging the Release PR is an irreversible npm publish. Agents may prepare changes (incl. changesets) and explain the procedure, but a human performs the actual release.

### The four published artifacts

This is a pnpm monorepo with independently versioned packages:

| Package | Published to | Tag format |
|---|---|---|
| `@cc-wf-studio/core` | npm | `@cc-wf-studio/core@x.y.z` |
| `@cc-wf-studio/mcp` | npm | `@cc-wf-studio/mcp@x.y.z` |
| `@cc-wf-studio/cli` | npm | `@cc-wf-studio/cli@x.y.z` |
| `cc-wf-studio` (VSCode extension) | GitHub Release (VSIX attachment) | `cc-wf-studio@x.y.z` |

`cc-wf-studio-webview` is in the Changesets `ignore` list — it is bundled into `@cc-wf-studio/cli` and the extension at build time, never published on its own.

### Per-PR step: add a changeset

When a change should be released, add a changeset describing it:

```bash
pnpm changeset
# interactive: select which package(s) to bump, choose patch/minor/major,
# write a one-line summary (this becomes the CHANGELOG entry)
```

This writes a `.changeset/<slug>.md` file — commit it alongside your code. **You never hand-edit `CHANGELOG.md`; Changesets generates it.** If a PR genuinely needs no release (CI/docs-only tooling), run `pnpm changeset add --empty`.

`updateInternalDependencies: "patch"` is set, so bumping `@cc-wf-studio/core` automatically bumps `cli` / `mcp` (patch) and updates their dependency ranges — no need to author separate changesets for the dependents.

### Release flow (manual Release PR → auto publish on merge)

```
1. feature PR + .changeset/*.md  →  merge to main   (just accumulates; no release)
2. when ready, run "Release — Create Release PR" (Actions, manual dispatch)
   → opens / updates the "Version Packages" PR — a preview of the bumps + CHANGELOG
3. review + merge the "Version Packages" PR into main
   → the merge push triggers "Release — Publish" automatically:
     publishes every pending npm package, creates tags, and if cc-wf-studio
     was bumped, builds + uploads the VSIX to its GitHub Release
4. Repository Owner uploads the VSIX from the GitHub Release to the stores (manual)
```

Confirm = release: because the version bump and publish happen on `main` back-to-back, a version never sits "confirmed but unpublished", so version numbers don't skip. Let changesets accumulate and cut a release only when ready.

- **`.github/workflows/release-version-pr.yml`** — trigger: **`workflow_dispatch`** (manual). Runs `changesets/action` *version step only* — opens / updates the Release PR. No publish. Intentionally manual so "cut a release" is deliberate.
- **`.github/workflows/release.yml`** — trigger: **push to `main`** (+ `workflow_dispatch` fallback). A `check` job skips ordinary feature merges (pending changesets present); on a release push (none pending) the `publish` job runs `changesets/action` *publish step* (`pnpm changeset publish`), then detects the `cc-wf-studio@*` tag and uploads the VSIX.
- `production` is **frozen / legacy** — not part of the flow; do not promote to it. (Past tags/Releases are unaffected — tags are independent of branches.)

### npm authentication: OIDC Trusted Publishing

npm publishes use **OIDC Trusted Publishing** — there is no `NPM_TOKEN` secret. Each of `@cc-wf-studio/{core,mcp,cli}` has a Trusted Publisher configured on npmjs.com pointing at `breaking-brake/cc-wf-studio` → `release.yml`. The trusted publisher is bound to the workflow **file name** (not its trigger), so keep the publish logic in `release.yml`. The publish workflow sets `NPM_CONFIG_PROVENANCE: 'true'`, so each release carries a provenance attestation.

### VS Marketplace / Open VSX publishing (manual, by the Repository Owner)

The publish workflow does **not** push the extension to the Marketplace. It only **builds the `.vsix` and attaches it to the `cc-wf-studio@x.y.z` GitHub Release**. The actual store publish is a manual step performed by the Repository Owner:

1. The "Release — Publish" workflow uploads `packages/vscode/*.vsix` to the GitHub Release for that version.
2. The Repository Owner downloads that `.vsix` from the GitHub Release.
3. The Repository Owner uploads it manually to the VS Marketplace (and Open VSX) via the publisher portal.

So the `.vsix` on the GitHub Release is the source artifact for the store listing — there is no `vsce publish` / `ovsx publish` in CI.

### If you must set a version by hand (rare)

Prefer `pnpm changeset` always. Only edit a `packages/*/package.json` `version` field directly when bootstrapping or fixing a broken state, and expect the next Changesets release to take over from there.

## AI Editing Features

### MCP Server-based AI Editing (Active)
- The built-in MCP server (`cc-workflow-ai-editor` skill) is the primary interface for external AI agents to create and edit workflows.
- All new AI editing development should go through the MCP server approach.
- The interaction sequence is documented in `docs/architecture.md`.

### Chat UI-based AI Editing (Discontinued)
- The chat UI-based AI editing features (Refinement Chat Panel, AI Workflow Generation Dialog) are **no longer under active development**.
- Existing functionality will be maintained but no new features or enhancements will be added.
- Affected features:
  - `001-ai-workflow-generation`: AI Workflow Generation via AiGenerationDialog
  - `001-ai-workflow-refinement`: AI Workflow Refinement via RefinementChatPanel
  - `001-ai-skill-generation`: AI Skill Node Generation via AiGenerationDialog
