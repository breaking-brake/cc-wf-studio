/**
 * Claude Code Workflow Studio - Tour Steps Definition
 *
 * Defines interactive tour steps for first-time users using Driver.js
 */

import type { Config as DriverConfig, DriveStep } from 'driver.js';

// Tour step indices (0-based)
export const CANVAS_STEP_INDEX = 11;
export const PROPERTY_PANEL_STEP_INDEX = 12;

/**
 * Tour steps configuration
 * Each step guides users through creating their first workflow
 *
 * @param t - Translation function
 * @param callbacks - Optional callbacks for step-specific actions
 */
export const getTourSteps = (
  t: (key: string) => string,
  callbacks?: {
    onSelectStartNode?: () => void;
    onDeselectNode?: () => void;
    moveNext?: () => void;
    movePrevious?: () => void;
  }
): DriveStep[] => [
  {
    popover: {
      title: '',
      description: t('tour.welcome'),
      side: 'over',
      align: 'center',
    },
  },
  {
    element: '.node-palette',
    popover: {
      title: '',
      description: t('tour.nodePalette'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-prompt-button"]',
    popover: {
      title: '',
      description: t('tour.addPrompt'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-subagent-button"]',
    popover: {
      title: '',
      description: t('tour.addSubAgent'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-subagentflow-button"]',
    popover: {
      title: '',
      description: t('tour.addSubAgentFlow'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-skill-button"]',
    popover: {
      title: '',
      description: t('tour.addSkill'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-mcp-button"]',
    popover: {
      title: '',
      description: t('tour.addMcp'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-ifelse-button"]',
    popover: {
      title: '',
      description: t('tour.addIfElse'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-switch-button"]',
    popover: {
      title: '',
      description: t('tour.addSwitch'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-askuserquestion-button"]',
    popover: {
      title: '',
      description: t('tour.addAskUserQuestion'),
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-end-button"]',
    popover: {
      title: '',
      description: t('tour.addEnd'),
      side: 'right',
      align: 'start',
    },
  },
  {
    popover: {
      title: '',
      description: t('tour.canvas'),
      side: 'over',
      align: 'center',
      // Select Start node before moving to property panel step
      onNextClick: () => {
        callbacks?.onSelectStartNode?.();
        // Small delay to allow React to render the property panel
        setTimeout(() => {
          callbacks?.moveNext?.();
        }, 50);
      },
    },
  },
  {
    element: '.property-panel',
    popover: {
      title: '',
      description: t('tour.propertyPanel'),
      side: 'left',
      align: 'start',
      // Deselect node when leaving property panel step (going back)
      onPrevClick: () => {
        callbacks?.onDeselectNode?.();
        callbacks?.movePrevious?.();
      },
      // Deselect node when leaving property panel step (going forward)
      onNextClick: () => {
        callbacks?.onDeselectNode?.();
        callbacks?.moveNext?.();
      },
    },
  },
  {
    popover: {
      title: '',
      description: t('tour.connectNodes'),
      side: 'over',
      align: 'center',
    },
  },
  {
    element: '[data-tour="workflow-name-input"]',
    popover: {
      title: '',
      description: t('tour.workflowName'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="save-button"]',
    popover: {
      title: '',
      description: t('tour.saveWorkflow'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="workflow-selector"]',
    popover: {
      title: '',
      description: t('tour.loadWorkflow'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="export-button"]',
    popover: {
      title: '',
      description: t('tour.exportWorkflow'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="ai-refine-button"]',
    popover: {
      title: '',
      description: t('tour.refineWithAI'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="slack-share-button"]',
    popover: {
      title: '',
      description: t('tour.slackShare'),
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="help-button"]',
    popover: {
      title: '',
      description: t('tour.helpButton'),
      side: 'bottom',
      align: 'start',
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
  showButtons: ['next', 'previous', 'close'],
  nextBtnText: t('tour.button.next'),
  prevBtnText: t('tour.button.back'),
  doneBtnText: t('tour.button.finish'),
  allowClose: true,
  allowKeyboardControl: true,
  smoothScroll: false,
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  overlayOpacity: 1,
  popoverClass: 'cc-wf-tour-popover',
});
