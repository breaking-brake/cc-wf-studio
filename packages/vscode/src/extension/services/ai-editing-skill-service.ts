/**
 * AI Editing Skill Service
 *
 * Generates and runs AI editing skills for different providers.
 * Writes a skill template to the provider-specific location and
 * launches the provider to execute it.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { log } from '../extension';
import { isAntigravityInstalled } from './antigravity-extension-service';
import { isCursorInstalled } from './cursor-extension-service';
import { isRooCodeInstalled, startRooCodeTask } from './roo-code-extension-service';

export type AiEditingProvider =
  | 'claude-code'
  | 'copilot-cli'
  | 'copilot-chat'
  | 'codex'
  | 'roo-code'
  | 'gemini'
  | 'antigravity'
  | 'cursor';

/**
 * Describes one installable skill: its slash-command name, the resource
 * template that defines it, and a label used for the launch terminal.
 */
interface SkillSpec {
  /** Skill / slash-command name (e.g. 'cc-workflow-ai-editor', 'import-skill') */
  skillName: string;
  /** Template file under resources/ */
  templateFile: string;
  /** Prefix for the launch terminal name (e.g. 'AI Edit', 'Import Skill') */
  terminalLabel: string;
}

const AI_EDIT_SPEC: SkillSpec = {
  skillName: 'cc-workflow-ai-editor',
  templateFile: 'ai-editing-skill-template.md',
  terminalLabel: 'AI Edit',
};

const IMPORT_SKILL_SPEC: SkillSpec = {
  skillName: 'import-skill',
  templateFile: 'import-skill-template.md',
  terminalLabel: 'Import Skill',
};

const GENERATE_TOUR_SPEC: SkillSpec = {
  skillName: 'generate-workflow-tour',
  templateFile: 'generate-workflow-tour-template.md',
  terminalLabel: 'Generate Workflow Tour',
};

/**
 * Get the skill file destination path for a given provider
 */
function getSkillDestination(
  provider: AiEditingProvider,
  workingDirectory: string,
  skillName: string
): string {
  switch (provider) {
    case 'claude-code':
      return path.join(workingDirectory, '.claude', 'commands', `${skillName}.md`);
    case 'copilot-cli':
      return path.join(workingDirectory, '.github', 'skills', skillName, 'SKILL.md');
    case 'copilot-chat':
      return path.join(workingDirectory, '.github', 'skills', skillName, 'SKILL.md');
    case 'codex':
      return path.join(workingDirectory, '.codex', 'skills', skillName, 'SKILL.md');
    case 'roo-code':
      return path.join(workingDirectory, '.roo', 'skills', skillName, 'SKILL.md');
    case 'gemini':
      return path.join(workingDirectory, '.gemini', 'skills', skillName, 'SKILL.md');
    case 'antigravity':
      return path.join(workingDirectory, '.agent', 'skills', skillName, 'SKILL.md');
    case 'cursor':
      return path.join(workingDirectory, '.cursor', 'skills', skillName, 'SKILL.md');
  }
}

/**
 * Load a skill template from resources
 */
function loadSkillTemplate(extensionPath: string, templateFile: string): string {
  const templatePath = path.join(extensionPath, 'resources', templateFile);
  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Write skill template to the provider-specific location
 */
async function writeSkillFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
  const fd = await fs.promises.open(filePath, 'w');
  await fd.writeFile(content, 'utf-8');
  await fd.sync();
  await fd.close();
}

/**
 * Launch the provider to run the skill
 */
