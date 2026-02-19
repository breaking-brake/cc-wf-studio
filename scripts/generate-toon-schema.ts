/**
 * TOON Schema Generator
 *
 * Converts workflow-schema.json to TOON format for reduced token consumption.
 *
 * Executed during build: npm run build
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { encode } from '@toon-format/toon';

const RESOURCES_DIR = path.resolve(__dirname, '../resources');
const JSON_SCHEMA_PATH = path.join(RESOURCES_DIR, 'workflow-schema.json');
const TOON_SCHEMA_PATH = path.join(RESOURCES_DIR, 'workflow-schema.toon');

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
  } catch (error) {
    console.error('Failed to generate TOON schema:', error);
    process.exit(1);
  }
}

generateToonSchema();
