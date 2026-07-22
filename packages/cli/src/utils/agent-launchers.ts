/**
 * Agents that can be launched from a terminal as a headless CLI binary.
 * IDE-only agents (antigravity / cursor / roo-code) have no headless CLI and
 * are intentionally excluded — `--launch` / `ccwf tour` skip them.
 *
 * Shared by `ccwf run --launch` (opens the agent interactively, no prompt)
 * and `ccwf tour` (spawns the agent with an inline prompt) so both commands
 * agree on which agents are launchable and what their binary is called.
 */
export interface AgentLauncher {
  label: string;
  bin: string;
}

export const LAUNCHABLE_AGENTS: Record<string, AgentLauncher> = {
  'claude-code': { label: 'Claude Code', bin: 'claude' },
  codex: { label: 'Codex CLI', bin: 'codex' },
  copilot: { label: 'Copilot CLI', bin: 'copilot' },
  gemini: { label: 'Gemini CLI', bin: 'gemini' },
};
