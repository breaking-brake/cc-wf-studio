import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import type { SlashCommandOptions, Workflow } from '../types/workflow-definition.js';
import { connect, endNode, makeWorkflow, promptNode, startNode } from './__fixtures__/workflows.js';
import { generateSlashCommandFile, validateClaudeFileFormat } from './workflow-export.js';

/**
 * Suite S2 — the Claude Code slash-command export path (issue #1044).
 *
 * `generateSlashCommandFile` builds its entire YAML frontmatter by hand: six
 * conditional option lines plus a four-level hand-indented `hooks:` block. If
 * any of it is wrong the user sets a model, a tool allowlist, an argument hint
 * or a hook in the canvas, exports, and the emitted
 * `.claude/skills/{workflow}/SKILL.md` carries different values than the
 * canvas holds — or a frontmatter block Claude Code cannot parse at all, in
 * which case the whole skill silently never loads. Nothing on the user's
 * machine reports it; the divergence surfaces wherever the agent is later run.
 *
 * The property under test is deliberately not "the generator emits these
 * lines". Asserting the output as string literals would reduce this suite to a
 * second copy of the generator, and it would pass on every defect below. What
 * is checked instead relates two independent representations of the same fact:
 *
 *   > The emitted frontmatter must parse as YAML, and parsing it must yield
 *   > back the `SlashCommandOptions` object the workflow declared.
 *
 * Input object on one side, parsed YAML tree on the other — an inspection
 * rather than a transcription (the distinction in
 * `docs/quality/03-assurance-map.md` §2). `yaml@2` is the parser, added to
 * this package's devDependencies for exactly this purpose; it is ESM-native
 * and needs no separate `@types` package.
 *
 * Section C pins two defects that are live today, filed as **bug #1047**:
 * `argument-hint` and `allowed-tools` are interpolated raw, so common — and in
 * the `argument-hint` case, *documented* — values produce a document that does
 * not parse. Those cases are written to pass against the current behaviour and
 * named `CURRENT BEHAVIOUR (bug #1047)`, per the #1018 / #1031 / #1039
 * precedent, so the suite stays green now and goes red the moment the feature
 * loop fixes it.
 */

/** A workflow with just enough shape for the generator's body to render. */
function workflowWith(
  slashCommandOptions?: SlashCommandOptions,
  overrides: Partial<Workflow> = {}
): Workflow {
  return makeWorkflow(
    [startNode('start-1'), promptNode('prompt-1', 'Do the thing'), endNode('end-1')],
    [connect('start-1', 'prompt-1'), connect('prompt-1', 'end-1')],
    { slashCommandOptions, ...overrides }
  );
}

/**
 * Pull the frontmatter body out of a generated file using the same fence
 * pattern `validateClaudeFileFormat` uses (`workflow-export.ts:272`), so the
 * suite and the shipped validator agree on where the block ends.
 */
function frontmatterOf(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error(`generated file has no YAML frontmatter:\n${content.slice(0, 200)}`);
  }
  return match[1];
}

/** Generate, extract, and parse — the happy path used by most cases. */
function parsedFrontmatter(
  slashCommandOptions?: SlashCommandOptions,
  overrides: Partial<Workflow> = {}
): Record<string, unknown> {
  const raw = frontmatterOf(generateSlashCommandFile(workflowWith(slashCommandOptions, overrides)));
  return YAML.parse(raw) as Record<string, unknown>;
}

