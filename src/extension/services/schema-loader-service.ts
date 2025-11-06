/**
 * Workflow Schema Loader Service
 *
 * Loads and caches the workflow schema documentation for AI context.
 * Based on: /specs/001-ai-workflow-generation/research.md Q2
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// In-memory cache for loaded schema
let cachedSchema: unknown | null = null;

export interface SchemaLoadResult {
  success: boolean;
  schema?: unknown;
  error?: {
    code: 'FILE_NOT_FOUND' | 'PARSE_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
}

/**
 * Load workflow schema from file
 *
 * @param schemaPath - Absolute path to workflow-schema.json file
 * @returns Load result with success status and schema/error
 */
export async function loadWorkflowSchema(schemaPath: string): Promise<SchemaLoadResult> {
  // Return cached schema if available
  if (cachedSchema !== null) {
    return {
      success: true,
      schema: cachedSchema,
    };
  }

  try {
    // Read schema file
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Parse JSON
    const schema = JSON.parse(schemaContent);

    // Cache for future use
    cachedSchema = schema;

    return {
      success: true,
      schema,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Workflow schema file not found',
          details: `Path: ${schemaPath}`,
        },
      };
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse workflow schema JSON',
          details: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred while loading schema',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Clear the cached schema (useful for testing or schema updates)
 */
export function clearSchemaCache(): void {
  cachedSchema = null;
}

/**
 * Get the default schema path for the extension
 *
 * @param extensionPath - The extension's root path from context.extensionPath
 * @returns Absolute path to workflow-schema.json
 */
export function getDefaultSchemaPath(extensionPath: string): string {
  return path.join(extensionPath, 'resources', 'workflow-schema.json');
}
