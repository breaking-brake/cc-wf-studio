/**
 * Workflow Validator
 *
 * Validates workflow JSON files downloaded from Slack.
 * Ensures required fields exist and structure is valid before import.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/extension-host-api-contracts.md
 */

import type { Workflow } from '../../shared/types/workflow';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the workflow is valid */
  valid: boolean;
  /** Validation error messages (if invalid) */
  errors?: string[];
  /** Parsed workflow object (if valid) */
  workflow?: Workflow;
}

/**
 * Validates workflow JSON content
 *
 * Checks:
 * 1. Valid JSON format
 * 2. Required fields exist (id, name, version, nodes, connections)
 * 3. Basic structure validation
 *
 * @param content - Workflow JSON string
 * @returns Validation result with errors or parsed workflow
 */
export function validateWorkflowFile(content: string): ValidationResult {
  const errors: string[] = [];

  // Step 1: Parse JSON
  let parsedData: unknown;
  try {
    parsedData = JSON.parse(content);
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  // Step 2: Type check
  if (typeof parsedData !== 'object' || parsedData === null) {
    return {
      valid: false,
      errors: ['Workflow must be a JSON object'],
    };
  }

  const workflow = parsedData as Record<string, unknown>;

  // Step 3: Required field validation
  const requiredFields: Array<keyof Workflow> = ['id', 'name', 'version', 'nodes', 'connections'];

  for (const field of requiredFields) {
    if (!(field in workflow)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Step 4: Field type validation
  if ('id' in workflow && typeof workflow.id !== 'string') {
    errors.push('Field "id" must be a string');
  }

  if ('name' in workflow && typeof workflow.name !== 'string') {
    errors.push('Field "name" must be a string');
  }

  if ('version' in workflow && typeof workflow.version !== 'string') {
    errors.push('Field "version" must be a string');
  }

  if ('nodes' in workflow && !Array.isArray(workflow.nodes)) {
    errors.push('Field "nodes" must be an array');
  }

  if ('connections' in workflow && !Array.isArray(workflow.connections)) {
    errors.push('Field "connections" must be an array');
  }

  // Step 5: Return validation result
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    workflow: workflow as Workflow,
  };
}
