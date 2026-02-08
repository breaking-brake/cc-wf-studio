/**
 * Workflow Schema Loader Service
 *
 * Loads and caches the workflow schema documentation for AI context.
 * Supports both JSON and TOON formats for A/B testing.
 * Supports 'full' and 'basic' schema variants for provider-specific content.
 * Based on: /specs/001-ai-workflow-generation/research.md Q2
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SchemaFormat } from '../../shared/types/ai-metrics';

/**
 * Schema variant determines which set of node types are included.
 * - 'full': All node types (for Claude Code, Copilot CLI, VSCode Copilot)
 * - 'basic': SubAgent/SubAgentFlow excluded (for Codex CLI, Roo Code)
 */
export type SchemaVariant = 'full' | 'basic';

// In-memory caches for loaded schemas (keyed by variant)
const cachedJsonSchemas = new Map<SchemaVariant, unknown>();
const cachedToonSchemas = new Map<SchemaVariant, string>();

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
 * @param variant - Schema variant to load (default: 'full')
 * @returns Load result with success status and schema/error
 */
export async function loadWorkflowSchema(
  schemaPath: string,
  variant: SchemaVariant = 'full'
): Promise<SchemaLoadResult> {
  // Return cached schema if available
  const cached = cachedJsonSchemas.get(variant);
  if (cached !== undefined) {
    return {
      success: true,
      schema: cached,
      format: 'json',
      sizeBytes: JSON.stringify(cached).length,
    };
  }

  try {
    // Read schema file
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Parse JSON
    const schema = JSON.parse(schemaContent);

    // Cache for future use
    cachedJsonSchemas.set(variant, schema);

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
 * @param variant - Schema variant to load (default: 'full')
 * @returns Load result with success status and schemaString/error
 */
export async function loadWorkflowSchemaToon(
  schemaPath: string,
  variant: SchemaVariant = 'full'
): Promise<SchemaLoadResult> {
  // Derive TOON path from JSON path
  const toonPath = schemaPath.replace('.json', '.toon');

  // Return cached schema if available
  const cached = cachedToonSchemas.get(variant);
  if (cached !== undefined) {
    return {
      success: true,
      schemaString: cached,
      format: 'toon',
      sizeBytes: cached.length,
    };
  }

  try {
    const toonContent = await fs.readFile(toonPath, 'utf-8');
    cachedToonSchemas.set(variant, toonContent);

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
 * @param variant - Schema variant to load (default: 'full')
 * @returns Load result with schema data
 */
export async function loadWorkflowSchemaByFormat(
  extensionPath: string,
  format: SchemaFormat,
  variant: SchemaVariant = 'full'
): Promise<SchemaLoadResult> {
  const jsonPath = getDefaultSchemaPath(extensionPath, variant);

  if (format === 'toon') {
    const result = await loadWorkflowSchemaToon(jsonPath, variant);
    if (result.success) {
      return result;
    }
    // Fallback to JSON if TOON fails
    console.warn('TOON schema load failed, falling back to JSON');
  }

  return loadWorkflowSchema(jsonPath, variant);
}

/**
 * Clear both schema caches (useful for testing or schema updates)
 */
export function clearSchemaCache(): void {
  cachedJsonSchemas.clear();
  cachedToonSchemas.clear();
}

/**
 * Get the default schema path for the extension
 *
 * @param extensionPath - The extension's root path from context.extensionPath
 * @param variant - Schema variant (default: 'full')
 * @returns Absolute path to workflow-schema.json (or workflow-schema-basic.json for 'basic')
 */
export function getDefaultSchemaPath(
  extensionPath: string,
  variant: SchemaVariant = 'full'
): string {
  const filename = variant === 'basic' ? 'workflow-schema-basic.json' : 'workflow-schema.json';
  return path.join(extensionPath, 'resources', filename);
}
