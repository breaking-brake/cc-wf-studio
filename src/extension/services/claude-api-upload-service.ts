/**
 * Claude API Upload Service
 *
 * Uploads workflow as Custom Skill to Claude API.
 * Generates SKILL.md, packages as ZIP, and uploads via /v1/skills endpoint.
 */

import * as fs from 'node:fs';
import { strToU8, zipSync } from 'fflate';
import type { McpNode, SkillNode, Workflow } from '../../shared/types/workflow-definition';
import { NodeType } from '../../shared/types/workflow-definition';
import { generateSkillContent } from './copilot-skill-export-service';
import { nodeNameToFileName } from './export-service';

const API_BASE = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';
const BETA_SKILLS = 'skills-2025-10-02';
const BETA_CODE_EXECUTION = 'code-execution-2025-08-25';
const BETA_MCP_CLIENT = 'mcp-client-2025-11-20';

export interface UploadResult {
  skillId: string;
  version: string;
  isNewVersion: boolean;
}

export interface CustomSkillInfo {
  id: string;
  displayTitle: string;
  latestVersion: string;
}

/**
 * Sanitize workflow name for Claude API skill name constraint.
 * API requires: max 64 chars, lowercase, hyphens only.
 */
function sanitizeSkillName(name: string): string {
  return nodeNameToFileName(name).substring(0, 64);
}

/**
 * Extract unique MCP server IDs from workflow nodes.
 */
function extractMcpServerIds(workflow: Workflow): string[] {
  const ids = new Set<string>();
  for (const node of workflow.nodes) {
    if (node.type === NodeType.Mcp) {
      const serverId = (node as McpNode).data.serverId;
      if (serverId) ids.add(serverId);
    }
  }
  return Array.from(ids);
}

/**
 * Extract unique dependent skill names from workflow nodes.
 */
function extractDependentSkillNames(workflow: Workflow): string[] {
  const names = new Set<string>();
  for (const node of workflow.nodes) {
    if (node.type === NodeType.Skill) {
      const name = (node as SkillNode).data.name;
      if (name) names.add(name);
    }
  }
  return Array.from(names);
}

/**
 * Build description with cc-wf-studio metadata for Claude API (max 1024 chars).
 * Format: [cc-wf-studio] <description> [mcp:server1,server2] [skills:name1,name2]
 */
function buildSkillDescription(
  workflow: Workflow,
  mcpServerIds: string[],
  dependentSkillNames: string[]
): string {
  const prefix = '[cc-wf-studio] ';
  const mcpSuffix = mcpServerIds.length > 0 ? ` [mcp:${mcpServerIds.join(',')}]` : '';
  const skillsSuffix =
    dependentSkillNames.length > 0 ? ` [skills:${dependentSkillNames.join(',')}]` : '';
  const maxDescLen = 1024 - prefix.length - mcpSuffix.length - skillsSuffix.length;
  const rawDescription =
    workflow.metadata?.description ||
    `Execute the "${workflow.name}" workflow. This skill guides through a structured workflow with defined steps and decision points.`;
  return `${prefix}${rawDescription.substring(0, maxDescLen)}${mcpSuffix}${skillsSuffix}`;
}

/**
 * Parse skill description to extract cc-wf-studio metadata.
 */
export function parseSkillDescription(description: string): {
  isFromStudio: boolean;
  originalDescription: string;
  mcpServerIds: string[];
  dependentSkillNames: string[];
} {
  if (!description.startsWith('[cc-wf-studio] ')) {
    return {
      isFromStudio: false,
      originalDescription: description,
      mcpServerIds: [],
      dependentSkillNames: [],
    };
  }

  let body = description.slice('[cc-wf-studio] '.length);
  let mcpServerIds: string[] = [];
  let dependentSkillNames: string[] = [];

  const skillsMatch = body.match(/\s*\[skills:([^\]]+)\]/);
  if (skillsMatch) {
    dependentSkillNames = skillsMatch[1].split(',').filter(Boolean);
    body = body.replace(skillsMatch[0], '');
  }

  const mcpMatch = body.match(/\s*\[mcp:([^\]]+)\]/);
  if (mcpMatch) {
    mcpServerIds = mcpMatch[1].split(',').filter(Boolean);
    body = body.replace(mcpMatch[0], '');
  }

  return { isFromStudio: true, originalDescription: body, mcpServerIds, dependentSkillNames };
}

/**
 * Generate SKILL.md and package as ZIP in memory using fflate.
 */
