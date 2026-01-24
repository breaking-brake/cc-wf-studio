/**
 * Claude Code Workflow Studio - Terminal Execution Service
 *
 * Handles execution of slash commands in VSCode integrated terminal
 */

import * as vscode from 'vscode';

/**
 * Options for executing a slash command in terminal
 */
export interface TerminalExecutionOptions {
  /** Workflow name (used for terminal tab name and slash command) */
  workflowName: string;
  /** Working directory for the terminal */
  workingDirectory: string;
}

/**
 * Result of terminal execution
 */
export interface TerminalExecutionResult {
  /** Name of the created terminal */
  terminalName: string;
  /** Reference to the VSCode terminal instance */
  terminal: vscode.Terminal;
}

/**
 * Execute a slash command in a new VSCode integrated terminal
 *
 * Creates a new terminal with the workflow name as the tab title,
 * sets the working directory to the workspace root, and executes
 * the Claude Code CLI with the slash command.
 *
 * @param options - Terminal execution options
 * @returns Terminal execution result
 */
export function executeSlashCommandInTerminal(
  options: TerminalExecutionOptions
): TerminalExecutionResult {
  const terminalName = `Workflow: ${options.workflowName}`;

  // Create a new terminal with the workflow name
  const terminal = vscode.window.createTerminal({
    name: terminalName,
    cwd: options.workingDirectory,
  });

  // Show the terminal and focus on it
  terminal.show(true);

  // Execute the Claude Code CLI with the slash command
  // Using double quotes to handle workflow names with spaces
  terminal.sendText(`claude "/${options.workflowName}"`);

  return {
    terminalName,
    terminal,
  };
}

/**
 * Options for executing Copilot CLI skill command
 */
export interface CopilotCliExecutionOptions {
  /** Skill name (the workflow name as .github/skills/{name}/SKILL.md) */
  skillName: string;
  /** Working directory for the terminal */
  workingDirectory: string;
}

/**
 * Execute Copilot CLI with skill in a new VSCode integrated terminal
 *
 * Creates a new terminal and executes:
 *   copilot -i ":skill {skillName}" --allow-all-tools
 *
 * @param options - Copilot CLI execution options
 * @returns Terminal execution result
 */
export function executeCopilotCliInTerminal(
  options: CopilotCliExecutionOptions
): TerminalExecutionResult {
  const terminalName = `Copilot: ${options.skillName}`;

  // Create a new terminal
  const terminal = vscode.window.createTerminal({
    name: terminalName,
    cwd: options.workingDirectory,
  });

  // Show the terminal and focus on it
  terminal.show(true);

  // Execute: copilot -i ":skill {skillName}" --allow-all-tools
  terminal.sendText(`copilot -i ":skill ${options.skillName}" --allow-all-tools`);

  return {
    terminalName,
    terminal,
  };
}

/**
 * Options for executing Codex CLI skill command
 */
export interface CodexCliExecutionOptions {
  /** Skill name (the workflow name as .codex/skills/{name}/SKILL.md) */
  skillName: string;
  /** Working directory for the terminal */
  workingDirectory: string;
}

/**
 * Execute Codex CLI with skill in a new VSCode integrated terminal
 *
 * Creates a new terminal and executes:
 *   codex "$skill-name"
 *
 * Note: Codex CLI uses $skill-name format to invoke skills in interactive mode
 *
 * @param options - Codex CLI execution options
 * @returns Terminal execution result
 */
export function executeCodexCliInTerminal(
  options: CodexCliExecutionOptions
): TerminalExecutionResult {
  const terminalName = `Codex: ${options.skillName}`;

  // Create a new terminal
  const terminal = vscode.window.createTerminal({
    name: terminalName,
    cwd: options.workingDirectory,
  });

  // Show the terminal and focus on it
  terminal.show(true);

  // Execute: codex "$skill-name" (interactive mode)
  terminal.sendText(`codex "\\$${options.skillName}"`);

  return {
    terminalName,
    terminal,
  };
}
