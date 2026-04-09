/**
 * Claude Code Workflow Studio - Interactive Tour Component
 *
 * Provides a guided tour for first-time users using Driver.js.
 * Uses allowClose: false and self-managed close/minimize.
 * Minimize: destroy Driver.js instance, show floating button.
 * Resume: recreate Driver.js instance at the saved step index.
 */

import { type Driver, driver } from 'driver.js';
import { HelpCircle } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'driver.js/dist/driver.css';
import { getDriverConfig, getTourSteps, PROPERTY_PANEL_STEP_INDEX } from '../constants/tour-steps';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';

interface TourProps {
  run: boolean;
  onFinish: () => void;
}

// SVG icons for injected buttons
const CLOSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const MINIMIZE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

const INJECTED_BTN_STYLE =
  'background: transparent; border: none; color: var(--vscode-icon-foreground); cursor: pointer; padding: 4px; display: flex; align-items: center; transition: opacity 0.2s;';

export const Tour: React.FC<TourProps> = ({ run, onFinish }) => {
  const { t } = useTranslation();
  const driverRef = useRef<Driver | null>(null);
  const onFinishRef = useRef(onFinish);
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const setSelectedNodeIdRef = useRef(setSelectedNodeId);
  const nodesRef = useRef(nodes);
  const stepIndexRef = useRef<number>(0);
  const [minimized, setMinimized] = useState(false);
  const minimizedRef = useRef(false);

  // Update refs
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);
  useEffect(() => {
    setSelectedNodeIdRef.current = setSelectedNodeId;
  }, [setSelectedNodeId]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    minimizedRef.current = minimized;
    if (minimized && run) {
      document.body.classList.add('tour-floating-visible');
    } else {
      document.body.classList.remove('tour-floating-visible');
    }
    return () => {
      document.body.classList.remove('tour-floating-visible');
    };
  }, [minimized, run]);

  // Build step callbacks for Driver.js
  const buildStepCallbacks = useCallback(
    (driverInstance: Driver) => ({
      onSelectSampleNode: () => {
        const currentNodes = nodesRef.current;
        const promptNode = currentNodes.find((n) => n.type === 'prompt');
        const subAgentNode = currentNodes.find((n) => n.type === 'subAgent');
        const nonDefaultNode = currentNodes.find(
          (n) => n.type !== 'start' && n.type !== 'end' && n.type !== 'group'
        );
        const targetNode = promptNode || subAgentNode || nonDefaultNode || currentNodes[0];
        if (targetNode) {
          setSelectedNodeIdRef.current(targetNode.id);
        }
      },
      onDeselectNode: () => setSelectedNodeIdRef.current(null),
      moveNext: () => driverInstance.moveNext(),
      movePrevious: () => driverInstance.movePrevious(),
    }),
    []
  );

  // Click-outside listener: minimize when clicking outside the popover
  const clickOutsideRef = useRef<((e: MouseEvent) => void) | null>(null);

  const removeClickOutsideListener = useCallback(() => {
    if (clickOutsideRef.current) {
      document.removeEventListener('click', clickOutsideRef.current, true);
      clickOutsideRef.current = null;
    }
  }, []);

  // Minimize the tour: save step, destroy Driver.js, show floating button
  const doMinimize = useCallback(() => {
    removeClickOutsideListener();
    if (stepIndexRef.current === PROPERTY_PANEL_STEP_INDEX) {
      setSelectedNodeIdRef.current(null);
    }
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
    setMinimized(true);
  }, [removeClickOutsideListener]);

  const addClickOutsideListener = useCallback(() => {
    removeClickOutsideListener();
    const handler = (e: MouseEvent) => {
      const popover = document.querySelector('.driver-popover');
      if (popover && !popover.contains(e.target as Node)) {
        e.stopPropagation();
        e.preventDefault();
        doMinimize();
      }
    };
    clickOutsideRef.current = handler;
    // Use capture + setTimeout to avoid catching the current click
    setTimeout(() => {
      document.addEventListener('click', handler, true);
    }, 0);
  }, [doMinimize, removeClickOutsideListener]);

  // Inject custom close (×) and minimize (−) buttons into Driver.js popover
  const injectButtons = useCallback(() => {
    const popover = document.querySelector('.driver-popover');
    if (!popover || document.getElementById('tour-custom-btns')) return;

    const container = document.createElement('div');
    container.id = 'tour-custom-btns';
    container.style.cssText = 'position: absolute; top: 4px; right: 4px; display: flex; gap: 2px;';

    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.title = t('tour.button.minimize' as keyof typeof t);
    minimizeBtn.style.cssText = INJECTED_BTN_STYLE;
    minimizeBtn.innerHTML = MINIMIZE_ICON;
    minimizeBtn.addEventListener('mouseenter', () => {
      minimizeBtn.style.opacity = '0.6';
    });
    minimizeBtn.addEventListener('mouseleave', () => {
      minimizeBtn.style.opacity = '1';
    });
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      doMinimize();
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.title = t('tour.button.close' as keyof typeof t);
    closeBtn.style.cssText = INJECTED_BTN_STYLE;
    closeBtn.innerHTML = CLOSE_ICON;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '0.6';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '1';
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      removeClickOutsideListener();
      if (stepIndexRef.current === PROPERTY_PANEL_STEP_INDEX) {
        setSelectedNodeIdRef.current(null);
      }
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      onFinishRef.current();
    });

    container.appendChild(minimizeBtn);
    container.appendChild(closeBtn);
    popover.appendChild(container);
  }, [t, doMinimize, removeClickOutsideListener]);

  // Create and start a Driver.js instance at a given step index
  const startDriver = useCallback(
    (startIndex: number) => {
      const config = getDriverConfig((key) => t(key as keyof typeof t));
      const driverInstance = driver({
        ...config,
        overlayClickBehavior: () => {
          doMinimize();
        },
        onHighlightStarted: (_element, _step, options) => {
          stepIndexRef.current = options.state.activeIndex ?? 0;
          requestAnimationFrame(() => {
            injectButtons();
            addClickOutsideListener();
          });
        },
        onDestroyStarted: () => {
          // Only called for natural completion (last step "Done" click)
          // Close/minimize buttons handle their own cleanup
          if (stepIndexRef.current === PROPERTY_PANEL_STEP_INDEX) {
            setSelectedNodeIdRef.current(null);
          }
          if (driverRef.current) {
            driverRef.current.destroy();
            driverRef.current = null;
          }
          stepIndexRef.current = 0;
          onFinishRef.current();
        },
      });

      const steps = getTourSteps(
        (key) => t(key as keyof typeof t),
        buildStepCallbacks(driverInstance)
      );
      driverInstance.setSteps(steps);
      driverInstance.drive(startIndex);
      driverRef.current = driverInstance;
    },
    [t, injectButtons, buildStepCallbacks, doMinimize, addClickOutsideListener]
  );

  // Main effect: start/stop/resume tour
  useEffect(() => {
    if (run && !minimized && !driverRef.current) {
      startDriver(stepIndexRef.current);
    } else if (!run) {
      removeClickOutsideListener();
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
      stepIndexRef.current = 0;
      setMinimized(false);
    }

    return () => {
      removeClickOutsideListener();
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [run, minimized, startDriver, removeClickOutsideListener]);

  // Floating resume button when minimized
  if (minimized && run) {
    return createPortal(
      <button
        type="button"
        onClick={() => setMinimized(false)}
        title={t('tour.button.resume' as keyof typeof t)}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '20px',
          border: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
        }}
      >
        <HelpCircle size={16} />
        {t('tour.button.resume' as keyof typeof t)}
      </button>,
      document.body
    );
  }

  return null;
};
