/**
 * Workflow Migration Utility
 *
 * Migrates older workflow formats to current version.
 * Handles backward compatibility for workflow structure changes.
 */

import type {
  SkillNodeData,
  SwitchCondition,
  SwitchNodeData,
  Workflow,
  WorkflowNode,
} from '../../shared/types/workflow-definition';

/**
 * Generate a unique branch ID
 */
function generateBranchId(): string {
  return `branch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Migrate Switch nodes to include default branch
 *
 * For existing workflows without default branch:
 * - Adds a default branch at the end
 * - Updates outputPorts count
 *
 * For existing workflows with default branch:
 * - Ensures default branch is last
 * - Ensures only one default branch exists
 *
 * @param workflow - The workflow to migrate
 * @returns Migrated workflow with updated Switch nodes
 */
export function migrateSwitchNodes(workflow: Workflow): Workflow {
  const migratedNodes = workflow.nodes.map((node) => {
    if (node.type !== 'switch') return node;

    const switchData = node.data as SwitchNodeData;
    const branches = switchData.branches || [];

    // Check if any branch has isDefault
    const hasDefault = branches.some((b: SwitchCondition) => b.isDefault);

    if (hasDefault) {
      // Ensure default branch is last
      const defaultIndex = branches.findIndex((b: SwitchCondition) => b.isDefault);
      if (defaultIndex !== branches.length - 1) {
        const defaultBranch = branches[defaultIndex];
        const newBranches = [
          ...branches.slice(0, defaultIndex),
          ...branches.slice(defaultIndex + 1),
          defaultBranch,
        ];
        return {
          ...node,
          data: {
            ...switchData,
            branches: newBranches,
            outputPorts: newBranches.length,
          },
        } as WorkflowNode;
      }
      return node;
    }

    // Add default branch for legacy workflows
    const newBranches: SwitchCondition[] = [
      ...branches.map((b: SwitchCondition) => ({
        ...b,
        isDefault: false,
      })),
      {
        id: generateBranchId(),
        label: 'default',
        condition: 'Other cases',
        isDefault: true,
      },
    ];

    return {
      ...node,
      data: {
        ...switchData,
        branches: newBranches,
        outputPorts: newBranches.length,
      },
    } as WorkflowNode;
  });

  return {
    ...workflow,
    nodes: migratedNodes,
  };
}

/**
 * Migrate Skill nodes to use new scope terminology
 *
 * Converts legacy scope values to Anthropic official terminology:
 * - 'personal' → 'user'
 *
 * This migration supports backward compatibility for existing workflows
 * saved before the scope terminology update.
 *
 * @param workflow - The workflow to migrate
 * @returns Migrated workflow with updated Skill node scopes
 *
 * @see Issue #364 - Tech Debt: Remove this migration after deprecation period
 */
export function migrateSkillScopes(workflow: Workflow): Workflow {
  const migratedNodes = workflow.nodes.map((node) => {
    if (node.type !== 'skill') return node;

    const data = node.data as SkillNodeData;
    // Cast to allow checking for legacy 'personal' value
    const currentScope = data.scope as string;

    // Migrate 'personal' → 'user'
    if (currentScope === 'personal') {
      console.warn(
        `[Workflow Migration] Migrating Skill "${data.name}" scope: 'personal' → 'user'`
      );
      return {
        ...node,
        data: {
          ...data,
          scope: 'user' as const,
        },
      } as WorkflowNode;
    }

    return node;
  });

  return {
    ...workflow,
    nodes: migratedNodes,
  };
}

/**
 * Migrate Skill nodes to include explicit executionMode
 *
 * For existing workflows without executionMode:
 * - Sets executionMode to 'execute' (preserving existing behavior)
 *
 * @param workflow - The workflow to migrate
 * @returns Migrated workflow with updated Skill nodes
 */
export function migrateSkillExecutionMode(workflow: Workflow): Workflow {
  const migratedNodes = workflow.nodes.map((node) => {
    if (node.type !== 'skill') return node;

    const data = node.data as SkillNodeData;

    if (data.executionMode === undefined) {
      return {
        ...node,
        data: {
          ...data,
          executionMode: 'execute' as const,
        },
      } as WorkflowNode;
    }

    return node;
  });

  return {
    ...workflow,
    nodes: migratedNodes,
  };
}

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
  // Apply migrations in order
  let migrated = workflow;

  // Migration 1: Add default branch to Switch nodes
  migrated = migrateSwitchNodes(migrated);

  // Migration 2: Update Skill node scope terminology ('personal' → 'user')
  migrated = migrateSkillScopes(migrated);

  // Migration 3: Set explicit executionMode on Skill nodes
  migrated = migrateSkillExecutionMode(migrated);

  // Add future migrations here...

  return migrated;
}
