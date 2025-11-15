/**
 * JSON Schema Parser
 *
 * Feature: 001-mcp-node
 * Purpose: Parse and validate JSON Schema for MCP tool parameters
 *
 * Based on: JSON Schema Draft 7
 * Task: T030
 */

import type { ToolParameter } from '../../shared/types/mcp-node';

/**
 * JSON Schema property definition
 */
export interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaProperty;
}

/**
 * JSON Schema root definition
 */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaProperty;
}

/**
 * Extended ToolParameter with additional validation metadata
 */
export interface ExtendedToolParameter extends ToolParameter {
  /** Allowed enum values (if defined) */
  enum?: unknown[];
  /** Default value (if defined) */
  default?: unknown;
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** Minimum length for strings */
  minLength?: number;
  /** Maximum length for strings */
  maxLength?: number;
  /** Regex pattern for string validation */
  pattern?: string;
  /** Item schema for arrays */
  items?: JsonSchemaProperty;
  /** Properties for objects */
  properties?: Record<string, JsonSchemaProperty>;
}

/**
 * Parse JSON Schema and convert to ToolParameter array
 *
 * Extracts parameter definitions with validation metadata from JSON Schema.
 * Supports string, number, boolean, integer, array, and object types.
 *
 * @param schema - JSON Schema object
 * @returns Array of tool parameters with validation metadata
 *
 * @example
 * ```typescript
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     region: {
 *       type: 'string',
 *       description: 'AWS region',
 *       enum: ['us-east-1', 'us-west-2']
 *     },
 *     limit: {
 *       type: 'integer',
 *       description: 'Result limit',
 *       minimum: 1,
 *       maximum: 100,
 *       default: 10
 *     }
 *   },
 *   required: ['region']
 * };
 *
 * const params = parseJsonSchema(schema);
 * // [
 * //   { name: 'region', type: 'string', required: true, enum: ['us-east-1', 'us-west-2'], ... },
 * //   { name: 'limit', type: 'integer', required: false, minimum: 1, maximum: 100, default: 10, ... }
 * // ]
 * ```
 */
export function parseJsonSchema(schema: JsonSchema): ExtendedToolParameter[] {
  if (!schema.properties) {
    return [];
  }

  const required = schema.required || [];

  return Object.entries(schema.properties).map(([name, propSchema]) => {
    // Determine parameter type
    const paramType = normalizeSchemaType(propSchema.type);

    // Base parameter
    const param: ExtendedToolParameter = {
      name,
      type: paramType,
      description: propSchema.description || '',
      required: required.includes(name),
    };

    // Add enum values if defined
    if (propSchema.enum) {
      param.enum = propSchema.enum;
    }

    // Add default value if defined
    if (propSchema.default !== undefined) {
      param.default = propSchema.default;
    }

    // Add numeric constraints
    if (paramType === 'number' || paramType === 'integer') {
      if (propSchema.minimum !== undefined) {
        param.minimum = propSchema.minimum;
      }
      if (propSchema.maximum !== undefined) {
        param.maximum = propSchema.maximum;
      }
    }

    // Add string constraints
    if (paramType === 'string') {
      if (propSchema.minLength !== undefined) {
        param.minLength = propSchema.minLength;
      }
      if (propSchema.maxLength !== undefined) {
        param.maxLength = propSchema.maxLength;
      }
      if (propSchema.pattern) {
        param.pattern = propSchema.pattern;
      }
    }

    // Add array item schema
    if (paramType === 'array' && propSchema.items) {
      param.items = propSchema.items;
    }

    // Add object properties schema
    if (paramType === 'object' && propSchema.properties) {
      param.properties = propSchema.properties;
    }

    return param;
  });
}

/**
 * Normalize JSON Schema type to ToolParameter type
 *
 * Handles both single type strings and type arrays.
 *
 * @param type - JSON Schema type (string or string[])
 * @returns Normalized type string
 */
