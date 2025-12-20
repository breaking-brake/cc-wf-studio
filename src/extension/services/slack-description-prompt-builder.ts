/**
 * Slack Description Prompt Builder
 *
 * Builds AI prompts for Slack description generation in TOON format.
 * TOON format reduces token consumption by ~7% compared to freetext.
 */

import { encode } from '@toon-format/toon';

/**
 * Prompt builder for Slack description generation
 */
export class SlackDescriptionPromptBuilder {
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
      role: 'technical writer creating a brief workflow description for Slack sharing',
      task: 'Analyze the following workflow JSON and generate a concise description',
      workflowJson: this.workflowJson,
      requirements: [
        'Maximum 200 characters (aim for 100-150 for readability)',
        'Focus on what the workflow accomplishes, not technical implementation details',
        'Use active voice and clear language',
        'Do NOT include markdown, code blocks, or formatting',
        'Output ONLY the description text, nothing else',
      ],
      outputFormat: 'A single line of plain text describing the workflow purpose',
    };
  }
}
