import type { ExecutionSessionPayload } from '@shared/types/messages';
import { Activity, Terminal } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { vscode } from '../main';
import { StyledTooltip } from './common/StyledTooltip';

export const ExecutionSessionPanel: React.FC<{ session: ExecutionSessionPayload }> = ({
  session,
}) => {
  const { t } = useTranslation();
  const running = session.status === 'running';
  const canFocusTerminal = session.status !== 'ended';
  const focusTerminal = () => {
    if (canFocusTerminal) {
      vscode.postMessage({
        type: 'FOCUS_EXECUTION_TERMINAL',
        payload: { runId: session.runId },
      });
    }
  };
  const statusLabel =
    session.status === 'running'
      ? t('executionSession.running')
      : session.status === 'waiting'
        ? t('executionSession.waitingForInput')
        : session.status === 'aborted'
          ? t('executionSession.aborted')
          : session.status === 'failed'
            ? t('executionSession.failed')
            : t('executionSession.ended');
  const activityText =
    session.lastActivity?.summary ??
    (session.provider === 'codex'
      ? t('executionSession.codexTerminal')
      : t('executionSession.waiting'));
  const activityLabel = (
    <span
      style={{
        flex: '1 1 auto',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {activityText}
    </span>
  );
  return (
    <div
      role={canFocusTerminal ? 'button' : undefined}
      tabIndex={canFocusTerminal ? 0 : undefined}
      onClick={focusTerminal}
      onKeyDown={(event) => {
        if (canFocusTerminal && (event.key === 'Enter' || event.key === ' ')) focusTerminal();
      }}
      style={{
        minHeight: 36,
        padding: '7px 12px',
        borderTop: '1px solid var(--vscode-panel-border)',
        background: 'var(--vscode-sideBar-background)',
        color: 'var(--vscode-foreground)',
        fontSize: 12,
        cursor: canFocusTerminal ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        <Activity size={14} />
        <span>{session.workflowName}</span>
        <span style={{ color: running ? '#89d185' : 'var(--vscode-descriptionForeground)' }}>
          {running ? '●' : '○'} {statusLabel}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          color: 'var(--vscode-descriptionForeground)',
          flex: '1 1 auto',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <Terminal size={13} style={{ flexShrink: 0 }} />
        {session.lastActivity?.summary ? (
          <StyledTooltip content={session.lastActivity.summary} side="top" delayDuration={150}>
            {activityLabel}
          </StyledTooltip>
        ) : (
          activityLabel
        )}
      </div>
      <div style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.65, fontSize: 10 }}>
        {t('executionSession.metadata', {
          sessionId: session.sessionId.slice(0, 8),
          time: new Date(session.updatedAt).toLocaleTimeString(),
        })}
      </div>
    </div>
  );
};
