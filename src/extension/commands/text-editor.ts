/**
 * Claude Code Workflow Studio - Text Editor Command
 *
 * Opens text content in VSCode's native editor for enhanced editing experience.
 * Feature: Edit in VSCode Editor functionality
 */

import * as vscode from 'vscode';
import type { OpenInEditorPayload } from '../../shared/types/messages';

/**
 * Active editor sessions tracking
 * Maps sessionId to { uri, latestContent } for cleanup and response handling
 */
const activeSessions = new Map<string, { uri: vscode.Uri; latestContent: string }>();

/**
 * Handle OPEN_IN_EDITOR message from webview
 *
 * Opens the provided content in a new VSCode text editor,
 * allowing users to edit with their full editor customizations.
 */
export async function handleOpenInEditor(
  payload: OpenInEditorPayload,
  webview: vscode.Webview
): Promise<void> {
  const { sessionId, content, label, language = 'markdown' } = payload;

  try {
    // Create an untitled document with the content
    const doc = await vscode.workspace.openTextDocument({
      content,
      language,
    });

    // Store the session mapping with initial content
    activeSessions.set(sessionId, { uri: doc.uri, latestContent: content });

    // Show the document in editor
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });

    // Set up document change listener to track latest content
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === doc.uri.toString()) {
        // Track latest content for use when document is closed
        const session = activeSessions.get(sessionId);
        if (session) {
          session.latestContent = event.document.getText();
        }
      }
    });

    // Set up save listener
    const saveDisposable = vscode.workspace.onDidSaveTextDocument((savedDoc) => {
      if (savedDoc.uri.toString() === doc.uri.toString()) {
        // Send updated content back to webview
        const updatedContent = savedDoc.getText();
        webview.postMessage({
          type: 'EDITOR_CONTENT_UPDATED',
          payload: {
            sessionId,
            content: updatedContent,
            saved: true,
          },
        });
      }
    });

    // Set up close listener
    const closeDisposable = vscode.workspace.onDidCloseTextDocument((closedDoc) => {
      if (closedDoc.uri.toString() === doc.uri.toString()) {
        // Use tracked content since closedDoc.getText() may not be available
        const session = activeSessions.get(sessionId);
        const finalContent = session?.latestContent ?? content;

        webview.postMessage({
          type: 'EDITOR_CONTENT_UPDATED',
          payload: {
            sessionId,
            content: finalContent,
            saved: false,
          },
        });

        // Cleanup
        activeSessions.delete(sessionId);
        changeDisposable.dispose();
        saveDisposable.dispose();
        closeDisposable.dispose();
      }
    });

    // Show info message with instructions
    const tabLabel = label || 'Edit Text';
    vscode.window.showInformationMessage(
      `Editing "${tabLabel}". Save (Ctrl+S) to apply changes, or close the tab to cancel.`
    );
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
