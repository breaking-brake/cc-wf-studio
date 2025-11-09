/**
 * AI Generation Command Handler
 *
 * Handles GENERATE_WORKFLOW messages from Webview and orchestrates AI workflow generation.
 * Based on: /specs/001-ai-workflow-generation/plan.md
 */

import type * as vscode from 'vscode';
import type {
  GenerateWorkflowPayload,
  GenerationFailedPayload,
  GenerationSuccessPayload,
  SkillReference,
  Workflow,
} from '../../shared/types/messages';
import type { SkillNodeData } from '../../shared/types/workflow-definition';
import { log } from '../extension';
import { executeClaudeCodeCLI, parseClaudeCodeOutput } from '../services/claude-code-service';
import { getDefaultSchemaPath, loadWorkflowSchema } from '../services/schema-loader-service';
import {
  type SkillRelevanceScore,
  filterSkillsByRelevance,
} from '../services/skill-relevance-matcher';
import { scanAllSkills } from '../services/skill-service';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';

/**
 * Handle AI workflow generation request
 *
 * @param payload - The generation request from Webview
 * @param webview - The webview to send response messages to
 * @param extensionPath - The extension's root path
 * @param requestId - The request ID for correlation
 */
export async function handleGenerateWorkflow(
  payload: GenerateWorkflowPayload,
  webview: vscode.Webview,
  extensionPath: string,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'AI Workflow Generation started', {
    requestId,
    descriptionLength: payload.userDescription.length,
    timeoutMs: payload.timeoutMs,
  });

  try {
    // Step 1: Load workflow schema and scan Skills in parallel (T014)
    const schemaPath = getDefaultSchemaPath(extensionPath);
    const [schemaResult, skillsResult] = await Promise.all([
      loadWorkflowSchema(schemaPath),
      scanAllSkills(),
    ]);

    if (!schemaResult.success || !schemaResult.schema) {
      // Schema loading failed
      log('ERROR', 'Failed to load workflow schema', {
        requestId,
        errorMessage: schemaResult.error?.message,
      });

      sendGenerationFailed(webview, requestId, {
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to load workflow schema',
          details: schemaResult.error?.message,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'Workflow schema loaded successfully', { requestId });

    // Combine personal and project Skills
    const availableSkills: SkillReference[] = [...skillsResult.personal, ...skillsResult.project];

    log('INFO', 'Skills scanned successfully', {
      requestId,
      personalCount: skillsResult.personal.length,
      projectCount: skillsResult.project.length,
      totalCount: availableSkills.length,
    });

    // Step 2: Filter Skills by relevance (T015)
    const filteredSkills = filterSkillsByRelevance(payload.userDescription, availableSkills);

    log('INFO', 'Skills filtered by relevance', {
      requestId,
      filteredCount: filteredSkills.length,
      topSkills: filteredSkills.slice(0, 5).map((s) => ({ name: s.skill.name, score: s.score })),
    });

    // Step 3: Construct prompt with Skills (T016-T017)
    const prompt = constructPrompt(payload.userDescription, schemaResult.schema, filteredSkills);

    // Step 3: Execute Claude Code CLI (pass requestId for cancellation support)
    const timeout = payload.timeoutMs ?? 60000;
    const cliResult = await executeClaudeCodeCLI(prompt, timeout, requestId);

    if (!cliResult.success || !cliResult.output) {
      // CLI execution failed
      log('ERROR', 'AI generation failed during CLI execution', {
        requestId,
        errorCode: cliResult.error?.code,
        errorMessage: cliResult.error?.message,
        executionTimeMs: cliResult.executionTimeMs,
      });

      sendGenerationFailed(webview, requestId, {
        error: cliResult.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during CLI execution',
        },
        executionTimeMs: cliResult.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'CLI execution successful, parsing output', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
    });

    // Step 4: Parse CLI output
    const parsedOutput = parseClaudeCodeOutput(cliResult.output);

    if (!parsedOutput) {
      // Parsing failed
      log('ERROR', 'Failed to parse CLI output', {
        requestId,
        outputPreview: cliResult.output.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      sendGenerationFailed(webview, requestId, {
        error: {
          code: 'PARSE_ERROR',
          message: 'Generation failed - please try again or rephrase your description',
          details: 'Failed to parse JSON from Claude Code output',
        },
        executionTimeMs: cliResult.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'Output parsed successfully, validating workflow', { requestId });

    // Step 5: Resolve Skill paths (T019-T021)
    const workflowWithResolvedSkills = await resolveSkillPaths(
      parsedOutput as Workflow,
      availableSkills
    );

    log('INFO', 'Skill paths resolved', {
      requestId,
      skillNodesCount: workflowWithResolvedSkills.nodes.filter((n) => n.type === 'skill').length,
    });

    // Step 6: Validate workflow
    const validationResult = validateAIGeneratedWorkflow(workflowWithResolvedSkills);

    if (!validationResult.valid) {
      // Validation failed
      const errorMessages = validationResult.errors.map((e) => e.message).join('; ');
      log('ERROR', 'Generated workflow failed validation', {
        requestId,
        errorCount: validationResult.errors.length,
        errors: validationResult.errors,
        executionTimeMs: cliResult.executionTimeMs,
      });

      sendGenerationFailed(webview, requestId, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Generated workflow failed validation',
          details: errorMessages,
        },
        executionTimeMs: cliResult.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'Workflow validated successfully', {
      requestId,
      nodeCount: workflowWithResolvedSkills.nodes?.length ?? 0,
      connectionCount: workflowWithResolvedSkills.connections?.length ?? 0,
    });

    // Step 7: Adjust node positions for better spacing
    const adjustedWorkflow = adjustNodeSpacing(workflowWithResolvedSkills);

    // Step 7: Success - send generated workflow
    log('INFO', 'AI Workflow Generation completed successfully', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
      workflowName: adjustedWorkflow.name,
    });

    sendGenerationSuccess(webview, requestId, {
      workflow: adjustedWorkflow,
      executionTimeMs: cliResult.executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Unexpected error
    const executionTimeMs = Date.now() - startTime;
    log('ERROR', 'Unexpected error during AI Workflow Generation', {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      executionTimeMs,
    });

    sendGenerationFailed(webview, requestId, {
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Estimated widths for each node type (in pixels)
 * These values are based on typical rendered widths in React Flow
 */
const NODE_TYPE_WIDTHS: Record<string, number> = {
  start: 150,
  end: 150,
  prompt: 250,
  subAgent: 280,
  ifElse: 300,
  switch: 350,
  askUserQuestion: 400, // Wide due to multiple choice options
};

/**
 * Get estimated width for a node based on its type
 */
function getNodeWidth(nodeType: string): number {
  return NODE_TYPE_WIDTHS[nodeType] ?? 250; // Default to 250px for unknown types
}

/**
 * Adjust node spacing for better visual layout
 *
 * AI-generated workflows may have overlapping nodes due to tight X-axis spacing.
 * This function redistributes nodes horizontally based on their actual widths,
 * ensuring wider nodes (like AskUserQuestion) don't overlap with subsequent nodes.
 *
 * @param workflow - The AI-generated workflow
 * @returns Workflow with adjusted node positions
 */
function adjustNodeSpacing(workflow: Workflow): Workflow {
  const LAYER_TOLERANCE = 100; // Nodes within this X distance are considered same layer
  const HORIZONTAL_PADDING = 40; // Minimum padding between node layers
  const START_X = 100; // Starting X position

  // Sort nodes by X position
  const sortedNodes = [...workflow.nodes].sort((a, b) => a.position.x - b.position.x);

  // Group nodes into layers (columns) based on X proximity
  const layers: (typeof sortedNodes)[] = [];
  let currentLayer: typeof sortedNodes = [];
  let lastX = Number.NEGATIVE_INFINITY;

  for (const node of sortedNodes) {
    if (currentLayer.length === 0 || node.position.x - lastX <= LAYER_TOLERANCE) {
      // Same layer
      currentLayer.push(node);
      lastX = Math.max(lastX, node.position.x);
    } else {
      // New layer
      layers.push(currentLayer);
      currentLayer = [node];
      lastX = node.position.x;
    }
  }
  if (currentLayer.length > 0) {
    layers.push(currentLayer);
  }

  // Calculate X position for each layer based on maximum width of previous layer
  const layerXPositions: number[] = [];
  let currentX = START_X;

  for (let i = 0; i < layers.length; i++) {
    layerXPositions.push(currentX);

    // Find maximum width in current layer
    const maxWidth = Math.max(...layers[i].map((node) => getNodeWidth(node.type)));

    // Next layer starts at: current X + max width of current layer + padding
    currentX += maxWidth + HORIZONTAL_PADDING;
  }

  // Assign new X positions to each node based on its layer
  const adjustedNodes = workflow.nodes.map((node) => {
    // Find which layer this node belongs to
    const layerIndex = layers.findIndex((layer) => layer.some((n) => n.id === node.id));
    const newX = layerXPositions[layerIndex] ?? START_X;

    return {
      ...node,
      position: {
        x: newX,
        y: node.position.y, // Keep Y position unchanged
      },
    };
  });

  return {
    ...workflow,
    nodes: adjustedNodes,
  };
}

/**
 * Construct prompt for Claude Code CLI with available Skills
 *
 * Based on: /specs/001-ai-workflow-generation/research.md Q4
 * Enhanced with: /specs/001-ai-skill-generation/contracts/skill-scanning-api.md Section 3.1
 *
 * @param userDescription - User's workflow description
 * @param schema - Workflow schema
 * @param filteredSkills - Top N relevant Skills (T016)
 * @returns Complete prompt string
 */
function constructPrompt(
  userDescription: string,
  schema: unknown,
  filteredSkills: SkillRelevanceScore[]
): string {
  const schemaJSON = JSON.stringify(schema, null, 2);

  // Prepare Skills list for AI prompt (T017)
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

**Task**: Generate a valid workflow JSON based on the user's natural language description.

**User Description**:
${userDescription}
${skillsSection}
**Workflow Schema**:
${schemaJSON}

**Output Requirements**:
- Output ONLY valid JSON matching the Workflow interface
- Do NOT include explanations, markdown, or additional text
- ONLY use node types that are listed in the supportedNodeTypes array
- Ensure the workflow has exactly one Start node and at least one End node
- Respect the maximum node limit of 50
- All connections must be valid (no connections from End nodes, no connections to Start nodes)
- Node IDs must be unique
- All required fields for each node type must be present
- Use semantic version for workflow version (e.g., "1.0.0")
- Set createdAt and updatedAt to current ISO 8601 timestamp

**Output Format**:
\`\`\`json
{
  "id": "generated-workflow-${Date.now()}",
  "name": "...",
  "version": "1.0.0",
  "nodes": [...],
  "connections": [...],
  "createdAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}"
}
\`\`\``;
}

/**
 * Resolve skillPath for AI-generated Skill nodes
 *
 * Based on: /specs/001-ai-skill-generation/contracts/skill-scanning-api.md Section 4.1
 *
 * @param workflow - AI-generated workflow (may have unresolved Skill nodes)
 * @param availableSkills - All scanned Skills (with paths)
 * @returns Modified workflow with resolved skillPath values (T019-T020)
 */
async function resolveSkillPaths(
  workflow: Workflow,
  availableSkills: SkillReference[]
): Promise<Workflow> {
  const resolvedNodes = workflow.nodes.map((node) => {
    if (node.type !== 'skill') {
      return node; // Not a Skill node, no changes
    }

    // Find matching Skill from scanned list
    const skillData = node.data as SkillNodeData;

    const matchedSkill = availableSkills.find(
      (skill) => skill.name === skillData.name && skill.scope === skillData.scope
    );

    if (matchedSkill) {
      // Skill found - resolve path (preserve all existing fields)
      return {
        ...node,
        data: {
          ...skillData,
          skillPath: matchedSkill.skillPath,
          validationStatus: matchedSkill.validationStatus,
        } as SkillNodeData,
      };
    }
    // Skill not found - mark as missing (T020, preserve all existing fields)
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

/**
 * Send GENERATION_SUCCESS message to Webview
 */
function sendGenerationSuccess(
  webview: vscode.Webview,
  requestId: string,
  payload: GenerationSuccessPayload
): void {
  webview.postMessage({
    type: 'GENERATION_SUCCESS',
    requestId,
    payload,
  });
}

/**
 * Send GENERATION_FAILED message to Webview
 */
function sendGenerationFailed(
  webview: vscode.Webview,
  requestId: string,
  payload: GenerationFailedPayload
): void {
  webview.postMessage({
    type: 'GENERATION_FAILED',
    requestId,
    payload,
  });
}
