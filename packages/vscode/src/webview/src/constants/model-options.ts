/**
 * Sub-Agent model dropdown options, derived from the core SSoT
 * (`SUB_AGENT_MODEL_VALUES` in @cc-wf-studio/core).
 *
 * Labels are intentionally NOT localized — model names are product terms
 * and stay in English across all UI languages.
 */

import { SUB_AGENT_MODEL_VALUES, type SubAgentModel } from '@cc-wf-studio/core';

export const SUB_AGENT_MODEL_OPTIONS: { value: SubAgentModel; label: string }[] =
  SUB_AGENT_MODEL_VALUES.map((v) => ({
    value: v,
    label: v.charAt(0).toUpperCase() + v.slice(1),
  }));
