/**
 * Refinement Prompt Builder
 *
 * Builds AI prompts for workflow refinement in TOON format.
 * TOON format reduces token consumption by ~7% compared to freetext.
 */

import { encode } from '@toon-format/toon';
import type { ConversationHistory, Workflow } from '../../shared/types/workflow-definition';
import { getCurrentLocale } from '../i18n/i18n-service';
import {
  CLARIFICATION_TRIGGERS,
  EDITING_PROCESS_MERMAID_DIAGRAM,
  EDITING_PROCESS_STEPS,
  REQUEST_TYPE_GUIDELINES,
} from './editing-flow-constants.generated';
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
    private previousValidationErrors?: ValidationErrorInfo[],
    private isCodexEnabled = false
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
      role: 'expert workflow designer for CC Workflow Studio',
      task: 'Refine the existing workflow based on user feedback',
      // AI Editing Process Flow - MUST follow this process strictly
      // Generated from: resources/ai-editing-process-flow.md
      editingProcessFlow: {
        description: 'You MUST follow this editing process step by step. Do NOT skip any steps.',
        mermaidDiagram: EDITING_PROCESS_MERMAID_DIAGRAM,
        steps: EDITING_PROCESS_STEPS,
        requestTypeGuidelines: REQUEST_TYPE_GUIDELINES,
        clarificationTriggers: CLARIFICATION_TRIGGERS,
      },
      currentWorkflow: {
        id: this.currentWorkflow.id,
        name: this.currentWorkflow.name,
        // Include COMPLETE node data for ALL node types to enable precise editing
        nodes: this.currentWorkflow.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          name: n.name,
          position: { x: n.position.x, y: n.position.y },
          // Include data for ALL node types - this is CRITICAL for preserving existing content
          data: n.data,
        })),
        connections: this.currentWorkflow.connections.map((c) => ({
          id: c.id,
          from: c.from,
          to: c.to,
          fromPort: c.fromPort,
          toPort: c.toPort,
        })),
        // Include subAgentFlows if present
        ...(this.currentWorkflow.subAgentFlows &&
          this.currentWorkflow.subAgentFlows.length > 0 && {
            subAgentFlows: this.currentWorkflow.subAgentFlows,
          }),
      },
      conversationHistory: recentMessages.map((m) => ({
        sender: m.sender,
        content: m.content,
      })),
      userRequest: this.userMessage,
      refinementGuidelines: [
        'CRITICAL: Preserve ALL unchanged nodes with their EXACT original data - do not modify or regenerate',
        'Only modify nodes that are explicitly requested to change',
        'Add new nodes ONLY if user explicitly asks for new functionality',
        'Maintain workflow connectivity and validity',
        'Respect node IDs - do not regenerate IDs for unchanged nodes',
        'Node names must match pattern /^[a-zA-Z0-9_-]+$/ (ASCII alphanumeric, hyphens, underscores only)',
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
        'Must have exactly 1 output port (outputPorts: 1)',
        'If branching needed, add ifElse/switch node after the Skill node',
        'For existing skill nodes: COPY data field exactly from currentWorkflow',
        'For NEW skill nodes: only use names from availableSkills list',
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
      // Codex Agent node constraints and guidelines (only when enabled)
      ...(this.isCodexEnabled && {
        codexNodeConstraints: [
          'Must have exactly 1 output port (outputPorts: 1)',
          'If branching needed, add ifElse/switch node after the Codex node',
          'For existing codex nodes: COPY data field exactly from currentWorkflow',
          'Required fields: label, prompt (or promptGuidance for ai-generated mode), model, reasoningEffort',
          'Optional fields: sandbox (read-only/workspace-write/danger-full-access), skipGitRepoCheck',
        ],
        codexAgentGuidelines: {
          description:
            'Codex Agent is a specialized node for executing OpenAI Codex CLI within workflows. Use it for advanced code generation, analysis, or complex reasoning tasks.',
          whenToUse: [
            'Complex code generation requiring multiple files or architectural decisions',
            'Code analysis or refactoring tasks that benefit from deep reasoning',
            'Tasks requiring workspace-level operations (with appropriate sandbox settings)',
            'Multi-step coding tasks that benefit from reasoning effort configuration',
          ],
          configurationOptions: {
            model: 'o3 (more capable) or o4-mini (faster, cost-effective)',
            reasoningEffort: 'low/medium/high - controls depth of reasoning',
            promptMode:
              'fixed (user-defined prompt) or ai-generated (orchestrating AI provides prompt)',
            sandbox:
              'Optional: read-only (safest), workspace-write (can modify files), danger-full-access',
            skipGitRepoCheck:
              'Usually required for workflow execution outside trusted git repositories',
          },
        },
      }),
      workflowSchema: this.schemaResult.schemaString || JSON.stringify(this.schemaResult.schema),
      outputFormat: {
        description:
          'You MUST output exactly ONE JSON object. Do NOT output multiple JSON blocks or explanatory text.',
        successExample: {
          status: 'success',
          message: 'Brief description of what was changed',
          values: {
            workflow: {
              id: 'workflow-id',
              name: 'workflow-name',
              nodes: ['... all nodes with data ...'],
              connections: ['... all connections ...'],
            },
          },
        },
        clarificationExample: {
          status: 'clarification',
          message: 'Your answer or question here',
        },
        errorExample: {
          status: 'error',
          message: 'Error description',
        },
      },
      criticalRules: [
        'OUTPUT FORMAT: You MUST output exactly ONE JSON object - no explanatory text, no multiple JSON blocks',
        'DO NOT output workflow JSON separately from status JSON - they must be combined in ONE response',
        'DO NOT wrap JSON in markdown code blocks (```json) - output raw JSON only',
        'For success: workflow MUST be nested inside values.workflow, not as a separate JSON block',
        'Follow the editingProcessFlow steps in order - do NOT skip steps',
        'For questions/understanding requests: use clarification status with your answer',
        'For unclear edit requests: use clarification status to ask for details',
        'For clear edit requests: use success status with the modified workflow inside values.workflow',
        'CRITICAL: When outputting workflow, COPY unchanged nodes with their EXACT original data',
        'NEVER regenerate or modify data for nodes that were not explicitly requested to change',
        'status and message fields are REQUIRED in every response',
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
