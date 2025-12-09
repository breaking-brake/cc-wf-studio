/**
 * Workflow Refinement Service
 *
 * Executes AI-assisted workflow refinement based on user feedback and conversation history.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md
 */

import type { SkillReference } from '../../shared/types/messages';
import type {
  ConversationHistory,
  SkillNodeData,
  Workflow,
} from '../../shared/types/workflow-definition';
import { log } from '../extension';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';
import { executeClaudeCodeCLI, parseClaudeCodeOutput } from './claude-code-service';
import { getDefaultSchemaPath, loadWorkflowSchema } from './schema-loader-service';
import { filterSkillsByRelevance, type SkillRelevanceScore } from './skill-relevance-matcher';
import { scanAllSkills } from './skill-service';

export interface RefinementResult {
  success: boolean;
  refinedWorkflow?: Workflow;
  clarificationMessage?: string;
  error?: {
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
}

/**
 * Check if AI output is a clarification message instead of a workflow
 *
 * @param output - AI output text
 * @returns true if output appears to be a clarification message
 */
function isClarificationMessage(output: string): boolean {
  // Remove JSON code blocks to avoid false positives
  const textWithoutCodeBlocks = output.replace(/```json[\s\S]*?```/g, '');

  // Clarification indicators (case-insensitive)
  const clarificationPatterns = [
    /I need to understand/i,
    /could you (please\s+)?(clarify|specify|tell me more)/i,
    /ambiguous/i,
    /unclear/i,
    /could mean/i,
    /which (one|approach|option|method)/i,
    /would you like me to/i,
    /please (clarify|specify)/i,
    /not sure (what|which|how)/i,
    /can you provide more (details|information)/i,
  ];

  return clarificationPatterns.some((pattern) => pattern.test(textWithoutCodeBlocks));
}

/**
 * Extract clarification message from AI output (removes JSON blocks)
 *
 * @param output - AI output text containing clarification and possibly JSON
 * @returns Clarification message without JSON blocks
 */
function extractClarificationMessage(output: string): string {
  // Remove JSON code blocks (```json ... ```)
  let cleanedOutput = output.replace(/```json[\s\S]*?```/g, '');

  // Remove standalone JSON blocks (raw JSON without markdown code blocks)
  // This regex matches JSON objects that start with { and end with }
  cleanedOutput = cleanedOutput.replace(/\n\s*\{[\s\S]*\}\s*$/g, '');

  // Trim whitespace
  return cleanedOutput.trim();
}

/**
 * Construct refinement prompt with conversation context
 *
 * @param currentWorkflow - The current workflow state
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param schema - Workflow schema for node type validation
 * @param filteredSkills - Skills filtered by relevance (optional)
 * @returns Prompt string for Claude Code CLI
 */
export function constructRefinementPrompt(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  schema: unknown,
  filteredSkills: SkillRelevanceScore[] = []
): string {
  // Get last 6 messages (3 rounds of user-AI conversation)
  // This provides sufficient context without overwhelming the prompt
  const recentMessages = conversationHistory.messages.slice(-6);

  const conversationContext =
    recentMessages.length > 0
      ? `**Conversation History** (last ${recentMessages.length} messages):
${recentMessages.map((msg) => `[${msg.sender.toUpperCase()}]: ${msg.content}`).join('\n')}\n`
      : '**Conversation History**: (This is the first message)\n';

  const schemaJSON = JSON.stringify(schema, null, 2);

  // Construct skills section (similar to ai-generation.ts)
  const skillsSection =
    filteredSkills.length > 0
      ? `

**Available Skills** (use when user description matches their purpose):
${JSON.stringify(
  filteredSkills.map((s) => ({
    name: s.skill.name,
    description: s.skill.description,
    scope: s.skill.scope,
  })),
  null,
  2
)}

**Instructions for Using Skills**:
- Use a Skill node when the user's description matches a Skill's documented purpose
- Copy the name, description, and scope exactly from the Available Skills list above
- Set validationStatus to "valid" and outputPorts to 1
- Do NOT include skillPath in your response (the system will resolve it automatically)
- If both personal and project Skills match, prefer the project Skill

`
      : '';

  return `You are an expert workflow designer for Claude Code Workflow Studio.

**Task**: Refine the existing workflow based on user's feedback.

**Current Workflow**:
${JSON.stringify(currentWorkflow, null, 2)}

${conversationContext}
**User's Refinement Request**:
${userMessage}

**Refinement Guidelines**:
1. Preserve existing nodes unless explicitly requested to remove
2. Add new nodes ONLY if user asks for new functionality
3. Modify node properties (labels, descriptions, prompts) based on feedback
4. Maintain workflow connectivity and validity
5. Respect node IDs - do not regenerate IDs for unchanged nodes
6. Update only what the user requested - minimize unnecessary changes

**Node Positioning Guidelines**:
1. Horizontal spacing between regular nodes: Use 300px (e.g., x: 350, 650, 950, 1250, 1550)
2. Spacing after Start node: Use 250px (e.g., Start at x: 100, next at x: 350)
3. Spacing before End node: Use 350px (e.g., previous at x: 1550, End at x: 1900)
4. Vertical spacing: Use 150px between nodes on different branches
5. When adding new nodes, calculate positions based on existing node positions and connections
6. Preserve existing node positions unless repositioning is explicitly requested
7. For branch nodes: offset vertically by 150px from the main path (e.g., y: 300 for main, y: 150/450 for branches)

**Skill Node Constraints**:
- Skill nodes MUST have exactly 1 output port (outputPorts: 1)
- If branching is needed after Skill execution, add an ifElse or switch node after the Skill node
- Never modify Skill node's outputPorts field

**Branching Node Selection**:
- Use ifElse node for 2-way conditional branching (true/false)
- Use switch node for 3+ way branching or multiple conditions
- Each branch output should connect to exactly one downstream node - never create serial connections from different branch outputs
${skillsSection}
**Workflow Schema** (reference for valid node types and structure):
${schemaJSON}

**Output Format**: Output ONLY valid JSON matching the Workflow interface. Do not include markdown code blocks or explanations.`;
}

/**
 * Default timeout for workflow refinement (90 seconds)
 * Can be overridden by user configuration (cc-wf-studio.aiRefinement.timeout)
 * Aligned with AI generation timeout for consistency
 */
const MAX_REFINEMENT_TIMEOUT_MS = 90000;

/**
 * Execute workflow refinement via Claude Code CLI
 *
 * @param currentWorkflow - The current workflow state
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param extensionPath - VSCode extension path for schema loading
 * @param useSkills - Whether to include skills in refinement (default: true)
 * @param timeoutMs - Timeout in milliseconds (default: 90000, can be configured via settings)
 * @param requestId - Optional request ID for cancellation support
 * @param workspaceRoot - The workspace root path for CLI execution
 * @returns Refinement result with success status and refined workflow or error
 */
export async function refineWorkflow(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  extensionPath: string,
  useSkills = true,
  timeoutMs = MAX_REFINEMENT_TIMEOUT_MS,
  requestId?: string,
  workspaceRoot?: string
): Promise<RefinementResult> {
  const startTime = Date.now();

  log('INFO', 'Starting workflow refinement', {
    requestId,
    workflowId: currentWorkflow.id,
    messageLength: userMessage.length,
    historyLength: conversationHistory.messages.length,
    currentIteration: conversationHistory.currentIteration,
    useSkills,
    timeoutMs,
  });

  try {
    // Step 1: Load workflow schema (and optionally scan skills)
    const schemaPath = getDefaultSchemaPath(extensionPath);

    let schemaResult: Awaited<ReturnType<typeof loadWorkflowSchema>>;
    let availableSkills: SkillReference[] = [];
    let filteredSkills: SkillRelevanceScore[] = [];

    if (useSkills) {
      // Scan skills in parallel with schema loading
      const [loadedSchema, skillsResult] = await Promise.all([
        loadWorkflowSchema(schemaPath),
        scanAllSkills(),
      ]);

      schemaResult = loadedSchema;

      if (!schemaResult.success || !schemaResult.schema) {
        log('ERROR', 'Failed to load workflow schema', {
          requestId,
          errorMessage: schemaResult.error?.message,
        });

        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to load workflow schema',
            details: schemaResult.error?.message,
          },
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Combine personal and project skills
      availableSkills = [...skillsResult.personal, ...skillsResult.project];

      log('INFO', 'Skills scanned successfully', {
        requestId,
        personalCount: skillsResult.personal.length,
        projectCount: skillsResult.project.length,
        totalCount: availableSkills.length,
      });

      // Step 2: Filter skills by relevance to user's message
      filteredSkills = filterSkillsByRelevance(userMessage, availableSkills);

      log('INFO', 'Skills filtered by relevance', {
        requestId,
        filteredCount: filteredSkills.length,
        topSkills: filteredSkills.slice(0, 5).map((s) => ({ name: s.skill.name, score: s.score })),
      });
    } else {
      // Skip skill scanning
      schemaResult = await loadWorkflowSchema(schemaPath);

      if (!schemaResult.success || !schemaResult.schema) {
        log('ERROR', 'Failed to load workflow schema', {
          requestId,
          errorMessage: schemaResult.error?.message,
        });

        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to load workflow schema',
            details: schemaResult.error?.message,
          },
          executionTimeMs: Date.now() - startTime,
        };
      }

      log('INFO', 'Skipping skill scan (useSkills=false)', { requestId });
    }

