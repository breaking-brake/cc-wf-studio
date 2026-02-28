/**
 * CC Workflow Studio - Electron Main Process
 *
 * Desktop application entry point.
 * Creates a BrowserWindow that loads the shared webview UI.
 */

import * as path from 'node:path';
import { ConsoleLogger, McpServerManager, NodeFileSystem, setLogger } from '@cc-wf-studio/core';
import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import { ElectronDialogService } from './adapters/electron-dialog-service';
import { ElectronMessageTransport } from './adapters/electron-message-transport';
import { setupIpcHandlers } from './ipc/ipc-handlers';

let mainWindow: BrowserWindow | null = null;
const logger = new ConsoleLogger();

// Set the global logger for core services
setLogger(logger);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'CC Workflow Studio',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the webview build output
  const webviewPath = path.join(__dirname, '../../webview/dist/index.html');
  mainWindow.loadFile(webviewPath);

  // Inject theme CSS variables
  mainWindow.webContents.on('did-finish-load', () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    injectThemeVariables(isDark);
  });

  // Listen for theme changes
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    injectThemeVariables(isDark);
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function injectThemeVariables(isDark: boolean): void {
  if (!mainWindow) return;

  const variables = isDark ? getDarkThemeVariables() : getLightThemeVariables();
  const css = `:root { ${variables} }`;

  mainWindow.webContents.insertCSS(css);
}

function getDarkThemeVariables(): string {
  return `
    --vscode-editor-background: #1e1e1e;
    --vscode-editor-foreground: #d4d4d4;
    --vscode-foreground: #cccccc;
    --vscode-descriptionForeground: #9d9d9d;
    --vscode-button-background: #0e639c;
    --vscode-button-foreground: #ffffff;
    --vscode-button-hoverBackground: #1177bb;
    --vscode-button-secondaryBackground: #3a3d41;
    --vscode-button-secondaryForeground: #ffffff;
    --vscode-button-secondaryHoverBackground: #45494e;
    --vscode-input-background: #3c3c3c;
    --vscode-input-foreground: #cccccc;
    --vscode-input-border: #3c3c3c;
    --vscode-input-placeholderForeground: #a6a6a6;
    --vscode-focusBorder: #007fd4;
    --vscode-panel-border: #2b2b2b;
    --vscode-panel-background: #1e1e1e;
    --vscode-sideBar-background: #252526;
    --vscode-sideBar-foreground: #cccccc;
    --vscode-list-hoverBackground: #2a2d2e;
    --vscode-list-activeSelectionBackground: #094771;
    --vscode-list-activeSelectionForeground: #ffffff;
    --vscode-list-inactiveSelectionBackground: #37373d;
    --vscode-badge-background: #4d4d4d;
    --vscode-badge-foreground: #ffffff;
    --vscode-scrollbarSlider-background: rgba(121, 121, 121, 0.4);
    --vscode-scrollbarSlider-hoverBackground: rgba(100, 100, 100, 0.7);
    --vscode-scrollbarSlider-activeBackground: rgba(191, 191, 191, 0.4);
    --vscode-textLink-foreground: #3794ff;
    --vscode-textLink-activeForeground: #3794ff;
    --vscode-errorForeground: #f48771;
    --vscode-icon-foreground: #c5c5c5;
    --vscode-dropdown-background: #3c3c3c;
    --vscode-dropdown-foreground: #cccccc;
    --vscode-dropdown-border: #3c3c3c;
    --vscode-checkbox-background: #3c3c3c;
    --vscode-checkbox-foreground: #cccccc;
    --vscode-checkbox-border: #3c3c3c;
    --vscode-widget-shadow: rgba(0, 0, 0, 0.36);
    --vscode-toolbar-hoverBackground: rgba(90, 93, 94, 0.31);
    --vscode-tab-activeBackground: #1e1e1e;
    --vscode-tab-activeForeground: #ffffff;
    --vscode-tab-inactiveBackground: #2d2d2d;
    --vscode-tab-inactiveForeground: rgba(255, 255, 255, 0.5);
    --vscode-tab-border: #252526;
    --vscode-editorWidget-background: #252526;
    --vscode-editorWidget-foreground: #cccccc;
    --vscode-editorWidget-border: #454545;
    --vscode-notifications-background: #252526;
    --vscode-notifications-foreground: #cccccc;
    --vscode-notificationCenterHeader-background: #303031;
    --vscode-settings-textInputBackground: #3c3c3c;
    --vscode-settings-textInputForeground: #cccccc;
    --vscode-settings-textInputBorder: #3c3c3c;
    --vscode-titleBar-activeBackground: #3c3c3c;
    --vscode-titleBar-activeForeground: #cccccc;
    --vscode-statusBar-background: #007acc;
    --vscode-statusBar-foreground: #ffffff;
  `;
}

