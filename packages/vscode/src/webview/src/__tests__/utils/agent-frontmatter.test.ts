/**
 * Suite S7 — the agent `.md` frontmatter parser behind sub-agent import
 * (issue #1030).
 *
 * `parseAgentFrontmatter` is the only thing that reads an existing
 * `.claude/agents/*.md` when the user picks it from the Sub-Agent creation
 * dialog. It runs twice per import, on the same content:
 *
 * - `SubAgentCreationDialog.tsx:125` prefills the form — `frontmatter.description`
 *   into the description field, **`body` into `agentDefinition`**, and
 *   `.model` / `.tools` / `.memory` into their fields.
 * - `NodePalette.tsx:207` (`handleSelectCommand`) builds the node itself:
 *   `model: (frontmatter.model as SubAgentModel) || 'sonnet'`,
 *   `tools: frontmatter.tools`, `memory: frontmatter.memory as ...`.
 *
 * Both casts are unchecked and both fall back on a falsy value, so a parse
 * that returns nothing does not fail loudly — it silently produces a `sonnet`
 * agent with no tools. That is what these tests protect: if this breaks, the
 * node that lands on the canvas carries the wrong model, the wrong tools, and
 * an `agentDefinition` that still has the raw `---` block inside it, so every
 * artifact generated from that workflow describes a different agent than the
 * file the user chose. `docs/quality/02-feature-map.md:126` rates the feature
 * **A** with exactly this failure mode.
 *
 * Two groups of assertions pin behaviour **as it is** rather than as it
 * arguably should be, following the #1018 / #1025 precedent:
 *
 * - **CRLF** (section E) — a `\r\n` file parses as nothing at all. Filed as
 *   issue #1031 for the feature track. Not skipped: the code does today what
 *   the case says it does, and skipping it would leave the most likely real
 *   failure uncovered while the feature loop decides.
 * - **Unescaped generator interpolation** (section F) — `generateSubAgentFile`
 *   builds `description:` by raw interpolation, so a description containing a
 *   newline injects frontmatter lines and does not survive the round trip.
 *   Same family as the already-filed #1009; recorded in `docs/qa-log.md`
 *   rather than filed a second time.
 *
 * Whoever fixes either should update the named cases rather than work around
 * them.
 */

import { generateSubAgentFile, type SubAgentNode } from '@cc-wf-studio/core';
import { describe, expect, it } from 'vitest';
import { parseAgentFrontmatter } from '../../utils/agent-frontmatter';

/** The canonical well-formed agent file, reused by the CRLF case verbatim. */
const WELL_FORMED = `---
name: code-reviewer
description: Reviews code for correctness
model: opus
tools: Read, Grep, Glob
---
You are a senior code reviewer.

Run git diff first.`;

