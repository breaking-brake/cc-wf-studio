/**
 * Claude Code Workflow Studio - Tour Steps Definition
 *
 * Defines interactive tour steps for first-time users
 */

import type { Step } from 'react-joyride';

/**
 * Tour steps configuration
 * Each step guides users through creating their first workflow
 */
export const getTourSteps = (t: (key: string) => string): Step[] => [
  {
    target: 'body',
    content: t('tour.welcome'),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.node-palette',
    content: t('tour.nodePalette'),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-prompt-button"]',
    content: t('tour.addPrompt'),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '.react-flow',
    content: t('tour.canvas'),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.property-panel',
    content: t('tour.propertyPanel'),
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: '[data-tour="add-askuserquestion-button"]',
    content: t('tour.addAskUserQuestion'),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '.react-flow',
    content: t('tour.connectNodes'),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="workflow-name-input"]',
    content: t('tour.workflowName'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="save-button"]',
    content: t('tour.saveWorkflow'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="workflow-selector"]',
    content: t('tour.loadWorkflow'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="export-button"]',
    content: t('tour.exportWorkflow'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="ai-generate-button"]',
    content: t('tour.generateWithAI'),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="help-button"]',
    content: t('tour.helpButton'),
    placement: 'bottom',
    disableBeacon: true,
  },
];

/**
 * Tour styles configuration
 */
export const tourStyles = {
  options: {
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    primaryColor: '#007acc',
    textColor: '#333',
    zIndex: 10000,
  },
  tooltip: {
    fontSize: 14,
    padding: 20,
  },
  buttonNext: {
    backgroundColor: '#007acc',
    fontSize: 14,
    padding: '8px 16px',
  },
  buttonBack: {
    color: '#007acc',
    fontSize: 14,
    marginRight: 10,
  },
  buttonSkip: {
    color: '#999',
    fontSize: 14,
  },
};

/**
 * Tour locale configuration
 */
export const getTourLocale = (t: (key: string) => string) => ({
  back: t('tour.button.back'),
  close: t('tour.button.close'),
  last: t('tour.button.finish'),
  next: t('tour.button.next'),
  skip: t('tour.button.skip'),
});
