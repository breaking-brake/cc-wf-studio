/**
 * Claude Code Workflow Studio - Copilot Export Service
 *
 * Handles workflow export to GitHub Copilot Prompts format (.github/prompts/*.prompt.md)
 * Based on: /docs/Copilot-Prompts-Guide.md
 *
 * @beta This is a PoC feature for GitHub Copilot integration
 */

import * as path from 'node:path';
import type { McpNodeData } from '../../shared/types/mcp-node';
import type { Workflow } from '../../shared/types/workflow-definition';
import { nodeNameToFileName } from './export-service';
import type { FileService } from './file-service';
import { getMcpServerConfig } from './mcp-config-reader';

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
  /** Skip MCP server sync to .vscode/mcp.json (default: false) */
  skipMcpSync?: boolean;
}

/**
 * Export result
 */
export interface CopilotExportResult {
  success: boolean;
  exportedFiles: string[];
  errors?: string[];
  /** MCP servers synced to .vscode/mcp.json */
  syncedMcpServers?: string[];
}

/**
 * VS Code MCP configuration format (.vscode/mcp.json)
 */
interface VscodeMcpConfig {
  servers?: Record<string, McpServerConfigEntry>;
  inputs?: unknown[];
}

/**
 * MCP server configuration entry
 */
interface McpServerConfigEntry {
  type?: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
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
  let syncedMcpServers: string[] = [];

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

