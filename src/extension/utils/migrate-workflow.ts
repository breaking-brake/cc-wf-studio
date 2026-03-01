/**
 * Workflow Migration Utility
 *
 * Migrates older workflow formats to current version.
 * Handles backward compatibility for workflow structure changes.
 */

import type { Workflow } from '../../shared/types/workflow-definition';

/**
 * Apply all workflow migrations
 *
 * Runs all migration functions in sequence.
 * Add new migration functions here as the schema evolves.
 *
 * @param workflow - The workflow to migrate
 * @returns Fully migrated workflow
 */
export function migrateWorkflow(workflow: Workflow): Workflow {
  // All legacy migrations have been removed after sufficient deprecation periods.
  // Add future migrations here...

  return workflow;
}
