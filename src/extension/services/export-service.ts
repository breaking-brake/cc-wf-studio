/**
 * Claude Code Workflow Studio - Export Service
 *
 * Handles workflow export to .claude format
 * Based on: /specs/001-cc-wf-studio/spec.md Export Format Details
 */

import * as path from 'node:path';
import type {
  AskUserQuestionNode,
  BranchNode,
  IfElseNode,
  McpNode,
  PromptNode,
  SkillNode,
  SubAgentFlow,
  SubAgentFlowNode,
  SubAgentNode,
  SwitchNode,
  Workflow,
  WorkflowNode,
} from '../../shared/types/workflow-definition';
import { translate } from '../i18n/i18n-service';
import type { FileService } from './file-service';

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
    if (!frontmatterContent.includes('allowed-tools:')) {
      throw new Error('SlashCommand file missing required field: allowed-tools');
    }
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
function generateSubAgentFile(node: SubAgentNode): string {
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
function generateSubAgentFlowAgentFile(
  subAgentFlow: SubAgentFlow,
  agentFileName: string,
  referencingNode?: SubAgentFlowNode
): string {
  const agentName = agentFileName;

  // Get model/tools/color from referencing node, or use defaults
  const model = referencingNode?.data.model || 'sonnet';
  const tools = referencingNode?.data.tools;
  const color = referencingNode?.data.color;

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

  frontmatter.push('---');
  frontmatter.push('');

  // Generate Mermaid flowchart (same as SlashCommand)
  const mermaidFlowchart = generateMermaidFlowchart({
    nodes: subAgentFlow.nodes,
    connections: subAgentFlow.connections,
  });

  // Create a pseudo-Workflow object to reuse generateWorkflowExecutionLogic
  // This ensures SubAgentFlow export format matches SlashCommand format exactly
  const pseudoWorkflow: Workflow = {
    name: subAgentFlow.name,
    description: subAgentFlow.description,
    nodes: subAgentFlow.nodes,
    connections: subAgentFlow.connections,
  };

  // Generate execution logic (same format as SlashCommand)
  const executionLogic = generateWorkflowExecutionLogic(pseudoWorkflow);

  return `${frontmatter.join('\n')}${mermaidFlowchart}\n\n${executionLogic}`;
}

/**
 * Common interface for Mermaid generation
 * Used by both Workflow and SubWorkflow
 */
interface MermaidSource {
  nodes: WorkflowNode[];
  connections: { from: string; to: string; fromPort?: string }[];
}

/**
 * Generate Mermaid flowchart from workflow or subworkflow
 *
 * @param source - Workflow or SubWorkflow definition
 * @returns Mermaid flowchart markdown
 */
function generateMermaidFlowchart(source: MermaidSource): string {
  const { nodes, connections } = source;
  const lines: string[] = [];

  // Start Mermaid code block
  lines.push('```mermaid');
  lines.push('flowchart TD');

  // Generate node definitions
  for (const node of nodes) {
    const nodeId = sanitizeNodeId(node.id);
    const nodeType = node.type as string;

    if (nodeType === 'start') {
      lines.push(`    ${nodeId}([${translate('mermaid.start')}])`);
    } else if (nodeType === 'end') {
      lines.push(`    ${nodeId}([${translate('mermaid.end')}])`);
    } else if (nodeType === 'subAgent') {
      const agentName = node.name || 'Sub-Agent';
      lines.push(`    ${nodeId}[${escapeLabel(agentName)}]`);
    } else if (nodeType === 'askUserQuestion') {
      const askNode = node as AskUserQuestionNode;
      const questionText = askNode.data.questionText || translate('mermaid.question');
      lines.push(`    ${nodeId}{${escapeLabel(`AskUserQuestion:<br/>${questionText}`)}}`);
    } else if (nodeType === 'branch') {
      const branchNode = node as BranchNode;
      const branchType = branchNode.data.branchType === 'conditional' ? 'Branch' : 'Switch';
      lines.push(
        `    ${nodeId}{${escapeLabel(`${branchType}:<br/>${translate('mermaid.conditionalBranch')}`)}}`
      );
    } else if (nodeType === 'ifElse') {
      lines.push(
        `    ${nodeId}{${escapeLabel(`If/Else:<br/>${translate('mermaid.conditionalBranch')}`)}}`
      );
    } else if (nodeType === 'switch') {
      lines.push(
        `    ${nodeId}{${escapeLabel(`Switch:<br/>${translate('mermaid.conditionalBranch')}`)}}`
      );
    } else if (nodeType === 'prompt') {
      const promptNode = node as PromptNode;
      // Use first line of prompt or default label
      const promptText = promptNode.data.prompt?.split('\n')[0] || 'Prompt';
      const label = promptText.length > 30 ? `${promptText.substring(0, 27)}...` : promptText;
      lines.push(`    ${nodeId}[${escapeLabel(label)}]`);
    } else if (nodeType === 'skill') {
      const skillNode = node as SkillNode;
      const skillName = skillNode.data.name || 'Skill';
      lines.push(`    ${nodeId}[[${escapeLabel(`Skill: ${skillName}`)}]]`);
    } else if (nodeType === 'mcp') {
      const mcpNode = node as McpNode;
      const toolName = mcpNode.data.toolName || 'MCP Tool';
      lines.push(`    ${nodeId}[[${escapeLabel(`MCP: ${toolName}`)}]]`);
    } else if (nodeType === 'subAgentFlow') {
      // Feature: 089-subworkflow - SubAgentFlow node uses subroutine shape
      const label = node.name || 'Sub-Agent Flow';
      lines.push(`    ${nodeId}[["${escapeLabel(label)}"]]`);
    }
  }

  // Add empty line between nodes and connections
  lines.push('');

  // Generate connections
  for (const conn of connections) {
    const fromId = sanitizeNodeId(conn.from);
    const toId = sanitizeNodeId(conn.to);

    // Find source node to determine if it's an AskUserQuestion or Branch with labeled branches
    const sourceNode = nodes.find((n) => n.id === conn.from);

    if (sourceNode?.type === 'askUserQuestion' && conn.fromPort) {
      const askNode = sourceNode as AskUserQuestionNode;

      // AI suggestions or multi-select: single output without labels
      if (askNode.data.useAiSuggestions || askNode.data.multiSelect) {
        lines.push(`    ${fromId} --> ${toId}`);
      } else {
        // Single select with user-defined options: labeled branches by option
        const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
        const option = askNode.data.options[branchIndex];

        if (option) {
          const label = escapeLabel(option.label);
          lines.push(`    ${fromId} -->|${label}| ${toId}`);
        } else {
          lines.push(`    ${fromId} --> ${toId}`);
        }
      }
    } else if (sourceNode?.type === 'branch' && conn.fromPort) {
      // Extract branch index from fromPort (e.g., "branch-0" -> 0)
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const branchNode = sourceNode as BranchNode;
      const branch = branchNode.data.branches[branchIndex];

      if (branch) {
        const label = escapeLabel(branch.label);
        lines.push(`    ${fromId} -->|${label}| ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    } else if (sourceNode?.type === 'ifElse' && conn.fromPort) {
      // Extract branch index from fromPort (e.g., "branch-0" -> 0)
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const ifElseNode = sourceNode as IfElseNode;
      const branch = ifElseNode.data.branches[branchIndex];

      if (branch) {
        const label = escapeLabel(branch.label);
        lines.push(`    ${fromId} -->|${label}| ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    } else if (sourceNode?.type === 'switch' && conn.fromPort) {
      // Extract branch index from fromPort (e.g., "branch-0" -> 0)
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const switchNode = sourceNode as SwitchNode;
      const branch = switchNode.data.branches[branchIndex];

      if (branch) {
        const label = escapeLabel(branch.label);
        lines.push(`    ${fromId} -->|${label}| ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    } else {
      lines.push(`    ${fromId} --> ${toId}`);
    }
  }

  // End Mermaid code block
  lines.push('```');

  return lines.join('\n');
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
 * Generate SlashCommand file content
 *
 * @param workflow - Workflow definition
 * @returns Markdown content with YAML frontmatter
 */
function generateSlashCommandFile(workflow: Workflow): string {
  // YAML frontmatter
  const frontmatterLines = [
    '---',
    `description: ${workflow.description || workflow.name}`,
    'allowed-tools: Task,AskUserQuestion',
  ];

  // Add context: fork if enabled (Claude Code v2.1.0+ feature)
  if (workflow.slashCommandOptions?.contextFork) {
    frontmatterLines.push('context: fork');
  }

  frontmatterLines.push('---', '');
  const frontmatter = frontmatterLines.join('\n');

  // Mermaid flowchart
  const mermaidFlowchart = generateMermaidFlowchart(workflow);

  // Workflow execution logic
  const executionLogic = generateWorkflowExecutionLogic(workflow);

  return `${frontmatter}${mermaidFlowchart}\n\n${executionLogic}`;
}

/**
 * Format MCP node in Manual Parameter Config Mode
 *
 * User explicitly configures server, tool, and all parameters.
 * Export shows explicit parameter values for reproduction.
 *
 * @param node - MCP node
 * @returns Markdown sections for this node
 */
function formatManualParameterConfigMode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);

  sections.push(`#### ${nodeId}(${node.data.toolName || 'MCP Tool'})`);
  sections.push('');
  sections.push(`${translate('mcpNode.description')}: ${node.data.toolDescription || ''}`);
  sections.push('');
  sections.push(`${translate('mcpNode.server')}: ${node.data.serverId}`);
  sections.push('');
  sections.push(`${translate('mcpNode.toolName')}: ${node.data.toolName || ''}`);
  sections.push('');
  sections.push(`${translate('mcpNode.validationStatus')}: ${node.data.validationStatus}`);
  sections.push('');

  // Show configured parameters
  const parameterValues = node.data.parameterValues || {};
  if (Object.keys(parameterValues).length > 0) {
    sections.push(`${translate('mcpNode.configuredParameters')}:`);
    sections.push('');
    for (const [paramName, paramValue] of Object.entries(parameterValues)) {
      const parameters = node.data.parameters || [];
      const paramSchema = parameters.find((p) => p.name === paramName);
      const paramType = paramSchema ? ` (${paramSchema.type})` : '';
      const valueStr =
        typeof paramValue === 'object' ? JSON.stringify(paramValue) : String(paramValue);
      sections.push(`- \`${paramName}\`${paramType}: ${valueStr}`);
    }
    sections.push('');
  }

  // Show parameter schema
  const parameters = node.data.parameters || [];
  if (parameters.length > 0) {
    sections.push(`${translate('mcpNode.availableParameters')}:`);
    sections.push('');
    for (const param of parameters) {
      const requiredLabel = param.required
        ? ` (${translate('mcpNode.required')})`
        : ` (${translate('mcpNode.optional')})`;
      const description = param.description || translate('mcpNode.noDescription');
      sections.push(`- \`${param.name}\` (${param.type})${requiredLabel}: ${description}`);
    }
    sections.push('');
  }

  sections.push(translate('mcpNode.executionMethod'));
  sections.push('');

  return sections;
}

/**
 * Format MCP node in AI Parameter Config Mode
 *
 * User selects server and tool, describes parameters in natural language.
 * Export includes tool name, parameter schema, and natural language description
 * for Claude Code to interpret and set appropriate parameter values.
 *
 * @param node - MCP node
 * @returns Markdown sections for this node
 */
function formatAiParameterConfigMode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);

  sections.push(`#### ${nodeId}(${node.data.toolName || 'MCP Tool'}) - AI Parameter Config Mode`);
  sections.push('');

  // Add metadata HTML comment for Claude Code (T056)
  const metadata = {
    mode: 'aiParameterConfig',
    serverId: node.data.serverId,
    toolName: node.data.toolName || '',
    userIntent: node.data.aiParameterConfig?.description || '',
    parameterSchema: (node.data.parameters || []).map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required,
      description: p.description || '',
      validation: p.validation,
    })),
  };
  sections.push(`<!-- MCP_NODE_METADATA: ${JSON.stringify(metadata)} -->`);
  sections.push('');

  sections.push(`${translate('mcpNode.description')}: ${node.data.toolDescription || ''}`);
  sections.push('');
  sections.push(`${translate('mcpNode.server')}: ${node.data.serverId}`);
  sections.push('');
  sections.push(`${translate('mcpNode.toolName')}: ${node.data.toolName || ''}`);
  sections.push('');
  sections.push(`${translate('mcpNode.validationStatus')}: ${node.data.validationStatus}`);
  sections.push('');

  // Show natural language parameter description
  if (node.data.aiParameterConfig?.description) {
    sections.push('**User Intent (Natural Language Parameter Description)**:');
    sections.push('');
    sections.push('```');
    sections.push(node.data.aiParameterConfig.description);
    sections.push('```');
    sections.push('');
  }

  // Show parameter schema for Claude Code interpretation
  const parameters = node.data.parameters || [];
  if (parameters.length > 0) {
    sections.push('**Parameter Schema** (for AI interpretation):');
    sections.push('');
    for (const param of parameters) {
      const requiredLabel = param.required
        ? ` (${translate('mcpNode.required')})`
        : ` (${translate('mcpNode.optional')})`;
      const description = param.description || translate('mcpNode.noDescription');
      sections.push(`- \`${param.name}\` (${param.type})${requiredLabel}: ${description}`);

      // Show validation constraints if any
      if (param.validation) {
        const constraints: string[] = [];
        if (param.validation.minLength !== undefined) {
          constraints.push(`minLength: ${param.validation.minLength}`);
        }
        if (param.validation.maxLength !== undefined) {
          constraints.push(`maxLength: ${param.validation.maxLength}`);
        }
        if (param.validation.minimum !== undefined) {
          constraints.push(`minimum: ${param.validation.minimum}`);
        }
        if (param.validation.maximum !== undefined) {
          constraints.push(`maximum: ${param.validation.maximum}`);
        }
        if (param.validation.pattern) {
          constraints.push(`pattern: ${param.validation.pattern}`);
        }
        if (param.validation.enum) {
          constraints.push(`enum: ${param.validation.enum.join(', ')}`);
        }
        if (constraints.length > 0) {
          sections.push(`  - Constraints: ${constraints.join(', ')}`);
        }
      }
    }
    sections.push('');
  }

  // Instructions for Claude Code
  sections.push('**Execution Method**:');
  sections.push('');
  sections.push(
    'Claude Code should interpret the natural language description above and set appropriate parameter values based on the parameter schema. Use your best judgment to map the user intent to concrete parameter values that satisfy the constraints.'
  );
  sections.push('');

  return sections;
}

/**
 * Format MCP node in AI Tool Selection Mode
 *
 * User selects server only, describes entire task in natural language.
 * Export includes server ID, task description, and available tools list
 * for Claude Code to select the most appropriate tool and configure parameters.
 *
 * @param node - MCP node
 * @returns Markdown sections for this node
 */
function formatAiToolSelectionMode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);

  sections.push(`#### ${nodeId}(MCP Auto-Selection) - AI Tool Selection Mode`);
  sections.push('');

  // Add metadata HTML comment for Claude Code (T057)
  const availableToolsRaw = node.data.aiToolSelectionConfig?.availableTools || [];
  const availableTools = availableToolsRaw.map((tool: unknown) => {
    // Handle both string format (legacy) and object format (current)
    if (typeof tool === 'object' && tool !== null && 'name' in tool) {
      const toolObj = tool as { name: string; description?: string };
      return {
        name: toolObj.name,
        description: toolObj.description || '',
      };
    }
    return {
      name: String(tool),
      description: '',
    };
  });

  const metadata = {
    mode: 'aiToolSelection',
    serverId: node.data.serverId,
    userIntent: node.data.aiToolSelectionConfig?.taskDescription || '',
    availableTools,
  };
  sections.push(`<!-- MCP_NODE_METADATA: ${JSON.stringify(metadata)} -->`);
  sections.push('');

  sections.push(`${translate('mcpNode.server')}: ${node.data.serverId}`);
  sections.push('');
  sections.push(`${translate('mcpNode.validationStatus')}: ${node.data.validationStatus}`);
  sections.push('');

  // Show natural language task description
  if (node.data.aiToolSelectionConfig?.taskDescription) {
    sections.push('**User Intent (Natural Language Task Description)**:');
    sections.push('');
    sections.push('```');
    sections.push(node.data.aiToolSelectionConfig.taskDescription);
    sections.push('```');
    sections.push('');
  }

  // Show available tools for Claude Code to choose from
  if (availableTools.length > 0) {
    sections.push(
      `**Available Tools** (${availableTools.length} tools from ${node.data.serverId}):`
    );
    sections.push('');
    for (const tool of availableTools) {
      sections.push(`- **${tool.name}**: ${tool.description || 'No description'}`);
    }
    sections.push('');
  } else {
    sections.push('**Available Tools**: (snapshot not available, query server at runtime)');
    sections.push('');
  }

  // Instructions for Claude Code
  sections.push('**Execution Method**:');
  sections.push('');
  sections.push(
    'Claude Code should analyze the task description above and select the most appropriate tool from the available tools list. Then, determine the appropriate parameter values for the selected tool based on the task requirements. If the available tools list is empty, query the MCP server at runtime to get the current list of tools.'
  );
  sections.push('');

  return sections;
}

