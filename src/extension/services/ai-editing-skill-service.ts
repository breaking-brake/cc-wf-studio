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
import { isRooCodeInstalled, startRooCodeTask } from './roo-code-extension-service';

export type AiEditingProvider =
  | 'claude-code'
  | 'copilot-cli'
  | 'copilot-vscode'
  | 'codex'
  | 'roo-code';

const SKILL_NAME = 'cc-workflow-ai-editor';

/**
 * Get the skill file destination path for a given provider
 */
function getSkillDestination(provider: AiEditingProvider, workingDirectory: string): string {
  switch (provider) {
    case 'claude-code':
      return path.join(workingDirectory, '.claude', 'commands', `${SKILL_NAME}.md`);
    case 'copilot-cli':
      return path.join(workingDirectory, '.github', 'skills', SKILL_NAME, 'SKILL.md');
    case 'copilot-vscode':
      return path.join(workingDirectory, '.github', 'skills', SKILL_NAME, 'SKILL.md');
    case 'codex':
      return path.join(workingDirectory, '.codex', 'skills', SKILL_NAME, 'SKILL.md');
    case 'roo-code':
      return path.join(workingDirectory, '.roo', 'skills', SKILL_NAME, 'SKILL.md');
  }
}

/**
 * Load the skill template from resources
 */
function loadSkillTemplate(extensionPath: string): string {
  const templatePath = path.join(extensionPath, 'resources', 'ai-editing-skill-template.md');
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
  workingDirectory: string
): Promise<void> {
  switch (provider) {
    case 'claude-code': {
      const terminalName = `AI Edit: Claude Code`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
      });
      terminal.show(true);
      terminal.sendText(`claude "/${SKILL_NAME}"`);
      break;
    }

    case 'copilot-cli': {
      const terminalName = `AI Edit: Copilot CLI`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
      });
      terminal.show(true);
      terminal.sendText(`copilot -i ":skill ${SKILL_NAME}" --allow-all-tools`);
      break;
    }

    case 'copilot-vscode': {
      try {
        await vscode.commands.executeCommand('workbench.action.chat.newChat');
        await vscode.commands.executeCommand('workbench.action.chat.open', {
          query: `/${SKILL_NAME}`,
          isPartialQuery: false,
        });
      } catch {
        try {
          await vscode.commands.executeCommand('workbench.action.chat.open');
          vscode.window.showInformationMessage(
            `Skill exported. Type "/${SKILL_NAME}" in Copilot Chat to run.`
          );
        } catch {
          throw new Error('GitHub Copilot Chat is not installed or not available.');
        }
      }
      break;
    }

    case 'codex': {
      const terminalName = `AI Edit: Codex CLI`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: workingDirectory,
      });
      terminal.show(true);
      terminal.sendText(`codex "\\$${SKILL_NAME}"`);
      break;
    }

    case 'roo-code': {
      if (isRooCodeInstalled()) {
        await startRooCodeTask(`:skill ${SKILL_NAME}`);
      } else {
        throw new Error('Roo Code extension is not installed.');
      }
      break;
    }
  }
}

/**
 * Generate the AI editing skill file and run it with the specified provider
 */
export async function generateAndRunAiEditingSkill(
  provider: AiEditingProvider,
  extensionPath: string,
  workingDirectory: string
): Promise<void> {
  log('INFO', 'AI Editing Skill: generating and running', { provider });

  // 1. Load template
  const template = loadSkillTemplate(extensionPath);

  // 2. Write to provider-specific location
  const destPath = getSkillDestination(provider, workingDirectory);
  await writeSkillFile(destPath, template);
  log('INFO', 'AI Editing Skill: wrote skill file', { destPath });

  // 3. Launch provider
  await launchProvider(provider, workingDirectory);
  log('INFO', 'AI Editing Skill: provider launched', { provider });
}