function getLightThemeVariables(): string {
  return `
    --vscode-editor-background: #ffffff;
    --vscode-editor-foreground: #333333;
    --vscode-foreground: #616161;
    --vscode-descriptionForeground: #717171;
    --vscode-button-background: #007acc;
    --vscode-button-foreground: #ffffff;
    --vscode-button-hoverBackground: #0062a3;
    --vscode-button-secondaryBackground: #5f6a79;
    --vscode-button-secondaryForeground: #ffffff;
    --vscode-button-secondaryHoverBackground: #4c5561;
    --vscode-input-background: #ffffff;
    --vscode-input-foreground: #616161;
    --vscode-input-border: #cecece;
    --vscode-input-placeholderForeground: #767676;
    --vscode-focusBorder: #0078d4;
    --vscode-panel-border: #e7e7e7;
    --vscode-panel-background: #ffffff;
    --vscode-sideBar-background: #f3f3f3;
    --vscode-sideBar-foreground: #616161;
    --vscode-list-hoverBackground: #e8e8e8;
    --vscode-list-activeSelectionBackground: #0060c0;
    --vscode-list-activeSelectionForeground: #ffffff;
    --vscode-list-inactiveSelectionBackground: #e4e6f1;
    --vscode-badge-background: #c4c4c4;
    --vscode-badge-foreground: #333333;
    --vscode-scrollbarSlider-background: rgba(100, 100, 100, 0.4);
    --vscode-scrollbarSlider-hoverBackground: rgba(100, 100, 100, 0.7);
    --vscode-scrollbarSlider-activeBackground: rgba(0, 0, 0, 0.6);
    --vscode-textLink-foreground: #006ab1;
    --vscode-textLink-activeForeground: #006ab1;
    --vscode-errorForeground: #a1260d;
    --vscode-icon-foreground: #424242;
    --vscode-dropdown-background: #ffffff;
    --vscode-dropdown-foreground: #616161;
    --vscode-dropdown-border: #cecece;
    --vscode-checkbox-background: #ffffff;
    --vscode-checkbox-foreground: #616161;
    --vscode-checkbox-border: #cecece;
    --vscode-widget-shadow: rgba(0, 0, 0, 0.16);
    --vscode-toolbar-hoverBackground: rgba(184, 184, 184, 0.31);
    --vscode-tab-activeBackground: #ffffff;
    --vscode-tab-activeForeground: #333333;
    --vscode-tab-inactiveBackground: #ececec;
    --vscode-tab-inactiveForeground: rgba(51, 51, 51, 0.7);
    --vscode-tab-border: #f3f3f3;
    --vscode-editorWidget-background: #f3f3f3;
    --vscode-editorWidget-foreground: #616161;
    --vscode-editorWidget-border: #c8c8c8;
    --vscode-notifications-background: #f3f3f3;
    --vscode-notifications-foreground: #616161;
    --vscode-notificationCenterHeader-background: #e7e7e7;
    --vscode-settings-textInputBackground: #ffffff;
    --vscode-settings-textInputForeground: #616161;
    --vscode-settings-textInputBorder: #cecece;
    --vscode-titleBar-activeBackground: #dddddd;
    --vscode-titleBar-activeForeground: #333333;
    --vscode-statusBar-background: #007acc;
    --vscode-statusBar-foreground: #ffffff;
  `;
}

app.whenReady().then(() => {
  createWindow();

  const fs = new NodeFileSystem();
  const mcpManager = new McpServerManager();
  const dialogService = new ElectronDialogService(() => mainWindow);

  // Set up IPC message transport
  const transport = new ElectronMessageTransport(ipcMain, () => mainWindow);
  mcpManager.setTransport(transport);

  // Set up IPC handlers
  setupIpcHandlers(ipcMain, {
    getMainWindow: () => mainWindow,
    fs,
    logger,
    dialog: dialogService,
    mcpManager,
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
