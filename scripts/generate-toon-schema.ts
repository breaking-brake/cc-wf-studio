/**
 * TOON Schema Generator
 *
 * Converts workflow-schema.json to TOON format for reduced token consumption.
 * Also generates "basic" schema variants (excluding subAgent/subAgentFlow)
 * for providers that don't support sub-agent execution (e.g., Codex CLI, Roo Code).
 *
 * Executed during build: npm run build
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { encode } from '@toon-format/toon';

const RESOURCES_DIR = path.resolve(__dirname, '../resources');
const JSON_SCHEMA_PATH = path.join(RESOURCES_DIR, 'workflow-schema.json');
const TOON_SCHEMA_PATH = path.join(RESOURCES_DIR, 'workflow-schema.toon');
const BASIC_JSON_SCHEMA_PATH = path.join(RESOURCES_DIR, 'workflow-schema-basic.json');
const BASIC_TOON_SCHEMA_PATH = path.join(RESOURCES_DIR, 'workflow-schema-basic.toon');

/**
 * Create a basic schema variant by removing subAgent/subAgentFlow related content
 */
function createBasicSchema(fullSchema: Record<string, unknown>): Record<string, unknown> {
  const schema = JSON.parse(JSON.stringify(fullSchema)) as Record<string, unknown>;

  // 1. Remove subAgent and subAgentFlow from metadata.supportedNodeTypes
  const metadata = schema.metadata as Record<string, unknown> | undefined;
  if (metadata?.supportedNodeTypes && Array.isArray(metadata.supportedNodeTypes)) {
    metadata.supportedNodeTypes = metadata.supportedNodeTypes.filter(
      (t: string) => t !== 'subAgent' && t !== 'subAgentFlow'
    );
  }

  // 2. Remove subAgent and subAgentFlow from nodeTypes
  const nodeTypes = schema.nodeTypes as Record<string, unknown> | undefined;
  if (nodeTypes) {
    delete nodeTypes.subAgent;
    delete nodeTypes.subAgentFlow;
  }

  // 3. Remove subAgentFlowConstraints section
  delete schema.subAgentFlowConstraints;

  // 4. Remove subAgentFlows from workflowStructure.fields
  const workflowStructure = schema.workflowStructure as Record<string, unknown> | undefined;
  if (workflowStructure) {
    const fields = workflowStructure.fields as Record<string, unknown> | undefined;
    if (fields) {
      delete fields.subAgentFlows;
    }
  }

  // 5. Remove subAgent and subAgentFlow from connections.portNamingRules.linearNodes.types
  const connections = schema.connections as Record<string, unknown> | undefined;
  if (connections) {
    const portNamingRules = connections.portNamingRules as Record<string, unknown> | undefined;
    if (portNamingRules) {
      const linearNodes = portNamingRules.linearNodes as Record<string, unknown> | undefined;
      if (linearNodes?.types && Array.isArray(linearNodes.types)) {
        linearNodes.types = linearNodes.types.filter(
          (t: string) => t !== 'subAgent' && t !== 'subAgentFlow'
        );
      }
    }
  }

  // 6. Remove examples that use subAgent nodes
  if (schema.examples && Array.isArray(schema.examples)) {
    schema.examples = schema.examples.filter((example: Record<string, unknown>) => {
      const workflow = example.workflow as Record<string, unknown> | undefined;
      if (!workflow) return true;
      const nodes = workflow.nodes as Array<Record<string, unknown>> | undefined;
      if (!nodes) return true;
      return !nodes.some((node) => node.type === 'subAgent' || node.type === 'subAgentFlow');
    });
  }

  return schema;
}

async function generateToonSchema(): Promise<void> {
  console.log('Generating TOON schema from workflow-schema.json...');

  try {
    // Read JSON schema
    const jsonContent = await fs.readFile(JSON_SCHEMA_PATH, 'utf-8');
    const schema = JSON.parse(jsonContent);

    // Convert to TOON format
    const toonContent = encode(schema);

    // Write TOON file
    await fs.writeFile(TOON_SCHEMA_PATH, toonContent, 'utf-8');

    // Calculate size comparison
    const jsonSize = Buffer.byteLength(jsonContent, 'utf-8');
    const toonSize = Buffer.byteLength(toonContent, 'utf-8');
    const reduction = (((jsonSize - toonSize) / jsonSize) * 100).toFixed(1);

    console.log('TOON schema generated successfully:');
    console.log(`  JSON size: ${jsonSize} bytes`);
    console.log(`  TOON size: ${toonSize} bytes`);
    console.log(`  Size reduction: ${reduction}%`);

    // Generate basic variant (subAgent/subAgentFlow excluded)
    console.log('\nGenerating basic schema variant...');
    const basicSchema = createBasicSchema(schema);

    const basicJsonContent = JSON.stringify(basicSchema, null, 2);
    await fs.writeFile(BASIC_JSON_SCHEMA_PATH, basicJsonContent, 'utf-8');

    const basicToonContent = encode(basicSchema);
    await fs.writeFile(BASIC_TOON_SCHEMA_PATH, basicToonContent, 'utf-8');

    const basicJsonSize = Buffer.byteLength(basicJsonContent, 'utf-8');
    const basicToonSize = Buffer.byteLength(basicToonContent, 'utf-8');
    const basicReduction = (((basicJsonSize - basicToonSize) / basicJsonSize) * 100).toFixed(1);

    console.log('Basic schema variant generated successfully:');
    console.log(`  JSON size: ${basicJsonSize} bytes`);
    console.log(`  TOON size: ${basicToonSize} bytes`);
    console.log(`  Size reduction: ${basicReduction}%`);
  } catch (error) {
    console.error('Failed to generate TOON schema:', error);
    process.exit(1);
  }
}

generateToonSchema();
