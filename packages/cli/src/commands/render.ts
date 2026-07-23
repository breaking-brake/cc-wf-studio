/**
 * `ccwf render <file>` — emit Mermaid + execution instructions for a workflow.
 *
 * Default format is `md` (Markdown bundle: title + Mermaid block + execution
 * guide), suitable for pasting into a PR description or README. `--format=mermaid`
 * outputs only the Mermaid `flowchart` source, intended for piping into
 * `mermaid-cli` or similar.
 *
 * `--agent <name>` phrases the execution instructions for that target agent —
 * the same wording `ccwf export --agent <name>` writes into the agent's
 * SKILL.md — instead of the default Claude Code phrasing. When the flag is
 * passed explicitly, the same target-compatibility warnings `ccwf validate
 * --agent` reports are printed to stderr (they never affect the exit code or
 * the stdout render). The Mermaid diagram itself is agent-agnostic, so
 * `--format=mermaid` output is unaffected by `--agent`.
 */

import * as fs from 'node:fs/promises';
import { Command, InvalidArgumentError } from 'commander';
import {
  generateAgentExecutionInstructions,
  generateExecutionInstructions,
  generateMermaidFlowchart,
} from '@cc-wf-studio/core';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';
import {
  SUPPORTED_AGENTS,
  type SupportedAgent,
  asSupportedAgent,
  collectAgentCompatibilityWarnings,
} from './export.js';

type RenderFormat = 'mermaid' | 'md';

interface RenderOptions {
  format: RenderFormat;
  agent: SupportedAgent;
  output?: string;
}

export function registerRenderCommand(program: Command): void {
  program
    .command('render')
    .description('Render a workflow JSON as Mermaid + execution Markdown to stdout.')
    .argument('<file>', 'Path to a workflow JSON file.')
    .option<RenderFormat>(
      '-f, --format <format>',
      'Output format: "md" (default) or "mermaid".',
      (value): RenderFormat => {
        if (value !== 'mermaid' && value !== 'md') {
          throw new InvalidArgumentError("Expected 'mermaid' or 'md'.");
        }
        return value;
      },
      'md'
    )
    .option<SupportedAgent>(
      '--agent <name>',
      `Phrase the execution instructions for this target agent (one of: ${SUPPORTED_AGENTS.join(', ')}). Defaults to claude-code. Also reports the same target-compatibility warnings as ccwf validate --agent (stderr, never affects the exit code). The Mermaid diagram is agent-agnostic.`,
      (value) => asSupportedAgent(value),
      'claude-code'
    )
    .option('-o, --output <file>', 'Write output to this file instead of stdout.')
    .action(async (file: string, options: RenderOptions, command: Command) => {
      try {
        const { workflow } = await loadWorkflowFromFile(file);
        const agent = options.agent;

        // Warnings only when --agent was passed explicitly: a plain
        // `ccwf render` keeps its historical stdout/stderr byte-for-byte.
        if (command.getOptionValueSource('agent') === 'cli') {
          for (const warning of collectAgentCompatibilityWarnings(workflow, agent)) {
            process.stderr.write(`warning: ${warning}\n`);
          }
        }

        // generateMermaidFlowchart already returns a fenced ```mermaid block.
        const mermaidBlock = generateMermaidFlowchart(workflow);

        let rendered: string;
        if (options.format === 'mermaid') {
          rendered = `${mermaidBlock}\n`;
        } else {
          const execution =
            agent === 'claude-code'
              ? generateExecutionInstructions(workflow, { provider: 'claude-code' })
              : generateAgentExecutionInstructions(workflow, agent);
          const title = `# ${workflow.name || 'Workflow'}`;
          const descriptionBlock = workflow.description ? `\n${workflow.description}\n` : '\n';
          rendered = `${title}\n${descriptionBlock}\n${mermaidBlock}\n\n${execution}\n`;
        }

        if (options.output) {
          await fs.writeFile(options.output, rendered, 'utf-8');
          process.stdout.write(`✓ Wrote render output to ${options.output}\n`);
        } else {
          process.stdout.write(rendered);
        }
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
