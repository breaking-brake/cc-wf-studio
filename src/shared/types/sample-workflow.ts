/**
 * Sample Workflow Types
 *
 * Type definitions for sample workflow metadata and file structure.
 * Sample workflows are bundled in resources/samples/ as JSON files.
 */

import type { Workflow } from './workflow-definition';

/**
 * Metadata for a sample workflow, used for listing and display in the UI.
 */
export interface SampleWorkflowMeta {
  /** Unique identifier matching the JSON filename (without extension) */
  id: string;
  /** i18n translation key for the sample name */
  nameKey: string;
  /** i18n translation key for the sample description */
  descriptionKey: string;
  /** Difficulty level for display */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Categorization tags */
  tags: string[];
  /** Number of nodes in the workflow (for display) */
  nodeCount: number;
}

/**
 * Structure of a sample workflow JSON file.
 * Each file in resources/samples/ must conform to this interface.
 */
export interface SampleWorkflowFile {
  meta: SampleWorkflowMeta;
  workflow: Workflow;
}
