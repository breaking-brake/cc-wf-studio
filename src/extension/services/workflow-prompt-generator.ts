/**
 * Claude Code Workflow Studio - Workflow Prompt Generator
 *
 * Shared module for generating Mermaid flowcharts and execution instructions.
 * Used by both Claude Code export and Copilot export services.
 *
 * All output is in English for consistent AI consumption.
 */

import type {
  AskUserQuestionNode,
  BranchNode,
  CodexNode,
  IfElseNode,
  McpNode,
  PromptNode,
  SkillNode,
  SwitchNode,
  Workflow,
  WorkflowNode,
} from '../../shared/types/workflow-definition';

/**
 * Common interface for Mermaid generation
 * Used by both Workflow and SubWorkflow
 */
export interface MermaidSource {
  nodes: WorkflowNode[];
  connections: { from: string; to: string; fromPort?: string }[];
}

/**
 * Sanitize node ID for Mermaid (remove special characters)
 */
export function sanitizeNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Escape special characters in Mermaid labels
 */
export function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;').replace(/\[/g, '#91;').replace(/\]/g, '#93;');
}

/**
 * Generate Mermaid flowchart from workflow or subworkflow
 */
export function generateMermaidFlowchart(source: MermaidSource): string {
  const { nodes, connections } = source;
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
      const askNode = node as AskUserQuestionNode;
      const questionText = askNode.data.questionText || 'Question';
      lines.push(`    ${nodeId}{${escapeLabel(`AskUserQuestion:<br/>${questionText}`)}}`);
    } else if (nodeType === 'branch') {
      const branchNode = node as BranchNode;
      const branchType = branchNode.data.branchType === 'conditional' ? 'Branch' : 'Switch';
      lines.push(`    ${nodeId}{${escapeLabel(`${branchType}:<br/>Conditional Branch`)}}`);
    } else if (nodeType === 'ifElse') {
      lines.push(`    ${nodeId}{${escapeLabel('If/Else:<br/>Conditional Branch')}}`);
    } else if (nodeType === 'switch') {
      lines.push(`    ${nodeId}{${escapeLabel('Switch:<br/>Conditional Branch')}}`);
    } else if (nodeType === 'prompt') {
      const promptNode = node as PromptNode;
      const promptText = promptNode.data.prompt?.split('\n')[0] || 'Prompt';
      const label = promptText.length > 30 ? `${promptText.substring(0, 27)}...` : promptText;
      lines.push(`    ${nodeId}[${escapeLabel(label)}]`);
    } else if (nodeType === 'skill') {
      const skillNode = node as SkillNode;
      const skillName = skillNode.data.name || 'Skill';
      lines.push(`    ${nodeId}[[${escapeLabel(`Skill: ${skillName}`)}]]`);
    } else if (nodeType === 'mcp') {
      const mcpNode = node as McpNode;
      const mcpData = mcpNode.data;
      let mcpLabel = 'MCP Tool';
      if (mcpData) {
        if (mcpData.toolName) {
          mcpLabel = `MCP: ${mcpData.toolName}`;
        } else if (mcpData.aiToolSelectionConfig?.taskDescription) {
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
    } else if (nodeType === 'codex') {
      const codexNode = node as CodexNode;
      const codexName = codexNode.data.label || 'Codex Agent';
      lines.push(`    ${nodeId}[[${escapeLabel(`Codex: ${codexName}`)}]]`);
    }
  }

  lines.push('');

  // Generate connections
  for (const conn of connections) {
    const fromId = sanitizeNodeId(conn.from);
    const toId = sanitizeNodeId(conn.to);
    const sourceNode = nodes.find((n) => n.id === conn.from);

    if (sourceNode?.type === 'askUserQuestion' && conn.fromPort) {
      const askNode = sourceNode as AskUserQuestionNode;
      if (askNode.data.useAiSuggestions || askNode.data.multiSelect) {
        lines.push(`    ${fromId} --> ${toId}`);
      } else {
        const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
        const option = askNode.data.options[branchIndex];
        if (option) {
          lines.push(`    ${fromId} -->|${escapeLabel(option.label)}| ${toId}`);
        } else {
          lines.push(`    ${fromId} --> ${toId}`);
        }
      }
    } else if (sourceNode?.type === 'branch' && conn.fromPort) {
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const branchNode = sourceNode as BranchNode;
      const branch = branchNode.data.branches[branchIndex];
      if (branch) {
        lines.push(`    ${fromId} -->|${escapeLabel(branch.label)}| ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    } else if (sourceNode?.type === 'ifElse' && conn.fromPort) {
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const ifElseNode = sourceNode as IfElseNode;
      const branch = ifElseNode.data.branches[branchIndex];
      if (branch) {
        lines.push(`    ${fromId} -->|${escapeLabel(branch.label)}| ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    } else if (sourceNode?.type === 'switch' && conn.fromPort) {
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const switchNode = sourceNode as SwitchNode;
      const branch = switchNode.data.branches[branchIndex];
      if (branch) {
        lines.push(`    ${fromId} -->|${escapeLabel(branch.label)}| ${toId}`);
      } else {
        lines.push(`    ${fromId} --> ${toId}`);
      }
    } else {
      lines.push(`    ${fromId} --> ${toId}`);
    }
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Format MCP node in Manual Parameter Config Mode
 */
function formatManualParameterConfigMode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);

  sections.push(`#### ${nodeId}(${node.data.toolName || 'MCP Tool'})`);
  sections.push('');
  sections.push(`**Description**: ${node.data.toolDescription || ''}`);
  sections.push('');
  sections.push(`**MCP Server**: ${node.data.serverId}`);
  sections.push('');
  sections.push(`**Tool Name**: ${node.data.toolName || ''}`);
  sections.push('');
  sections.push(`**Validation Status**: ${node.data.validationStatus}`);
  sections.push('');

  const parameterValues = node.data.parameterValues || {};
  if (Object.keys(parameterValues).length > 0) {
    sections.push('**Configured Parameters**:');
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

  const parameters = node.data.parameters || [];
  if (parameters.length > 0) {
    sections.push('**Available Parameters**:');
    sections.push('');
    for (const param of parameters) {
      const requiredLabel = param.required ? ' (required)' : ' (optional)';
      const description = param.description || 'No description available';
      sections.push(`- \`${param.name}\` (${param.type})${requiredLabel}: ${description}`);
    }
    sections.push('');
  }

  sections.push(
    'This node invokes an MCP (Model Context Protocol) tool. When executing this workflow, use the configured parameters to call the tool via the MCP server.'
  );
  sections.push('');

  return sections;
}

/**
 * Format MCP node in AI Parameter Config Mode
 */
function formatAiParameterConfigMode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);

  sections.push(`#### ${nodeId}(${node.data.toolName || 'MCP Tool'}) - AI Parameter Config Mode`);
  sections.push('');

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

  sections.push(`**Description**: ${node.data.toolDescription || ''}`);
  sections.push('');
  sections.push(`**MCP Server**: ${node.data.serverId}`);
  sections.push('');
  sections.push(`**Tool Name**: ${node.data.toolName || ''}`);
  sections.push('');
  sections.push(`**Validation Status**: ${node.data.validationStatus}`);
  sections.push('');

  if (node.data.aiParameterConfig?.description) {
    sections.push('**User Intent (Natural Language Parameter Description)**:');
    sections.push('');
    sections.push('```');
    sections.push(node.data.aiParameterConfig.description);
    sections.push('```');
    sections.push('');
  }

  const parameters = node.data.parameters || [];
  if (parameters.length > 0) {
    sections.push('**Parameter Schema** (for AI interpretation):');
    sections.push('');
    for (const param of parameters) {
      const requiredLabel = param.required ? ' (required)' : ' (optional)';
      const description = param.description || 'No description available';
      sections.push(`- \`${param.name}\` (${param.type})${requiredLabel}: ${description}`);

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
 */
function formatAiToolSelectionMode(node: McpNode): string[] {
  const sections: string[] = [];
  const nodeId = sanitizeNodeId(node.id);

  sections.push(`#### ${nodeId}(MCP Auto-Selection) - AI Tool Selection Mode`);
  sections.push('');

  const availableToolsRaw = node.data.aiToolSelectionConfig?.availableTools || [];
  const availableTools = availableToolsRaw.map((tool: unknown) => {
    if (typeof tool === 'object' && tool !== null && 'name' in tool) {
      const toolObj = tool as { name: string; description?: string };
      return { name: toolObj.name, description: toolObj.description || '' };
    }
    return { name: String(tool), description: '' };
  });

  const metadata = {
    mode: 'aiToolSelection',
    serverId: node.data.serverId,
    userIntent: node.data.aiToolSelectionConfig?.taskDescription || '',
    availableTools,
  };
  sections.push(`<!-- MCP_NODE_METADATA: ${JSON.stringify(metadata)} -->`);
  sections.push('');

  sections.push(`**MCP Server**: ${node.data.serverId}`);
  sections.push('');
  sections.push(`**Validation Status**: ${node.data.validationStatus}`);
  sections.push('');

  if (node.data.aiToolSelectionConfig?.taskDescription) {
    sections.push('**User Intent (Natural Language Task Description)**:');
    sections.push('');
    sections.push('```');
    sections.push(node.data.aiToolSelectionConfig.taskDescription);
    sections.push('```');
    sections.push('');
  }

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

  sections.push('**Execution Method**:');
  sections.push('');
  sections.push(
    'Claude Code should analyze the task description above and select the most appropriate tool from the available tools list. Then, determine the appropriate parameter values for the selected tool based on the task requirements. If the available tools list is empty, query the MCP server at runtime to get the current list of tools.'
  );
  sections.push('');

  return sections;
}

/**
 * Options for generating execution instructions
 */
export interface ExecutionInstructionsOptions {
  /** Parent workflow name (for SubAgentFlow file naming) */
  parentWorkflowName?: string;
  /** SubAgentFlows from the parent workflow */
  subAgentFlows?: Workflow['subAgentFlows'];
}

/**
 * Generate workflow execution instructions
 */
export function generateExecutionInstructions(
  workflow: Workflow,
  options: ExecutionInstructionsOptions = {}
): string {
  const { nodes } = workflow;
  const sections: string[] = [];

  // Introduction
  sections.push('## Workflow Execution Guide');
  sections.push('');
  sections.push(
    'Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.'
  );
  sections.push('');

  // Node type explanations
  sections.push('### Execution Methods by Node Type');
  sections.push('');
  sections.push('- **Rectangle nodes**: Execute Sub-Agents using the Task tool');
  sections.push(
    '- **Diamond nodes (AskUserQuestion:...)**: Use the AskUserQuestion tool to prompt the user and branch based on their response'
  );
  sections.push(
    '- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on the results of previous processing (see details section)'
  );
  sections.push(
    '- **Rectangle nodes (Prompt nodes)**: Execute the prompts described in the details section below'
  );
  sections.push('');

  // Collect nodes by type
  const promptNodes = nodes.filter((n) => n.type === 'prompt') as PromptNode[];
  const skillNodes = nodes.filter((n) => n.type === 'skill') as SkillNode[];
  const mcpNodes = nodes.filter((n) => n.type === 'mcp') as McpNode[];
  const codexNodes = nodes.filter((n) => n.type === 'codex') as CodexNode[];
  const askUserQuestionNodes = nodes.filter(
    (n) => n.type === 'askUserQuestion'
  ) as AskUserQuestionNode[];
  const branchNodes = nodes.filter((n) => n.type === 'branch') as BranchNode[];
  const ifElseNodes = nodes.filter((n) => n.type === 'ifElse') as IfElseNode[];
  const switchNodes = nodes.filter((n) => n.type === 'switch') as SwitchNode[];
  const subAgentFlowNodes = nodes.filter((n) => n.type === 'subAgentFlow');

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
    sections.push('## MCP Tool Nodes');
    sections.push('');
    for (const node of mcpNodes) {
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
          nodeSections = formatManualParameterConfigMode(node);
      }

      sections.push(...nodeSections);
    }
  }

  // Codex node details
  if (codexNodes.length > 0) {
    sections.push('## Codex Agent Nodes');
    sections.push('');
    sections.push(
      'Execute these nodes using the OpenAI Codex CLI. Use the Bash tool to run the `codex exec` command with the specified parameters.'
    );
    sections.push('');
    for (const node of codexNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const escapedPrompt = node.data.prompt.replace(/'/g, "'\\''");
      const skipGitFlag = node.data.skipGitRepoCheck ? '--skip-git-repo-check ' : '';
      const sandboxFlag = node.data.sandbox ? `-s ${node.data.sandbox} ` : '';
      sections.push(`#### ${nodeId}(${node.data.label})`);
      sections.push('');
      sections.push('**Execution Command**:');
      sections.push('');
      sections.push('```bash');
      sections.push(
        `codex exec ${skipGitFlag}-m ${node.data.model} -c 'reasoning_effort="${node.data.reasoningEffort}"' ${sandboxFlag}'${escapedPrompt}'`
      );
      sections.push('```');
      sections.push('');
      sections.push(`**Model**: ${node.data.model}`);
      sections.push('');
      sections.push(`**Reasoning Effort**: ${node.data.reasoningEffort}`);
      sections.push('');
      if (node.data.sandbox) {
        sections.push(`**Sandbox Mode**: ${node.data.sandbox}`);
      } else {
        sections.push('**Sandbox Mode**: (default - not specified)');
      }
      sections.push('');
      sections.push('**Prompt**:');
      sections.push('');
      sections.push('```');
      sections.push(node.data.prompt);
      sections.push('```');
      sections.push('');
    }
  }

  // SubAgentFlow node details
  if (subAgentFlowNodes.length > 0 && options.parentWorkflowName && options.subAgentFlows) {
    sections.push('## Sub-Agent Flow Nodes');
    sections.push('');
    for (const node of subAgentFlowNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const label =
        ('data' in node && node.data && 'label' in node.data ? node.data.label : null) ||
        node.name ||
        'Sub-Agent Flow';
      const subAgentFlowId =
        'data' in node && node.data && 'subAgentFlowId' in node.data
          ? node.data.subAgentFlowId
          : null;
      const linkedSubAgentFlow = options.subAgentFlows?.find((sf) => sf.id === subAgentFlowId);

      if (linkedSubAgentFlow) {
        const subAgentFlowFileName = linkedSubAgentFlow.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-_]/g, '');
        const agentFileName = `${options.parentWorkflowName}_${subAgentFlowFileName}`;

        sections.push(`#### ${nodeId}(${label})`);
        sections.push('');
        sections.push(`@Sub-Agent: ${agentFileName}`);
        sections.push('');
      }
    }
  }

  // Prompt node details
  if (promptNodes.length > 0) {
    sections.push('### Prompt Node Details');
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

      if (node.data.variables && Object.keys(node.data.variables).length > 0) {
        sections.push('**Available variables:**');
        for (const [key, value] of Object.entries(node.data.variables)) {
          sections.push(`- \`{{${key}}}\`: ${value || '(not set)'}`);
        }
        sections.push('');
      }
    }
  }

  // AskUserQuestion node details
  if (askUserQuestionNodes.length > 0) {
    sections.push('### AskUserQuestion Node Details');
    sections.push('');
    sections.push('Ask the user and proceed based on their choice.');
    sections.push('');
    for (const node of askUserQuestionNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(${node.data.questionText})`);
      sections.push('');

      if (node.data.useAiSuggestions) {
        sections.push(
          '**Selection mode:** AI Suggestions (AI generates options dynamically based on context and presents them to the user)'
        );
        sections.push('');
        if (node.data.multiSelect) {
          sections.push('**Multi-select:** Enabled (user can select multiple options)');
          sections.push('');
        }
      } else if (node.data.multiSelect) {
        sections.push(
          '**Selection mode:** Multi-select enabled (a list of selected options is passed to the next node)'
        );
        sections.push('');
        sections.push('**Options:**');
        for (const option of node.data.options) {
          sections.push(`- **${option.label}**: ${option.description || '(no description)'}`);
        }
        sections.push('');
      } else {
        sections.push('**Selection mode:** Single Select (branches based on the selected option)');
        sections.push('');
        sections.push('**Options:**');
        for (const option of node.data.options) {
          sections.push(`- **${option.label}**: ${option.description || '(no description)'}`);
        }
        sections.push('');
      }
    }
  }

  // Branch node details (Legacy)
  if (branchNodes.length > 0) {
    sections.push('### Branch Node Details');
    sections.push('');
    for (const node of branchNodes) {
      const nodeId = sanitizeNodeId(node.id);
      const branchTypeName =
        node.data.branchType === 'conditional' ? 'Binary Branch' : 'Multiple Branch';
      sections.push(`#### ${nodeId}(${branchTypeName})`);
      sections.push('');
      sections.push('**Branch conditions:**');
      for (const branch of node.data.branches) {
        sections.push(`- **${branch.label}**: ${branch.condition}`);
      }
      sections.push('');
      sections.push(
        '**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.'
      );
      sections.push('');
    }
  }

  // IfElse node details
  if (ifElseNodes.length > 0) {
    sections.push('### If/Else Node Details');
    sections.push('');
    for (const node of ifElseNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(Binary Branch (True/False))`);
      sections.push('');
      if (node.data.evaluationTarget) {
        sections.push(`**Evaluation Target**: ${node.data.evaluationTarget}`);
        sections.push('');
      }
      sections.push('**Branch conditions:**');
      for (const branch of node.data.branches) {
        sections.push(`- **${branch.label}**: ${branch.condition}`);
      }
      sections.push('');
      sections.push(
        '**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.'
      );
      sections.push('');
    }
  }

  // Switch node details
  if (switchNodes.length > 0) {
    sections.push('### Switch Node Details');
    sections.push('');
    for (const node of switchNodes) {
      const nodeId = sanitizeNodeId(node.id);
      sections.push(`#### ${nodeId}(Multiple Branch (2-N))`);
      sections.push('');
      if (node.data.evaluationTarget) {
        sections.push(`**Evaluation Target**: ${node.data.evaluationTarget}`);
        sections.push('');
      }
      sections.push('**Branch conditions:**');
      for (const branch of node.data.branches) {
        sections.push(`- **${branch.label}**: ${branch.condition}`);
      }
      sections.push('');
      sections.push(
        '**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.'
      );
      sections.push('');
    }
  }

  return sections.join('\n');
}