function packageSkillAsZip(workflow: Workflow): { zipData: Uint8Array; skillName: string } {
  const skillName = sanitizeSkillName(workflow.name);
  const skillContent = generateSkillContent(workflow);

  // Override frontmatter with API-safe name/description
  const safeDescription = buildSkillDescription(
    workflow,
    extractMcpServerIds(workflow),
    extractDependentSkillNames(workflow)
  );
  const contentWithSafeMeta = skillContent.replace(
    /^---\nname: .+\ndescription: .+\n---/,
    `---\nname: ${skillName}\ndescription: "${safeDescription.replace(/"/g, '\\"')}"\n---`
  );

  const zipData = zipSync({
    [`${skillName}/SKILL.md`]: strToU8(contentWithSafeMeta),
  });

  return { zipData, skillName };
}

/**
 * Find existing custom skill by display_title.
 */
async function findExistingSkill(
  apiKey: string,
  displayTitle: string
): Promise<{ id: string; latestVersion: string } | null> {
  const response = await fetch(`${API_BASE}/v1/skills?source=custom`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
  });

  if (!response.ok) return null;

  const result = (await response.json()) as {
    data: { id: string; display_title: string; latest_version: string }[];
  };
  const existing = result.data.find((s) => s.display_title === displayTitle);
  return existing ? { id: existing.id, latestVersion: existing.latest_version } : null;
}

/**
 * Create a new version for an existing skill.
 */
async function createNewVersion(
  apiKey: string,
  skillId: string,
  zipData: Uint8Array
): Promise<{ version: string }> {
  const blob = new Blob([zipData], { type: 'application/zip' });
  const formData = new FormData();
  formData.append('files[]', blob, 'skill.zip');

  const response = await fetch(`${API_BASE}/v1/skills/${skillId}/versions`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Version creation failed (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as { version: string };
}

/**
 * Create a new skill.
 */
async function createNewSkill(
  apiKey: string,
  displayTitle: string,
  zipData: Uint8Array
): Promise<{ id: string; latestVersion: string }> {
  const blob = new Blob([zipData], { type: 'application/zip' });
  const formData = new FormData();
  formData.append('display_title', displayTitle);
  formData.append('files[]', blob, 'skill.zip');

  const response = await fetch(`${API_BASE}/v1/skills`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as { id: string; latest_version: string };
  return { id: result.id, latestVersion: result.latest_version };
}

/**
 * Upload workflow as Custom Skill to Claude API.
 * Creates a new skill or updates an existing one with a new version.
 */
export async function uploadWorkflow(apiKey: string, workflow: Workflow): Promise<UploadResult> {
  const { zipData } = packageSkillAsZip(workflow);
  const displayTitle = workflow.name;

  // Check for existing skill
  const existing = await findExistingSkill(apiKey, displayTitle);

  if (existing) {
    const newVersion = await createNewVersion(apiKey, existing.id, zipData);
    return {
      skillId: existing.id,
      version: newVersion.version,
      isNewVersion: true,
    };
  }

  // Create new skill
  const result = await createNewSkill(apiKey, displayTitle, zipData);
  return {
    skillId: result.id,
    version: result.latestVersion,
    isNewVersion: false,
  };
}

/**
 * List all custom skills from Claude API.
 */
export async function listCustomSkills(apiKey: string): Promise<CustomSkillInfo[]> {
  const response = await fetch(`${API_BASE}/v1/skills?source=custom`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to list skills (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as {
    data: { id: string; display_title: string; latest_version: string }[];
  };

  return result.data.map((s) => ({
    id: s.id,
    displayTitle: s.display_title,
    latestVersion: s.latest_version,
  }));
}

/**
 * List all versions of a custom skill from Claude API.
 */
export async function listSkillVersions(apiKey: string, skillId: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/v1/skills/${skillId}/versions`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to list skill versions (${response.status}): ${errorBody}`);
  }
  const result = (await response.json()) as {
    data: { version: string }[];
  };
  return result.data.map((v) => v.version);
}

/**
 * Delete a specific version of a custom skill from Claude API.
 */
export async function deleteSkillVersion(
  apiKey: string,
  skillId: string,
  version: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/skills/${skillId}/versions/${version}`, {
    method: 'DELETE',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to delete skill version (${response.status}): ${errorBody}`);
  }
}

/**
 * Delete a custom skill from Claude API.
 * Automatically deletes all versions first, then deletes the skill itself.
 */
export async function deleteCustomSkill(apiKey: string, skillId: string): Promise<void> {
  // First, delete all versions
  const versions = await listSkillVersions(apiKey, skillId);
  for (const version of versions) {
    await deleteSkillVersion(apiKey, skillId, version);
  }

  // Then delete the skill itself
  const response = await fetch(`${API_BASE}/v1/skills/${skillId}`, {
    method: 'DELETE',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to delete skill (${response.status}): ${errorBody}`);
  }
}

/**
 * Get skill version details from Claude API.
 */
export async function getSkillVersionDetails(
  apiKey: string,
  skillId: string,
  version: string
): Promise<{ skillId: string; version: string; name: string; description: string }> {
  const response = await fetch(`${API_BASE}/v1/skills/${skillId}/versions/${version}`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get skill version details (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as {
    name: string;
    description: string;
    version: string;
  };

  return {
    skillId,
    version: result.version,
    name: result.name,
    description: result.description || '',
  };
}

/**
 * Upload a SKILL.md file directly as a Custom Skill to Claude API.
 * Used for uploading dependent skills referenced by workflows.
 */
export async function uploadSkillFile(
  apiKey: string,
  skillName: string,
  skillFilePath: string
): Promise<UploadResult> {
  const content = await fs.promises.readFile(skillFilePath, 'utf-8');

  // Ensure description has [cc-wf-studio] prefix
  const contentWithPrefix = content.replace(
    /^(---\n(?:.*\n)*?description:\s*)(["']?)(.+?)\2(\n---)/m,
    (_match, before, _quote, desc, after) => {
      const prefixed = desc.startsWith('[cc-wf-studio]') ? desc : `[cc-wf-studio] ${desc}`;
      return `${before}"${prefixed.replace(/"/g, '\\"')}"${after}`;
    }
  );

  const sanitizedName = sanitizeSkillName(skillName);

  const zipData = zipSync({
    [`${sanitizedName}/SKILL.md`]: strToU8(contentWithPrefix),
  });

  const displayTitle = skillName;
  const existing = await findExistingSkill(apiKey, displayTitle);

  if (existing) {
    const newVersion = await createNewVersion(apiKey, existing.id, zipData);
    return {
      skillId: existing.id,
      version: newVersion.version,
      isNewVersion: true,
    };
  }

  const result = await createNewSkill(apiKey, displayTitle, zipData);
  return {
    skillId: result.id,
    version: result.latestVersion,
    isNewVersion: false,
  };
}

