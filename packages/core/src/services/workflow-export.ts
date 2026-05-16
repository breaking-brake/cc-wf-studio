/**
 * Pure formatters and planner for cc-wf-studio's .claude file export.
 *
 * Generates the textual contents of `.claude/agents/*.md` and
 * `.claude/commands/<workflow>.md`. No file I/O — callers (the VSCode
 * extension's export-service, the `ccwf run` CLI command) are responsible for
 * actually writing the bytes.
 */

import type { SubAgentFlow, SubAgentFlowNode, SubAgentNode, Workflow } from '../types/workflow-definition.js';
import {
  generateExecutionInstructions,
  generateMermaidFlowchart,
} from './workflow-prompt-generator.js';

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/**
 * Convert a node / workflow display name to a kebab filename.
 *
 * The transformation is lossy (drops anything outside `[a-z0-9-_]`) and matches
 * the historic behaviour the VSCode extension has been shipping since v1.
 */
export function nodeNameToFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

// ---------------------------------------------------------------------------
// YAML helpers
// ---------------------------------------------------------------------------

/**
 * Format a YAML scalar with proper escaping.
 *
 * Used for hook commands and any other value that may contain YAML special
 * characters. Strips `\n` / `\r` so the resulting value is always a single line
 * — multi-line hook commands are not supported by the export contract.
 */
