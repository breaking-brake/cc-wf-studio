/**
 * Claude Code Workflow Studio - Copilot Export Service
 *
 * Handles workflow export to GitHub Copilot Prompts format (.github/prompts/*.prompt.md)
 * Based on: /docs/Copilot-Prompts-Guide.md
 *
 * @beta This is a PoC feature for GitHub Copilot integration
 */

import * as path from 'node:path';
import type { Workflow } from '../../shared/types/workflow-definition';
import { nodeNameToFileName } from './export-service';
import type { FileService } from './file-service';

/**
 * Copilot agent mode options
 */
export type CopilotAgentMode = 'ask' | 'edit' | 'agent';

/**
 * Copilot model options
 */
export type CopilotModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'o1-preview'
  | 'o1-mini'
  | 'claude-3.5-sonnet'
  | 'claude-3-opus';

/**
 * Copilot export options
 */
export interface CopilotExportOptions {
  /** Export destination: copilot only, claude only, or both */
  destination: 'copilot' | 'claude' | 'both';
  /** Copilot agent mode */
  agent: CopilotAgentMode;
  /** Copilot model (optional - omit to use default) */
  model?: CopilotModel;
  /** Tools to enable (optional) */
  tools?: string[];
}

/**
 * Export result
 */
export interface CopilotExportResult {
  success: boolean;
  exportedFiles: string[];
  errors?: string[];
}

/**
 * Check if any Copilot export files already exist
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Array of existing file paths (empty if no conflicts)
 */
export async function checkExistingCopilotFiles(
  workflow: Workflow,
  fileService: FileService
): Promise<string[]> {
  const existingFiles: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  const promptsDir = path.join(workspacePath, '.github', 'prompts');
  const workflowBaseName = nodeNameToFileName(workflow.name);
  const filePath = path.join(promptsDir, `${workflowBaseName}.prompt.md`);

  if (await fileService.fileExists(filePath)) {
    existingFiles.push(filePath);
  }

  return existingFiles;
}

/**
 * Export workflow to Copilot Prompts format
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @param options - Copilot export options
 * @returns Export result with file paths
 */
