/**
 * Suite S2 — the Skill node's `SKILL.md` writer and reader (issue #1060).
 *
 * Two pure modules form the whole of the Skill node's file contract, and
 * before this suite neither had a single test reference anywhere in the repo:
 *
 * - `generateSkillFileContent` (`skill-file-generator.ts:50`) builds the file
 *   the extension writes. Its only caller is `skill-service.ts:598`, whose
 *   very next statement writes `content` to disk (`:601`) — there is no
 *   validation step on this path.
 * - `parseSkillFrontmatter` (`yaml-parser.ts:43`) reads every `SKILL.md` the
 *   Skill Browser lists, from four call sites (`skill-service.ts:69`, `:313`,
 *   `:370`, `:542`).
 *
 * What breaks for a user if either regresses:
 *
 * - **Write** — the extension reports success and the file lands on disk, but
 *   Claude Code **silently never loads the skill** because the frontmatter it
 *   parses (with a real YAML parser) is invalid. Nothing on the user's machine
 *   reports this; the failure surfaces wherever the agent later runs.
 * - **Read** — a skill the user already has on disk **disappears from the
 *   Skill Browser** and can no longer be attached to a Skill node: a `null`
 *   return makes the caller drop that skill from the list
 *   (`skill-service.ts:69-71`, `:313-315`) with no error shown anywhere.
 *
 * `docs/quality/02-feature-map.md:128` rates this feature **A** with exactly
 * these failure modes.
 *
 * Section C is the load-bearing part. Asserting "the generator emits these
 * lines" would only transcribe the generator and would pass on every defect in
 * section D; what is asserted instead is that **what the reader reads back
 * equals the payload that was written** — payload object on one side, parsed
 * object on the other. Same shape as section F of `agent-frontmatter.test.ts`
 * (#1030).
 *
 * Section D pins behaviour **as it is today** rather than as it should be,
 * following the #1018 / #1031 / #1047 / #1058 precedent: each case is named
 * `CURRENT BEHAVIOUR (bug #1061)` and asserts what the code currently does.
 * These are pins, not skips — a skipped case would leave the most likely real
 * failure uncovered while the feature loop decides, whereas a pin goes red the
 * moment the fix lands. Whoever fixes #1061 should update the named cases
 * rather than work around them.
 *
 * The section-D cases assert with **`yaml@2`, not only with
 * `parseSkillFrontmatter`**. The in-house parser is regex-based and will
 * happily read a block that no real YAML parser accepts — which is exactly how
 * #1047 shipped — so checking the emitted block against the in-house reader
 * alone would report success on precisely the inputs that fail for the user.
 */

import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import type { CreateSkillPayload } from '../../shared/types/messages';
import { generateSkillFileContent } from './skill-file-generator';
import { parseSkillFrontmatter } from './yaml-parser';

/** A payload with only the fields the dialog always fills in. */
function payload(overrides: Partial<CreateSkillPayload> = {}): CreateSkillPayload {
  return {
    name: 'test-generator',
    description: 'Generates unit tests',
    instructions: '# Test Generator\n\nGenerates tests...',
    scope: 'project',
    ...overrides,
  };
}

/**
 * The frontmatter block as a real YAML parser sees it — the same slice
 * `parseSkillFrontmatter` extracts, but handed to `yaml@2` instead of to a
 * regex. Returns the parse error rather than throwing so a case can assert on
 * it.
 */
