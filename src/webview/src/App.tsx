/**
 * Claude Code Workflow Studio - Main App Component
 *
 * Root component for the Webview UI with 3-column layout
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import type { ErrorPayload, InitialStatePayload } from '@shared/types/messages';
import type React from 'react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from './components/dialogs/ConfirmDialog';
import { ErrorNotification } from './components/ErrorNotification';
import { NodePalette } from './components/NodePalette';
import { PropertyPanel } from './components/PropertyPanel';
import { Toolbar } from './components/Toolbar';
import { Tour } from './components/Tour';
import { WorkflowEditor } from './components/WorkflowEditor';
import { useTranslation } from './i18n/i18n-context';
import { useWorkflowStore } from './stores/workflow-store';

const App: React.FC = () => {
  const { t } = useTranslation();
  const { pendingDeleteNodeIds, confirmDeleteNodes, cancelDeleteNodes } = useWorkflowStore();
  const [error, setError] = useState<ErrorPayload | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0); // Used to force Tour component remount

  const handleError = (errorData: ErrorPayload) => {
    setError(errorData);
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleTourFinish = () => {
    setRunTour(false);
  };

  const handleStartTour = () => {
    setRunTour(true);
    setTourKey((prev) => prev + 1); // Increment key to force remount and reset tour state
  };

  // Listen for messages from Extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'INITIAL_STATE') {
        const payload = message.payload as InitialStatePayload;
        if (payload.isFirstLaunch) {
          // Start tour automatically on first launch
          setRunTour(true);
        }
      }
    };

    window.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, []);

  return (
    <div
      className="app"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top: Toolbar */}
      <Toolbar onError={handleError} onStartTour={handleStartTour} />

      {/* Main Content: 3-column layout */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
        }}
      >
        {/* Left Panel: Node Palette */}
        <NodePalette />

        {/* Center: Workflow Editor */}
        <div style={{ flex: 1, position: 'relative' }}>
          <WorkflowEditor />
        </div>

        {/* Right Panel: Property Panel */}
        <PropertyPanel />
      </div>

      {/* Error Notification Overlay */}
      <ErrorNotification error={error} onDismiss={handleDismissError} />

      {/* Interactive Tour */}
      <Tour key={tourKey} run={runTour} onFinish={handleTourFinish} />

      {/* Delete Confirmation Dialog for Delete key */}
      <ConfirmDialog
        isOpen={pendingDeleteNodeIds.length > 0}
        title={t('dialog.deleteNode.title')}
        message={t('dialog.deleteNode.message')}
        confirmLabel={t('dialog.deleteNode.confirm')}
        cancelLabel={t('dialog.deleteNode.cancel')}
        onConfirm={confirmDeleteNodes}
        onCancel={cancelDeleteNodes}
      />
    </div>
  );
};

export default App;