export function escapeYamlString(value: string, alwaysQuote = false): string {
  if (
    alwaysQuote ||
    /[:[\]{}&*?|<>=!%@#`'",\n\r\\]/.test(value) ||
    value.startsWith(' ') ||
    value.endsWith(' ')
  ) {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/[\n\r]/g, '');
    return `"${escaped}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// File content generators
// ---------------------------------------------------------------------------

/** Options for generating Sub-Agent files for different providers. */
export interface SubAgentFileOptions {
  /** Output `readonly: true` in frontmatter (e.g., for Cursor). */
  readonly?: boolean;
  /** Omit `model:` entirely (e.g., for CC-specific models like haiku). */
  omitModel?: boolean;
}

/** Generate Sub-Agent configuration file content. */
export function generateSubAgentFile(node: SubAgentNode, options?: SubAgentFileOptions): string {
  const { name, data } = node;
  const agentName = nodeNameToFileName(name);

  const frontmatter = ['---', `name: ${agentName}`, `description: ${data.description || name}`];

  if (data.tools && data.tools.length > 0) {
    frontmatter.push(`tools: ${data.tools}`);
  }

  if (!options?.omitModel) {
    if (data.model) {
      frontmatter.push(`model: ${data.model}`);
    } else {
      frontmatter.push('model: sonnet');
    }
  }

  if (options?.readonly) {
    frontmatter.push('readonly: true');
  }

  if (data.color) {
    frontmatter.push(`color: ${data.color}`);
  }

  if (data.memory) {
    frontmatter.push(`memory: ${data.memory}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  const agentDefinition = data.agentDefinition || data.prompt || '';

  return frontmatter.join('\n') + agentDefinition;
}

/**
 * Generate Sub-Agent file content from a `SubAgentFlow`.
 *
 * Converts a SubAgentFlow into a Sub-Agent `.md` file that can be executed by
 * Claude Code. The SubAgentFlow's nodes are converted to sequential execution
 * steps via the shared Mermaid + execution-instructions generators.
 *
 * @param agentFileName Already-sanitized filename (format: `{parent}_{flow}`).
 * @param referencingNode Optional `SubAgentFlowNode` (provides model / tools / color / memory).
 */
export function generateSubAgentFlowAgentFile(
  subAgentFlow: SubAgentFlow,
  agentFileName: string,
  referencingNode?: SubAgentFlowNode,
  options?: { highlightEnabled?: boolean }
): string {
  const agentName = agentFileName;

  const model = referencingNode?.data.model || 'sonnet';
  const tools = referencingNode?.data.tools;
  const color = referencingNode?.data.color;
  const memory = referencingNode?.data.memory;

  const frontmatter = [
    '---',
    `name: ${agentName}`,
    `description: ${subAgentFlow.description || subAgentFlow.name}`,
  ];

  if (tools && tools.length > 0) {
    frontmatter.push(`tools: ${tools}`);
  }

  frontmatter.push(`model: ${model}`);

  if (color) {
    frontmatter.push(`color: ${color}`);
  }

  if (memory) {
    frontmatter.push(`memory: ${memory}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  const mermaidFlowchart = generateMermaidFlowchart({
    nodes: subAgentFlow.nodes,
    connections: subAgentFlow.connections,
  });

  // Only `name`, `description`, `nodes`, `connections` are read downstream.
  // The rest of the Workflow contract is satisfied with placeholders so the
  // pure formatter can be reached from non-bundler tsc builds.
  const pseudoWorkflow: Workflow = {
    id: subAgentFlow.id,
    name: subAgentFlow.name,
    description: subAgentFlow.description,
    version: '1.0.0',
    nodes: subAgentFlow.nodes,
    connections: subAgentFlow.connections,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  const executionLogic = generateExecutionInstructions(pseudoWorkflow, {
    provider: 'claude-code',
    highlightEnabled: options?.highlightEnabled,
  });

  return `${frontmatter.join('\n')}${mermaidFlowchart}\n\n${executionLogic}`;
}

/** Generate the `.claude/commands/<workflow>.md` SlashCommand file content. */
export function generateSlashCommandFile(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): string {
  const frontmatterLines = [
    '---',
    `description: ${escapeYamlString(workflow.description || workflow.name)}`,
  ];

  if (workflow.slashCommandOptions?.allowedTools) {
    frontmatterLines.push(`allowed-tools: ${workflow.slashCommandOptions.allowedTools}`);
  }

  if (workflow.slashCommandOptions?.model && workflow.slashCommandOptions.model !== 'default') {
    frontmatterLines.push(`model: ${workflow.slashCommandOptions.model}`);
  }

  if (workflow.slashCommandOptions?.context && workflow.slashCommandOptions.context !== 'default') {
    frontmatterLines.push(`context: ${workflow.slashCommandOptions.context}`);
  }

  if (workflow.slashCommandOptions?.disableModelInvocation) {
    frontmatterLines.push('disable-model-invocation: true');
  }

  if (workflow.slashCommandOptions?.argumentHint) {
    frontmatterLines.push(`argument-hint: ${workflow.slashCommandOptions.argumentHint}`);
  }

  const hooks = workflow.slashCommandOptions?.hooks;
  if (hooks && Object.keys(hooks).length > 0) {
    frontmatterLines.push('hooks:');
    for (const [hookType, entries] of Object.entries(hooks)) {
      if (entries && entries.length > 0) {
        frontmatterLines.push(`  ${hookType}:`);
        for (const entry of entries) {
          if (entry.matcher) {
            frontmatterLines.push(`    - matcher: ${escapeYamlString(entry.matcher, true)}`);
            frontmatterLines.push('      hooks:');
          } else {
            frontmatterLines.push('    - hooks:');
          }
          for (const action of entry.hooks) {
            frontmatterLines.push(`        - type: ${action.type}`);
            frontmatterLines.push(`          command: ${escapeYamlString(action.command, true)}`);
            if (action.once) {
              frontmatterLines.push('          once: true');
            }
          }
        }
      }
    }
  }

  frontmatterLines.push('---', '');
  const frontmatter = frontmatterLines.join('\n');

  const mermaidFlowchart = generateMermaidFlowchart(workflow);

  const workflowBaseName = nodeNameToFileName(workflow.name);
  const executionLogic = generateExecutionInstructions(workflow, {
    parentWorkflowName: workflowBaseName,
    subAgentFlows: workflow.subAgentFlows,
    provider: 'claude-code',
    highlightEnabled: options?.highlightEnabled,
  });

  return `${frontmatter}${mermaidFlowchart}\n\n${executionLogic}`;
}

// ---------------------------------------------------------------------------
// .claude file validation
// ---------------------------------------------------------------------------

/** Validate the textual contract of a `.claude/*` file. Throws on violation. */
export function validateClaudeFileFormat(
  content: string,
  fileType: 'subAgent' | 'slashCommand'
): void {
  if (!content || content.trim().length === 0) {
    throw new Error('File content is empty');
  }

  if (content.includes('�')) {
    throw new Error('File content contains invalid UTF-8 characters');
  }

  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Missing or invalid YAML frontmatter (must start and end with ---)');
  }

  const frontmatterContent = match[1];

  if (fileType === 'subAgent') {
    if (!frontmatterContent.includes('name:')) {
      throw new Error('Sub-Agent file missing required field: name');
    }
    if (!frontmatterContent.includes('description:')) {
      throw new Error('Sub-Agent file missing required field: description');
    }
    if (!frontmatterContent.includes('model:')) {
      throw new Error('Sub-Agent file missing required field: model');
    }
  } else if (fileType === 'slashCommand') {
    if (!frontmatterContent.includes('description:')) {
      throw new Error('SlashCommand file missing required field: description');
    }
  }

  const bodyContent = content.substring(match[0].length).trim();
  if (bodyContent.length === 0) {
    throw new Error('File is missing prompt body content after frontmatter');
  }
}

// ---------------------------------------------------------------------------
// Export planner (pure, I/O-free)
// ---------------------------------------------------------------------------

export type PlannedExportFileKind = 'subAgent' | 'subAgentFlow' | 'slashCommand';

export interface PlannedExportFile {
  /**
   * Path relative to the project root, with forward slashes
   * (e.g. `.claude/agents/my-agent.md`).
   */
  relativePath: string;
  contents: string;
  kind: PlannedExportFileKind;
  /** Original display name of the source node / flow / workflow. */
  sourceName: string;
}

export interface PlanWorkflowExportOptions {
  highlightEnabled?: boolean;
}

const AGENTS_DIR = '.claude/agents';
const COMMANDS_DIR = '.claude/commands';

/**
 * Plan the set of files `ccwf run` (and the VSCode extension's export flow)
 * needs to write for a given workflow.
 *
 * Skips Sub-Agent nodes that already reference an external file
 * (`commandFilePath`, `pluginName`, `builtInType`) — these are already on disk.
 */
export function planWorkflowExportFiles(
  workflow: Workflow,
  options?: PlanWorkflowExportOptions
): PlannedExportFile[] {
  const planned: PlannedExportFile[] = [];

  // Inline Sub-Agent nodes
  const subAgentNodes = workflow.nodes.filter(
    (node): node is SubAgentNode => node.type === 'subAgent'
  );
  for (const node of subAgentNodes) {
    if (node.data.commandFilePath) continue;
    if (node.data.pluginName) continue;
    if (node.data.builtInType) continue;
    const fileName = nodeNameToFileName(node.name);
    planned.push({
      relativePath: `${AGENTS_DIR}/${fileName}.md`,
      contents: generateSubAgentFile(node),
      kind: 'subAgent',
      sourceName: node.name,
    });
  }

  // SubAgentFlow → agent files (format: <workflow>_<flow>.md)
  const workflowBaseName = nodeNameToFileName(workflow.name);
  if (workflow.subAgentFlows && workflow.subAgentFlows.length > 0) {
    const subAgentFlowNodes = workflow.nodes.filter(
      (node): node is SubAgentFlowNode => node.type === 'subAgentFlow'
    );
    for (const subAgentFlow of workflow.subAgentFlows) {
      const subAgentFlowFileName = nodeNameToFileName(subAgentFlow.name);
      const fileName = `${workflowBaseName}_${subAgentFlowFileName}`;
      const referencingNode = subAgentFlowNodes.find(
        (node) => node.data.subAgentFlowId === subAgentFlow.id
      );
      planned.push({
        relativePath: `${AGENTS_DIR}/${fileName}.md`,
        contents: generateSubAgentFlowAgentFile(subAgentFlow, fileName, referencingNode, options),
        kind: 'subAgentFlow',
        sourceName: subAgentFlow.name,
      });
    }
  }

  // SlashCommand
  planned.push({
    relativePath: `${COMMANDS_DIR}/${workflowBaseName}.md`,
    contents: generateSlashCommandFile(workflow, options),
    kind: 'slashCommand',
    sourceName: workflow.name,
  });

  return planned;
}
