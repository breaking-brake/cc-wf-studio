/**
 * Claude Code Workflow Studio - Export Service
 *
 * Handles workflow export to .claude format
 * Based on: /specs/001-cc-wf-studio/spec.md Export Format Details
 */

import * as path from 'node:path';
import type {
  SubAgentFlow,
  SubAgentFlowNode,
  SubAgentNode,
  Workflow,
} from '../../shared/types/workflow-definition';
import type { FileService } from './file-service';
import {
  generateExecutionInstructions,
  generateMermaidFlowchart,
  sanitizeNodeId,
} from './workflow-prompt-generator';

/**
 * Check if any export files already exist
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Array of existing file paths (empty if no conflicts)
 */
export async function checkExistingFiles(
  workflow: Workflow,
  fileService: FileService
): Promise<string[]> {
  const existingFiles: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  const agentsDir = path.join(workspacePath, '.claude', 'agents');
  const commandsDir = path.join(workspacePath, '.claude', 'commands');

  // Check Sub-Agent files
  const subAgentNodes = workflow.nodes.filter((node) => node.type === 'subAgent') as SubAgentNode[];
  for (const node of subAgentNodes) {
    const fileName = nodeNameToFileName(node.name);
    const filePath = path.join(agentsDir, `${fileName}.md`);
    if (await fileService.fileExists(filePath)) {
      existingFiles.push(filePath);
    }
  }

  // Check SubAgentFlow agent files (Issue #89)
  // File format: {parent-workflow-name}_{subagentflow-name}.md
  const workflowBaseName = nodeNameToFileName(workflow.name);
  if (workflow.subAgentFlows && workflow.subAgentFlows.length > 0) {
    for (const subAgentFlow of workflow.subAgentFlows) {
      const subAgentFlowFileName = nodeNameToFileName(subAgentFlow.name);
      const fileName = `${workflowBaseName}_${subAgentFlowFileName}`;
      const filePath = path.join(agentsDir, `${fileName}.md`);
      if (await fileService.fileExists(filePath)) {
        existingFiles.push(filePath);
      }
    }
  }

  // Check SlashCommand file
  const commandFileName = workflowBaseName;
  const commandFilePath = path.join(commandsDir, `${commandFileName}.md`);
  if (await fileService.fileExists(commandFilePath)) {
    existingFiles.push(commandFilePath);
  }

  return existingFiles;
}

/**
 * Export workflow to .claude format
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Array of exported file paths
 */
export async function exportWorkflow(
  workflow: Workflow,
  fileService: FileService
): Promise<string[]> {
  const exportedFiles: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  // Create .claude directories if they don't exist
  const agentsDir = path.join(workspacePath, '.claude', 'agents');
  const commandsDir = path.join(workspacePath, '.claude', 'commands');

  await fileService.createDirectory(path.join(workspacePath, '.claude'));
  await fileService.createDirectory(agentsDir);
  await fileService.createDirectory(commandsDir);

  // Export Sub-Agent nodes
  const subAgentNodes = workflow.nodes.filter((node) => node.type === 'subAgent') as SubAgentNode[];
  for (const node of subAgentNodes) {
    const fileName = nodeNameToFileName(node.name);
    const filePath = path.join(agentsDir, `${fileName}.md`);
    const content = generateSubAgentFile(node);
    await fileService.writeFile(filePath, content);
    exportedFiles.push(filePath);
  }

  // Export SubAgentFlow as Sub-Agent files (Issue #89)
  // File format: {parent-workflow-name}_{subagentflow-name}.md
  const workflowBaseName = nodeNameToFileName(workflow.name);
  if (workflow.subAgentFlows && workflow.subAgentFlows.length > 0) {
    // Get all SubAgentFlow nodes to access their model/tools/color settings
    const subAgentFlowNodes = workflow.nodes.filter(
      (node) => node.type === 'subAgentFlow'
    ) as SubAgentFlowNode[];

    for (const subAgentFlow of workflow.subAgentFlows) {
      const subAgentFlowFileName = nodeNameToFileName(subAgentFlow.name);
      const fileName = `${workflowBaseName}_${subAgentFlowFileName}`;
      const filePath = path.join(agentsDir, `${fileName}.md`);

      // Find the node that references this SubAgentFlow to get model/tools/color
      const referencingNode = subAgentFlowNodes.find(
        (node) => node.data.subAgentFlowId === subAgentFlow.id
      );

      const content = generateSubAgentFlowAgentFile(subAgentFlow, fileName, referencingNode);
      await fileService.writeFile(filePath, content);
      exportedFiles.push(filePath);
    }
  }

  // Export SlashCommand
  const commandFileName = workflowBaseName;
  const commandFilePath = path.join(commandsDir, `${commandFileName}.md`);
  const commandContent = generateSlashCommandFile(workflow);
  await fileService.writeFile(commandFilePath, commandContent);
  exportedFiles.push(commandFilePath);

  return exportedFiles;
}

