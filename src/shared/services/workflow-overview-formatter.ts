/**
 * Human-friendly Markdown generator for the Overview Mode right pane.
 *
 * Produces a document that lets a person read a whole workflow top-to-bottom:
 * one section per node, in topological order from Start, with each node's
 * actual content (prompt body, question text, branch conditions, …) and an
 * arrow to the next node(s) at the bottom.
 *
 * Each node section is headed by `## {sanitizedNodeId}({title})` so the
 * existing scroll-sync mechanism in `InstructionsPanel.tsx` can keep working.
 *
 * This is *not* the AI export format — see `generateExecutionInstructions` in
 * `workflow-prompt-generator.ts` for that. AI-only sections (Execution Methods,
 * Group Node Execution Tracking, Parallel Execution …) are deliberately absent.
 */

import type {
  AskUserQuestionNode,
  BranchNode,
  CodexNode,
  Connection,
  GroupNode,
  IfElseNode,
  McpNode,
  PromptNode,
  SkillNode,
  SubAgentFlowNode,
  SubAgentNode,
  SwitchNode,
  Workflow,
  WorkflowNode,
} from '../types/workflow-definition';
import { sanitizeNodeId } from './workflow-prompt-generator';

const SEPARATOR = '\n---\n';

interface NextEdge {
  toNodeId: string;
  /** Branch / option label, if the source node is a branching node. */
  label?: string;
}

/**
 * Public entry point: produce the full Markdown document for one workflow.
 */
export function generateOverviewMarkdown(workflow: Workflow): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${workflow.name}`);
  if (workflow.description?.trim()) {
    sections.push('');
    sections.push(quote(workflow.description.trim()));
  }

  // Body — one section per node
  const ordered = topologicalOrder(workflow);
  const nodeById = new Map(workflow.nodes.map((n) => [n.id, n]));
  for (const node of ordered) {
    if ((node.type as string) === 'group') continue; // group ノードはスキップ（フラット表示）
    sections.push(SEPARATOR);
    sections.push(formatNode(node, workflow, nodeById));
  }

  return `${sections.join('\n')}\n`;
}

// ============================================================================
// Ordering
// ============================================================================

/**
 * BFS from the Start node(s). Ports are visited in fromPort order so the
 * resulting order is deterministic for branched flows.
 *
 * Nodes not reachable from any Start are appended at the end so they are
 * still rendered (won't silently disappear from the doc).
 */
function topologicalOrder(workflow: Workflow): WorkflowNode[] {
  const result: WorkflowNode[] = [];
  const visited = new Set<string>();
  const byId = new Map(workflow.nodes.map((n) => [n.id, n]));

  const outgoing = new Map<string, Connection[]>();
  for (const conn of workflow.connections) {
    const list = outgoing.get(conn.from) ?? [];
    list.push(conn);
    outgoing.set(conn.from, list);
  }
  for (const list of outgoing.values()) {
    list.sort((a, b) => (a.fromPort || '').localeCompare(b.fromPort || ''));
  }

  const starts = workflow.nodes.filter((n) => (n.type as string) === 'start');
  const queue: WorkflowNode[] = [...starts];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || visited.has(node.id)) continue;
    visited.add(node.id);
    result.push(node);
    for (const conn of outgoing.get(node.id) ?? []) {
      const next = byId.get(conn.to);
      if (next && !visited.has(next.id)) queue.push(next);
    }
  }

  // Anything we didn't reach: append in declaration order.
  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) result.push(node);
  }

  return result;
}

// ============================================================================
// Per-node formatting
// ============================================================================

function formatNode(
  node: WorkflowNode,
  workflow: Workflow,
  byId: Map<string, WorkflowNode>
): string {
  const lines: string[] = [];
  const heading = `## ${sanitizeNodeId(node.id)}(${titleOf(node)})`;
  lines.push(heading);
  lines.push('');

  const type = node.type as string;
  switch (type) {
    case 'start':
      lines.push(formatStart(node));
      break;
    case 'end':
      lines.push(formatEnd(node));
      break;
    case 'subAgent':
      lines.push(formatSubAgent(node as SubAgentNode));
      break;
    case 'prompt':
      lines.push(formatPrompt(node as PromptNode));
      break;
    case 'askUserQuestion':
      lines.push(formatAskUserQuestion(node as AskUserQuestionNode));
      break;
    case 'ifElse':
      lines.push(formatIfElse(node as IfElseNode));
      break;
    case 'switch':
      lines.push(formatSwitch(node as SwitchNode));
      break;
    case 'branch':
      lines.push(formatBranch(node as BranchNode));
      break;
    case 'skill':
      lines.push(formatSkill(node as SkillNode));
      break;
    case 'mcp':
      lines.push(formatMcp(node as McpNode));
      break;
    case 'codex':
      lines.push(formatCodex(node as CodexNode));
      break;
    case 'subAgentFlow':
      lines.push(formatSubAgentFlow(node as SubAgentFlowNode, workflow));
      break;
    case 'group':
      lines.push(`**Type**: Group — ${escapeInline((node as GroupNode).data.label || 'Group')}`);
      break;
    default:
      lines.push(`**Type**: ${type}`);
      break;
  }

  // Connection footer (skip for End)
  if (type !== 'end') {
    const edges = getNextEdges(node, workflow);
    if (edges.length > 0) {
      lines.push('');
      lines.push(formatNextEdges(node, edges, byId));
    }
  }

  return lines.join('\n');
}

