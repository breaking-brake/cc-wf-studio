/**
 * `ccwf render <file>` — emit Mermaid + execution instructions for a workflow.
 *
 * Default format is `md` (Markdown bundle: title + Mermaid block + execution
 * guide), suitable for pasting into a PR description or README. `--format=mermaid`
 * outputs only the Mermaid `flowchart` source, intended for piping into
 * `mermaid-cli` or similar.
 */

import { Command, InvalidArgumentError } from 'commander';
import {
  generateExecutionInstructions,
  generateMermaidFlowchart,
} from '@cc-wf-studio/core';
import { WorkflowLoadError, loadWorkflowFromFile } from '../utils/load-workflow.js';

type RenderFormat = 'mermaid' | 'md';

interface RenderOptions {
  format: RenderFormat;
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
    .action(async (file: string, options: RenderOptions) => {
      try {
        const { workflow } = await loadWorkflowFromFile(file);
        // generateMermaidFlowchart already returns a fenced ```mermaid block.
        const mermaidBlock = generateMermaidFlowchart(workflow);

        if (options.format === 'mermaid') {
          process.stdout.write(`${mermaidBlock}\n`);
          return;
        }

        const execution = generateExecutionInstructions(workflow, {
          provider: 'claude-code',
        });
        const title = `# ${workflow.name || 'Workflow'}`;
        const descriptionBlock = workflow.description ? `\n${workflow.description}\n` : '\n';
        process.stdout.write(`${title}\n${descriptionBlock}\n${mermaidBlock}\n\n${execution}\n`);
      } catch (error) {
        if (error instanceof WorkflowLoadError) {
          process.stderr.write(`error: ${error.message}\n`);
          process.exit(error.exitCode);
        }
        throw error;
      }
    });
}
