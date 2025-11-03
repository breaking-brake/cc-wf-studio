/**
 * Claude Code Workflow Studio - Interactive Tour Component
 *
 * Provides a guided tour for first-time users using react-joyride
 */

import type React from 'react';
import { useCallback } from 'react';
import Joyride, { type CallBackProps, EVENTS, STATUS } from 'react-joyride';
import { getTourLocale, getTourSteps, tourStyles } from '../constants/tour-steps';
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

  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type } = data;

      // Tour finished or skipped
      if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
        onFinish();
      }

      // Handle tour close event
      if (type === EVENTS.TOUR_END || type === EVENTS.STEP_AFTER) {
        // Optional: Add analytics or state updates here
      }
    },
    [onFinish]
  );

  return (
    <Joyride
      steps={getTourSteps((key) => t(key as keyof typeof t))}
      run={run}
      continuous
      showProgress
      showSkipButton
      spotlightPadding={10}
      disableOverlayClose
      disableCloseOnEsc={false}
      scrollToFirstStep
      scrollOffset={100}
      styles={tourStyles}
      locale={getTourLocale((key) => t(key as keyof typeof t))}
      callback={handleJoyrideCallback}
    />
  );
};