    // Step 3: Construct refinement prompt (with or without skills)
    const prompt = constructRefinementPrompt(
      currentWorkflow,
      conversationHistory,
      userMessage,
      schemaResult.schema,
      filteredSkills
    );

    // Step 4: Execute Claude Code CLI
    const cliResult = await executeClaudeCodeCLI(prompt, timeoutMs, requestId, workspaceRoot);

    if (!cliResult.success || !cliResult.output) {
      // CLI execution failed
      log('ERROR', 'Refinement failed during CLI execution', {
        requestId,
        errorCode: cliResult.error?.code,
        errorMessage: cliResult.error?.message,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: cliResult.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during CLI execution',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    log('INFO', 'CLI execution successful, checking output type', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
    });

    // Step 5: Check if output is a clarification message
    if (isClarificationMessage(cliResult.output)) {
      const clarificationText = extractClarificationMessage(cliResult.output);

      log('INFO', 'AI is requesting clarification', {
        requestId,
        outputPreview: clarificationText.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: true,
        clarificationMessage: clarificationText,
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 6: Parse CLI output as workflow JSON
    const parsedOutput = parseClaudeCodeOutput(cliResult.output);

    if (!parsedOutput) {
      // Parsing failed
      log('ERROR', 'Failed to parse CLI output', {
        requestId,
        outputPreview: cliResult.output.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse AI response. Please try again or rephrase your request',
          details: 'Failed to parse JSON from Claude Code output',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Type check: ensure parsed output is a Workflow
    let refinedWorkflow = parsedOutput as Workflow;

    if (!refinedWorkflow.id || !refinedWorkflow.nodes || !refinedWorkflow.connections) {
      log('ERROR', 'Parsed output is not a valid Workflow', {
        requestId,
        hasId: !!refinedWorkflow.id,
        hasNodes: !!refinedWorkflow.nodes,
        hasConnections: !!refinedWorkflow.connections,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Refinement failed - AI output does not match Workflow format',
          details: 'Missing required workflow fields (id, nodes, or connections)',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 7: Resolve skill paths for skill nodes (only if useSkills is true)
    if (useSkills) {
      refinedWorkflow = await resolveSkillPaths(refinedWorkflow, availableSkills);

      log('INFO', 'Skill paths resolved', {
        requestId,
        skillNodesCount: refinedWorkflow.nodes.filter((n) => n.type === 'skill').length,
      });
    } else {
      log('INFO', 'Skipping skill path resolution (useSkills=false)', { requestId });
    }

    // Step 8: Validate refined workflow
    const validation = validateAIGeneratedWorkflow(refinedWorkflow);

    if (!validation.valid) {
      log('ERROR', 'Refined workflow failed validation', {
        requestId,
        validationErrors: validation.errors,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refined workflow failed validation - please try again',
          details: validation.errors.map((e) => e.message).join('; '),
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    const executionTimeMs = Date.now() - startTime;

    log('INFO', 'Workflow refinement successful', {
      requestId,
      executionTimeMs,
      nodeCount: refinedWorkflow.nodes.length,
      connectionCount: refinedWorkflow.connections.length,
    });

    return {
      success: true,
      refinedWorkflow,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error during workflow refinement', {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred during refinement',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
    };
  }
}

/**
 * Resolve skill paths for skill nodes in the workflow
 *
 * @param workflow - The workflow containing skill nodes
 * @param availableSkills - List of available skills to match against
 * @returns Workflow with resolved skill paths
 */
async function resolveSkillPaths(
  workflow: Workflow,
  availableSkills: SkillReference[]
): Promise<Workflow> {
  const resolvedNodes = workflow.nodes.map((node) => {
    if (node.type !== 'skill') {
      return node; // Not a Skill node, no changes
    }

    const skillData = node.data as SkillNodeData;

    // Find matching skill by name and scope
    const matchedSkill = availableSkills.find(
      (skill) => skill.name === skillData.name && skill.scope === skillData.scope
    );

    if (matchedSkill) {
      // Skill found - resolve path
      return {
        ...node,
        data: {
          ...skillData,
          skillPath: matchedSkill.skillPath,
          validationStatus: matchedSkill.validationStatus,
        } as SkillNodeData,
      };
    }

    // Skill not found - mark as missing
    return {
      ...node,
      data: {
        ...skillData,
        validationStatus: 'missing' as const,
      } as SkillNodeData,
    };
  });

  return {
    ...workflow,
    nodes: resolvedNodes,
  };
}

// ============================================================================
// SubAgentFlow Refinement Functions
// ============================================================================

/**
 * Inner workflow representation for SubAgentFlow refinement
 */
export interface InnerWorkflow {
  nodes: Workflow['nodes'];
  connections: Workflow['connections'];
}

/**
 * SubAgentFlow refinement result
 */
export interface SubAgentFlowRefinementResult {
  success: boolean;
  refinedInnerWorkflow?: InnerWorkflow;
  clarificationMessage?: string;
  error?: {
    code:
      | 'COMMAND_NOT_FOUND'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'PROHIBITED_NODE_TYPE'
      | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
}

/**
 * Prohibited node types in SubAgentFlow
 */
const SUBAGENTFLOW_PROHIBITED_NODE_TYPES = ['subAgent', 'subAgentFlow', 'askUserQuestion'];

/**
 * Maximum nodes allowed in SubAgentFlow
 */
const SUBAGENTFLOW_MAX_NODES = 30;

/**
 * Construct refinement prompt for SubAgentFlow
 *
 * @param innerWorkflow - The current inner workflow state (nodes + connections)
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param schema - Workflow schema for node type validation
 * @param filteredSkills - Skills filtered by relevance (optional)
 * @returns Prompt string for Claude Code CLI
 */
export function constructSubAgentFlowRefinementPrompt(
  innerWorkflow: InnerWorkflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  schema: unknown,
  filteredSkills: SkillRelevanceScore[] = []
): string {
  // Get last 6 messages (3 rounds of user-AI conversation)
  const recentMessages = conversationHistory.messages.slice(-6);

  const conversationContext =
    recentMessages.length > 0
      ? `**Conversation History** (last ${recentMessages.length} messages):
${recentMessages.map((msg) => `[${msg.sender.toUpperCase()}]: ${msg.content}`).join('\n')}\n`
      : '**Conversation History**: (This is the first message)\n';

  const schemaJSON = JSON.stringify(schema, null, 2);

  // Construct skills section
  const skillsSection =
    filteredSkills.length > 0
      ? `

**Available Skills** (use when user description matches their purpose):
${JSON.stringify(
  filteredSkills.map((s) => ({
    name: s.skill.name,
    description: s.skill.description,
    scope: s.skill.scope,
  })),
  null,
  2
)}

**Instructions for Using Skills**:
- Use a Skill node when the user's description matches a Skill's documented purpose
- Copy the name, description, and scope exactly from the Available Skills list above
- Set validationStatus to "valid" and outputPorts to 1
- Do NOT include skillPath in your response (the system will resolve it automatically)
- If both personal and project Skills match, prefer the project Skill

`
      : '';

  return `You are an expert workflow designer for Claude Code Workflow Studio.

**Task**: Refine a Sub-Agent Flow based on user's feedback.

**IMPORTANT - Sub-Agent Flow Constraints**:
Sub-Agent Flows have strict constraints that MUST be followed:
1. **Prohibited Node Types**: You MUST NOT use the following node types:
   - subAgent (Claude Code constraint for sequential execution)
   - subAgentFlow (no nesting allowed)
   - askUserQuestion (user interaction not supported in sub-agent context)
2. **Allowed Node Types**: start, end, prompt, ifElse, switch, skill, mcp
3. **Maximum Nodes**: ${SUBAGENTFLOW_MAX_NODES} nodes maximum
4. **Must have exactly one Start node and at least one End node**

**Current Sub-Agent Flow**:
${JSON.stringify(innerWorkflow, null, 2)}

${conversationContext}
**User's Refinement Request**:
${userMessage}

**Refinement Guidelines**:
1. Preserve existing nodes unless explicitly requested to remove
2. Add new nodes ONLY if user asks for new functionality
3. Modify node properties (labels, descriptions, prompts) based on feedback
4. Maintain workflow connectivity and validity
5. Respect node IDs - do not regenerate IDs for unchanged nodes
6. Update only what the user requested - minimize unnecessary changes
7. **NEVER add subAgent, subAgentFlow, or askUserQuestion nodes**

**Node Positioning Guidelines**:
1. Horizontal spacing between regular nodes: Use 300px (e.g., x: 350, 650, 950, 1250, 1550)
2. Spacing after Start node: Use 250px (e.g., Start at x: 100, next at x: 350)
3. Spacing before End node: Use 350px (e.g., previous at x: 1550, End at x: 1900)
4. Vertical spacing: Use 150px between nodes on different branches
5. When adding new nodes, calculate positions based on existing node positions and connections
6. Preserve existing node positions unless repositioning is explicitly requested
7. For branch nodes: offset vertically by 150px from the main path

**Skill Node Constraints**:
- Skill nodes MUST have exactly 1 output port (outputPorts: 1)
- If branching is needed after Skill execution, add an ifElse or switch node after the Skill node
- Never modify Skill node's outputPorts field

**Branching Node Selection**:
- Use ifElse node for 2-way conditional branching (true/false)
- Use switch node for 3+ way branching or multiple conditions
- Each branch output should connect to exactly one downstream node
${skillsSection}
**Workflow Schema** (reference for valid node types and structure):
${schemaJSON}

**Output Format**: Output ONLY valid JSON with "nodes" and "connections" arrays. Do not include markdown code blocks or explanations. Example:
{
  "nodes": [...],
  "connections": [...]
}`;
}

/**
 * Validate that the inner workflow does not contain prohibited node types
 */
function validateSubAgentFlowNodes(innerWorkflow: InnerWorkflow): {
  valid: boolean;
  prohibitedNodes: string[];
} {
  const prohibitedNodes: string[] = [];

  for (const node of innerWorkflow.nodes) {
    if (SUBAGENTFLOW_PROHIBITED_NODE_TYPES.includes(node.type)) {
      prohibitedNodes.push(`${node.type} (${node.id})`);
    }
  }

  return {
    valid: prohibitedNodes.length === 0,
    prohibitedNodes,
  };
}

/**
 * Execute SubAgentFlow refinement via Claude Code CLI
 *
 * @param innerWorkflow - The current inner workflow state (nodes + connections)
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param extensionPath - VSCode extension path for schema loading
 * @param useSkills - Whether to include skills in refinement (default: true)
 * @param timeoutMs - Timeout in milliseconds (default: 90000)
 * @param requestId - Optional request ID for cancellation support
 * @param workspaceRoot - The workspace root path for CLI execution
 * @returns SubAgentFlow refinement result
 */
export async function refineSubAgentFlow(
  innerWorkflow: InnerWorkflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  extensionPath: string,
  useSkills = true,
  timeoutMs = MAX_REFINEMENT_TIMEOUT_MS,
  requestId?: string,
  workspaceRoot?: string
): Promise<SubAgentFlowRefinementResult> {
  const startTime = Date.now();

  log('INFO', 'Starting SubAgentFlow refinement', {
    requestId,
    nodeCount: innerWorkflow.nodes.length,
    messageLength: userMessage.length,
    historyLength: conversationHistory.messages.length,
    currentIteration: conversationHistory.currentIteration,
    useSkills,
    timeoutMs,
  });

  try {
    // Step 1: Load workflow schema (and optionally scan skills)
    const schemaPath = getDefaultSchemaPath(extensionPath);

    let schemaResult: Awaited<ReturnType<typeof loadWorkflowSchema>>;
    let availableSkills: SkillReference[] = [];
    let filteredSkills: SkillRelevanceScore[] = [];

    if (useSkills) {
      const [loadedSchema, skillsResult] = await Promise.all([
        loadWorkflowSchema(schemaPath),
        scanAllSkills(),
      ]);

      schemaResult = loadedSchema;

      if (!schemaResult.success || !schemaResult.schema) {
        log('ERROR', 'Failed to load workflow schema for SubAgentFlow', {
          requestId,
          errorMessage: schemaResult.error?.message,
        });

        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to load workflow schema',
            details: schemaResult.error?.message,
          },
          executionTimeMs: Date.now() - startTime,
        };
      }

      availableSkills = [...skillsResult.personal, ...skillsResult.project];
      filteredSkills = filterSkillsByRelevance(userMessage, availableSkills);

      log('INFO', 'Skills filtered for SubAgentFlow refinement', {
        requestId,
        filteredCount: filteredSkills.length,
      });
    } else {
      schemaResult = await loadWorkflowSchema(schemaPath);

      if (!schemaResult.success || !schemaResult.schema) {
        return {
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to load workflow schema',
            details: schemaResult.error?.message,
          },
          executionTimeMs: Date.now() - startTime,
        };
      }
    }

    // Step 2: Construct SubAgentFlow-specific refinement prompt
    const prompt = constructSubAgentFlowRefinementPrompt(
      innerWorkflow,
      conversationHistory,
      userMessage,
      schemaResult.schema,
      filteredSkills
    );

    // Step 3: Execute Claude Code CLI
    const cliResult = await executeClaudeCodeCLI(prompt, timeoutMs, requestId, workspaceRoot);

    if (!cliResult.success || !cliResult.output) {
      log('ERROR', 'SubAgentFlow refinement failed during CLI execution', {
        requestId,
        errorCode: cliResult.error?.code,
        errorMessage: cliResult.error?.message,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: cliResult.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during CLI execution',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 4: Check if output is a clarification message
    if (isClarificationMessage(cliResult.output)) {
      const clarificationText = extractClarificationMessage(cliResult.output);

      log('INFO', 'AI is requesting clarification for SubAgentFlow', {
        requestId,
        outputPreview: clarificationText.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: true,
        clarificationMessage: clarificationText,
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 5: Parse CLI output as inner workflow JSON
    const parsedOutput = parseClaudeCodeOutput(cliResult.output);

    if (!parsedOutput) {
      log('ERROR', 'Failed to parse SubAgentFlow CLI output', {
        requestId,
        outputPreview: cliResult.output.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse AI response. Please try again or rephrase your request',
          details: 'Failed to parse JSON from Claude Code output',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Type check: ensure parsed output has nodes and connections
    const refinedInnerWorkflow = parsedOutput as InnerWorkflow;

    if (!refinedInnerWorkflow.nodes || !refinedInnerWorkflow.connections) {
      log('ERROR', 'Parsed SubAgentFlow output missing required fields', {
        requestId,
        hasNodes: !!refinedInnerWorkflow.nodes,
        hasConnections: !!refinedInnerWorkflow.connections,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Refinement failed - AI output does not match expected format',
          details: 'Missing required fields (nodes or connections)',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 6: Validate prohibited node types
    const nodeValidation = validateSubAgentFlowNodes(refinedInnerWorkflow);

    if (!nodeValidation.valid) {
      log('ERROR', 'SubAgentFlow contains prohibited node types', {
        requestId,
        prohibitedNodes: nodeValidation.prohibitedNodes,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PROHIBITED_NODE_TYPE',
          message: 'Sub-Agent Flow cannot contain SubAgent, SubAgentFlow, or AskUserQuestion nodes',
          details: `Prohibited nodes found: ${nodeValidation.prohibitedNodes.join(', ')}`,
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 7: Validate node count
    if (refinedInnerWorkflow.nodes.length > SUBAGENTFLOW_MAX_NODES) {
      log('ERROR', 'SubAgentFlow exceeds maximum node count', {
        requestId,
        nodeCount: refinedInnerWorkflow.nodes.length,
        maxNodes: SUBAGENTFLOW_MAX_NODES,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Sub-Agent Flow cannot exceed ${SUBAGENTFLOW_MAX_NODES} nodes`,
          details: `Current count: ${refinedInnerWorkflow.nodes.length}`,
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 8: Resolve skill paths if using skills
    if (useSkills) {
      // Create a temporary workflow object for skill path resolution
      const tempWorkflow: Workflow = {
        id: 'temp',
        name: 'temp',
        version: '1.0.0',
        nodes: refinedInnerWorkflow.nodes,
        connections: refinedInnerWorkflow.connections,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const resolvedWorkflow = await resolveSkillPaths(tempWorkflow, availableSkills);
      refinedInnerWorkflow.nodes = resolvedWorkflow.nodes;

      log('INFO', 'Skill paths resolved for SubAgentFlow', {
        requestId,
        skillNodesCount: refinedInnerWorkflow.nodes.filter((n) => n.type === 'skill').length,
      });
    }

    const executionTimeMs = Date.now() - startTime;

    log('INFO', 'SubAgentFlow refinement successful', {
      requestId,
      executionTimeMs,
      nodeCount: refinedInnerWorkflow.nodes.length,
      connectionCount: refinedInnerWorkflow.connections.length,
    });

    return {
      success: true,
      refinedInnerWorkflow,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error during SubAgentFlow refinement', {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred during refinement',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
    };
  }
}
