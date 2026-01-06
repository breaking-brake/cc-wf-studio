/**
 * Refinement Prompt Builder
 *
 * Builds AI prompts for workflow refinement in TOON format.
 * TOON format reduces token consumption by ~7% compared to freetext.
 */

import { encode } from '@toon-format/toon';
import type { ConversationHistory, Workflow } from '../../shared/types/workflow-definition';
import { getCurrentLocale } from '../i18n/i18n-service';
import type { ValidationErrorInfo } from './refinement-service';
import type { SchemaLoadResult } from './schema-loader-service';
import type { SkillRelevanceScore } from './skill-relevance-matcher';

/**
 * Prompt builder for workflow refinement
 */
export class RefinementPromptBuilder {
  constructor(
    private currentWorkflow: Workflow,
    private conversationHistory: ConversationHistory,
    private userMessage: string,
    private schemaResult: SchemaLoadResult,
    private filteredSkills: SkillRelevanceScore[],
    private previousValidationErrors?: ValidationErrorInfo[]
  ) {}

  buildPrompt(): string {
    const structured = this.getStructuredPrompt();
    return encode(structured);
  }

  private getStructuredPrompt(): object {
    const recentMessages = this.conversationHistory.messages.slice(-6);
    const locale = getCurrentLocale();

    return {
      responseLocale: locale,
      role: 'expert workflow designer for Claude Code Workflow Studio',
      task: 'Refine the existing workflow based on user feedback',
      currentWorkflow: {
        id: this.currentWorkflow.id,
        name: this.currentWorkflow.name,
        nodes: this.currentWorkflow.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          'position.x': n.position.x,
          'position.y': n.position.y,
          // Include data for skill nodes to preserve exact skill information
          ...(n.type === 'skill' && n.data
            ? {
                data: {
                  name: (n.data as { name?: string }).name,
                  description: (n.data as { description?: string }).description,
                  scope: (n.data as { scope?: string }).scope,
                  validationStatus: (n.data as { validationStatus?: string }).validationStatus,
                  outputPorts: (n.data as { outputPorts?: number }).outputPorts,
                },
              }
            : {}),
        })),
        connections: this.currentWorkflow.connections.map((c) => ({
          id: c.id,
          from: c.from,
          to: c.to,
          fromPort: c.fromPort,
          toPort: c.toPort,
        })),
      },
      conversationHistory: recentMessages.map((m) => ({
        sender: m.sender,
        content: m.content,
      })),
      userRequest: this.userMessage,
      refinementGuidelines: [
        'Preserve existing nodes unless explicitly requested to remove',
        'Add new nodes ONLY if user asks for new functionality',
        'Modify node properties based on feedback',
        'Maintain workflow connectivity and validity',
        'Respect node IDs - do not regenerate IDs for unchanged nodes',
        'Update only what the user requested',
        'Node names must match pattern /^[a-zA-Z0-9_-]+$/ (ASCII alphanumeric, hyphens, underscores only - NO spaces or non-ASCII characters)',
      ],
      nodePositioningGuidelines: [
        'Horizontal spacing: 300px',
        'Spacing after Start: 250px',
        'Spacing before End: 350px',
        'Vertical spacing: 150px',
        'Calculate positions based on existing nodes',
        'Preserve existing positions unless requested',
        'Branch nodes: offset vertically by 150px',
      ],
      skillNodeConstraints: [
        'Must have exactly 1 output port',
        'If branching needed, add ifElse/switch after Skill',
        'Never modify outputPorts field',
        'PRESERVE existing skill node data exactly - do not change name, description, scope',
        'When skill node exists in currentWorkflow, copy its data field exactly',
        'Only use skill names from availableSkills list for NEW skill nodes',
      ],
      branchingNodeSelection: {
        ifElse: '2-way conditional branching (true/false)',
        switch: '3+ way branching or multiple conditions',
        rule: 'Each branch connects to exactly one downstream node',
      },
      availableSkills: this.filteredSkills.map((s) => ({
        name: s.skill.name,
        description: s.skill.description,
        scope: s.skill.scope,
      })),
      workflowSchema: this.schemaResult.schemaString || JSON.stringify(this.schemaResult.schema),
      outputFormat: {
        success: {
          status: 'success',
          message: 'Brief description of changes',
          'values.workflow': '{...}',
        },
        clarification: {
          status: 'clarification',
          message: 'Your question here',
        },
        error: {
          status: 'error',
          message: 'Error description',
        },
      },
      criticalRules: [
        'ALWAYS output valid JSON',
        'NEVER include markdown code blocks',
        'Even if no changes, wrap in success response',
        'status and message fields REQUIRED',
        'If you need clarification, use { status: "clarification", message: "..." } format',
        'NEVER ask questions in plain text - use clarification JSON format',
      ],
      // Include previous validation errors for retry context
      ...(this.previousValidationErrors &&
        this.previousValidationErrors.length > 0 && {
          previousAttemptFailed: true,
          previousValidationErrors: this.previousValidationErrors.map((e) => ({
            code: e.code,
            message: e.message,
            field: e.field,
          })),
          errorRecoveryInstructions: [
            'The previous attempt failed validation with the errors listed above',
            'Please carefully review the errors and fix them in your output',
            'Pay special attention to node naming patterns and field requirements',
            'Node names must match pattern /^[a-zA-Z0-9_-]+$/ (no spaces, Japanese characters, or special chars)',
            'Ensure all required fields are present with valid values',
          ],
        }),
    };
  }
}
