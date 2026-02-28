export interface IDialogService {
  showInformationMessage(message: string): void;
  showWarningMessage(message: string): void;
  showErrorMessage(message: string): void;
  showConfirmDialog(message: string, confirmLabel: string): Promise<boolean>;
  showOpenFileDialog(options: {
    filters?: Record<string, string[]>;
    title?: string;
  }): Promise<string | null>;
}