describe('parseAgentFrontmatter', () => {
  // -------------------------------------------------------------------------
  // A. Well-formed frontmatter
  // -------------------------------------------------------------------------
  describe('well-formed frontmatter', () => {
    it('parses every key and returns the body after the closing fence', () => {
      const { frontmatter, body } = parseAgentFrontmatter(WELL_FORMED);

      // Asserted whole, not key-by-key: a line leaking out of a nested block
      // into the top level is a real failure mode here (see section B).
      expect(frontmatter).toEqual({
        name: 'code-reviewer',
        description: 'Reviews code for correctness',
        model: 'opus',
        tools: 'Read, Grep, Glob',
      });
      expect(body).toBe('You are a senior code reviewer.\n\nRun git diff first.');
    });

    it('accepts a hyphenated key', () => {
      const { frontmatter } = parseAgentFrontmatter('---\nname: x\nallowed-tools: Read\n---\nbody');

      expect(frontmatter).toEqual({ name: 'x', 'allowed-tools': 'Read' });
    });

    it('keeps a value containing a colon whole', () => {
      // The split is on the first colon only, and "Deploy: staging" is
      // ordinary phrasing for a description.
      const { frontmatter } = parseAgentFrontmatter('---\ndescription: Deploy: staging\n---\nb');

      expect(frontmatter.description).toBe('Deploy: staging');
    });

    it('lets the last occurrence of a duplicate key win', () => {
      const { frontmatter } = parseAgentFrontmatter('---\nname: a\nname: b\n---\nb');

      expect(frontmatter).toEqual({ name: 'b' });
    });

    it("yields '' for an empty value, not undefined", () => {
      // Load-bearing: both call sites use `|| 'sonnet'` / `|| ''` fallbacks, so
      // '' and undefined take the same branch *today*. A change here changes
      // which branch runs.
      const { frontmatter } = parseAgentFrontmatter('---\nname: x\ndescription:\n---\nb');

      expect(frontmatter).toEqual({ name: 'x', description: '' });
    });
  });

  // -------------------------------------------------------------------------
  // B. Complex nested structures are skipped
  //
  // The code comment claims it skips "complex nested structures like
  // hooks/mcpServers". That claim holds only because indented lines fail the
  // `^(\w...)` anchor — so these cases assert the claim, not the mechanism.
  // -------------------------------------------------------------------------
  describe('nested structures', () => {
    it('skips a nested hooks block without leaking its inner keys', () => {
      const { frontmatter } = parseAgentFrontmatter(
        '---\nname: x\nhooks:\n  PreToolUse:\n    - matcher: Bash\n      command: echo hi\nmodel: opus\n---\nb'
      );

      // Whole-object assertion: PreToolUse / matcher / command reaching the top
      // level would mean a nested config silently became agent metadata.
      expect(frontmatter).toEqual({ name: 'x', hooks: '', model: 'opus' });
    });

    it('skips a list-valued tools block', () => {
      const { frontmatter } = parseAgentFrontmatter(
        '---\nname: x\ntools:\n  - Read\n  - Grep\n---\nb'
      );

      // Downstream this is benign: `generateSubAgentFile` guards on
      // `data.tools && data.tools.length > 0`, so '' drops the field rather
      // than emitting an empty one.
      expect(frontmatter).toEqual({ name: 'x', tools: '' });
    });
  });

  // -------------------------------------------------------------------------
  // C. Content that does not match
  // -------------------------------------------------------------------------
  describe('content without parseable frontmatter', () => {
    it('returns the content verbatim and untrimmed when there is no frontmatter', () => {
      const content = '  just a body\nwith lines  ';
      const { frontmatter, body } = parseAgentFrontmatter(content);

      // The no-match branch returns `content` directly while the match branch
      // trims — the trimmed half is pinned by the body-handling case below.
      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });

    it('does not match when a blank line precedes the opening fence', () => {
      const content = '\n---\nname: x\n---\nb';
      const { frontmatter, body } = parseAgentFrontmatter(content);

      expect(frontmatter).toEqual({});
      expect(body).toBe(content);
    });

    it('matches a closing fence with no trailing newline, leaving an empty body', () => {
      const { frontmatter, body } = parseAgentFrontmatter('---\nname: x\n---');

      expect(frontmatter).toEqual({ name: 'x' });
      expect(body).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // D. The non-greedy fence
  // -------------------------------------------------------------------------
  it('ends the frontmatter at the first closing fence, keeping a later horizontal rule in the body', () => {
    const { frontmatter, body } = parseAgentFrontmatter(
      '---\nname: x\n---\nintro\n\n---\n\nafter the rule'
    );

    // A greedy fence would swallow the document down to the last `---`, so the
    // agent definition would lose everything above it.
    expect(frontmatter).toEqual({ name: 'x' });
    expect(body).toBe('intro\n\n---\n\nafter the rule');
  });

  // -------------------------------------------------------------------------
  // E. CRLF — pinned as observed, tracked by issue #1031
  // -------------------------------------------------------------------------
  it('CURRENT BEHAVIOUR (bug #1031): a CRLF file parses as no frontmatter at all', () => {
    const crlf = WELL_FORMED.replace(/\n/g, '\r\n');

    const { frontmatter, body } = parseAgentFrontmatter(crlf);

    // The pattern hardcodes `\n` around both fences, so a CRLF file misses
    // entirely. Downstream: `model` falls back to 'sonnet' whatever the file
    // said, `tools` and `memory` are dropped, and `agentDefinition` becomes the
    // whole file including the raw fences. Reachable on Windows via an editor's
    // default line endings or `core.autocrlf=true`, and the extension ships on
    // Windows.
    //
    // This asserts what the parser does today. When #1031 is fixed on
    // auto-dev, replace these expectations with the well-formed ones above.
    expect(frontmatter).toEqual({});
    expect(body).toBe(crlf);
    expect(body).toContain('---\r\n');
  });

  // -------------------------------------------------------------------------
  // F. Round-trip against the file the product itself writes
  //
  // `generateSubAgentFile` is what cc-wf-studio emits into `.claude/agents/`,
  // and `parseAgentFrontmatter` is what reads such a file back in. These two
  // modules are maintained independently, so this is a contract check rather
  // than a transcription of either one's implementation.
  // -------------------------------------------------------------------------
  describe('round trip with generateSubAgentFile', () => {
    function subAgentNode(data: Record<string, unknown>): SubAgentNode {
      return {
        id: 'agent-1',
        type: 'subAgent',
        name: 'Code Reviewer',
        position: { x: 0, y: 0 },
        data,
      } as unknown as SubAgentNode;
    }

    it('reads back every field of a file the product generated', () => {
      const file = generateSubAgentFile(
        subAgentNode({
          description: 'Reviews code for correctness',
          agentDefinition: 'You are a senior code reviewer.\n\nRun git diff first.',
          model: 'opus',
          tools: 'Read, Grep, Glob',
          memory: 'project',
        })
      );

      const { frontmatter, body } = parseAgentFrontmatter(file);

      expect(frontmatter).toEqual({
        name: 'code-reviewer',
        description: 'Reviews code for correctness',
        tools: 'Read, Grep, Glob',
        model: 'opus',
        memory: 'project',
      });
      expect(body).toBe('You are a senior code reviewer.\n\nRun git diff first.');
    });

    it('loses the leading whitespace of a description across the round trip', () => {
      const file = generateSubAgentFile(
        subAgentNode({
          description: '  leading space description',
          agentDefinition: 'body',
          model: 'sonnet',
        })
      );

      // Benign, and pinned so it stays visible: the generator interpolates the
      // raw value and the parser trims it back off.
      expect(parseAgentFrontmatter(file).frontmatter.description).toBe('leading space description');
    });

    it('CURRENT BEHAVIOUR (unescaped interpolation, cf. #1009): a newline in the description injects frontmatter lines', () => {
      const file = generateSubAgentFile(
        subAgentNode({
          description: 'line one\nmodel: haiku',
          agentDefinition: 'body',
          model: 'opus',
        })
      );

      // `generateSubAgentFile` writes `description: ${data.description || name}`
      // with no `escapeYamlString`, unlike the slash-command path in the same
      // file. The second line of the description therefore becomes its own
      // frontmatter entry, and the description does not survive intact.
      expect(file).toContain('description: line one\nmodel: haiku\n');

      const { frontmatter } = parseAgentFrontmatter(file);

      expect(frontmatter.description).toBe('line one');
      // The injected `model: haiku` is overridden only because the real
      // `model:` line follows it and last-occurrence wins.
      expect(frontmatter.model).toBe('opus');
    });

    it('survives a colon inside the description', () => {
      const file = generateSubAgentFile(
        subAgentNode({ description: 'Deploy: staging', agentDefinition: 'body', model: 'opus' })
      );

      expect(parseAgentFrontmatter(file).frontmatter.description).toBe('Deploy: staging');
    });
  });

  // -------------------------------------------------------------------------
  // G. Body handling
  // -------------------------------------------------------------------------
  it('trims the body on both ends when the frontmatter matched', () => {
    const { body } = parseAgentFrontmatter(
      '---\nname: x\n---\n   indented first line\n\ntrailing   '
    );

    // Pinned because the first line's indent is lost: a markdown body opening
    // with an indented code block would be affected, and nothing today says
    // whether that is intended.
    expect(body).toBe('indented first line\n\ntrailing');
  });
});
