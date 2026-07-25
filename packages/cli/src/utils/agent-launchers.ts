/**
 * Agents that can be launched from a terminal as a headless CLI binary.
 * IDE-only agents (antigravity / cursor / roo-code) have no headless CLI and
 * are intentionally excluded — `--launch` / `ccwf tour` skip them.
 *
 * Shared by `ccwf run --launch` (spawns the agent with the exported skill
 * already invoked) and `ccwf tour` (spawns the agent with an inline tour
 * prompt) so both commands agree on which agents are launchable, what their
 * binary is called, and how an inline prompt is passed to it.
 *
 * `ccwf tour` keeps its own argv map on top of this one: it adds
 * `--allow-all-tools` for Copilot because the tour is a one-shot file edit,
 * whereas `run --launch` stays a normal interactive session and must not
 * bypass the agent's permission prompts.
 */
export interface AgentLauncher {
  label: string;
  bin: string;
  /**
   * How a user invokes an exported skill in this agent, given the skill's
   * slash name — Claude Code / Copilot use `/name`, Codex uses `$name`,
   * Gemini takes the bare name. Mirrors the `Next:` hints in `run`.
   */
  invokeSkill: (slashName: string) => string;
  /** argv that spawns this agent with `prompt` as its initial input. */
  promptArgs: (prompt: string) => string[];
}

export const LAUNCHABLE_AGENTS: Record<string, AgentLauncher> = {
  'claude-code': {
    label: 'Claude Code',
    bin: 'claude',
    invokeSkill: (slash) => `/${slash}`,
    promptArgs: (prompt) => [prompt],
  },
  codex: {
    label: 'Codex CLI',
    bin: 'codex',
    invokeSkill: (slash) => `$${slash}`,
    promptArgs: (prompt) => [prompt],
  },
  copilot: {
    label: 'Copilot CLI',
    bin: 'copilot',
    invokeSkill: (slash) => `/${slash}`,
    promptArgs: (prompt) => ['-i', prompt],
  },
  gemini: {
    label: 'Gemini CLI',
    bin: 'gemini',
    invokeSkill: (slash) => slash,
    promptArgs: (prompt) => ['-i', prompt],
  },
};