function normalizeSchemaType(
  type?: string | string[]
): 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object' {
  // Default to string if type is not defined
  if (!type) {
    return 'string';
  }

  // If type is an array, use the first non-null type
  if (Array.isArray(type)) {
    const firstType = type.find((t) => t !== 'null');
    if (!firstType) {
      return 'string';
    }
    type = firstType;
  }

  // Validate and return type
  if (
    type === 'string' ||
    type === 'number' ||
    type === 'boolean' ||
    type === 'integer' ||
    type === 'array' ||
    type === 'object'
  ) {
    return type;
  }

  // Unknown type defaults to string
  return 'string';
}

/**
 * Validate parameter value against JSON Schema constraints
 *
 * Checks if a value satisfies the constraints defined in the parameter schema.
 *
 * @param value - Value to validate
 * @param param - Parameter schema with constraints
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```typescript
 * const param = { name: 'region', type: 'string', enum: ['us-east-1', 'us-west-2'], required: true };
 * const result = validateParameterValue('us-east-1', param);
 * // { valid: true }
 *
 * const invalidResult = validateParameterValue('invalid-region', param);
 * // { valid: false, error: 'Value must be one of: us-east-1, us-west-2' }
 * ```
 */
export function validateParameterValue(
  value: unknown,
  param: ExtendedToolParameter
): { valid: boolean; error?: string } {
  // Check required constraint
  if (param.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: 'This field is required' };
  }

  // Skip validation if value is empty and not required
  if (!param.required && (value === undefined || value === null || value === '')) {
    return { valid: true };
  }

  // Validate by type
  switch (param.type) {
    case 'string':
      return validateStringValue(value, param);
    case 'number':
    case 'integer':
      return validateNumberValue(value, param);
    case 'boolean':
      return validateBooleanValue(value);
    case 'array':
      return validateArrayValue(value);
    case 'object':
      return validateObjectValue(value);
    default:
      return { valid: true };
  }
}

/**
 * Validate string value
 */
function validateStringValue(
  value: unknown,
  param: ExtendedToolParameter
): { valid: boolean; error?: string } {
  if (typeof value !== 'string') {
    return { valid: false, error: 'Value must be a string' };
  }

  // Check enum constraint
  if (param.enum && !param.enum.includes(value)) {
    return { valid: false, error: `Value must be one of: ${param.enum.join(', ')}` };
  }

  // Check minLength constraint
  if (param.minLength !== undefined && value.length < param.minLength) {
    return { valid: false, error: `Minimum length is ${param.minLength}` };
  }

  // Check maxLength constraint
  if (param.maxLength !== undefined && value.length > param.maxLength) {
    return { valid: false, error: `Maximum length is ${param.maxLength}` };
  }

  // Check pattern constraint
  if (param.pattern) {
    const regex = new RegExp(param.pattern);
    if (!regex.test(value)) {
      return { valid: false, error: `Value must match pattern: ${param.pattern}` };
    }
  }

  return { valid: true };
}

/**
 * Validate number value
 */
function validateNumberValue(
  value: unknown,
  param: ExtendedToolParameter
): { valid: boolean; error?: string } {
  const num = Number(value);

  if (Number.isNaN(num)) {
    return { valid: false, error: 'Value must be a number' };
  }

  // Check integer constraint
  if (param.type === 'integer' && !Number.isInteger(num)) {
    return { valid: false, error: 'Value must be an integer' };
  }

  // Check minimum constraint
  if (param.minimum !== undefined && num < param.minimum) {
    return { valid: false, error: `Minimum value is ${param.minimum}` };
  }

  // Check maximum constraint
  if (param.maximum !== undefined && num > param.maximum) {
    return { valid: false, error: `Maximum value is ${param.maximum}` };
  }

  return { valid: true };
}

/**
 * Validate boolean value
 */
function validateBooleanValue(value: unknown): { valid: boolean; error?: string } {
  if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
    return { valid: false, error: 'Value must be a boolean' };
  }

  return { valid: true };
}

/**
 * Validate array value
 */
function validateArrayValue(value: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'Value must be an array' };
  }

  return { valid: true };
}

/**
 * Validate object value
 */
function validateObjectValue(value: unknown): { valid: boolean; error?: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'Value must be an object' };
  }

  return { valid: true };
}
