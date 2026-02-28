import type { Workflow } from '../types/workflow-definition.js';

export interface IWorkflowProvider {
  getCurrentWorkflow(): Promise<{ workflow: Workflow | null; isStale: boolean }>;
  applyWorkflow(workflow: Workflow, description?: string): Promise<boolean>;
}
