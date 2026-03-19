/**
 * Command Operations - Extension Host Message Handlers
 *
 * Feature: 636 - Sub-Agent "Use Existing Command" support
 * Purpose: Handle Webview requests for command browsing and sub-agent creation
 */

import * as path from 'node:path';
import * as vscode from 'vscode';
import type { CreateSubAgentPayload } from '../../shared/types/messages';
import { scanAllCommands } from '../services/command-service';
import { generateSubAgentFile, nodeNameToFileName } from '../services/export-service';
import { FileService } from '../services/file-service';

const outputChannel = vscode.window.createOutputChannel('CC Workflow Studio');

/**
 * Handle BROWSE_COMMANDS request from Webview
 *
 * Scans user (~/.claude/agents/) and project (.claude/agents/) directories
 * and returns all available .md command files.
 */
export async function handleBrowseCommands(
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();
  outputChannel.appendLine(`[Command Browse] Starting scan (requestId: ${requestId})`);

  try {
    const { user, project, local } = await scanAllCommands();
    const allCommands = [...user, ...project, ...local];

    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(
      `[Command Browse] Scan completed in ${executionTime}ms - Found ${user.length} user, ${project.length} project, ${local.length} plugin commands`
    );

    webview.postMessage({
      type: 'COMMAND_LIST_LOADED',
      requestId,
      payload: {
        commands: allCommands,
        timestamp: new Date().toISOString(),
        userCount: user.length,
        projectCount: project.length,
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(`[Command Browse] Error after ${executionTime}ms: ${error}`);

    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'COMMAND_BROWSE_FAILED',
        message: String(error),
      },
    });
  }
}

/**
 * Handle CREATE_SUB_AGENT request from Webview
 *
 * Writes a .claude/agents/{name}.md file immediately when a Sub-Agent node is created.
 * Reuses generateSubAgentFile() and nodeNameToFileName() from export-service.
 */
export async function handleCreateSubAgent(
  payload: CreateSubAgentPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();
  outputChannel.appendLine(`[Sub-Agent Create] Starting file write (requestId: ${requestId})`);

  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder open');
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    const fileService = new FileService(workspacePath);

    // Build a pseudo SubAgentNode for generateSubAgentFile()
    const pseudoNode = {
      id: '',
      type: 'subAgent' as const,
      name: payload.description,
      position: { x: 0, y: 0 },
      data: {
        description: payload.description,
        prompt: payload.prompt,
        model: payload.agentType === 'claudeCode' ? payload.model || 'sonnet' : undefined,
        tools: payload.agentType === 'claudeCode' ? payload.tools || undefined : undefined,
        memory:
          payload.agentType === 'claudeCode'
            ? (payload.memory as 'user' | 'project' | 'local' | undefined) || undefined
            : undefined,
        outputPorts: 1,
      },
    };

    const content = generateSubAgentFile(pseudoNode);

    // Use existing file path (edit mode) or create new file
    let filePath: string;
    let fileName: string;

    if (payload.commandFilePath) {
      // Edit mode: overwrite existing file
      filePath = payload.commandFilePath;
      fileName = path.basename(filePath);
    } else {
      // Create mode: generate new file
      const baseName = nodeNameToFileName(payload.description);
      const agentsDir = path.join(workspacePath, '.claude', 'agents');
      await fileService.createDirectory(path.join(workspacePath, '.claude'));
      await fileService.createDirectory(agentsDir);
      filePath = path.join(agentsDir, `${baseName}.md`);
      fileName = `${baseName}.md`;
    }

    await fileService.writeFile(filePath, content);

    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(`[Sub-Agent Create] File written in ${executionTime}ms: ${filePath}`);

    webview.postMessage({
      type: 'SUB_AGENT_CREATION_SUCCESS',
      requestId,
      payload: {
        filePath,
        fileName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(`[Sub-Agent Create] Error after ${executionTime}ms: ${error}`);

    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'SUB_AGENT_CREATE_FAILED',
        message: String(error),
      },
    });
  }
}
