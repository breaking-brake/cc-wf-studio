import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  type AgentSkillProvider,
  agentSkillFilePath,
  generateAgentSkillContent,
  planAgentSkillFiles,
} from './agent-skill-export.js';
import { escapeYamlString, nodeNameToFileName } from './workflow-export.js';
import {
  connect,
  endNode,
  makeWorkflow,
  promptNode,
  startNode,
  subAgentNode,
} from './__fixtures__/workflows.js';

/**
 * Suite S2, item 4 — internal consistency of the shared generator behind the
 * six non-Claude export targets.
 *
 * What can and cannot be checked here is worth stating, because it bounds the
 * suite. Whether Codex or Gemini actually *accept* the format we emit is not
 * verifiable from inside this repository: no independent specification of
 * their skill formats exists here, so the generator is the only statement of
 * the format and testing it against itself would be a transcription rather
 * than a check (see "The limit of S2" in `docs/quality/03-assurance-map.md`).
 *
 * What is verifiable is consistency between artifacts that are maintained
 * separately and must agree:
 *
 *   - one generator, six providers — all must produce a structurally sound
 *     document, and the per-provider differences must be the intended ones;
 *   - the output paths against the target table in the repository README,
 *     which is edited by hand and drifts;
 *   - the YAML frontmatter against `escapeYamlString`, the escaping the
 *     Claude Code export path in this same package already applies.
 */

const ALL_PROVIDERS: AgentSkillProvider[] = [
  'antigravity',
  'codex',
  'copilot',
  'cursor',
  'gemini',
  'roo-code',
];

/** A workflow with enough shape to exercise the planner's optional branches. */
function sampleWorkflow() {
  return makeWorkflow(
    [
      startNode('start-1'),
      subAgentNode('agent-1', 'Code Reviewer'),
      subAgentNode('agent-2', 'Test Runner'),
      promptNode('prompt-1', 'Summarize the findings'),
      endNode('end-1'),
    ],
    [
      connect('start-1', 'agent-1'),
      connect('agent-1', 'agent-2'),
      connect('agent-2', 'prompt-1'),
      connect('prompt-1', 'end-1'),
    ],
    { name: 'Release Review' }
  );
}

// ---------------------------------------------------------------------------
// Structure — identical across providers
// ---------------------------------------------------------------------------

describe('generateAgentSkillContent', () => {
  for (const provider of ALL_PROVIDERS) {
    describe(provider, () => {
      it('produces frontmatter followed by the diagram and the instructions', () => {
        // A SKILL.md missing any of these parts is not loadable as a skill:
        // without frontmatter the agent cannot index it, without the diagram
        // it cannot see the flow, without the instructions it cannot act.
        const content = generateAgentSkillContent(sampleWorkflow(), provider);
        const lines = content.split('\n');

        expect(lines[0]).toBe('---');
        const closing = lines.indexOf('---', 1);
        expect(closing).toBeGreaterThan(0);

        const frontmatter = lines.slice(1, closing);
        expect(frontmatter.some((l) => l.startsWith('name: '))).toBe(true);
        expect(frontmatter.some((l) => l.startsWith('description: '))).toBe(true);

        expect(content).toContain('# Release Review');
        expect(content).toContain('## Workflow Diagram');
        expect(content).toContain('```mermaid');
        expect(content).toContain('## Execution Instructions');
        expect(content).toContain('## Workflow Execution Guide');
      });

      it('names the skill after the workflow, matching its directory', () => {
        // The agent resolves a skill by the directory name; a `name:` that
        // disagrees with the path makes the skill unreferenceable.
        const workflow = sampleWorkflow();
        const content = generateAgentSkillContent(workflow, provider);
        const expected = nodeNameToFileName(workflow.name);
        expect(content).toContain(`name: ${expected}`);
        expect(agentSkillFilePath(workflow, provider)).toContain(`/${expected}/SKILL.md`);
      });
    });
  }

  it('uses the workflow description when one is set', () => {
    // The description is what the agent matches on when deciding whether to
    // load the skill; a wrong one means the skill never triggers.
    const content = generateAgentSkillContent(
      makeWorkflow([startNode('start-1')], [], {
        name: 'Release Review',
        metadata: { description: 'Review a release candidate end to end' },
      }),
      'codex'
    );
    expect(content).toContain('description: Review a release candidate end to end');
  });

  it('falls back to a description naming the workflow', () => {
    const content = generateAgentSkillContent(
      makeWorkflow([startNode('start-1')], [], { name: 'Release Review' }),
      'codex'
    );
    expect(content).toContain('description: Execute the "Release Review" workflow.');
  });

  it('carries the provider-specific execution vocabulary', () => {
    // The one intended difference between providers: the tool the agent is
    // told to call. Naming Codex's tool in a Gemini export sends the agent
    // after a tool it does not have.
    expect(generateAgentSkillContent(sampleWorkflow(), 'codex')).toContain('spawn_agent');
    expect(generateAgentSkillContent(sampleWorkflow(), 'gemini')).toContain('ask_user');
    expect(generateAgentSkillContent(sampleWorkflow(), 'roo-code')).toContain(
      'ask_followup_question'
    );
    expect(generateAgentSkillContent(sampleWorkflow(), 'copilot')).toContain('task/agent tool');
  });

  it('produces identical output for the same workflow', () => {
    const workflow = sampleWorkflow();
    expect(generateAgentSkillContent(workflow, 'codex')).toBe(
      generateAgentSkillContent(workflow, 'codex')
    );
  });
});

