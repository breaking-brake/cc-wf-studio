/**
 * Feature Announcement Banner Component
 *
 * A dismissable banner for announcing new features to users.
 * Once dismissed, the banner state is persisted to localStorage.
 */

import { Terminal, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const DISMISSED_KEY_PREFIX = 'cc-wf-studio:feature-dismissed:';

interface FeatureAnnouncementBannerProps {
  /** Unique identifier for this feature announcement (used for localStorage key) */
  featureId: string;
  /** Optional icon to display (default: robot emoji) */
  icon?: React.ReactNode;
  /** Banner title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional callback when banner is dismissed */
  onDismiss?: () => void;
}

/**
 * Check if a feature announcement has been dismissed
 */
function isDismissed(featureId: string): boolean {
  try {
    return localStorage.getItem(`${DISMISSED_KEY_PREFIX}${featureId}`) === 'true';
  } catch {
    // localStorage may not be available in some contexts
    return false;
  }
}

/**
 * Mark a feature announcement as dismissed
 */
function setDismissed(featureId: string): void {
  try {
    localStorage.setItem(`${DISMISSED_KEY_PREFIX}${featureId}`, 'true');
  } catch {
    // localStorage may not be available in some contexts
  }
}

export function FeatureAnnouncementBanner({
  featureId,
  icon,
  title,
  description,
  onDismiss,
}: FeatureAnnouncementBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    setVisible(!isDismissed(featureId));
  }, [featureId]);

  const handleDismiss = useCallback(() => {
    setDismissed(featureId);
    setVisible(false);
    onDismiss?.();
  }, [featureId, onDismiss]);

  if (!visible) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <span style={styles.icon}>{icon ?? <Terminal size={16} />}</span>
        <div style={styles.textContainer}>
          <span style={styles.title}>{title}</span>
          {description && <span style={styles.description}>{description}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        style={styles.closeButton}
        aria-label="Dismiss announcement"
      >
        <X size={16} />
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: 'rgba(0, 122, 204, 0.15)',
    borderBottom: '1px solid rgba(0, 122, 204, 0.3)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  icon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  title: {
    color: 'var(--vscode-foreground)',
    fontWeight: 500,
  },
  description: {
    color: 'var(--vscode-descriptionForeground)',
    fontSize: '12px',
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--vscode-foreground)',
    opacity: 0.7,
    flexShrink: 0,
    marginLeft: '8px',
  },
};