/**
 * Validate .claude file format
 *
 * @param content - File content to validate
 * @param fileType - Type of file ('subAgent' or 'slashCommand')
 * @throws Error if validation fails
 */
export function validateClaudeFileFormat(
  content: string,
  fileType: 'subAgent' | 'slashCommand'
): void {
  // Check if content is non-empty
  if (!content || content.trim().length === 0) {
    throw new Error('File content is empty');
  }

  // Check UTF-8 encoding (string should not contain replacement characters)
  if (content.includes('\uFFFD')) {
    throw new Error('File content contains invalid UTF-8 characters');
  }

  // Check YAML frontmatter format
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Missing or invalid YAML frontmatter (must start and end with ---)');
  }

  const frontmatterContent = match[1];

  // Validate required fields based on file type
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
    // Issue #424: allowed-tools is optional (omit = use Claude Code default)
  }

  // Check that there's content after frontmatter (prompt body)
  const bodyContent = content.substring(match[0].length).trim();
  if (bodyContent.length === 0) {
    throw new Error('File is missing prompt body content after frontmatter');
  }
}

/**
 * Convert node name to filename
 *
 * @param name - Node name
 * @returns Filename (lowercase, spaces to hyphens)
 */
export function nodeNameToFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

/**
 * Generate Sub-Agent configuration file content
 *
 * @param node - Sub-Agent node
 * @returns Markdown content with YAML frontmatter
 */
export function generateSubAgentFile(node: SubAgentNode): string {
  const { name, data } = node;
  const agentName = nodeNameToFileName(name);

  // YAML frontmatter
  const frontmatter = ['---', `name: ${agentName}`, `description: ${data.description || name}`];

  // Add optional fields
  if (data.tools && data.tools.length > 0) {
    frontmatter.push(`tools: ${data.tools}`);
  }

  if (data.model) {
    frontmatter.push(`model: ${data.model}`);
  } else {
    frontmatter.push('model: sonnet');
  }

  if (data.color) {
    frontmatter.push(`color: ${data.color}`);
  }

  if (data.memory) {
    frontmatter.push(`memory: ${data.memory}`);
  }

  frontmatter.push('---');
  frontmatter.push('');

  // Prompt body
  const prompt = data.prompt || '';

  return frontmatter.join('\n') + prompt;
}

/**
 * Generate Sub-Agent file content from SubAgentFlow (Issue #89)
 *
 * Converts a SubAgentFlow into a Sub-Agent .md file that can be executed
 * by Claude Code. The SubAgentFlow's nodes are converted to sequential
 * execution steps.
 *
 * @param subAgentFlow - SubAgentFlow definition
 * @param agentFileName - Generated file name (format: {parent}_{subagentflow})
 * @param referencingNode - Optional SubAgentFlowNode that references this flow (for model/tools/color)
 * @returns Markdown content with YAML frontmatter
 */
export function generateSubAgentFlowAgentFile(
  subAgentFlow: SubAgentFlow,
  agentFileName: string,
  referencingNode?: SubAgentFlowNode
): string {
  const agentName = agentFileName;

  // Get model/tools/color/memory from referencing node, or use defaults
  const model = referencingNode?.data.model || 'sonnet';
  const tools = referencingNode?.data.tools;
  const color = referencingNode?.data.color;
  const memory = referencingNode?.data.memory;

  // YAML frontmatter (same structure as SubAgent)
  const frontmatter = [
    '---',
    `name: ${agentName}`,
    `description: ${subAgentFlow.description || subAgentFlow.name}`,
  ];

  // Add optional fields
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

  // Generate Mermaid flowchart using shared module
  const mermaidFlowchart = generateMermaidFlowchart({
    nodes: subAgentFlow.nodes,
    connections: subAgentFlow.connections,
  });

  // Create a pseudo-Workflow object to reuse generateExecutionInstructions
  const pseudoWorkflow: Workflow = {
    name: subAgentFlow.name,
    description: subAgentFlow.description,
    nodes: subAgentFlow.nodes,
    connections: subAgentFlow.connections,
  };

  // Generate execution logic using shared module
  const executionLogic = generateExecutionInstructions(pseudoWorkflow, {
    provider: 'claude-code',
  });

  return `${frontmatter.join('\n')}${mermaidFlowchart}\n\n${executionLogic}`;
}

