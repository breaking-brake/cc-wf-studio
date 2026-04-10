/**
 * Claude Code Workflow Studio - Tour Steps Definition
 *
 * Defines interactive tour steps for first-time users using Driver.js
 * Redesigned to 7 focused steps using sample workflow as teaching context
 */

import type { Config as DriverConfig, DriveStep } from 'driver.js';

// Tour step indices (0-based)
export const PROPERTY_PANEL_STEP_INDEX = 2;

/**
 * Tour steps configuration
 * Each step guides users through the workflow editor using a sample workflow
 *
 * @param t - Translation function
 * @param callbacks - Optional callbacks for step-specific actions
 */
export const getTourSteps = (
  t: (key: string) => string,
  callbacks?: {
    onSelectSampleNode?: () => void;
    onDeselectNode?: () => void;
    moveNext?: () => void;
    movePrevious?: () => void;
    skipToStep?: (index: number) => void;
  }
): DriveStep[] => [
  // Step 1: Welcome
  {
    popover: {
      title: '',
      description: t('tour.welcome'),
      side: 'over',
      align: 'center',
    },
  },
  // Step 2: Canvas with sample workflow
  {
    element: '.react-flow',
    popover: {
      title: '',
      description: t('tour.canvas'),
      side: 'over',
      align: 'center',
      // Select a node before moving to property panel step
      onNextClick: () => {
        callbacks?.onSelectSampleNode?.();
        const start = Date.now();
        const waitForPropertyPanel = () => {
          if (document.querySelector('.property-panel')) {
            callbacks?.moveNext?.();
            return;
          }
          // Timeout: skip property panel step if it doesn't appear (e.g. empty canvas)
          if (Date.now() - start > 500) {
            callbacks?.skipToStep?.(PROPERTY_PANEL_STEP_INDEX + 1);
            return;
          }
          requestAnimationFrame(waitForPropertyPanel);
        };
        waitForPropertyPanel();
      },
    },
  },
  // Step 3: Property Panel (select a node to show it)
  {
    element: '.property-panel',
    popover: {
      title: '',
      description: t('tour.propertyPanel'),
      side: 'left',
      align: 'start',
      onPrevClick: () => {
        callbacks?.onDeselectNode?.();
        callbacks?.movePrevious?.();
      },
      onNextClick: () => {
        callbacks?.onDeselectNode?.();
        callbacks?.moveNext?.();
      },
    },
  },
  // Step 4: Node Palette (all nodes at once)
  {
    element: '.node-palette',
    popover: {
      title: '',
      description: t('tour.nodePalette'),
      side: 'right',
      align: 'start',
    },
  },
  // Step 5: Toolbar (Save/Load/Export/Run grouped)
  {
    element: '[data-tour="toolbar-actions"]',
    popover: {
      title: '',
      description: t('tour.toolbarActions'),
      side: 'bottom',
      align: 'start',
    },
  },
  // Step 6: AI Refine button
  {
    element: '[data-tour="ai-refine-button"]',
    popover: {
      title: '',
      description: t('tour.refineWithAI'),
      side: 'bottom',
      align: 'start',
    },
  },
  // Step 7: Finish
  {
    popover: {
      title: '',
      description: t('tour.finish'),
      side: 'over',
      align: 'center',
    },
  },
];

/**
 * Driver.js configuration
 * Styles and behavior configuration for the tour
 */
export const getDriverConfig = (t: (key: string) => string): DriverConfig => ({
  animate: false,
  showProgress: true,
  progressText: 'Step {{current}}/{{total}}',
  showButtons: ['next', 'previous'],
  nextBtnText: t('tour.button.next'),
  prevBtnText: t('tour.button.back'),
  doneBtnText: t('tour.button.finish'),
  allowClose: false,
  allowKeyboardControl: true,
  smoothScroll: false,
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  overlayOpacity: 1,
  popoverClass: 'cc-wf-tour-popover',
});
