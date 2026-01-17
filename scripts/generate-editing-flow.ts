/**
 * AI Editing Flow Generator
 *
 * Parses ai-editing-process-flow.md and generates TypeScript constants.
 * This allows the Mermaid diagram and process steps to be maintained in a
 * human-readable markdown file while being embedded in the prompt builder.
 *
 * Executed during build: npm run build
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const RESOURCES_DIR = path.resolve(__dirname, '../resources');
const MD_PATH = path.join(RESOURCES_DIR, 'ai-editing-process-flow.md');
const OUTPUT_PATH = path.resolve(
  __dirname,
  '../src/extension/services/editing-flow-constants.generated.ts'
);

interface EditingFlowData {
  mermaidDiagram: string;
  steps: string[];
  requestTypeGuidelines: {
    questionOrUnderstanding: string[];
    editRequest: string[];
    unclearRequest: string[];
  };
  clarificationTriggers: string[];
}

/**
 * Extract content between ```mermaid and ``` markers
 */
function extractMermaidDiagram(content: string): string {
  const match = content.match(/```mermaid\n([\s\S]*?)```/);
  if (!match) {
    throw new Error('Mermaid diagram not found in markdown file');
  }
  return match[1].trim();
}

/**
 * Extract numbered list items under a heading
 */
function extractNumberedList(content: string, heading: string): string[] {
  const headingRegex = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = content.match(headingRegex);
  if (!match) {
    return [];
  }

  const section = match[1];
  const items: string[] = [];
  const lines = section.split('\n');

  for (const line of lines) {
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      items.push(numberedMatch[1].trim());
    }
  }

  return items;
}

/**
 * Extract bullet list items under a subsection heading
 */
function extractBulletList(content: string, mainHeading: string, subHeading: string): string[] {
  // Find the main section
  const mainRegex = new RegExp(`## ${mainHeading}\\n\\n([\\s\\S]*?)(?=\\n## [^#]|$)`);
  const mainMatch = content.match(mainRegex);
  if (!mainMatch) {
    return [];
  }

  const mainSection = mainMatch[1];

  // Find the subsection
  const subRegex = new RegExp(`### ${subHeading}\\n\\n([\\s\\S]*?)(?=\\n### |$)`);
  const subMatch = mainSection.match(subRegex);
  if (!subMatch) {
    return [];
  }

  const subSection = subMatch[1];
  const items: string[] = [];
  const lines = subSection.split('\n');

  for (const line of lines) {
    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      // Remove backticks from inline code
      items.push(bulletMatch[1].trim().replace(/`/g, ''));
    }
  }

  return items;
}

/**
 * Extract bullet list items under a heading (top-level)
 */
function extractTopLevelBulletList(content: string, heading: string): string[] {
  const headingRegex = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = content.match(headingRegex);
  if (!match) {
    return [];
  }

  const section = match[1];
  const items: string[] = [];
  const lines = section.split('\n');

  for (const line of lines) {
    const bulletMatch = line.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      items.push(bulletMatch[1].trim());
    }
  }

  return items;
}

/**
 * Parse the markdown file and extract all data
 */
function parseMarkdown(content: string): EditingFlowData {
  // Normalize CRLF to LF for cross-platform compatibility (Windows support)
  const normalizedContent = content.replace(/\r\n/g, '\n');

  return {
    mermaidDiagram: extractMermaidDiagram(normalizedContent),
    steps: extractNumberedList(normalizedContent, 'Process Steps'),
    requestTypeGuidelines: {
      questionOrUnderstanding: extractBulletList(
        normalizedContent,
        'Request Type Guidelines',
        'Question or Understanding Request'
      ),
      editRequest: extractBulletList(normalizedContent, 'Request Type Guidelines', 'Edit Request'),
      unclearRequest: extractBulletList(
        normalizedContent,
        'Request Type Guidelines',
        'Unclear Request'
      ),
    },
    clarificationTriggers: extractTopLevelBulletList(normalizedContent, 'Clarification Triggers'),
  };
}

/**
 * Generate TypeScript code from parsed data
 */
function generateTypeScript(data: EditingFlowData): string {
  const toStringArray = (arr: string[]) =>
    arr.map((item) => `    '${item.replace(/'/g, "\\'")}',`).join('\n');

  return `/**
 * AI Editing Flow Constants
 *
 * AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY
 * Generated from: resources/ai-editing-process-flow.md
 * To modify, edit the markdown file and run: npm run generate:editing-flow
 */

/**
 * Mermaid diagram representing the AI editing process flow
 */
export const EDITING_PROCESS_MERMAID_DIAGRAM = \`${data.mermaidDiagram}\`;

/**
 * Step-by-step process for AI editing
 */
export const EDITING_PROCESS_STEPS: readonly string[] = [
${toStringArray(data.steps)}
] as const;

/**
 * Guidelines for identifying request types
 */
export const REQUEST_TYPE_GUIDELINES = {
  questionOrUnderstanding: [
${toStringArray(data.requestTypeGuidelines.questionOrUnderstanding)}
  ] as const,
  editRequest: [
${toStringArray(data.requestTypeGuidelines.editRequest)}
  ] as const,
  unclearRequest: [
${toStringArray(data.requestTypeGuidelines.unclearRequest)}
  ] as const,
} as const;

/**
 * Conditions that should trigger a clarification request
 */
export const CLARIFICATION_TRIGGERS: readonly string[] = [
${toStringArray(data.clarificationTriggers)}
] as const;
`;
}

async function generateEditingFlow(): Promise<void> {
  console.log('Generating editing flow constants from ai-editing-process-flow.md...');

  try {
    // Read markdown file
    const mdContent = await fs.readFile(MD_PATH, 'utf-8');

    // Parse markdown
    const data = parseMarkdown(mdContent);

    // Generate TypeScript
    const tsContent = generateTypeScript(data);

    // Write output file
    await fs.writeFile(OUTPUT_PATH, tsContent, 'utf-8');

    console.log('Editing flow constants generated successfully:');
    console.log(`  Source: ${path.relative(process.cwd(), MD_PATH)}`);
    console.log(`  Output: ${path.relative(process.cwd(), OUTPUT_PATH)}`);
    console.log(`  Steps: ${data.steps.length}`);
    console.log(`  Clarification triggers: ${data.clarificationTriggers.length}`);
  } catch (error) {
    console.error('Failed to generate editing flow constants:', error);
    process.exit(1);
  }
}

generateEditingFlow();