function titleOf(node: WorkflowNode): string {
  // Prefer data.label, fall back to node.name, finally to type name.
  const data = (node as { data?: { label?: string } }).data;
  const dataLabel = data?.label?.trim();
  if (dataLabel) return dataLabel;
  const name = node.name?.trim();
  if (name) return name;
  return node.type as string;
}

// ----- start / end --------------------------------------------------------

function formatStart(node: WorkflowNode): string {
  return `**Type**: Start${labelHint(node)}`;
}

function formatEnd(node: WorkflowNode): string {
  return `**Type**: End${labelHint(node)}`;
}

function labelHint(node: WorkflowNode): string {
  const data = (node as { data?: { label?: string } }).data;
  const label = data?.label?.trim();
  if (label && label !== titleOf(node)) {
    return ` — ${escapeInline(label)}`;
  }
  return '';
}

// ----- subAgent -----------------------------------------------------------

function formatSubAgent(node: SubAgentNode): string {
  const out: string[] = [];
  const d = node.data;
  const typeBadge = d.builtInType ? `Sub-Agent · built-in: \`${d.builtInType}\`` : 'Sub-Agent';
  out.push(`**Type**: ${typeBadge}`);
  if (d.description?.trim()) {
    out.push('');
    out.push(quote(d.description.trim()));
  }
  if (d.agentDefinition?.trim()) {
    out.push('');
    out.push('**Agent definition**:');
    out.push('');
    out.push(fence(d.agentDefinition.trim()));
  }
  if (d.prompt?.trim()) {
    out.push('');
    out.push('**Prompt**:');
    out.push('');
    out.push(fence(d.prompt.trim()));
  }
  const meta: string[] = [];
  if (d.model) meta.push(`Model: \`${d.model}\``);
  if (d.tools?.trim()) meta.push(`Tools: \`${d.tools.trim()}\``);
  if (d.memory) meta.push(`Memory: \`${d.memory}\``);
  if (meta.length > 0) {
    out.push('');
    out.push(meta.join(' · '));
  }
  return out.join('\n');
}

// ----- prompt -------------------------------------------------------------

