/**
 * MCP Node Creation Wizard State Hook
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Manage step-by-step wizard state for MCP node creation
 *
 * Flow (simplified from 7-step to 4-step):
 * 1. Server selection
 * 2. Mode selection (aiToolSelection / aiParameterConfig / manualParameterConfig)
 * 3. Tool or Task config (depends on mode)
 * 4. Final config (only for aiParameterConfig / manualParameterConfig)
 */

import type { McpNodeMode } from '@shared/types/mcp-node';
import type { McpServerReference, McpToolReference } from '@shared/types/messages';
import { useCallback, useMemo, useState } from 'react';

/**
 * Wizard step numbers
 *
 * Flow:
 * 1. Server selection
 * 2. Mode selection (3 modes: aiToolSelection, aiParameterConfig, manualParameterConfig)
 * 3. Tool or Task config:
 *    - aiToolSelection → NL Task input (final step)
 *    - aiParameterConfig / manualParameterConfig → Tool selection
 * 4. Final config (only for non-aiToolSelection):
 *    - aiParameterConfig → NL Param input
 *    - manualParameterConfig → Parameter form
 */
export enum WizardStep {
  ServerSelection = 1,
  ModeSelection = 2,
  ToolOrTaskConfig = 3,
  FinalConfig = 4,
}

interface WizardState {
  currentStep: WizardStep;
  selectedServer: McpServerReference | null;
  selectedMode: McpNodeMode;
  selectedTool: McpToolReference | null;
  naturalLanguageTaskDescription: string;
  aiParameterConfigDescription: string;
  manualParameterValues: Record<string, unknown>;
}

const initialState: WizardState = {
  currentStep: WizardStep.ServerSelection,
  selectedServer: null,
  selectedMode: 'aiToolSelection',
  selectedTool: null,
  naturalLanguageTaskDescription: '',
  aiParameterConfigDescription: '',
  manualParameterValues: {},
};

export function useMcpCreationWizard() {
  const [state, setState] = useState<WizardState>(initialState);

  /**
   * The final mode is simply the selected mode
   */
  const finalMode = state.selectedMode;

  /**
   * Check if user can proceed to next step
   */
  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case WizardStep.ServerSelection:
        return state.selectedServer !== null;

      case WizardStep.ModeSelection:
        return true;

      case WizardStep.ToolOrTaskConfig:
        if (state.selectedMode === 'aiToolSelection') {
          return state.naturalLanguageTaskDescription.length > 0;
        }
        // aiParameterConfig / manualParameterConfig → tool must be selected
        return state.selectedTool !== null;

      case WizardStep.FinalConfig:
        if (state.selectedMode === 'aiParameterConfig') {
          return state.aiParameterConfigDescription.length > 0;
        }
        // manualParameterConfig → always allow (parameters can be empty)
        return true;

      default:
        return false;
    }
  }, [state]);

  /**
   * Determine next step based on current state
   */
  const getNextStep = useCallback((): WizardStep | null => {
    switch (state.currentStep) {
      case WizardStep.ServerSelection:
        return WizardStep.ModeSelection;

      case WizardStep.ModeSelection:
        return WizardStep.ToolOrTaskConfig;

      case WizardStep.ToolOrTaskConfig:
        if (state.selectedMode === 'aiToolSelection') {
          // aiToolSelection: step 3 is the final step (NL task input)
          return null;
        }
        return WizardStep.FinalConfig;

      case WizardStep.FinalConfig:
        return null;

      default:
        return null;
    }
  }, [state.currentStep, state.selectedMode]);

  /**
   * Determine previous step based on current state
   */
  const getPreviousStep = useCallback((): WizardStep | null => {
    switch (state.currentStep) {
      case WizardStep.ServerSelection:
        return null;

      case WizardStep.ModeSelection:
        return WizardStep.ServerSelection;

      case WizardStep.ToolOrTaskConfig:
        return WizardStep.ModeSelection;

      case WizardStep.FinalConfig:
        return WizardStep.ToolOrTaskConfig;

      default:
        return null;
    }
  }, [state.currentStep]);

  /**
   * Navigate to next step
   */
  const nextStep = useCallback(() => {
    const next = getNextStep();
    if (next !== null) {
      setState((prev) => ({ ...prev, currentStep: next }));
    }
  }, [getNextStep]);

  /**
   * Navigate to previous step
   */
  const prevStep = useCallback(() => {
    const prev = getPreviousStep();
    if (prev !== null) {
      setState((prevState) => ({ ...prevState, currentStep: prev }));
    }
  }, [getPreviousStep]);

  /**
   * Check if wizard is complete and ready to save
   */
  const isComplete = useMemo((): boolean => {
    const nextStep = getNextStep();
    if (nextStep !== null) {
      return false;
    }

    switch (state.selectedMode) {
      case 'aiToolSelection':
        return state.selectedServer !== null && state.naturalLanguageTaskDescription.length > 0;

      case 'aiParameterConfig':
        return (
          state.selectedServer !== null &&
          state.selectedTool !== null &&
          state.aiParameterConfigDescription.length > 0
        );

      case 'manualParameterConfig':
        return state.selectedServer !== null && state.selectedTool !== null;

      default:
        return false;
    }
  }, [state, getNextStep]);

  /**
   * Reset wizard to initial state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // State setters
  const setServer = useCallback((server: McpServerReference | null) => {
    setState((prev) => ({ ...prev, selectedServer: server }));
  }, []);

  const setSelectedMode = useCallback((mode: McpNodeMode) => {
    // Reset downstream data when mode changes
    setState((prev) => ({
      ...prev,
      selectedMode: mode,
      selectedTool: null,
      naturalLanguageTaskDescription: '',
      aiParameterConfigDescription: '',
      manualParameterValues: {},
    }));
  }, []);

  const setTool = useCallback((tool: McpToolReference | null) => {
    setState((prev) => ({ ...prev, selectedTool: tool }));
  }, []);

  const setNaturalLanguageTaskDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, naturalLanguageTaskDescription: description }));
  }, []);

  const setAiParameterConfigDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, aiParameterConfigDescription: description }));
  }, []);

  const setManualParameterValues = useCallback((values: Record<string, unknown>) => {
    setState((prev) => ({ ...prev, manualParameterValues: values }));
  }, []);

  /**
   * Total steps for step indicator (dynamic based on mode)
   */
  const totalSteps = state.selectedMode === 'aiToolSelection' ? 3 : 4;

  return {
    // State
    state,

    // Computed
    finalMode,
    canProceed: canProceed(),
    isComplete,
    totalSteps,

    // Navigation
    nextStep,
    prevStep,
    reset,

    // Setters
    setServer,
    setSelectedMode,
    setTool,
    setNaturalLanguageTaskDescription,
    setAiParameterConfigDescription,
    setManualParameterValues,
  };
}