/**
 * Generate workflow execution logic
 *
 * @param workflow - Workflow definition
 * @returns Markdown text with execution instructions
 */
function generateWorkflowExecutionLogic(workflow: Workflow): string {
  const { nodes } = workflow;
  const sections: string[] = [];

  // Introduction
  sections.push(translate('guide.title'));
  sections.push('');
  sections.push(translate('guide.intro'));
  sections.push('');

  // Node type explanations
  sections.push(translate('guide.nodeTypesTitle'));
  sections.push('');
  sections.push(translate('guide.nodeTypes.subAgent'));
  sections.push(translate('guide.nodeTypes.askUserQuestion'));
  sections.push(translate('guide.nodeTypes.branch'));
  sections.push(translate('guide.nodeTypes.prompt'));
  sections.push('');

  // Collect node details by type
  const promptNodes = nodes.filter((n) => (n.type as string) === 'prompt') as PromptNode[];
  const skillNodes = nodes.filter((n) => (n.type as string) === 'skill') as SkillNode[];
  const mcpNodes = nodes.filter((n) => (n.type as string) === 'mcp') as McpNode[];
  const askUserQuestionNodes = nodes.filter(
    (n) => (n.type as string) === 'askUserQuestion'
  ) as AskUserQuestionNode[];
  const branchNodes = nodes.filter((n) => (n.type as string) === 'branch') as BranchNode[];
  const ifElseNodes = nodes.filter((n) => (n.type as string) === 'ifElse') as IfElseNode[];
  const switchNodes = nodes.filter((n) => (n.type as string) === 'switch') as SwitchNode[];
  const subAgentFlowNodes = nodes.filter(
    (n) => (n.type as string) === 'subAgentFlow'
  ) as SubAgentFlowNode[];

  // Skill node details
  if (skillNodes.length > 0) {
    sections.push('## Skill Nodes');
    sections.push('');
    for (const node of skillNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${node.data.name})`);
      sections.push('');
      sections.push(`**Description**: ${node.data.description}`);
      sections.push('');
      sections.push(`**Scope**: ${node.data.scope}`);
      sections.push('');
      sections.push(`**Validation Status**: ${node.data.validationStatus}`);
      sections.push('');
      if (node.data.allowedTools) {
        sections.push(`**Allowed Tools**: ${node.data.allowedTools}`);
        sections.push('');
      }
      sections.push(`**Skill Path**: \`${node.data.skillPath}\``);
      sections.push('');
      sections.push(
        'This node executes a Claude Code Skill. The Skill definition is stored in the SKILL.md file at the path shown above.'
      );
      sections.push('');
    }
  }

  // MCP node details
  if (mcpNodes.length > 0) {
    sections.push(translate('mcpNode.title'));
    sections.push('');
    for (const node of mcpNodes) {
      // Detect mode and use appropriate formatter (T055)
      const mode = node.data.mode || 'manualParameterConfig';
      let nodeSections: string[] = [];

      switch (mode) {
        case 'manualParameterConfig':
          nodeSections = formatManualParameterConfigMode(node);
          break;
        case 'aiParameterConfig':
          nodeSections = formatAiParameterConfigMode(node);
          break;
        case 'aiToolSelection':
          nodeSections = formatAiToolSelectionMode(node);
          break;
        default:
          // Fallback to manual mode for unknown modes
          nodeSections = formatManualParameterConfigMode(node);
      }

      sections.push(...nodeSections);
    }
  }

  // SubAgentFlow node details (Feature: 089-subworkflow)
  // Keep it simple like SubAgent - just reference the agent name
  const parentWorkflowBaseName = nodeNameToFileName(workflow.name);
  if (subAgentFlowNodes.length > 0) {
    sections.push('## Sub-Agent Flow Nodes');
    sections.push('');
    for (const node of subAgentFlowNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const label = node.data.label || node.name || 'Sub-Agent Flow';

      // Find linked sub-agent flow
      const linkedSubAgentFlow = workflow.subAgentFlows?.find(
        (sf) => sf.id === node.data.subAgentFlowId
      );

      if (linkedSubAgentFlow) {
        const subAgentFlowFileName = nodeNameToFileName(linkedSubAgentFlow.name);
        const agentFileName = `${parentWorkflowBaseName}_${subAgentFlowFileName}`;

        sections.push(`#### ${nodeId}(${label})`);
        sections.push('');
        sections.push(`@Sub-Agent: ${agentFileName}`);
        sections.push('');
      }
    }
  }

  // Prompt node details
  if (promptNodes.length > 0) {
    sections.push(translate('promptNode.title'));
    sections.push('');
    for (const node of promptNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const label = node.data.prompt?.split('\n')[0] || node.name;
      const displayLabel = label.length > 30 ? `${label.substring(0, 27)}...` : label;
      sections.push(`#### ${nodeId}(${displayLabel})`);
      sections.push('');
      sections.push('```');
      sections.push(node.data.prompt || '');
      sections.push('```');
      sections.push('');

      // Show variables if any
      if (node.data.variables && Object.keys(node.data.variables).length > 0) {
        sections.push(translate('promptNode.availableVariables'));
        for (const [key, value] of Object.entries(node.data.variables)) {
          sections.push(`- \`{{${key}}}\`: ${value || translate('promptNode.variableNotSet')}`);
        }
        sections.push('');
      }
    }
  }

  // AskUserQuestion node details
  if (askUserQuestionNodes.length > 0) {
    sections.push(translate('askNode.title'));
    sections.push('');
    for (const node of askUserQuestionNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${node.data.questionText})`);
      sections.push('');

      // Show selection mode
      if (node.data.useAiSuggestions) {
        sections.push(
          `${translate('askNode.selectionMode')} ${translate('askNode.aiSuggestions')}`
        );
        sections.push('');
        if (node.data.multiSelect) {
          sections.push(translate('askNode.multiSelect'));
          sections.push('');
        }
      } else if (node.data.multiSelect) {
        sections.push(
          `${translate('askNode.selectionMode')} ${translate('askNode.multiSelectExplanation')}`
        );
        sections.push('');
        sections.push(translate('askNode.options'));
        for (const option of node.data.options) {
          sections.push(
            `- **${option.label}**: ${option.description || translate('askNode.noDescription')}`
          );
        }
        sections.push('');
      } else {
        sections.push(`${translate('askNode.selectionMode')} ${translate('askNode.singleSelect')}`);
        sections.push('');
        sections.push(translate('askNode.options'));
        for (const option of node.data.options) {
          sections.push(
            `- **${option.label}**: ${option.description || translate('askNode.noDescription')}`
          );
        }
        sections.push('');
      }
    }
  }

  // Branch node details (Legacy)
  if (branchNodes.length > 0) {
    sections.push(translate('branchNode.title'));
    sections.push('');
    for (const node of branchNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const branchTypeName =
        node.data.branchType === 'conditional'
          ? translate('branchNode.binary')
          : translate('branchNode.multiple');
      sections.push(`#### ${nodeId}(${branchTypeName})`);
      sections.push('');
      sections.push(translate('branchNode.conditions'));
      for (const branch of node.data.branches) {
        sections.push(`- **${branch.label}**: ${branch.condition}`);
      }
      sections.push('');
      sections.push(translate('branchNode.executionMethod'));
      sections.push('');
    }
  }

  // IfElse node details
  if (ifElseNodes.length > 0) {
    sections.push(translate('ifElseNode.title'));
    sections.push('');
    for (const node of ifElseNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${translate('ifElseNode.binary')})`);
      sections.push('');
      if (node.data.evaluationTarget) {
        sections.push(
          `**${translate('ifElseNode.evaluationTarget')}**: ${node.data.evaluationTarget}`
        );
        sections.push('');
      }
      sections.push(translate('branchNode.conditions'));
      for (const branch of node.data.branches) {
        sections.push(`- **${branch.label}**: ${branch.condition}`);
      }
      sections.push('');
      sections.push(translate('branchNode.executionMethod'));
      sections.push('');
    }
  }

  // Switch node details
  if (switchNodes.length > 0) {
    sections.push(translate('switchNode.title'));
    sections.push('');
    for (const node of switchNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${translate('switchNode.multiple')})`);
      sections.push('');
      if (node.data.evaluationTarget) {
        sections.push(
          `**${translate('switchNode.evaluationTarget')}**: ${node.data.evaluationTarget}`
        );
        sections.push('');
      }
      sections.push(translate('branchNode.conditions'));
      for (const branch of node.data.branches) {
        sections.push(`- **${branch.label}**: ${branch.condition}`);
      }
      sections.push('');
      sections.push(translate('branchNode.executionMethod'));
      sections.push('');
    }
  }

  return sections.join('\n');
}
