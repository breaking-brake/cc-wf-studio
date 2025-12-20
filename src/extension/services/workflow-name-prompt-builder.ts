/**
 * Workflow Name Prompt Builder
 *
 * Builds AI prompts for workflow name generation in TOON format.
 * TOON format reduces token consumption by ~7% compared to freetext.
 */

import { encode } from '@toon-format/toon';

/**
 * Prompt builder for workflow name generation
 */
export class WorkflowNamePromptBuilder {
  constructor(
    private workflowJson: string,
    private targetLanguage: string
  ) {}

  buildPrompt(): string {
    const structured = this.getStructuredPrompt();
    return encode(structured);
  }

  private getStructuredPrompt(): object {
    return {
      responseLocale: this.targetLanguage,
      role: 'workflow naming specialist',
      task: 'Analyze the following workflow JSON and generate a concise, descriptive name',
      workflowJson: this.workflowJson,
      requirements: [
        'Use kebab-case format (e.g., "data-analysis-pipeline", "user-auth-flow")',
        'Maximum 50 characters',
        "Focus on the workflow's primary purpose or function",
        'Do NOT include generic words like "workflow" or "process" unless necessary',
        'Do NOT include markdown, code blocks, or formatting',
        'Output ONLY the name, nothing else',
      ],
      outputFormat: 'A single kebab-case name describing the workflow purpose',
    };
  }
}