/** Same, but reports whether the block parses at all rather than throwing. */
function frontmatterParses(slashCommandOptions?: SlashCommandOptions): boolean {
  const raw = frontmatterOf(generateSlashCommandFile(workflowWith(slashCommandOptions)));
  try {
    YAML.parse(raw);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// A. Conditional emission — presence AND absence
// ---------------------------------------------------------------------------

describe('generateSlashCommandFile — conditional frontmatter keys', () => {
  it('emits only description when the workflow declares no options', () => {
    // The absence half matters as much as the presence half: a regression that
    // spreads every option unconditionally satisfies a presence-only check.
    expect(parsedFrontmatter(undefined)).toEqual({ description: 'Sample Workflow' });
  });

  it("omits model and context when they hold the 'default' sentinel", () => {
    // `default` means "say nothing", not "a model named default". Emitting the
    // line tells Claude Code to look for a model literally called `default`.
    expect(parsedFrontmatter({ model: 'default', context: 'default' })).toEqual({
      description: 'Sample Workflow',
    });
  });

  it('emits model and context when they hold real values', () => {
    expect(parsedFrontmatter({ model: 'opus', context: 'fork' })).toEqual({
      description: 'Sample Workflow',
      model: 'opus',
      context: 'fork',
    });
  });

  it('renames the camelCase option fields to their kebab-case frontmatter keys', () => {
    // This rename is the entire contract with the consumer and is stated
    // nowhere but in this function, so it is worth pinning key by key.
    const parsed = parsedFrontmatter({
      allowedTools: 'Bash(git diff:*), Read',
      disableModelInvocation: true,
      argumentHint: 'add [tagId] | remove [tagId] | list',
    });

    expect(parsed).toEqual({
      description: 'Sample Workflow',
      'allowed-tools': 'Bash(git diff:*), Read',
      'disable-model-invocation': true,
      'argument-hint': 'add [tagId] | remove [tagId] | list',
    });
    // Guard the rename explicitly — `toEqual` above would also pass if both
    // spellings were emitted.
    expect(parsed).not.toHaveProperty('allowedTools');
    expect(parsed).not.toHaveProperty('argumentHint');
    expect(parsed).not.toHaveProperty('disableModelInvocation');
  });

  it('omits disable-model-invocation entirely when it is false', () => {
    // The guard is a truthiness check, not a presence check: `false` must not
    // round-trip as `disable-model-invocation: false`.
    expect(parsedFrontmatter({ disableModelInvocation: false })).toEqual({
      description: 'Sample Workflow',
    });
  });

  it('falls back to the workflow name when it has no description', () => {
    expect(parsedFrontmatter(undefined, { name: 'My Flow', description: undefined })).toEqual({
      description: 'My Flow',
    });
  });
});

// ---------------------------------------------------------------------------
// B. The hooks block — assert the parsed tree, never the indentation
// ---------------------------------------------------------------------------

describe('generateSlashCommandFile — the hooks block', () => {
  it('round-trips an entry with a matcher and a once-only action', () => {
    // Four hand-written indentation levels (2/4/6/8 spaces) stand between the
    // input object and this assertion; a regression in any of them fails here.
    const hooks = {
      PreToolUse: [
        { matcher: 'Bash', hooks: [{ type: 'command' as const, command: 'echo hi', once: true }] },
      ],
    };
    expect(parsedFrontmatter({ hooks }).hooks).toEqual(hooks);
  });

  it('round-trips an entry with no matcher', () => {
    // The matcher-less shape is a separate branch (`- hooks:` rather than
    // `- matcher: …` + `hooks:`) and only one branch runs per fixture.
    const hooks = { Stop: [{ hooks: [{ type: 'command' as const, command: 'echo bye' }] }] };
    expect(parsedFrontmatter({ hooks }).hooks).toEqual(hooks);
  });

  it('round-trips two hook types declared on one workflow', () => {
    const hooks = {
      PreToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command' as const, command: 'fmt' }] }],
      Stop: [{ hooks: [{ type: 'command' as const, command: 'done' }] }],
    };
    expect(parsedFrontmatter({ hooks }).hooks).toEqual(hooks);
  });

  it('omits once when it is false', () => {
    const hooks = {
      Stop: [{ hooks: [{ type: 'command' as const, command: 'echo bye', once: false }] }],
    };
    expect(parsedFrontmatter({ hooks }).hooks).toEqual({
      Stop: [{ hooks: [{ type: 'command', command: 'echo bye' }] }],
    });
  });

  it('emits no hooks key at all for an empty hooks object', () => {
    expect(parsedFrontmatter({ hooks: {} })).toEqual({ description: 'Sample Workflow' });
  });

  it('CURRENT BEHAVIOUR: a hook type with no entries emits a bare, null-valued hooks key', () => {
    // The outer guard counts keys and the inner guard counts entries, so
    // `{ PreToolUse: [] }` slips between them and emits a lone `hooks:` line.
    //
    // No bug filed, per #1044: this is unreachable from the canvas.
    // `removeHookEntry` (`workflow-store.ts:556-563`) deletes the hook type
    // when its last entry goes and drops `hooks` entirely when the last type
    // goes, so only a hand-edited or AI-authored file can reach this shape.
    // Pinned as observed rather than asserted as correct.
    expect(parsedFrontmatter({ hooks: { PreToolUse: [] } })).toEqual({
      description: 'Sample Workflow',
      hooks: null,
    });
  });
});

// ---------------------------------------------------------------------------
// C. Escaping — what survives, and what is broken today
// ---------------------------------------------------------------------------

describe('generateSlashCommandFile — escaping of user-typed values', () => {
  it('quotes a description containing a colon so it parses back unchanged', () => {
    expect(parsedFrontmatter(undefined, { description: 'Deploy: staging and prod' })).toEqual({
      description: 'Deploy: staging and prod',
    });
  });

  it('round-trips hook matchers and commands containing quotes and dollar signs', () => {
    // Both go through `escapeYamlString(x, true)`, so they are always quoted.
    const hooks = {
      PreToolUse: [
        {
          matcher: 'Bash("x")',
          hooks: [{ type: 'command' as const, command: 'echo "$USER" | tee -a $LOG' }],
        },
      ],
    };
    expect(parsedFrontmatter({ hooks }).hooks).toEqual(hooks);
  });

  it.each([
    ['*', 'the match-everything matcher the type doc comment names'],
    ['Bash: git commit', 'a colon-space, which would open a nested mapping'],
    ['[Edit]', 'a leading bracket, which would open a flow sequence'],
  ])(
    'round-trips the matcher %j — %s',
    (matcher) => {
      // These are the matchers that make the `alwaysQuote` argument at
      // `workflow-export.ts:222` load-bearing rather than decorative: each one
      // is a YAML control construct as a plain scalar (`*` is an alias
      // indicator and does not even parse). A regression that drops the
      // escaping there passes the case above but fails here.
      const hooks = {
        PreToolUse: [{ matcher, hooks: [{ type: 'command' as const, command: 'echo hi' }] }],
      };
      expect(parsedFrontmatter({ hooks }).hooks).toEqual(hooks);
    }
  );

  it('round-trips a command that YAML would otherwise read as a mapping', () => {
    // Same point for the command line (`workflow-export.ts:229`): a colon
    // followed by a space is the one shape a plain scalar cannot carry.
    const hooks = {
      Stop: [{ hooks: [{ type: 'command' as const, command: 'git log --format=fmt: %s' }] }],
    };
    expect(parsedFrontmatter({ hooks }).hooks).toEqual(hooks);
  });

  it.each([
    ['[file] [mode] | [alt]', 'the format the type doc comment prescribes'],
    ['[arg1] [arg2]', 'two bracketed arguments'],
  ])(
    'CURRENT BEHAVIOUR (bug #1047): argumentHint %j makes the frontmatter unparseable — %s',
    (argumentHint) => {
      // `argument-hint` is interpolated raw (`workflow-export.ts:211`) while
      // `description` two lines above goes through `escapeYamlString`. A
      // leading `[` opens a YAML flow sequence that never closes.
      //
      // The damage is not confined to the hint: the frontmatter is one block,
      // so the whole SKILL.md fails to load. And the first value here is the
      // format `workflow-definition.ts:69` documents, so a user following the
      // doc comment exactly produces a broken export.
      //
      // Asserted as *does not parse*. When #1047 is fixed this goes red;
      // replace it with a round-trip assertion at that point.
      expect(frontmatterParses({ argumentHint })).toBe(false);
    }
  );

  it('CURRENT BEHAVIOUR (bug #1047): a single bracketed argumentHint parses as a list, not a string', () => {
    // The quieter half of the same defect: this one parses, so nothing errors,
    // but the consumer reads a one-element array where a string was declared.
    expect(parsedFrontmatter({ argumentHint: '[message]' })).toEqual({
      description: 'Sample Workflow',
      'argument-hint': ['message'],
    });
  });

  it('argumentHint starting with a word survives — by luck, not by escaping', () => {
    // Kept alongside the failing cases so the fix for #1047 is visibly a
    // widening of what works, not a change in behaviour here.
    expect(parsedFrontmatter({ argumentHint: 'add [tagId] | remove [tagId] | list' })).toEqual({
      description: 'Sample Workflow',
      'argument-hint': 'add [tagId] | remove [tagId] | list',
    });
  });

  it('CURRENT BEHAVIOUR (bug #1047): allowedTools containing a colon-space makes the frontmatter unparseable', () => {
    // Same root cause at `workflow-export.ts:195`. `Bash(git diff:*), Read`
    // survives only because there is no space after its colon.
    expect(frontmatterParses({ allowedTools: 'Bash: git diff' })).toBe(false);
    expect(frontmatterParses({ allowedTools: 'Bash(git diff:*), Read' })).toBe(true);
  });

  it('CURRENT BEHAVIOUR: a newline in the description is stripped, joining the words', () => {
    // `escapeYamlString` removes `\n` rather than escaping it
    // (`workflow-export.ts:54`), so the two lines run together with no
    // separator. Same family as the already-filed #1009 — recorded here rather
    // than filed again.
    expect(parsedFrontmatter(undefined, { description: 'Line one\nLine two' })).toEqual({
      description: 'Line oneLine two',
    });
  });
});

// ---------------------------------------------------------------------------
// D. Agreement with the validator the extension actually runs
// ---------------------------------------------------------------------------

describe('generateSlashCommandFile — validateClaudeFileFormat agreement', () => {
  it('accepts every well-formed generated file', () => {
    // `validateClaudeFileFormat` is a second, independently maintained
    // statement of this contract, and it is live: the extension calls it on
    // every file before writing (`export-workflow.ts:109,254`).
    const cases: (SlashCommandOptions | undefined)[] = [
      undefined,
      { model: 'opus', context: 'fork' },
      { allowedTools: 'Bash(git diff:*), Read', disableModelInvocation: true },
      {
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo hi' }] }],
          Stop: [{ hooks: [{ type: 'command', command: 'done' }] }],
        },
      },
    ];

    for (const options of cases) {
      const content = generateSlashCommandFile(workflowWith(options));
      expect(() =>
        validateClaudeFileFormat(content, 'slashCommand')
      ).not.toThrow();
    }
  });

  it('CURRENT BEHAVIOUR (bug #1047): the validator passes files that no YAML parser can read', () => {
    // This is why the defect ships silently. The gate checks the `---` fences
    // and greps for `description:`; it never parses the block, so the export
    // succeeds and the file is written. Pinned so the gap is visible in the
    // suite rather than only in the issue.
    const broken: SlashCommandOptions = { argumentHint: '[file] [mode] | [alt]' };
    const content = generateSlashCommandFile(workflowWith(broken));

    expect(frontmatterParses(broken)).toBe(false);
    expect(() => validateClaudeFileFormat(content, 'slashCommand')).not.toThrow();
  });
});
