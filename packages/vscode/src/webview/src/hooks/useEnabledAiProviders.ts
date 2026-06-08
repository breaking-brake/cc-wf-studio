/**
 * Shared list of AI editing providers and a hook that filters it down to the
 * ones currently enabled (Claude Code is always available; the rest depend on
 * detected extensions/CLIs tracked in the refinement store).
 *
 * Used by the MCP "AI Edit" panel and the Generate Workflow Tour popover so the
 * available-agent list stays in one place.
 */

import type { AiEditingProvider } from '@shared/types/messages';
import { useMemo } from 'react';
import { useRefinementStore } from '../stores/refinement-store';

export interface AiProviderOption {
  provider: AiEditingProvider;
  label: string;
}

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  { provider: 'claude-code', label: 'Claude Code' },
  { provider: 'copilot-chat', label: 'Copilot Chat' },
  { provider: 'copilot-cli', label: 'Copilot CLI' },
  { provider: 'codex', label: 'Codex CLI' },
  { provider: 'roo-code', label: 'Roo Code' },
  { provider: 'gemini', label: 'Gemini CLI' },
  { provider: 'antigravity', label: 'Antigravity' },
  { provider: 'cursor', label: 'Cursor' },
];

export function useEnabledAiProviders(): AiProviderOption[] {
  const {
    isCopilotChatEnabled,
    isCopilotCliEnabled,
    isCodexEnabled,
    isRooCodeEnabled,
    isGeminiEnabled,
    isAntigravityEnabled,
    isCursorEnabled,
  } = useRefinementStore();

  return useMemo(
    () =>
      AI_PROVIDER_OPTIONS.filter((o) => {
        switch (o.provider) {
          case 'claude-code':
            return true;
          case 'copilot-cli':
            return isCopilotCliEnabled;
          case 'copilot-chat':
            return isCopilotChatEnabled;
          case 'codex':
            return isCodexEnabled;
          case 'roo-code':
            return isRooCodeEnabled;
          case 'gemini':
            return isGeminiEnabled;
          case 'antigravity':
            return isAntigravityEnabled;
          case 'cursor':
            return isCursorEnabled;
          default:
            return false;
        }
      }),
    [
      isCopilotChatEnabled,
      isCopilotCliEnabled,
      isCodexEnabled,
      isRooCodeEnabled,
      isGeminiEnabled,
      isAntigravityEnabled,
      isCursorEnabled,
    ]
  );
}
