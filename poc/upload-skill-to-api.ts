/**
 * PoC: Upload cc-wf-studio workflow as Custom Skill to Claude API
 *
 * Flow:
 *   1. Read workflow JSON from .vscode/workflows/
 *   2. Generate SKILL.md (reusing export logic from copilot-skill-export-service)
 *   3. Package as ZIP
 *   4. Upload to Claude API /v1/skills
 *   5. Execute the uploaded skill via Messages API
 *
 * Usage:
 *   npx tsx poc/upload-skill-to-api.ts <workflow-json-path> [--execute]
 *
 * Environment:
 *   ANTHROPIC_API_KEY - Required. Your Anthropic API key.
 *
 * Example:
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx poc/upload-skill-to-api.ts .vscode/workflows/daily-task-workflow.json
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx poc/upload-skill-to-api.ts .vscode/workflows/daily-task-workflow.json --execute
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// ============================================================================
// SKILL.md Generation (extracted from copilot-skill-export-service.ts)
// ============================================================================

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface Connection {
  from: string;
  to: string;
  fromPort?: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  metadata?: { description?: string };
}

function sanitizeNodeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeLabel(label: string): string {
  return label
    .replace(/#/g, '#35;')
    .replace(/"/g, '#quot;')
    .replace(/\[/g, '#91;')
    .replace(/\]/g, '#93;')
    .replace(/\(/g, '#40;')
    .replace(/\)/g, '#41;')
    .replace(/\{/g, '#123;')
    .replace(/\}/g, '#125;')
    .replace(/</g, '#60;')
    .replace(/>/g, '#62;')
    .replace(/\|/g, '#124;');
}

function nodeNameToFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function generateMermaidFlowchart(nodes: WorkflowNode[], connections: Connection[]): string {
  const lines: string[] = ['```mermaid', 'flowchart TD'];

  for (const node of nodes) {
    const nodeId = sanitizeNodeId(node.id);
    switch (node.type) {
      case 'start':
        lines.push(`    ${nodeId}([Start])`);
        break;
      case 'end':
        lines.push(`    ${nodeId}([End])`);
        break;
      case 'prompt': {
        const promptText = (node.data.prompt as string)?.split('\n')[0] || 'Prompt';
        const label = promptText.length > 30 ? `${promptText.substring(0, 27)}...` : promptText;
        lines.push(`    ${nodeId}[${escapeLabel(label)}]`);
        break;
      }
      case 'subAgent': {
        const agentName = node.name || 'Sub-Agent';
        lines.push(`    ${nodeId}[${escapeLabel(`Sub-Agent: ${agentName}`)}]`);
        break;
      }
      case 'askUserQuestion': {
        const questionText = (node.data.questionText as string) || 'Question';
        lines.push(
          `    ${nodeId}{${escapeLabel('AskUserQuestion')}:<br/>${escapeLabel(questionText)}}`
        );
        break;
      }
      case 'skill': {
        const skillName = (node.data.name as string) || 'Skill';
        lines.push(`    ${nodeId}[[${escapeLabel(`Skill: ${skillName}`)}]]`);
        break;
      }
      default:
        lines.push(`    ${nodeId}[${escapeLabel(node.name || node.type)}]`);
    }
  }

  lines.push('');

  for (const conn of connections) {
    const fromId = sanitizeNodeId(conn.from);
    const toId = sanitizeNodeId(conn.to);
    const sourceNode = nodes.find((n) => n.id === conn.from);

    if (sourceNode?.type === 'askUserQuestion' && conn.fromPort) {
      const branchIndex = Number.parseInt(conn.fromPort.replace('branch-', ''), 10);
      const options = (sourceNode.data.options as { label: string }[]) || [];
      const option = options[branchIndex];
      if (option) {
        lines.push(`    ${fromId} -->|${escapeLabel(option.label)}| ${toId}`);
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

function generateSkillMd(workflow: Workflow): string {
  const skillName = nodeNameToFileName(workflow.name);
  const description =
    workflow.metadata?.description ||
    workflow.description ||
    `Execute the "${workflow.name}" workflow. This skill guides through a structured workflow with defined steps and decision points.`;

  // Claude API requires: name (max 64 chars, lowercase, hyphens), description (max 1024 chars)
  const safeName = skillName.substring(0, 64);
  const safeDescription = description.substring(0, 1024);

  const frontmatter = `---
name: ${safeName}
description: ${safeDescription}
---`;

  const mermaidContent = generateMermaidFlowchart(workflow.nodes, workflow.connections);

  const body = `# ${workflow.name}

## Workflow Diagram

${mermaidContent}

## Execution Instructions

Follow the Mermaid flowchart above to execute the workflow step by step.
Start from the "Start" node and follow the arrows to each subsequent node.
For decision nodes (diamonds), evaluate the condition and follow the appropriate branch.
Continue until you reach the "End" node.`;

  return `${frontmatter}\n\n${body}`;
}

// ============================================================================
// ZIP Packaging
// ============================================================================

function packageAsZip(skillName: string, skillMdContent: string, tmpDir: string): string {
  const skillDir = path.join(tmpDir, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMdContent, 'utf-8');

  const zipPath = path.join(tmpDir, `${skillName}.zip`);
  // Use system zip command (available on macOS/Linux)
  execSync(`cd "${tmpDir}" && zip -r "${zipPath}" "${skillName}/"`, { stdio: 'pipe' });

  return zipPath;
}

// ============================================================================
// Claude API Integration
// ============================================================================

const API_BASE = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';
const BETA_SKILLS = 'skills-2025-10-02';
const BETA_CODE_EXECUTION = 'code-execution-2025-08-25';

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

async function createNewVersion(
  apiKey: string,
  skillId: string,
  zipPath: string
): Promise<{ version: string }> {
  const zipBuffer = fs.readFileSync(zipPath);
  const blob = new Blob([zipBuffer], { type: 'application/zip' });

  const formData = new FormData();
  formData.append('files[]', blob, 'skill.zip');

  console.log(`   Creating new version for existing skill ${skillId}...`);

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

  const result = (await response.json()) as { version: string };
  return result;
}

async function uploadSkill(
  apiKey: string,
  displayTitle: string,
  zipPath: string
): Promise<{ id: string; latestVersion: string }> {
  console.log(`\n📤 Uploading skill "${displayTitle}" to Claude API...`);

  // Check if skill already exists
  const existing = await findExistingSkill(apiKey, displayTitle);
  if (existing) {
    console.log(`   Skill already exists (${existing.id}). Updating with new version...`);
    const newVersion = await createNewVersion(apiKey, existing.id, zipPath);
    console.log(`✅ New version created!`);
    console.log(`   Skill ID: ${existing.id}`);
    console.log(`   Version: ${newVersion.version}`);
    return { id: existing.id, latestVersion: newVersion.version };
  }

  // Create new skill
  const zipBuffer = fs.readFileSync(zipPath);
  const blob = new Blob([zipBuffer], { type: 'application/zip' });

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
  console.log(`✅ Skill uploaded successfully!`);
  console.log(`   Skill ID: ${result.id}`);
  console.log(`   Version: ${result.latest_version}`);

  return { id: result.id, latestVersion: result.latest_version };
}

async function listSkills(apiKey: string): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/skills?source=custom`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': BETA_SKILLS,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`List skills failed (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as { data: { id: string; display_title: string }[] };
  console.log(`\n📋 Custom Skills in workspace:`);
  for (const skill of result.data) {
    console.log(`   - ${skill.id}: ${skill.display_title}`);
  }
}

async function executeSkill(
  apiKey: string,
  skillId: string,
  prompt: string
): Promise<void> {
  console.log(`\n🚀 Executing skill ${skillId}...`);
  console.log(`   Prompt: "${prompt}"`);

  const response = await fetch(`${API_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': `${BETA_CODE_EXECUTION},${BETA_SKILLS}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      container: {
        skills: [
          {
            type: 'custom',
            skill_id: skillId,
            version: 'latest',
          },
        ],
      },
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Execution failed (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as Record<string, unknown>;

  // Save full response JSON for inspection
  const outputDir = path.join(process.cwd(), 'poc', 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'last-response.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n📁 Full response saved to: ${outputPath}`);

  // Display summary
  const content = result.content as { type: string; text?: string }[];
  const stopReason = result.stop_reason as string;
  console.log(`\n📝 Response (stop_reason: ${stopReason}):`);
  for (const block of content) {
    if (block.type === 'text' && block.text) {
      console.log(block.text);
    } else {
      console.log(`  [${block.type}]`);
    }
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const workflowPath = args.find((a) => !a.startsWith('--'));
  const shouldExecute = args.includes('--execute');
  const shouldList = args.includes('--list');
  const isDryRun = args.includes('--dry-run');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !isDryRun) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required (or use --dry-run)');
    process.exit(1);
  }

  // List existing skills
  if (shouldList) {
    if (!apiKey) { console.error('❌ ANTHROPIC_API_KEY required for --list'); process.exit(1); }
    await listSkills(apiKey);
    return;
  }

  if (!workflowPath) {
    console.error('Usage: npx tsx poc/upload-skill-to-api.ts <workflow-json-path> [--execute] [--list] [--dry-run]');
    console.error('');
    console.error('Options:');
    console.error('  --execute   Execute the uploaded skill after upload');
    console.error('  --list      List existing custom skills');
    console.error('  --dry-run   Generate SKILL.md and ZIP without uploading (no API key needed)');
    process.exit(1);
  }

  // Step 1: Read workflow JSON
  const resolvedPath = path.resolve(workflowPath);
  console.log(`📂 Reading workflow: ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const workflowJson = fs.readFileSync(resolvedPath, 'utf-8');
  const workflow: Workflow = JSON.parse(workflowJson);
  console.log(`   Name: ${workflow.name}`);
  console.log(`   Nodes: ${workflow.nodes.length}`);
  console.log(`   Connections: ${workflow.connections.length}`);

  // Step 2: Generate SKILL.md
  const skillMd = generateSkillMd(workflow);
  const skillName = nodeNameToFileName(workflow.name);
  console.log(`\n📝 Generated SKILL.md (${skillMd.length} bytes)`);
  console.log('--- SKILL.md preview ---');
  console.log(skillMd.substring(0, 500));
  if (skillMd.length > 500) console.log('...(truncated)');
  console.log('--- end preview ---');

  // Step 3: Package as ZIP
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'cc-wf-skill-'));
  const zipPath = packageAsZip(skillName, skillMd, tmpDir);
  const zipSize = fs.statSync(zipPath).size;
  console.log(`\n📦 Created ZIP: ${zipPath} (${zipSize} bytes)`);

  // Step 4: Upload to Claude API (skip in dry-run mode)
  if (isDryRun) {
    // Save generated files for inspection
    const outputDir = path.join(path.dirname(resolvedPath), '..', 'poc', 'output');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.copyFileSync(path.join(tmpDir, skillName, 'SKILL.md'), path.join(outputDir, 'SKILL.md'));
    fs.copyFileSync(zipPath, path.join(outputDir, `${skillName}.zip`));
    console.log(`\n📁 Dry-run output saved to: ${outputDir}/`);
    console.log(`   - SKILL.md`);
    console.log(`   - ${skillName}.zip`);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`\n🧹 Cleaned up temp directory`);
    console.log(`\n✅ Dry-run complete. Review the generated files, then run with ANTHROPIC_API_KEY to upload.`);
    return;
  }

  try {
    const { id: skillId } = await uploadSkill(apiKey!, workflow.name, zipPath);

    // Step 5: Optionally execute
    if (shouldExecute) {
      await executeSkill(
        apiKey!,
        skillId,
        `Please execute the "${workflow.name}" workflow using the uploaded skill.`
      );
    } else {
      console.log(`\n💡 To execute this skill, run again with --execute flag`);
    }
  } finally {
    // Cleanup tmp
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`\n🧹 Cleaned up temp directory`);
  }
}

main().catch((err) => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});
