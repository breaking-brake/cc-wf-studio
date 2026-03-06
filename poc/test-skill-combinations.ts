/**
 * PoC: Test Custom Skill combinations with existing Skills and remote MCP
 *
 * Test A: Custom Skill + Anthropic pre-built Skill (pptx)
 * Test B: Custom Skill + Remote MCP (Context7)
 *
 * Usage:
 *   export $(cat poc/.env | xargs)
 *   npx tsx poc/test-skill-combinations.ts --test-skills     # Test A
 *   npx tsx poc/test-skill-combinations.ts --test-mcp        # Test B
 *   npx tsx poc/test-skill-combinations.ts --all             # Both
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const API_BASE = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';
const MODEL = 'claude-haiku-4-5-20251001';

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }
  return key;
}

function saveResponse(testName: string, result: Record<string, unknown>): void {
  const outputDir = path.join(process.cwd(), 'poc', 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${testName}-response.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`📁 Full response saved to: ${outputPath}`);
}

function printResponse(result: Record<string, unknown>): void {
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
// Test A: Custom Skill + Anthropic pre-built Skill
// ============================================================================

async function testCustomPlusAnthropicSkill(apiKey: string): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test A: Custom Skill + Anthropic pre-built Skill (pptx)');
  console.log('='.repeat(70));

  // Find existing custom skill
  console.log('\n🔍 Looking for existing custom skill...');
  const listResponse = await fetch(`${API_BASE}/v1/skills?source=custom`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': 'skills-2025-10-02',
    },
  });

  if (!listResponse.ok) {
    throw new Error(`List skills failed: ${await listResponse.text()}`);
  }

  const skills = (await listResponse.json()) as {
    data: { id: string; display_title: string }[];
  };

  const customSkill = skills.data.find((s) => s.display_title === 'daily-task-workflow');
  if (!customSkill) {
    console.log(
      '❌ Custom skill "daily-task-workflow" not found. Run upload-skill-to-api.ts first.'
    );
    return;
  }
  console.log(`   Found: ${customSkill.id}`);

  // Execute with both custom + anthropic skill
  console.log('\n🚀 Executing with Custom Skill + pptx Skill...');
  const response = await fetch(`${API_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': 'code-execution-2025-08-25,skills-2025-10-02',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      container: {
        skills: [
          { type: 'custom', skill_id: customSkill.id, version: 'latest' },
          { type: 'anthropic', skill_id: 'pptx', version: 'latest' },
        ],
      },
      messages: [
        {
          role: 'user',
          content:
            'First, read the daily-task-workflow skill to understand the workflow structure. Then, create a simple 2-slide PowerPoint presentation that summarizes the workflow diagram found in the skill.',
        },
      ],
      tools: [{ type: 'code_execution_20250825', name: 'code_execution' }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`❌ Execution failed (${response.status}): ${errorBody}`);
    return;
  }

  const result = (await response.json()) as Record<string, unknown>;
  saveResponse('test-a-custom-plus-pptx', result);
  printResponse(result);
  console.log('\n✅ Test A complete');
}

// ============================================================================
// Test B: Custom Skill + Remote MCP (Context7)
// ============================================================================

async function testCustomPlusMcp(apiKey: string): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('Test B: Custom Skill + Remote MCP (Context7)');
  console.log('='.repeat(70));

  // Find existing custom skill
  console.log('\n🔍 Looking for existing custom skill...');
  const listResponse = await fetch(`${API_BASE}/v1/skills?source=custom`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': 'skills-2025-10-02',
    },
  });

  if (!listResponse.ok) {
    throw new Error(`List skills failed: ${await listResponse.text()}`);
  }

  const skills = (await listResponse.json()) as {
    data: { id: string; display_title: string }[];
  };

  const customSkill = skills.data.find((s) => s.display_title === 'daily-task-workflow');
  if (!customSkill) {
    console.log(
      '❌ Custom skill "daily-task-workflow" not found. Run upload-skill-to-api.ts first.'
    );
    return;
  }
  console.log(`   Found: ${customSkill.id}`);

  // Execute with custom skill + MCP (Context7)
  console.log('\n🚀 Executing with Custom Skill + Context7 MCP...');
  const response = await fetch(`${API_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-beta': 'code-execution-2025-08-25,skills-2025-10-02,mcp-client-2025-11-20',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      container: {
        skills: [{ type: 'custom', skill_id: customSkill.id, version: 'latest' }],
      },
      mcp_servers: [
        {
          type: 'url',
          url: 'https://mcp.context7.com/mcp',
          name: 'context7',
        },
      ],
      messages: [
        {
          role: 'user',
          content:
            'First, use the Context7 MCP tools to resolve the library ID for "react" and then query the latest version information. After that, read the daily-task-workflow skill and tell me the workflow structure.',
        },
      ],
      tools: [
        { type: 'code_execution_20250825', name: 'code_execution' },
        { type: 'mcp_toolset', mcp_server_name: 'context7' },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`❌ Execution failed (${response.status}): ${errorBody}`);
    return;
  }

  const result = (await response.json()) as Record<string, unknown>;
  saveResponse('test-b-custom-plus-mcp', result);
  printResponse(result);
  console.log('\n✅ Test B complete');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const testSkills = args.includes('--test-skills') || args.includes('--all');
  const testMcp = args.includes('--test-mcp') || args.includes('--all');

  if (!testSkills && !testMcp) {
    console.log(
      'Usage: npx tsx poc/test-skill-combinations.ts [--test-skills] [--test-mcp] [--all]'
    );
    console.log('');
    console.log('Options:');
    console.log('  --test-skills  Test A: Custom Skill + Anthropic pre-built Skill (pptx)');
    console.log('  --test-mcp     Test B: Custom Skill + Remote MCP (Context7)');
    console.log('  --all          Run all tests');
    process.exit(0);
  }

  const apiKey = getApiKey();

  if (testSkills) {
    await testCustomPlusAnthropicSkill(apiKey);
  }

  if (testMcp) {
    await testCustomPlusMcp(apiKey);
  }

  console.log('\n🏁 All tests done.');
}

main().catch((err) => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});
