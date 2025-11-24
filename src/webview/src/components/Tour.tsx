/**
 * Claude Code Workflow Studio - Interactive Tour Component
 *
 * Provides a guided tour for first-time users using Driver.js
 */

import { type Driver, driver } from 'driver.js';
import type React from 'react';
import { useEffect, useRef } from 'react';
import 'driver.js/dist/driver.css';
import { getDriverConfig, getTourSteps } from '../constants/tour-steps';
import { useTranslation } from '../i18n/i18n-context';

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

  // Update onFinish ref when it changes
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // Initialize driver instance
    if (!driverRef.current) {
      const config = getDriverConfig((key) => t(key as keyof typeof t));
      driverRef.current = driver({
        ...config,
        onCloseClick: () => {
          // Called when close button (X) is clicked
          if (driverRef.current) {
            driverRef.current.destroy();
          }
        },
        onDestroyStarted: () => {
          // Called when tour is about to be destroyed (completed, skipped, or closed)
          // Destroy the driver instance
          if (driverRef.current) {
            driverRef.current.destroy();
            driverRef.current = null;
          }
          // Call onFinish callback
          onFinishRef.current();
        },
      });
    }

    // Start or stop tour based on run prop
    if (run && driverRef.current) {
      const steps = getTourSteps((key) => t(key as keyof typeof t));
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