export async function exportWorkflowForCopilot(
  workflow: Workflow,
  fileService: FileService,
  options: CopilotExportOptions
): Promise<CopilotExportResult> {
  const exportedFiles: string[] = [];
  const errors: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  try {
    // Create .github/prompts directory if it doesn't exist
    const promptsDir = path.join(workspacePath, '.github', 'prompts');
    await fileService.createDirectory(path.join(workspacePath, '.github'));
    await fileService.createDirectory(promptsDir);

    // Generate Copilot prompt file
    const workflowBaseName = nodeNameToFileName(workflow.name);
    const filePath = path.join(promptsDir, `${workflowBaseName}.prompt.md`);
    const content = generateCopilotPromptFile(workflow, options);

    await fileService.writeFile(filePath, content);
    exportedFiles.push(filePath);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return {
    success: errors.length === 0,
    exportedFiles,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Generate Copilot Prompt file content
 *
 * @param workflow - Workflow definition
 * @param options - Copilot export options
 * @returns Markdown content with YAML frontmatter
 */
function generateCopilotPromptFile(workflow: Workflow, options: CopilotExportOptions): string {
  const workflowName = nodeNameToFileName(workflow.name);

  // YAML frontmatter
  const frontmatterLines = ['---', `name: ${workflowName}`];

  // Add description
  if (workflow.description) {
    frontmatterLines.push(`description: ${workflow.description}`);
  } else {
    frontmatterLines.push(`description: ${workflow.name}`);
  }

  // Add argument-hint if configured
  if (workflow.slashCommandOptions?.argumentHint) {
    frontmatterLines.push(`argument-hint: ${workflow.slashCommandOptions.argumentHint}`);
  }

  // Add agent mode
  frontmatterLines.push(`agent: ${options.agent}`);

  // Add model if specified
  if (options.model) {
    frontmatterLines.push(`model: ${options.model}`);
  }

  // Add tools if specified (array format)
  if (options.tools && options.tools.length > 0) {
    frontmatterLines.push('tools:');
    for (const tool of options.tools) {
      frontmatterLines.push(`  - ${tool}`);
    }
  } else if (workflow.slashCommandOptions?.allowedTools) {
    // Convert comma-separated allowed-tools to array format
    const tools = workflow.slashCommandOptions.allowedTools.split(',').map((t) => t.trim());
    if (tools.length > 0) {
      frontmatterLines.push('tools:');
      for (const tool of tools) {
        frontmatterLines.push(`  - ${tool}`);
      }
    }
  }

  frontmatterLines.push('---', '');
  const frontmatter = frontmatterLines.join('\n');

  // Generate Mermaid flowchart
  const mermaidFlowchart = generateMermaidFlowchartForCopilot(workflow);

  // Generate execution instructions
  const executionInstructions = generateExecutionInstructionsForCopilot(workflow);

  return `${frontmatter}${mermaidFlowchart}\n\n${executionInstructions}`;
}

/**
 * Sanitize node ID for Mermaid (remove special characters)
 *
 * @param id - Node ID
 * @returns Sanitized ID
 */
function sanitizeNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Escape special characters in Mermaid labels
 *
 * @param label - Label text
 * @returns Escaped label
 */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;').replace(/\[/g, '#91;').replace(/\]/g, '#93;');
}

/**
 * Generate Mermaid flowchart for Copilot
 *
 * @param workflow - Workflow definition
 * @returns Mermaid flowchart markdown
 */
function generateMermaidFlowchartForCopilot(workflow: Workflow): string {
  const { nodes, connections } = workflow;
  const lines: string[] = [];

  lines.push('```mermaid');
  lines.push('flowchart TD');

  // Generate node definitions
  for (const node of nodes) {
    const nodeId = sanitizeNodeId(node.id);
    const nodeType = node.type as string;

    if (nodeType === 'start') {
      lines.push(`    ${nodeId}([Start])`);
    } else if (nodeType === 'end') {
      lines.push(`    ${nodeId}([End])`);
    } else if (nodeType === 'subAgent') {
      const agentName = node.name || 'Sub-Agent';
      lines.push(`    ${nodeId}[${escapeLabel(agentName)}]`);
    } else if (nodeType === 'askUserQuestion') {
      const questionText =
        'data' in node && node.data && 'questionText' in node.data
          ? (node.data.questionText as string)
          : 'Question';
      lines.push(`    ${nodeId}{${escapeLabel(`Question: ${questionText}`)}}`);
    } else if (nodeType === 'ifElse' || nodeType === 'branch') {
      lines.push(`    ${nodeId}{${escapeLabel('Condition')}}`);
    } else if (nodeType === 'switch') {
      lines.push(`    ${nodeId}{${escapeLabel('Switch')}}`);
    } else if (nodeType === 'prompt') {
      const promptData = 'data' in node && node.data && 'prompt' in node.data ? node.data : null;
      const promptText = promptData
        ? String(promptData.prompt).split('\n')[0] || 'Prompt'
        : 'Prompt';
      const label = promptText.length > 30 ? `${promptText.substring(0, 27)}...` : promptText;
      lines.push(`    ${nodeId}[${escapeLabel(label)}]`);
    } else if (nodeType === 'skill') {
      const skillData = 'data' in node && node.data && 'name' in node.data ? node.data : null;
      const skillName = skillData ? String(skillData.name) : 'Skill';
      lines.push(`    ${nodeId}[[${escapeLabel(`Skill: ${skillName}`)}]]`);
    } else if (nodeType === 'mcp') {
      const mcpData = 'data' in node && node.data && 'toolName' in node.data ? node.data : null;
      const toolName = mcpData ? String(mcpData.toolName) : 'MCP Tool';
      lines.push(`    ${nodeId}[[${escapeLabel(`MCP: ${toolName}`)}]]`);
    } else if (nodeType === 'subAgentFlow') {
      const label = node.name || 'Sub-Agent Flow';
      lines.push(`    ${nodeId}[["${escapeLabel(label)}"]]`);
    }
  }

  lines.push('');

  // Generate connections
  for (const conn of connections) {
    const fromId = sanitizeNodeId(conn.from);
    const toId = sanitizeNodeId(conn.to);
    lines.push(`    ${fromId} --> ${toId}`);
  }

  lines.push('```');

  return lines.join('\n');
}

/**
 * Generate execution instructions for Copilot
 *
 * @param workflow - Workflow definition
 * @returns Markdown execution instructions
 */
function generateExecutionInstructionsForCopilot(workflow: Workflow): string {
  const sections: string[] = [];

  sections.push('# Workflow Execution Instructions');
  sections.push('');
  sections.push(
    'Follow the flowchart above to execute this workflow. Each node represents a step to perform.'
  );
  sections.push('');

  // Add node-specific instructions
  const { nodes } = workflow;

  // Prompt nodes
  const promptNodes = nodes.filter((n) => n.type === 'prompt');
  if (promptNodes.length > 0) {
    sections.push('## Prompts');
    sections.push('');
    for (const node of promptNodes) {
      const promptData = 'data' in node && node.data && 'prompt' in node.data ? node.data : null;
      if (promptData) {
        sections.push(`### ${node.name || 'Prompt'}`);
        sections.push('');
        sections.push('```');
        sections.push(String(promptData.prompt || ''));
        sections.push('```');
        sections.push('');
      }
    }
  }

  // SubAgent nodes
  const subAgentNodes = nodes.filter((n) => n.type === 'subAgent');
  if (subAgentNodes.length > 0) {
    sections.push('## Sub-Agents');
    sections.push('');
    for (const node of subAgentNodes) {
      const agentData =
        'data' in node && node.data && 'description' in node.data ? node.data : null;
      if (agentData) {
        sections.push(`### ${node.name || 'Sub-Agent'}`);
        sections.push('');
        sections.push(`**Description**: ${agentData.description || 'No description'}`);
        sections.push('');
        if ('prompt' in agentData && agentData.prompt) {
          sections.push('**Prompt**:');
          sections.push('```');
          sections.push(String(agentData.prompt));
          sections.push('```');
          sections.push('');
        }
      }
    }
  }

  // AskUserQuestion nodes
  const askNodes = nodes.filter((n) => n.type === 'askUserQuestion');
  if (askNodes.length > 0) {
    sections.push('## User Questions');
    sections.push('');
    for (const node of askNodes) {
      const askData = 'data' in node && node.data && 'questionText' in node.data ? node.data : null;
      if (askData) {
        sections.push(`### ${node.name || 'Question'}`);
        sections.push('');
        sections.push(`**Question**: ${askData.questionText || 'No question text'}`);
        sections.push('');
        if ('options' in askData && Array.isArray(askData.options) && askData.options.length > 0) {
          sections.push('**Options**:');
          for (const opt of askData.options) {
            if (opt && typeof opt === 'object' && 'label' in opt) {
              sections.push(`- **${opt.label}**: ${opt.description || ''}`);
            }
          }
          sections.push('');
        }
      }
    }
  }

  // Skill nodes
  const skillNodes = nodes.filter((n) => n.type === 'skill');
  if (skillNodes.length > 0) {
    sections.push('## Skills');
    sections.push('');
    for (const node of skillNodes) {
      const skillData = 'data' in node && node.data && 'name' in node.data ? node.data : null;
      if (skillData) {
        sections.push(`### ${skillData.name || 'Skill'}`);
        sections.push('');
        sections.push(`**Description**: ${skillData.description || 'No description'}`);
        sections.push('');
        if ('skillPath' in skillData && skillData.skillPath) {
          sections.push(`**Path**: \`${skillData.skillPath}\``);
          sections.push('');
        }
      }
    }
  }

  // MCP nodes
  const mcpNodes = nodes.filter((n) => n.type === 'mcp');
  if (mcpNodes.length > 0) {
    sections.push('## MCP Tools');
    sections.push('');
    for (const node of mcpNodes) {
      const mcpData = 'data' in node && node.data && 'toolName' in node.data ? node.data : null;
      if (mcpData) {
        sections.push(`### ${mcpData.toolName || 'MCP Tool'}`);
        sections.push('');
        sections.push(`**Server**: ${mcpData.serverId || 'Unknown'}`);
        sections.push('');
        if ('toolDescription' in mcpData && mcpData.toolDescription) {
          sections.push(`**Description**: ${mcpData.toolDescription}`);
          sections.push('');
        }
      }
    }
  }

  return sections.join('\n');
}