    // Sync MCP server configurations to .vscode/mcp.json (unless skipped)
    if (!options.skipMcpSync) {
      const mcpServerIds = extractMcpServerIdsFromWorkflow(workflow);
      syncedMcpServers = await syncMcpConfigForCopilot(mcpServerIds, fileService);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return {
    success: errors.length === 0,
    exportedFiles,
    errors: errors.length > 0 ? errors : undefined,
    syncedMcpServers: syncedMcpServers.length > 0 ? syncedMcpServers : undefined,
  };
}

/**
 * Preview result for MCP server sync
 */
export interface McpSyncPreviewResult {
  /** Server IDs that would be added to .vscode/mcp.json */
  serversToAdd: string[];
  /** Server IDs that already exist in .vscode/mcp.json */
  existingServers: string[];
  /** Server IDs not found in any Claude Code config */
  missingServers: string[];
}

/**
 * Preview which MCP servers would be synced to .vscode/mcp.json
 *
 * This function checks without actually writing, allowing for confirmation dialogs.
 *
 * @param workflow - Workflow definition
 * @param fileService - File service instance
 * @returns Preview of servers to add, existing, and missing
 */
export async function previewMcpSyncForCopilot(
  workflow: Workflow,
  fileService: FileService
): Promise<McpSyncPreviewResult> {
  const serverIds = extractMcpServerIdsFromWorkflow(workflow);

  if (serverIds.length === 0) {
    return { serversToAdd: [], existingServers: [], missingServers: [] };
  }

  const workspacePath = fileService.getWorkspacePath();
  const vscodeMcpPath = path.join(workspacePath, '.vscode', 'mcp.json');

  // Read existing VS Code mcp.json
  let existingVscodeServers: Record<string, unknown> = {};
  try {
    if (await fileService.fileExists(vscodeMcpPath)) {
      const content = await fileService.readFile(vscodeMcpPath);
      const vscodeConfig = JSON.parse(content) as VscodeMcpConfig;
      existingVscodeServers = vscodeConfig.servers || {};
    }
  } catch {
    // File doesn't exist or invalid JSON
  }

  const serversToAdd: string[] = [];
  const existingServers: string[] = [];
  const missingServers: string[] = [];

  for (const serverId of serverIds) {
    if (existingVscodeServers[serverId]) {
      existingServers.push(serverId);
    } else {
      // Check if server config exists in Claude Code
      const serverConfig = getMcpServerConfig(serverId, workspacePath);
      if (serverConfig) {
        serversToAdd.push(serverId);
      } else {
        missingServers.push(serverId);
      }
    }
  }

  return { serversToAdd, existingServers, missingServers };
}

/**
 * Execute MCP server sync to .vscode/mcp.json
 *
 * Call this after user confirms the sync via previewMcpSyncForCopilot.
 *
 * @param workflow - Workflow definition
 * @param fileService - File service instance
 * @returns Array of synced server IDs
 */
export async function executeMcpSyncForCopilot(
  workflow: Workflow,
  fileService: FileService
): Promise<string[]> {
  const serverIds = extractMcpServerIdsFromWorkflow(workflow);
  return syncMcpConfigForCopilot(serverIds, fileService);
}

/**
 * Extract unique MCP server IDs from workflow nodes
 *
 * @param workflow - Workflow definition
 * @returns Array of unique server IDs
 */
function extractMcpServerIdsFromWorkflow(workflow: Workflow): string[] {
  const serverIds = new Set<string>();

  for (const node of workflow.nodes) {
    if (node.type !== 'mcp') continue;
    if (!('data' in node) || !node.data) continue;

    const mcpData = node.data as McpNodeData;
    if (mcpData.serverId?.trim()) {
      serverIds.add(mcpData.serverId);
    }
  }

  return Array.from(serverIds);
}

/**
 * Sync MCP server configurations from Claude Code to VS Code (.vscode/mcp.json)
 *
 * Reads MCP server configs from all Claude Code scopes (project, local, user)
 * and writes them to .vscode/mcp.json for GitHub Copilot.
 * Only adds servers that don't already exist in .vscode/mcp.json.
 *
 * @param serverIds - Server IDs to sync
 * @param fileService - File service instance
 * @returns Array of synced server IDs
 */
async function syncMcpConfigForCopilot(
  serverIds: string[],
  fileService: FileService
): Promise<string[]> {
  if (serverIds.length === 0) {
    return [];
  }

  const workspacePath = fileService.getWorkspacePath();
  const vscodeMcpPath = path.join(workspacePath, '.vscode', 'mcp.json');

  // Read existing VS Code mcp.json
  let vscodeConfig: VscodeMcpConfig = { servers: {} };
  try {
    if (await fileService.fileExists(vscodeMcpPath)) {
      const content = await fileService.readFile(vscodeMcpPath);
      vscodeConfig = JSON.parse(content) as VscodeMcpConfig;
    }
  } catch {
    // File doesn't exist or invalid JSON - create new
    vscodeConfig = { servers: {} };
  }

  if (!vscodeConfig.servers) {
    vscodeConfig.servers = {};
  }

  // Sync servers from all Claude Code scopes (project, local, user)
  const syncedServers: string[] = [];
  for (const serverId of serverIds) {
    // Skip if already exists in VS Code config
    if (vscodeConfig.servers[serverId]) {
      continue;
    }

    // Get server config from Claude Code (searches all scopes)
    const serverConfig = getMcpServerConfig(serverId, workspacePath);
    if (!serverConfig) {
      continue;
    }

    // Add to VS Code config
    vscodeConfig.servers[serverId] = serverConfig;
    syncedServers.push(serverId);
  }

  // Write updated VS Code config if any servers were added
  if (syncedServers.length > 0) {
    await fileService.createDirectory(path.join(workspacePath, '.vscode'));
    await fileService.writeFile(vscodeMcpPath, JSON.stringify(vscodeConfig, null, 2));
  }

  return syncedServers;
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

  // Collect all tools from multiple sources
  const allTools: string[] = [];

  // 1. Add explicitly specified tools from export options
  if (options.tools && options.tools.length > 0) {
    allTools.push(...options.tools);
  }

  // 2. Add allowed tools from workflow slashCommandOptions
  if (workflow.slashCommandOptions?.allowedTools) {
    const allowedTools = workflow.slashCommandOptions.allowedTools
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    allTools.push(...allowedTools);
  }

  // Note: MCP tools are NOT added to tools: frontmatter.
  // When tools: is omitted, Copilot allows all available tools including MCP servers.

  // De-duplicate and add to frontmatter
  const uniqueTools = [...new Set(allTools)];
  if (uniqueTools.length > 0) {
    frontmatterLines.push('tools:');
    for (const tool of uniqueTools) {
      frontmatterLines.push(`  - ${tool}`);
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
      const mcpData = 'data' in node && node.data ? (node.data as McpNodeData) : null;
      let mcpLabel = 'MCP Tool';
      if (mcpData) {
        if (mcpData.toolName) {
          mcpLabel = `MCP: ${mcpData.toolName}`;
        } else if (mcpData.aiToolSelectionConfig?.taskDescription) {
          // aiToolSelection mode: show task description
          const desc = mcpData.aiToolSelectionConfig.taskDescription;
          mcpLabel = `MCP Task: ${desc.length > 25 ? `${desc.substring(0, 22)}...` : desc}`;
        } else {
          mcpLabel = `MCP: ${mcpData.serverId || 'Tool'}`;
        }
      }
      lines.push(`    ${nodeId}[[${escapeLabel(mcpLabel)}]]`);
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
      const mcpData = 'data' in node && node.data ? (node.data as McpNodeData) : null;
      if (mcpData) {
        const mode = mcpData.mode || 'manualParameterConfig';

        if (mode === 'aiToolSelection') {
          // AI Tool Selection mode: show task description
          const taskDesc = mcpData.aiToolSelectionConfig?.taskDescription || 'No task description';
          sections.push(`### MCP Task: ${mcpData.serverId || 'Unknown Server'}`);
          sections.push('');
          sections.push(`**Server**: ${mcpData.serverId || 'Unknown'}`);
          sections.push('');
          sections.push(`**Mode**: AI Tool Selection`);
          sections.push('');
          sections.push(`**Task Description**: ${taskDesc}`);
          sections.push('');
          sections.push(
            '> Use the MCP tools from this server to accomplish the task described above.'
          );
          sections.push('');
        } else {
          // Manual or AI Parameter Config mode: show tool details
          sections.push(`### ${mcpData.toolName || 'MCP Tool'}`);
          sections.push('');
          sections.push(`**Server**: ${mcpData.serverId || 'Unknown'}`);
          sections.push('');
          if (mcpData.toolDescription) {
            sections.push(`**Description**: ${mcpData.toolDescription}`);
            sections.push('');
          }
          if (mode === 'aiParameterConfig' && mcpData.aiParameterConfig?.description) {
            sections.push(`**Parameter Instructions**: ${mcpData.aiParameterConfig.description}`);
            sections.push('');
          }
        }
      }
    }
  }

  return sections.join('\n');
}