// ---------------------------------------------------------------------------
// Planned file set
// ---------------------------------------------------------------------------

describe('planAgentSkillFiles', () => {
  it('plans exactly one SKILL.md for the providers that have no agents dir', () => {
    for (const provider of ALL_PROVIDERS.filter((p) => p !== 'cursor')) {
      const planned = planAgentSkillFiles(sampleWorkflow(), provider);
      expect(planned.map((p) => p.relativePath), provider).toEqual([
        agentSkillFilePath(sampleWorkflow(), provider),
      ]);
    }
  });

  it('mirrors Sub-Agent nodes into agent files for Cursor only', () => {
    // Cursor is the sole provider with an `agentsDir`. If another provider
    // started emitting agent files it would scatter definitions into
    // directories that agent never reads.
    const planned = planAgentSkillFiles(sampleWorkflow(), 'cursor');
    expect(planned.map((p) => p.relativePath).sort()).toEqual([
      '.cursor/agents/code-reviewer.md',
      '.cursor/agents/test-runner.md',
      '.cursor/skills/release-review/SKILL.md',
    ]);
  });

  it('plans no agent files when the workflow has no Sub-Agent nodes', () => {
    const planned = planAgentSkillFiles(
      makeWorkflow([startNode('start-1'), endNode('end-1')], [], { name: 'Release Review' }),
      'cursor'
    );
    expect(planned.map((p) => p.relativePath)).toEqual(['.cursor/skills/release-review/SKILL.md']);
  });

  it('emits every planned file with contents', () => {
    // A planned entry with an empty body writes an empty file over whatever
    // the user had there.
    for (const provider of ALL_PROVIDERS) {
      for (const file of planAgentSkillFiles(sampleWorkflow(), provider)) {
        expect(file.contents.length, `${provider}:${file.relativePath}`).toBeGreaterThan(0);
      }
    }
  });

  it('returns relative, forward-slashed paths that stay inside the project', () => {
    // These paths are joined onto a user-chosen root by the CLI and the
    // extension. An absolute path or a `..` segment would write outside it.
    for (const provider of ALL_PROVIDERS) {
      for (const { relativePath } of planAgentSkillFiles(sampleWorkflow(), provider)) {
        expect(relativePath, provider).not.toContain('\\');
        expect(relativePath.startsWith('/'), provider).toBe(false);
        expect(relativePath.split('/'), provider).not.toContain('..');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Agreement with the README target table
// ---------------------------------------------------------------------------

/**
 * The README's "Supported Agents" table is the user-facing statement of where
 * an export lands, and it is maintained separately from the generator. A
 * divergence is a real defect in one of the two: either the table misdirects
 * a user hunting for their exported skill, or the export writes somewhere the
 * target agent does not read.
 *
 * Read via `fs` for the same reason as the authoring-guide suite: the README
 * sits outside the package `rootDir`, and the relative path resolves
 * identically from `src/services/` and the compiled `dist/services/`.
 */
const README = readFileSync(new URL('../../../../README.md', import.meta.url), 'utf-8');

/** README row label → provider id. Claude Code and Copilot Chat use other paths. */
const README_ROW_FOR_PROVIDER: Record<AgentSkillProvider, string> = {
  copilot: 'GitHub Copilot CLI',
  codex: 'OpenAI Codex CLI',
  'roo-code': 'Zoo Code (formerly Roo Code)',
  gemini: 'Gemini CLI',
  antigravity: 'Antigravity',
  cursor: 'Cursor',
};

/** Pull the `Export Format` cell for a row of the Supported Agents table. */
function readmeExportPaths(rowLabel: string): string[] {
  const row = README.split('\n').find((line) => line.startsWith(`| ${rowLabel} |`));
  if (!row) throw new Error(`No "Supported Agents" row for ${rowLabel} in README.md`);
  const cell = row.split('|')[2];
  return [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

describe('README target table', () => {
  it('documents every provider the code supports', () => {
    // A new export target that never reaches the README is a feature users
    // cannot find.
    for (const provider of ALL_PROVIDERS) {
      expect(() => readmeExportPaths(README_ROW_FOR_PROVIDER[provider]), provider).not.toThrow();
    }
  });

  it('lists the directory each provider actually writes its SKILL.md to', () => {
    for (const provider of ALL_PROVIDERS) {
      const documented = readmeExportPaths(README_ROW_FOR_PROVIDER[provider]);
      const actual = agentSkillFilePath(sampleWorkflow(), provider);
      expect(
        documented.some((dir) => actual.startsWith(dir)),
        `${provider}: ${actual} is under none of ${documented.join(', ')}`
      ).toBe(true);
    }
  });

  it('accounts for every directory the README promises', () => {
    // The reverse direction: a documented directory nothing ever writes to
    // sends the user looking for a file that is not there. Cursor's two
    // entries are both real — `.cursor/agents/` for the mirrored Sub-Agents.
    for (const provider of ALL_PROVIDERS) {
      const documented = readmeExportPaths(README_ROW_FOR_PROVIDER[provider]);
      const planned = planAgentSkillFiles(sampleWorkflow(), provider).map((p) => p.relativePath);
      for (const dir of documented) {
        expect(
          planned.some((p) => p.startsWith(dir)),
          `${provider}: nothing is written under the documented ${dir}`
        ).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// YAML frontmatter — currently broken, see the referenced bug
// ---------------------------------------------------------------------------

describe('YAML frontmatter escaping', () => {
  /**
   * SKIPPED — pins a product defect this suite found, filed as #1009. The
   * fix touches `packages/core/src/` and so belongs to the feature loop on
   * `auto-dev`; un-skip this once it reaches `main`.
   *
   * `generateAgentSkillContent` interpolates the workflow description into
   * `description: ${description}` raw, while `generateSlashCommandFile` in
   * this same package routes the identical value through `escapeYamlString`.
   * A description containing `:` — "Deploy: staging then prod" — therefore
   * yields invalid YAML for all six non-Claude targets, and the agent silently
   * fails to load the skill. A newline in the description is worse: the
   * remainder leaks out of the frontmatter into the document body.
   */
  it.skip('escapes the description the way the Claude Code export does (bug #1009)', () => {
    for (const description of [
      'Deploy: staging then prod',
      'Says "hello"',
      'Line one\nLine two',
    ]) {
      const content = generateAgentSkillContent(
        makeWorkflow([startNode('start-1')], [], {
          name: 'Release Review',
          metadata: { description },
        }),
        'codex'
      );
      expect(content).toContain(`description: ${escapeYamlString(description)}`);
    }
  });

  it('needs no escaping for a plain description', () => {
    // The unaffected path, kept green so the skipped case above is clearly
    // about escaping rather than about the frontmatter in general.
    const content = generateAgentSkillContent(
      makeWorkflow([startNode('start-1')], [], {
        name: 'Release Review',
        metadata: { description: 'Review a release candidate' },
      }),
      'codex'
    );
    expect(content).toContain('description: Review a release candidate');
    expect(escapeYamlString('Review a release candidate')).toBe('Review a release candidate');
  });
});