/**
 * Execute an uploaded skill via Messages API with streaming.
 */
export async function executeUploadedSkillStreaming(
  apiKey: string,
  skillId: string,
  prompt: string,
  model: string,
  onChunk: (chunk: string) => void,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  containerId?: string,
  mcpServers?: Array<{ id: string; url: string; authorization_token?: string }>,
  additionalSkillIds?: string[]
): Promise<{
  responseText: string;
  stopReason: string;
  containerId?: string;
  usage?: { input_tokens: number; output_tokens: number };
}> {
  const hasMcp = mcpServers && mcpServers.length > 0;
  const betaHeaders = [BETA_CODE_EXECUTION, BETA_SKILLS];
  if (hasMcp) betaHeaders.push(BETA_MCP_CLIENT);

  const tools: Array<Record<string, string>> = [
    { type: 'code_execution_20250825', name: 'code_execution' },
  ];
  if (hasMcp) {
    for (const s of mcpServers) {
      tools.push({ type: 'mcp_toolset', mcp_server_name: s.id });
    }
  }

  const requestBody: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    stream: true,
    container: {
      ...(containerId ? { id: containerId } : {}),
      skills: [
        { type: 'custom', skill_id: skillId, version: 'latest' },
        ...(additionalSkillIds ?? []).map((id) => ({
          type: 'custom',
          skill_id: id,
          version: 'latest',
        })),
      ],
    },
    messages: [...(conversationHistory ?? []), { role: 'user', content: prompt }],
    tools,
  };
  if (hasMcp) {
    requestBody.mcp_servers = mcpServers.map((s) => ({
      type: 'url',
      url: s.url,
      name: s.id,
      ...(s.authorization_token ? { authorization_token: s.authorization_token } : {}),
    }));
  }

  const response = await fetch(`${API_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': betaHeaders.join(','),
      'content-type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Execution failed (${response.status}): ${errorBody}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error('No response body for streaming');
  }

  let fullText = '';
  let stopReason = 'end_turn';
  let returnedContainerId: string | undefined;
  let usage: { input_tokens: number; output_tokens: number } | undefined;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const event = JSON.parse(jsonStr) as {
          type: string;
          message?: {
            container?: { id?: string };
            usage?: { input_tokens: number; output_tokens: number };
          };
          delta?: { type?: string; text?: string; stop_reason?: string };
          usage?: { output_tokens: number };
        };

        if (event.type === 'message_start') {
          if (event.message?.container?.id) {
            returnedContainerId = event.message.container.id;
          }
          if (event.message?.usage) {
            usage = { ...event.message.usage, output_tokens: 0 };
          }
        } else if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const text = event.delta.text || '';
          fullText += text;
          onChunk(text);
        } else if (event.type === 'message_delta') {
          if (event.delta?.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
          if (event.usage?.output_tokens && usage) {
            usage.output_tokens = event.usage.output_tokens;
          }
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  return {
    responseText: fullText || '(No text response)',
    stopReason,
    containerId: returnedContainerId,
    usage,
  };
}
