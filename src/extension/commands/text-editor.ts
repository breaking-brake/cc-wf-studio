/**
 * Claude Code Workflow Studio - Text Editor Command
 *
 * Opens text content in VSCode's native editor for enhanced editing experience.
 * Feature: Edit in VSCode Editor functionality
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { OpenInEditorPayload } from '../../shared/types/messages';

/**
 * Active editor sessions tracking
 * Maps sessionId to session data for cleanup and response handling
 */
const activeSessions = new Map<
  string,
  {
    filePath: string;
    webview: vscode.Webview;
    disposables: vscode.Disposable[];
  }
>();

/**
 * Get file extension based on language
 */
function getExtension(language: string): string {
  switch (language) {
    case 'markdown':
      return '.md';
    case 'plaintext':
      return '.txt';
    default:
      return '.txt';
  }
}

/**
 * Handle OPEN_IN_EDITOR message from webview
 *
 * Opens the provided content in a new VSCode text editor using a temporary file,
 * allowing users to edit with their full editor customizations.
 */
export async function handleOpenInEditor(
  payload: OpenInEditorPayload,
  webview: vscode.Webview
): Promise<void> {
  const { sessionId, content, language = 'markdown' } = payload;

  try {
    // Create a temporary file with the content
    const tmpDir = os.tmpdir();
    const fileName = `cc-wf-studio-${sessionId}${getExtension(language)}`;
    const filePath = path.join(tmpDir, fileName);

    // Write content to temporary file
    fs.writeFileSync(filePath, content, 'utf-8');

    // Open the file in editor
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const disposables: vscode.Disposable[] = [];

    // Set up save listener - this works for :w, Ctrl+S, menu save, etc.
    const saveDisposable = vscode.workspace.onDidSaveTextDocument((savedDoc) => {
      if (savedDoc.uri.fsPath !== filePath) return;

      // Send content to webview
      webview.postMessage({
        type: 'EDITOR_CONTENT_UPDATED',
        payload: {
          sessionId,
          content: savedDoc.getText(),
          saved: true,
        },
      });

      // Cleanup and close editor
      cleanupSession(sessionId);
      vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      vscode.window.showInformationMessage('Content applied successfully');
    });
    disposables.push(saveDisposable);

    // Set up listener to detect when our editor is no longer visible (closed)
    const editorChangeDisposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
      const session = activeSessions.get(sessionId);
      if (!session) return; // Already cleaned up by save handler

      // Check if our file is still open in any visible editor
      const isStillOpen = editors.some((editor) => editor.document.uri.fsPath === filePath);

      if (!isStillOpen) {
        // Editor was closed without saving
        // Read final content from file
        let finalContent = content;
        try {
          if (fs.existsSync(filePath)) {
            finalContent = fs.readFileSync(filePath, 'utf-8');
          }
        } catch {
          // Use original content if file read fails
        }

        webview.postMessage({
          type: 'EDITOR_CONTENT_UPDATED',
          payload: {
            sessionId,
            content: finalContent,
            saved: false,
          },
        });

        cleanupSession(sessionId);
      }
    });
    disposables.push(editorChangeDisposable);

    // Store session
    activeSessions.set(sessionId, { filePath, webview, disposables });
  } catch (error) {
    // Send error back to webview
    webview.postMessage({
      type: 'EDITOR_CONTENT_UPDATED',
      payload: {
        sessionId,
        content,
        saved: false,
      },
    });

    vscode.window.showErrorMessage(
      `Failed to open editor: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Cleanup a session: dispose listeners, delete temp file, clear context
 */
function cleanupSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  // Dispose all listeners
  for (const disposable of session.disposables) {
    disposable.dispose();
  }

  // Delete temporary file
  try {
    if (fs.existsSync(session.filePath)) {
      fs.unlinkSync(session.filePath);
    }
  } catch {
    // Ignore file deletion errors
  }

  // Remove from active sessions
  activeSessions.delete(sessionId);
}