function formatPrompt(node: PromptNode): string {
  const out: string[] = [];
  out.push('**Type**: Prompt (orchestrator)');
  const body = node.data.prompt?.trim();
  if (body) {
    out.push('');
    out.push(fence(body));
  }
  if (node.data.variables) {
    const keys = Object.keys(node.data.variables);
    if (keys.length > 0) {
      out.push('');
      out.push(`**Variables**: ${keys.map((k) => `\`${k}\``).join(', ')}`);
    }
  }
  return out.join('\n');
}

// ----- askUserQuestion ----------------------------------------------------

function formatAskUserQuestion(node: AskUserQuestionNode): string {
  const out: string[] = [];
  const d = node.data;
  const mode = d.useAiSuggestions
    ? 'AI suggestions'
    : d.multiSelect
      ? 'multi-select'
      : 'single-select';
  out.push(`**Type**: AskUserQuestion (${mode})`);
  if (d.questionText?.trim()) {
    out.push('');
    out.push(`**Question**: ${escapeInline(d.questionText.trim())}`);
  }
  if (!d.useAiSuggestions && d.options && d.options.length > 0) {
    out.push('');
    out.push('**Options**:');
    for (const opt of d.options) {
      const label = escapeInline(opt.label || '');
      const desc = opt.description?.trim() ? ` — ${escapeInline(opt.description.trim())}` : '';
      out.push(`- **${label}**${desc}`);
    }
  }
  return out.join('\n');
}

// ----- ifElse / switch / branch -------------------------------------------

function formatIfElse(node: IfElseNode): string {
  const out: string[] = ['**Type**: If/Else'];
  if (node.data.evaluationTarget?.trim()) {
    out.push('');
    out.push(`**評価対象**: ${escapeInline(node.data.evaluationTarget.trim())}`);
  }
  return out.join('\n');
}

function formatSwitch(node: SwitchNode): string {
  const out: string[] = ['**Type**: Switch'];
  if (node.data.evaluationTarget?.trim()) {
    out.push('');
    out.push(`**評価対象**: ${escapeInline(node.data.evaluationTarget.trim())}`);
  }
  return out.join('\n');
}

function formatBranch(node: BranchNode): string {
  const branchType = node.data.branchType === 'switch' ? 'Switch' : 'Branch';
  return `**Type**: ${branchType} (legacy)`;
}

// ----- skill --------------------------------------------------------------

function formatSkill(node: SkillNode): string {
  const out: string[] = [];
  const d = node.data;
  const mode = d.executionMode === 'load' ? 'load' : 'execute';
  out.push(`**Type**: Skill (${mode})`);
  if (d.description?.trim()) {
    out.push('');
    out.push(quote(d.description.trim()));
  }
  if (mode === 'execute' && d.executionPrompt?.trim()) {
    out.push('');
    out.push('**Execution prompt**:');
    out.push('');
    out.push(fence(d.executionPrompt.trim()));
  }
  const meta: string[] = [`Scope: \`${d.scope}\``];
  if (d.allowedTools?.trim()) meta.push(`Tools: \`${d.allowedTools.trim()}\``);
  out.push('');
  out.push(meta.join(' · '));
  return out.join('\n');
}

// ----- mcp ----------------------------------------------------------------

function formatMcp(node: McpNode): string {
  const out: string[] = [];
  const d = node.data;
  const mode = d.mode ?? 'manualParameterConfig';
  out.push(`**Type**: MCP (${mode})`);
  if (d.toolDescription?.trim()) {
    out.push('');
    out.push(quote(d.toolDescription.trim()));
  }
  const ident: string[] = [];
  if (d.serverId) ident.push(`Server: \`${d.serverId}\``);
  if (d.toolName) ident.push(`Tool: \`${d.toolName}\``);
  if (ident.length > 0) {
    out.push('');
    out.push(ident.join(' · '));
  }

  if (mode === 'aiParameterConfig' && d.aiParameterConfig?.description?.trim()) {
    out.push('');
    out.push('**Parameter description**:');
    out.push('');
    out.push(fence(d.aiParameterConfig.description.trim()));
  } else if (mode === 'aiToolSelection' && d.aiToolSelectionConfig?.taskDescription?.trim()) {
    out.push('');
    out.push('**Task description**:');
    out.push('');
    out.push(fence(d.aiToolSelectionConfig.taskDescription.trim()));
  } else if (mode === 'manualParameterConfig' && d.parameterValues) {
    const entries = Object.entries(d.parameterValues);
    if (entries.length > 0) {
      out.push('');
      out.push('**Parameter values**:');
      for (const [key, value] of entries) {
        out.push(`- \`${key}\`: ${formatParamValue(value)}`);
      }
    }
  }
  return out.join('\n');
}

function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return '*(empty)*';
  if (typeof value === 'string') return `\`${value}\``;
  if (typeof value === 'number' || typeof value === 'boolean') return `\`${String(value)}\``;
  return `\`${JSON.stringify(value)}\``;
}

// ----- codex --------------------------------------------------------------

