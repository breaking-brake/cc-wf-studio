/**
 * MCP Node Edit Wizard State Hook
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Manage step-by-step wizard state for MCP node editing
 *
 * Unlike the creation wizard, this has no server selection step (server is fixed).
 * Steps:
 * 1. Mode selection
 * 2. Tool or Task config (depends on mode)
 * 3. Final config (only for aiParameterConfig / manualParameterConfig)
 *
 * Opens at the final step based on existing nodeData, allowing users to go back.
 */

import type { McpNodeData, McpNodeMode } from '@shared/types/mcp-node';
import type { McpToolReference } from '@shared/types/messages';
import { useCallback, useMemo, useState } from 'react';

export enum EditWizardStep {
  ModeSelection = 1,
  ToolOrTaskConfig = 2,
  FinalConfig = 3,
}

interface EditWizardState {
  currentStep: EditWizardStep;
  selectedMode: McpNodeMode;
  selectedTool: McpToolReference | null;
  naturalLanguageTaskDescription: string;
  aiParameterConfigDescription: string;
  manualParameterValues: Record<string, unknown>;
}

const initialState: EditWizardState = {
  currentStep: EditWizardStep.ModeSelection,
  selectedMode: 'manualParameterConfig',
  selectedTool: null,
  naturalLanguageTaskDescription: '',
  aiParameterConfigDescription: '',
  manualParameterValues: {},
};

export function useMcpEditWizard() {
  const [state, setState] = useState<EditWizardState>(initialState);

  /**
   * Initialize wizard state from existing node data.
   * Sets all fields from nodeData and navigates to the final step.
   */
  const initializeFromNodeData = useCallback((nodeData: McpNodeData) => {
    const mode = nodeData.mode || 'manualParameterConfig';

    const tool: McpToolReference | null = nodeData.toolName
      ? {
          serverId: nodeData.serverId,
          name: nodeData.toolName,
          description: nodeData.toolDescription || '',
          parameters: nodeData.parameters || [],
        }
      : null;

    let finalStep: EditWizardStep;
    if (mode === 'aiToolSelection') {
      finalStep = EditWizardStep.ToolOrTaskConfig;
    } else {
      finalStep = EditWizardStep.FinalConfig;
    }

    setState({
      currentStep: finalStep,
      selectedMode: mode,
      selectedTool: tool,
      naturalLanguageTaskDescription: nodeData.aiToolSelectionConfig?.taskDescription || '',
      aiParameterConfigDescription: nodeData.aiParameterConfig?.description || '',
      manualParameterValues: nodeData.parameterValues || {},
    });
  }, []);

  /**
   * Check if user can proceed to next step
   */
  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case EditWizardStep.ModeSelection:
        return true;

      case EditWizardStep.ToolOrTaskConfig:
        if (state.selectedMode === 'aiToolSelection') {
          return state.naturalLanguageTaskDescription.length > 0;
        }
        return state.selectedTool !== null;

      case EditWizardStep.FinalConfig:
        if (state.selectedMode === 'aiParameterConfig') {
          return state.aiParameterConfigDescription.length > 0;
        }
        // manualParameterConfig → always allow
        return true;

      default:
        return false;
    }
  }, [state]);

  /**
   * Determine next step based on current state
   */
  const getNextStep = useCallback((): EditWizardStep | null => {
    switch (state.currentStep) {
      case EditWizardStep.ModeSelection:
        return EditWizardStep.ToolOrTaskConfig;

      case EditWizardStep.ToolOrTaskConfig:
        if (state.selectedMode === 'aiToolSelection') {
          return null; // final step
        }
        return EditWizardStep.FinalConfig;

      case EditWizardStep.FinalConfig:
        return null;

      default:
        return null;
    }
  }, [state.currentStep, state.selectedMode]);

  /**
   * Determine previous step based on current state
   */
  const getPreviousStep = useCallback((): EditWizardStep | null => {
    switch (state.currentStep) {
      case EditWizardStep.ModeSelection:
        return null;

      case EditWizardStep.ToolOrTaskConfig:
        return EditWizardStep.ModeSelection;

      case EditWizardStep.FinalConfig:
        return EditWizardStep.ToolOrTaskConfig;

      default:
        return null;
    }
  }, [state.currentStep]);

  const nextStep = useCallback(() => {
    const next = getNextStep();
    if (next !== null) {
      setState((prev) => ({ ...prev, currentStep: next }));
    }
  }, [getNextStep]);

  const prevStep = useCallback(() => {
    const prev = getPreviousStep();
    if (prev !== null) {
      setState((prevState) => ({ ...prevState, currentStep: prev }));
    }
  }, [getPreviousStep]);

  /**
   * Check if wizard is on the final step and ready to save
   */
  const isComplete = useMemo((): boolean => {
    const next = getNextStep();
    if (next !== null) {
      return false;
    }

    switch (state.selectedMode) {
      case 'aiToolSelection':
        return state.naturalLanguageTaskDescription.length > 0;

      case 'aiParameterConfig':
        return state.selectedTool !== null && state.aiParameterConfigDescription.length > 0;

      case 'manualParameterConfig':
        return state.selectedTool !== null;

      default:
        return false;
    }
  }, [state, getNextStep]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // State setters
  const setSelectedMode = useCallback((mode: McpNodeMode) => {
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
   * Total steps (dynamic based on mode)
   * aiToolSelection: 2 steps (ModeSelection + ToolOrTaskConfig)
   * others: 3 steps (ModeSelection + ToolOrTaskConfig + FinalConfig)
   */
  const totalSteps = state.selectedMode === 'aiToolSelection' ? 2 : 3;

  return {
    state,

    // Computed
    canProceed: canProceed(),
    isComplete,
    totalSteps,

    // Navigation
    nextStep,
    prevStep,
    reset,
    initializeFromNodeData,

    // Setters
    setSelectedMode,
    setTool,
    setNaturalLanguageTaskDescription,
    setAiParameterConfigDescription,
    setManualParameterValues,
  };
}
