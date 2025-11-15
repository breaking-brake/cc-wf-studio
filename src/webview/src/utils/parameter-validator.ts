/**
 * Parameter Validator - Webview Client-Side Validation
 *
 * Feature: 001-mcp-node
 * Purpose: Validate MCP tool parameter values against schema constraints
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T037
 *
 * Note: This is a client-side validator for immediate UI feedback.
 * Extension-side validation (schema-parser.ts) is the authoritative source.
 */

import type { ToolParameter } from '@shared/types/mcp-node';

/**
 * Extended ToolParameter with validation metadata
 */
export interface ExtendedToolParameter extends ToolParameter {
  /** Allowed enum values (if defined) */
  enum?: unknown[];
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
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate parameter value against schema constraints
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
 * ```
 */
export function validateParameterValue(
  value: unknown,
  param: ExtendedToolParameter
): ValidationResult {
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
function validateStringValue(value: unknown, param: ExtendedToolParameter): ValidationResult {
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
function validateNumberValue(value: unknown, param: ExtendedToolParameter): ValidationResult {
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
function validateBooleanValue(value: unknown): ValidationResult {
  if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
    return { valid: false, error: 'Value must be a boolean' };
  }

  return { valid: true };
}

/**
 * Validate array value
 */
function validateArrayValue(value: unknown): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, error: 'Value must be an array' };
  }

  return { valid: true };
}

/**
 * Validate object value
 */
function validateObjectValue(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: 'Value must be an object' };
  }

  return { valid: true };
}

/**
 * Validate all parameters in a parameter map
 *
 * @param parameterValues - Map of parameter names to values
 * @param parameters - Array of parameter schemas
 * @returns Map of parameter names to validation errors (empty if all valid)
 *
 * @example
 * ```typescript
 * const errors = validateAllParameters(
 *   { region: 'us-east-1', limit: '10' },
 *   [
 *     { name: 'region', type: 'string', required: true },
 *     { name: 'limit', type: 'integer', required: false }
 *   ]
 * );
 * // {}
 * ```
 */
export function validateAllParameters(
  parameterValues: Record<string, unknown>,
  parameters: ExtendedToolParameter[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const param of parameters) {
    const value = parameterValues[param.name];
    const result = validateParameterValue(value, param);

    if (!result.valid && result.error) {
      errors[param.name] = result.error;
    }
  }

  return errors;
}