/**
 * Format YAML string values with proper escaping
 *
 * Issue #413: Used for hooks command values in frontmatter
 * Issue #485: Properly escape backslashes and quotes, remove newlines
 *
 * @param value - String value to format
 * @param alwaysQuote - Always wrap in double quotes
 * @returns YAML string value with proper escaping
 */
export function escapeYamlString(value: string, alwaysQuote = false): string {
  // Always quote if requested, or if the string contains special characters
  if (
    alwaysQuote ||
    /[:[\]{}&*?|<>=!%@#`'",\n\r\\]/.test(value) ||
    value.startsWith(' ') ||
    value.endsWith(' ')
  ) {
    // Escape backslashes first, then double quotes, then remove newlines
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/[\n\r]/g, '');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * Generate SlashCommand file content
 *
 * @param workflow - Workflow definition
 * @returns Markdown content with YAML frontmatter
 */
function generateSlashCommandFile(workflow: Workflow): string {
  // YAML frontmatter
  const frontmatterLines = [
    '---',
    `description: ${escapeYamlString(workflow.description || workflow.name)}`,
  ];

  // Issue #424: Add allowed-tools only if explicitly configured (omit = use Claude Code default)
  if (workflow.slashCommandOptions?.allowedTools) {
    frontmatterLines.push(`allowed-tools: ${workflow.slashCommandOptions.allowedTools}`);
  }

  // Add model if specified and not 'default'
  if (workflow.slashCommandOptions?.model && workflow.slashCommandOptions.model !== 'default') {
    frontmatterLines.push(`model: ${workflow.slashCommandOptions.model}`);
  }

  // Add context if specified and not 'default' (Claude Code v2.1.0+ feature)
  if (workflow.slashCommandOptions?.context && workflow.slashCommandOptions.context !== 'default') {
    frontmatterLines.push(`context: ${workflow.slashCommandOptions.context}`);
  }

  // Issue #426: Add disable-model-invocation if enabled
  if (workflow.slashCommandOptions?.disableModelInvocation) {
    frontmatterLines.push('disable-model-invocation: true');
  }

  // Issue #425: Add argument-hint if configured
  if (workflow.slashCommandOptions?.argumentHint) {
    frontmatterLines.push(`argument-hint: ${workflow.slashCommandOptions.argumentHint}`);
  }

  // Issue #413: Add hooks if configured (Claude Code Docs compliant format)
  // See: https://code.claude.com/docs/en/hooks
  const hooks = workflow.slashCommandOptions?.hooks;
  if (hooks && Object.keys(hooks).length > 0) {
    frontmatterLines.push('hooks:');
    for (const [hookType, entries] of Object.entries(hooks)) {
      if (entries && entries.length > 0) {
        frontmatterLines.push(`  ${hookType}:`);
        for (const entry of entries) {
          // matcher is optional for all hook types
          if (entry.matcher) {
            frontmatterLines.push(`    - matcher: ${escapeYamlString(entry.matcher, true)}`);
            frontmatterLines.push('      hooks:');
          } else {
            // No matcher - start with hooks directly on the same line as -
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

  // Mermaid flowchart using shared module
  const mermaidFlowchart = generateMermaidFlowchart(workflow);

  // Workflow execution logic using shared module
  const workflowBaseName = nodeNameToFileName(workflow.name);
  const executionLogic = generateExecutionInstructions(workflow, {
    parentWorkflowName: workflowBaseName,
    subAgentFlows: workflow.subAgentFlows,
    provider: 'claude-code',
  });

  return `${frontmatter}${mermaidFlowchart}\n\n${executionLogic}`;
}

// Re-export sanitizeNodeId for use by other modules that may need it
export { sanitizeNodeId };