async function launchProvider(
  provider: AiEditingProvider,
  workingDirectory: string,
  spec: SkillSpec
): Promise<void> {
  const { skillName, terminalLabel } = spec;
  switch (provider) {
    case 'claude-code': {
      const terminalName = `${terminalLabel}: Claude Code`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
      });
      terminal.show(true);
      terminal.sendText(`claude "/${skillName}"`);
      break;
    }

    case 'copilot-cli': {
      const terminalName = `${terminalLabel}: Copilot CLI`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
      });
      terminal.show(true);
      terminal.sendText(`copilot -i ":skill ${skillName}" --allow-all-tools`);
      break;
    }

    case 'copilot-chat': {
      try {
        await vscode.commands.executeCommand('workbench.action.chat.newChat');
        await vscode.commands.executeCommand('workbench.action.chat.open', {
          query: `/${skillName}`,
          isPartialQuery: false,
        });
      } catch {
        try {
          await vscode.commands.executeCommand('workbench.action.chat.open');
          vscode.window.showInformationMessage(
            `Skill exported. Type "/${skillName}" in Copilot Chat to run.`
          );
        } catch {
          throw new Error('GitHub Copilot Chat is not installed or not available.');
        }
      }
      break;
    }

    case 'codex': {
      const terminalName = `${terminalLabel}: Codex CLI`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
      });
      terminal.show(true);
      terminal.sendText(`codex "\\$${skillName}"`);
      break;
    }

    case 'roo-code': {
      if (isRooCodeInstalled()) {
        await startRooCodeTask(`:skill ${skillName}`);
      } else {
        throw new Error('Roo Code extension is not installed.');
      }
      break;
    }

    case 'gemini': {
      const terminalName = `${terminalLabel}: Gemini CLI`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
      });
      terminal.show(true);
      terminal.sendText(`gemini -i ":skill ${skillName}"`);
      break;
    }

    case 'antigravity': {
      // For Antigravity, only check installation here.
      // Launch is handled separately after MCP refresh dialog in open-editor.ts.
      if (!isAntigravityInstalled()) {
        throw new Error('Antigravity extension is not installed.');
      }
      break;
    }

    case 'cursor': {
      // For Cursor, check installation and launch via chat command.
      if (!isCursorInstalled()) {
        throw new Error('Cursor extension is not installed.');
      }
      try {
        await vscode.commands.executeCommand('workbench.action.chat.open', `/${spec.skillName}`);
      } catch {
        throw new Error('Failed to launch Cursor agent.');
      }
      break;
    }
  }
}

/**
 * Write a skill template to the provider-specific location and launch the
 * provider to run it. Shared by the AI-editing and import-skill flows.
 */
async function generateAndRunSkill(
  provider: AiEditingProvider,
  extensionPath: string,
  workingDirectory: string,
  spec: SkillSpec
): Promise<void> {
  log('INFO', 'Skill: generating and running', { provider, skill: spec.skillName });

  // 1. Load template
  const template = loadSkillTemplate(extensionPath, spec.templateFile);

  // 2. Write to provider-specific location
  const destPath = getSkillDestination(provider, workingDirectory, spec.skillName);
  await writeSkillFile(destPath, template);
  log('INFO', 'Skill: wrote skill file', { destPath });

  // 3. Launch provider
  await launchProvider(provider, workingDirectory, spec);
  log('INFO', 'Skill: provider launched', { provider, skill: spec.skillName });
}

/**
 * Generate the AI editing skill file and run it with the specified provider
 */
export async function generateAndRunAiEditingSkill(
  provider: AiEditingProvider,
  extensionPath: string,
  workingDirectory: string
): Promise<void> {
  await generateAndRunSkill(provider, extensionPath, workingDirectory, AI_EDIT_SPEC);
}

/**
 * Generate the import-skill file and run it with the specified provider.
 * The agent reads a published Agent Skill and reconstructs it as a workflow
 * on the canvas via the built-in MCP server.
 */
export async function generateAndRunImportSkill(
  provider: AiEditingProvider,
  extensionPath: string,
  workingDirectory: string
): Promise<void> {
  await generateAndRunSkill(provider, extensionPath, workingDirectory, IMPORT_SKILL_SPEC);
}

/**
 * Generate the generate-workflow-tour skill file and run it with the provider.
 * The agent reads the current workflow and adds a guided `tour` to it on the
 * canvas via the built-in MCP server.
 */
export async function generateAndRunGenerateTourSkill(
  provider: AiEditingProvider,
  extensionPath: string,
  workingDirectory: string
): Promise<void> {
  await generateAndRunSkill(provider, extensionPath, workingDirectory, GENERATE_TOUR_SPEC);
}
