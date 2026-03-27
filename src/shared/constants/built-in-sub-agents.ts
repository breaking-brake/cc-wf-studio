/**
 * Built-in Claude Code Sub-Agent Presets
 *
 * Defines the core built-in sub-agent types provided by Claude Code.
 * These agents have fixed model and tool configurations controlled by Claude Code.
 */

import type { BuiltInSubAgentType } from '../types/workflow-definition';

/** i18n keys for built-in sub-agent presets (must match WebviewTranslationKeys) */
type BuiltInI18nKey =
  | 'subAgent.builtIn.generalPurpose.description'
  | 'subAgent.builtIn.generalPurpose.defaultAgentDefinition'
  | 'subAgent.builtIn.generalPurpose.defaultPrompt'
  | 'subAgent.builtIn.explore.description'
  | 'subAgent.builtIn.explore.defaultAgentDefinition'
  | 'subAgent.builtIn.explore.defaultPrompt'
  | 'subAgent.builtIn.plan.description'
  | 'subAgent.builtIn.plan.defaultAgentDefinition'
  | 'subAgent.builtIn.plan.defaultPrompt';

export interface BuiltInSubAgentPreset {
  /** The built-in sub-agent type identifier */
  type: BuiltInSubAgentType;
  /** Display name (not localized — kept in English across all languages) */
  displayName: string;
  /** i18n key for the description */
  descriptionKey: BuiltInI18nKey;
  /** i18n key for the default agent definition (what this agent IS) */
  defaultAgentDefinitionKey: BuiltInI18nKey;
  /** i18n key for the default task prompt template (what to TELL this agent to do) */
  defaultPromptKey: BuiltInI18nKey;
  /** Model used by this preset (e.g., 'haiku', 'inherit') */
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  /** Whether this preset is read-only (no file writes/edits) */
  readonly?: boolean;
  /** Human-readable tools description (read-only, controlled by preset) */
  toolsDescription: string;
  /** Human-readable model description (read-only, controlled by preset) */
  modelDescription: string;
}

export const BUILT_IN_SUB_AGENTS: readonly BuiltInSubAgentPreset[] = [
  {
    type: 'general-purpose',
    displayName: 'General Purpose',
    descriptionKey: 'subAgent.builtIn.generalPurpose.description',
    defaultAgentDefinitionKey: 'subAgent.builtIn.generalPurpose.defaultAgentDefinition',
    defaultPromptKey: 'subAgent.builtIn.generalPurpose.defaultPrompt',
    toolsDescription: 'All tools (*)',
    modelDescription: 'Inherited from parent',
  },
  {
    type: 'explore',
    displayName: 'Explore',
    descriptionKey: 'subAgent.builtIn.explore.description',
    defaultAgentDefinitionKey: 'subAgent.builtIn.explore.defaultAgentDefinition',
    defaultPromptKey: 'subAgent.builtIn.explore.defaultPrompt',
    model: 'haiku',
    readonly: true,
    toolsDescription: 'Read-only tools (no Write/Edit)',
    modelDescription: 'Haiku (fast) — inherit on other AI agents',
  },
  {
    type: 'plan',
    displayName: 'Plan',
    descriptionKey: 'subAgent.builtIn.plan.description',
    defaultAgentDefinitionKey: 'subAgent.builtIn.plan.defaultAgentDefinition',
    defaultPromptKey: 'subAgent.builtIn.plan.defaultPrompt',
    readonly: true,
    toolsDescription: 'Read-only tools (no Write/Edit)',
    modelDescription: 'Inherited from parent',
  },
] as const;