function formatCodex(node: CodexNode): string {
  const out: string[] = [];
  const d = node.data;
  out.push(`**Type**: Codex Agent (${d.promptMode})`);
  if (d.prompt?.trim()) {
    out.push('');
    out.push(fence(d.prompt.trim()));
  }
  const meta: string[] = [`Model: \`${d.model}\``, `Reasoning: \`${d.reasoningEffort}\``];
  if (d.sandbox) meta.push(`Sandbox: \`${d.sandbox}\``);
  out.push('');
  out.push(meta.join(' · '));
  return out.join('\n');
}

// ----- subAgentFlow -------------------------------------------------------

function formatSubAgentFlow(node: SubAgentFlowNode, workflow: Workflow): string {
  const out: string[] = ['**Type**: Sub-Agent Flow'];
  const d = node.data;
  if (d.description?.trim()) {
    out.push('');
    out.push(quote(d.description.trim()));
  }
  const flow = workflow.subAgentFlows?.find((f) => f.id === d.subAgentFlowId);
  const target = flow ? `\`${flow.name}\`` : `\`${d.subAgentFlowId}\``;
  out.push('');
  out.push(`**参照先 flow**: ${target}`);
  return out.join('\n');
}

// ============================================================================
// Connection rendering
// ============================================================================

function getNextEdges(node: WorkflowNode, workflow: Workflow): NextEdge[] {
  const conns = workflow.connections.filter((c) => c.from === node.id);
  conns.sort((a, b) => (a.fromPort || '').localeCompare(b.fromPort || ''));

  return conns.map((conn) => {
    const label = resolvePortLabel(node, conn.fromPort);
    return { toNodeId: conn.to, label };
  });
}

function resolvePortLabel(node: WorkflowNode, fromPort?: string): string | undefined {
  if (!fromPort) return undefined;
  const m = fromPort.match(/^branch-(\d+)$/);
  if (!m) return undefined;
  const idx = Number.parseInt(m[1], 10);
  const type = node.type as string;
  if (type === 'askUserQuestion') {
    const opt = (node as AskUserQuestionNode).data.options?.[idx];
    return opt?.label;
  }
  if (type === 'ifElse' || type === 'switch' || type === 'branch') {
    const branches = (node as IfElseNode | SwitchNode | BranchNode).data.branches;
    return branches?.[idx]?.label;
  }
  return undefined;
}

function formatNextEdges(
  node: WorkflowNode,
  edges: NextEdge[],
  byId: Map<string, WorkflowNode>
): string {
  if (edges.length === 1 && !edges[0].label) {
    const next = byId.get(edges[0].toNodeId);
    return `→ **Next**: ${nodeRefText(next, edges[0].toNodeId)}`;
  }
  // Multiple edges or labelled edges → list.
  const branchType = node.type as string;
  return edges
    .map((e) => {
      const next = byId.get(e.toNodeId);
      const ref = nodeRefText(next, e.toNodeId);
      const labelText = formatBranchLabel(branchType, e.label);
      return labelText ? `→ ${labelText}: ${ref}` : `→ **Next**: ${ref}`;
    })
    .join('  \n'); // two-space line break for Markdown
}

function formatBranchLabel(branchType: string, label?: string): string | undefined {
  if (!label) return undefined;
  // Decorate True/False ifElse for quick visual scan.
  if (branchType === 'ifElse') {
    const lc = label.toLowerCase();
    if (['true', 'yes', 'valid', 'ok', 'success'].includes(lc)) {
      return `✅ **${escapeInline(label)}**`;
    }
    if (['false', 'no', 'invalid', 'error', 'failure'].includes(lc)) {
      return `❌ **${escapeInline(label)}**`;
    }
  }
  return `**${escapeInline(label)}**`;
}

function nodeRefText(node: WorkflowNode | undefined, idFallback: string): string {
  if (!node) return `\`${idFallback}\``;
  const sanitized = sanitizeNodeId(node.id);
  // Inline-code text wrapped in a link to the section anchor. Backticks make
  // the content inert (parens/brackets in the title don't break the link).
  return `[\`${sanitized}(${titleOf(node)})\`](#overview-section-${sanitized})`;
}

// ============================================================================
// Markdown helpers
// ============================================================================

function fence(text: string): string {
  // Use 4-backtick fence to safely contain triple-backtick blocks inside prompts.
  return `\`\`\`\`\n${text}\n\`\`\`\``;
}

function quote(text: string): string {
  return text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/** Trim an inline string to one line, escaping control characters. */
function escapeInline(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