function parseBlockAsYaml(
  content: string
): { ok: true; value: unknown } | { ok: false; error: string } {
  const block = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (block === undefined) {
    return { ok: false, error: 'no frontmatter block' };
  }
  try {
    return { ok: true, value: YAML.parse(block) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// A. generateSkillFileContent — the shape written to disk
// ---------------------------------------------------------------------------
describe('generateSkillFileContent', () => {
  it('emits the three-line frontmatter, a blank line, then the instructions', () => {
    const content = generateSkillFileContent(
      payload({ name: 'my-skill', description: 'Does something useful', instructions: 'Body text' })
    );

    // Asserted whole rather than line-by-line: the blank separator line and
    // the absence of a trailing newline are both part of what lands on disk.
    expect(content).toBe(
      ['---', 'name: my-skill', 'description: Does something useful', '---', '', 'Body text'].join(
        '\n'
      )
    );
  });

  it('emits allowed-tools, trimmed, when the field carries a value', () => {
    const content = generateSkillFileContent(payload({ allowedTools: '  Read, Grep, Glob  ' }));

    expect(content).toContain('\nallowed-tools: Read, Grep, Glob\n');
    // Positioned after description and before the closing fence.
    expect(content.split('\n').slice(0, 5)).toEqual([
      '---',
      'name: test-generator',
      'description: Generates unit tests',
      'allowed-tools: Read, Grep, Glob',
      '---',
    ]);
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace only', '   '],
  ])('omits allowed-tools entirely when the field is %s', (_label, allowedTools) => {
    const content = generateSkillFileContent(payload({ allowedTools }));

    // The `.trim().length > 0` guard at :58 — an empty key would otherwise
    // reach the file, and a skill with a blank allowed-tools list is not the
    // same as a skill with no restriction at all.
    expect(content).not.toContain('allowed-tools');
  });

  it('preserves the instructions byte-for-byte', () => {
    // A leading heading, internal blank lines and a trailing newline are all
    // things a user types into the instructions textarea.
    const instructions = '# Heading\n\nParagraph one.\n\n- item\n\n';
    const content = generateSkillFileContent(payload({ instructions }));

    expect(content.endsWith(`\n\n${instructions}`)).toBe(true);
    expect(content.slice(content.indexOf('---\n\n') + '---\n\n'.length)).toBe(instructions);
  });
});

// ---------------------------------------------------------------------------
// B. parseSkillFrontmatter — what the Skill Browser reads back
// ---------------------------------------------------------------------------
describe('parseSkillFrontmatter', () => {
  /** The canonical well-formed file, reused verbatim by the CRLF case. */
  const WELL_FORMED = [
    '---',
    'name: my-skill',
    'description: Does something useful',
    'allowed-tools: Read, Write',
    '---',
    '',
    '# Instructions',
  ].join('\n');

  it('returns every field, renaming allowed-tools to allowedTools', () => {
    // The rename is the contract between the file format and every caller.
    expect(parseSkillFrontmatter(WELL_FORMED)).toEqual({
      name: 'my-skill',
      description: 'Does something useful',
      allowedTools: 'Read, Write',
    });
  });

  it('trims values but keeps a value containing ": " whole', () => {
    const parsed = parseSkillFrontmatter(
      '---\nname:   my-skill  \ndescription:   Deploy: staging then prod   \n---\nbody'
    );

    expect(parsed).toEqual({ name: 'my-skill', description: 'Deploy: staging then prod' });
  });

  it('parses a CRLF file identically to the same file with LF endings', () => {
    // Contrast with bug #1031: `parseAgentFrontmatter`, the sibling parser in
    // this product, reads a CRLF file as no frontmatter at all. The two
    // parsers disagree and this one is the correct half — a skill authored on
    // Windows still shows up in the Skill Browser. Pinned so a "cleanup" of
    // this regex does not quietly adopt the broken behaviour.
    const crlf = WELL_FORMED.replace(/\n/g, '\r\n');

    expect(parseSkillFrontmatter(crlf)).toEqual(parseSkillFrontmatter(WELL_FORMED));
    expect(parseSkillFrontmatter(crlf)).not.toBeNull();
  });

  it.each([
    ['there is no frontmatter at all', '# Just markdown\n\nNo fence here.'],
    ['the closing fence is missing', '---\nname: my-skill\ndescription: Does something\n'],
    [
      'a blank line precedes the opening fence',
      '\n---\nname: my-skill\ndescription: Does something\n---\n',
    ],
  ])('returns null when %s', (_label, content) => {
    expect(parseSkillFrontmatter(content)).toBeNull();
  });

  it('returns null when description is missing, even if name is present', () => {
    // description is the only required field (:63-65). Every caller drops the
    // skill from the list on null, so this is the line between "listed" and
    // "silently invisible".
    expect(parseSkillFrontmatter('---\nname: my-skill\n---\nbody')).toBeNull();
  });

  it('returns an empty name rather than null when name is missing', () => {
    // Callers fall back to the directory name (`skill-service.ts:75`, `:316`),
    // which only works because this is '' and not null.
    expect(parseSkillFrontmatter('---\ndescription: Does something\n---\nbody')).toEqual({
      name: '',
      description: 'Does something',
      allowedTools: undefined,
    });
  });

  it('does not extend the block to a later --- in the body', () => {
    const content = [
      '---',
      'name: my-skill',
      'description: real description',
      '---',
      '',
      'Body prose.',
      '',
      '---',
      'description: injected',
      '---',
    ].join('\n');

    // The non-greedy `*?` stops at the first closing fence, so a horizontal
    // rule in the instructions cannot redefine the skill's metadata.
    expect(parseSkillFrontmatter(content)?.description).toBe('real description');
  });
});

// ---------------------------------------------------------------------------
// C. Round trip — what was written is what comes back
// ---------------------------------------------------------------------------
describe('round trip: generate then parse', () => {
  it('returns the same three fields the payload declared', () => {
    const written = payload({
      name: 'deploy-helper',
      description: 'Helps deploy the app',
      allowedTools: 'Read, Bash',
    });

    expect(parseSkillFrontmatter(generateSkillFileContent(written))).toEqual({
      name: written.name,
      description: written.description,
      allowedTools: written.allowedTools,
    });
  });

  it('returns allowedTools as undefined when the payload omitted it', () => {
    const written = payload({ name: 'no-tools', description: 'No tool restriction' });

    expect(parseSkillFrontmatter(generateSkillFileContent(written))).toEqual({
      name: written.name,
      description: written.description,
      allowedTools: undefined,
    });
  });

  it('emits a block a real YAML parser accepts, for an ordinary payload', () => {
    const written = payload({ description: 'Generates unit tests', allowedTools: 'Read, Grep' });

    expect(parseBlockAsYaml(generateSkillFileContent(written))).toEqual({
      ok: true,
      value: {
        name: written.name,
        description: written.description,
        'allowed-tools': written.allowedTools,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// D. CURRENT BEHAVIOUR — the generator interpolates user text unescaped
//
// `generateSkillFileContent` builds frontmatter by raw interpolation (`:53`,
// `:54`, `:59`) while `escapeYamlString` — exported from `@cc-wf-studio/core`,
// which this package already depends on — sits unused. This is the fourth site
// of the family behind #1009, #1047 and #1058, filed for the feature track as
// bug #1061.
//
// Live exposure, not hypothetical: `description` is a <textarea>
// (`SkillCreationDialog.tsx:270`), so a newline is one keypress, and
// `allowedTools` is a free-text <input> (`:394`).
// ---------------------------------------------------------------------------
describe('CURRENT BEHAVIOUR: unescaped interpolation (bug #1061)', () => {
  it('CURRENT BEHAVIOUR (bug #1061): a ": " in the description emits invalid YAML', () => {
    const content = generateSkillFileContent(payload({ description: 'Deploy: staging then prod' }));
    const asYaml = parseBlockAsYaml(content);

    // The in-house reader is happy, so the Skill Browser shows the skill and
    // the user sees nothing wrong...
    expect(parseSkillFrontmatter(content)?.description).toBe('Deploy: staging then prod');
    // ...but the file Claude Code actually loads does not parse.
    expect(asYaml.ok).toBe(false);
    expect(asYaml.ok === false && asYaml.error).toContain('Nested mappings are not allowed');
  });

  it('CURRENT BEHAVIOUR (bug #1061): a ": " in allowedTools emits invalid YAML', () => {
    const content = generateSkillFileContent(payload({ allowedTools: 'Bash: git diff' }));
    const asYaml = parseBlockAsYaml(content);

    expect(parseSkillFrontmatter(content)?.allowedTools).toBe('Bash: git diff');
    expect(asYaml.ok).toBe(false);
    expect(asYaml.ok === false && asYaml.error).toContain('Nested mappings are not allowed');
  });

  it('CURRENT BEHAVIOUR (bug #1061): a newline in the description injects an allowed-tools field', () => {
    const written = payload({ description: 'line one\nallowed-tools: Bash' });
    const parsed = parseSkillFrontmatter(generateSkillFileContent(written));

    // Stated against what the payload declared, so the case describes the
    // defect rather than its symptom: the skill was created with no tool
    // restriction and comes back carrying one.
    expect(written.allowedTools).toBeUndefined();
    expect(parsed?.allowedTools).toBe('Bash');
  });

  it('CURRENT BEHAVIOUR (bug #1061): a multi-line description loses every line after the first', () => {
    const written = payload({ description: 'line one\nline two' });
    const content = generateSkillFileContent(written);

    // The description shown in the Skill Browser is not the one the user
    // typed, and the block does not parse as YAML either.
    expect(parseSkillFrontmatter(content)?.description).toBe('line one');
    expect(parseBlockAsYaml(content).ok).toBe(false);
  });
});
