/**
 * Claude Code Workflow Studio - Interactive Tour Component
 *
 * Provides a guided tour for first-time users using Driver.js
 */

import { type Driver, driver } from 'driver.js';
import type React from 'react';
import { useEffect, useRef } from 'react';
import 'driver.js/dist/driver.css';
import { getDriverConfig, getTourSteps, PROPERTY_PANEL_STEP_INDEX } from '../constants/tour-steps';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';

interface TourProps {
  run: boolean;
  onFinish: () => void;
}

/**
 * Tour Component
 *
 * Displays an interactive overlay tour that guides users through the application
 */
export const Tour: React.FC<TourProps> = ({ run, onFinish }) => {
  const { t } = useTranslation();
  const driverRef = useRef<Driver | null>(null);
  const onFinishRef = useRef(onFinish);
  const setSelectedNodeId = useWorkflowStore((state) => state.setSelectedNodeId);
  const setSelectedNodeIdRef = useRef(setSelectedNodeId);
  const previousStepIndexRef = useRef<number | null>(null);

  // Update refs when they change
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    setSelectedNodeIdRef.current = setSelectedNodeId;
  }, [setSelectedNodeId]);

  useEffect(() => {
    // Initialize driver instance
    if (!driverRef.current) {
      const config = getDriverConfig((key) => t(key as keyof typeof t));
      driverRef.current = driver({
        ...config,
        onHighlightStarted: (_element, _step, options) => {
          const currentIndex = options.state.activeIndex;
          previousStepIndexRef.current = currentIndex ?? null;
        },
        onCloseClick: () => {
          // Called when close button (X) is clicked
          // Deselect node if we were on property panel step
          if (previousStepIndexRef.current === PROPERTY_PANEL_STEP_INDEX) {
            setSelectedNodeIdRef.current(null);
          }
          if (driverRef.current) {
            driverRef.current.destroy();
          }
        },
        onDestroyStarted: () => {
          // Called when tour is about to be destroyed (completed, skipped, or closed)
          // Deselect node if we were on property panel step
          if (previousStepIndexRef.current === PROPERTY_PANEL_STEP_INDEX) {
            setSelectedNodeIdRef.current(null);
          }
          // Destroy the driver instance
          if (driverRef.current) {
            driverRef.current.destroy();
            driverRef.current = null;
          }
          // Reset step tracking
          previousStepIndexRef.current = null;
          // Call onFinish callback
          onFinishRef.current();
        },
      });
    }

    // Start or stop tour based on run prop
    if (run && driverRef.current) {
      // Create step callbacks that reference the current driver instance
      const driverInstance = driverRef.current;
      const steps = getTourSteps((key) => t(key as keyof typeof t), {
        onSelectStartNode: () => setSelectedNodeIdRef.current('start-node-default'),
        onDeselectNode: () => setSelectedNodeIdRef.current(null),
        moveNext: () => driverInstance.moveNext(),
        movePrevious: () => driverInstance.movePrevious(),
      });
      driverRef.current.setSteps(steps);
      driverRef.current.drive();
    } else if (!run && driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [run, t]);

  return null;
};
