/**
 * Workflow Schema Loader Service
 *
 * Loads and caches the workflow schema documentation for AI context.
 * Supports both JSON and TOON formats for A/B testing.
 * Based on: /specs/001-ai-workflow-generation/research.md Q2
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SchemaFormat } from '../../shared/types/ai-metrics';

// In-memory caches for loaded schemas
let cachedJsonSchema: unknown | undefined;
let cachedToonSchema: string | undefined;

export interface SchemaLoadResult {
  success: boolean;
  schema?: unknown;
  schemaString?: string; // For TOON format (already serialized)
  format: SchemaFormat;
  sizeBytes: number;
  error?: {
    code: 'FILE_NOT_FOUND' | 'PARSE_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
}

/**
 * Load workflow schema in JSON format (existing behavior)
 *
 * @param schemaPath - Absolute path to workflow-schema.json file
 * @returns Load result with success status and schema/error
 */
export async function loadWorkflowSchema(schemaPath: string): Promise<SchemaLoadResult> {
  // Return cached schema if available
  if (cachedJsonSchema !== undefined) {
    return {
      success: true,
      schema: cachedJsonSchema,
      format: 'json',
      sizeBytes: JSON.stringify(cachedJsonSchema).length,
    };
  }

  try {
    // Read schema file
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Parse JSON
    const schema = JSON.parse(schemaContent);

    // Cache for future use
    cachedJsonSchema = schema;

    return {
      success: true,
      schema,
      format: 'json',
      sizeBytes: schemaContent.length,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        success: false,
        format: 'json',
        sizeBytes: 0,
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
        format: 'json',
        sizeBytes: 0,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse workflow schema JSON',
          details: error.message,
        },
      };
    }

    return {
      success: false,
      format: 'json',
      sizeBytes: 0,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred while loading schema',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Load workflow schema in TOON format
 * Returns the raw TOON string for direct inclusion in prompts
 *
 * @param schemaPath - Absolute path to workflow-schema.json file (TOON path derived from it)
 * @returns Load result with success status and schemaString/error
 */
export async function loadWorkflowSchemaToon(schemaPath: string): Promise<SchemaLoadResult> {
  // Derive TOON path from JSON path
  const toonPath = schemaPath.replace('.json', '.toon');

  // Return cached schema if available
  if (cachedToonSchema !== undefined) {
    return {
      success: true,
      schemaString: cachedToonSchema,
      format: 'toon',
      sizeBytes: cachedToonSchema.length,
    };
  }

  try {
    const toonContent = await fs.readFile(toonPath, 'utf-8');
    cachedToonSchema = toonContent;

    return {
      success: true,
      schemaString: toonContent,
      format: 'toon',
      sizeBytes: toonContent.length,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        success: false,
        format: 'toon',
        sizeBytes: 0,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'TOON schema file not found. Falling back to JSON.',
          details: `Path: ${toonPath}`,
        },
      };
    }

    return {
      success: false,
      format: 'toon',
      sizeBytes: 0,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred while loading TOON schema',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Load workflow schema in specified format
 *
 * @param extensionPath - The extension's root path
 * @param format - Schema format to load ('json' or 'toon')
 * @returns Load result with schema data
 */
export async function loadWorkflowSchemaByFormat(
  extensionPath: string,
  format: SchemaFormat
): Promise<SchemaLoadResult> {
  const jsonPath = getDefaultSchemaPath(extensionPath);

  if (format === 'toon') {
    const result = await loadWorkflowSchemaToon(jsonPath);
    if (result.success) {
      return result;
    }
    // Fallback to JSON if TOON fails
    console.warn('TOON schema load failed, falling back to JSON');
  }

  return loadWorkflowSchema(jsonPath);
}

/**
 * Clear both schema caches (useful for testing or schema updates)
 */
export function clearSchemaCache(): void {
  cachedJsonSchema = undefined;
  cachedToonSchema = undefined;
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
