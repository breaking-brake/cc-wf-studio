/**
 * MCP Node Creation Wizard State Hook
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Manage step-by-step wizard state for MCP node creation
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T018
 */

import type { McpNodeMode, ParameterConfigMode, ToolSelectionMode } from '@shared/types/mcp-node';
import type { McpServerReference, McpToolReference } from '@shared/types/messages';
import { useCallback, useMemo, useState } from 'react';

/**
 * Wizard step numbers
 *
 * Flow:
 * 1. Server selection
 * 2. Tool selection method choice
 * 3. (manual) Tool selection OR (auto) Natural language task input [Full NL Mode]
 * 4. (manual only) Parameter config method choice
 * 5. (manual) Detailed Mode OR (auto) Natural language param input [NL Param Mode]
 */
export enum WizardStep {
  ServerSelection = 1,
  ToolSelectionMethod = 2,
  ToolSelection = 3,
  ParameterConfigMethod = 4,
  NaturalLanguageTask = 5,
  NaturalLanguageParam = 6,
}

interface WizardState {
  currentStep: WizardStep;
  selectedServer: McpServerReference | null;
  toolSelectionMode: ToolSelectionMode | null;
  selectedTool: McpToolReference | null;
  parameterConfigMode: ParameterConfigMode | null;
  naturalLanguageTaskDescription: string;
  naturalLanguageParamDescription: string;
}

const initialState: WizardState = {
  currentStep: WizardStep.ServerSelection,
  selectedServer: null,
  toolSelectionMode: null,
  selectedTool: null,
  parameterConfigMode: null,
  naturalLanguageTaskDescription: '',
  naturalLanguageParamDescription: '',
};

export function useMcpCreationWizard() {
  const [state, setState] = useState<WizardState>(initialState);

  /**
   * Determine the final MCP node mode based on wizard choices
   */
  const determineFinalMode = useCallback((): McpNodeMode | null => {
    if (state.toolSelectionMode === 'auto') {
      return 'fullNaturalLanguage';
    }

    if (state.toolSelectionMode === 'manual' && state.parameterConfigMode === 'auto') {
      return 'naturalLanguageParam';
    }

    if (state.toolSelectionMode === 'manual' && state.parameterConfigMode === 'manual') {
      return 'detailed';
    }

    return null;
  }, [state.toolSelectionMode, state.parameterConfigMode]);

  /**
   * Check if user can proceed to next step
   */
  const canProceed = useCallback((): boolean => {
    switch (state.currentStep) {
      case WizardStep.ServerSelection:
        return state.selectedServer !== null;

      case WizardStep.ToolSelectionMethod:
        return state.toolSelectionMode !== null;

      case WizardStep.ToolSelection:
        return state.selectedTool !== null;

      case WizardStep.ParameterConfigMethod:
        return state.parameterConfigMode !== null;

      case WizardStep.NaturalLanguageTask:
        // Minimum 20 characters for Full NL Mode
        return state.naturalLanguageTaskDescription.length >= 20;

      case WizardStep.NaturalLanguageParam:
        // Minimum 10 characters for NL Param Mode
        return state.naturalLanguageParamDescription.length >= 10;

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
        return WizardStep.ToolSelectionMethod;

      case WizardStep.ToolSelectionMethod:
        if (state.toolSelectionMode === 'manual') {
          return WizardStep.ToolSelection;
        }
        if (state.toolSelectionMode === 'auto') {
          return WizardStep.NaturalLanguageTask;
        }
        return null;

      case WizardStep.ToolSelection:
        return WizardStep.ParameterConfigMethod;

      case WizardStep.ParameterConfigMethod:
        if (state.parameterConfigMode === 'manual') {
          // Detailed Mode - no more steps, ready to save
          return null;
        }
        if (state.parameterConfigMode === 'auto') {
          return WizardStep.NaturalLanguageParam;
        }
        return null;

      case WizardStep.NaturalLanguageTask:
        // Full NL Mode - no more steps, ready to save
        return null;

      case WizardStep.NaturalLanguageParam:
        // NL Param Mode - no more steps, ready to save
        return null;

      default:
        return null;
    }
  }, [state.currentStep, state.toolSelectionMode, state.parameterConfigMode]);

  /**
   * Determine previous step based on current state
   */
  const getPreviousStep = useCallback((): WizardStep | null => {
    switch (state.currentStep) {
      case WizardStep.ServerSelection:
        return null;

      case WizardStep.ToolSelectionMethod:
        return WizardStep.ServerSelection;

      case WizardStep.ToolSelection:
        return WizardStep.ToolSelectionMethod;

      case WizardStep.ParameterConfigMethod:
        return WizardStep.ToolSelection;

      case WizardStep.NaturalLanguageTask:
        return WizardStep.ToolSelectionMethod;

      case WizardStep.NaturalLanguageParam:
        return WizardStep.ParameterConfigMethod;

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
    const mode = determineFinalMode();
    if (!mode) return false;

    switch (mode) {
      case 'detailed':
        return (
          state.selectedServer !== null &&
          state.toolSelectionMode === 'manual' &&
          state.selectedTool !== null &&
          state.parameterConfigMode === 'manual'
        );

      case 'naturalLanguageParam':
        return (
          state.selectedServer !== null &&
          state.toolSelectionMode === 'manual' &&
          state.selectedTool !== null &&
          state.parameterConfigMode === 'auto' &&
          state.naturalLanguageParamDescription.length >= 10
        );

      case 'fullNaturalLanguage':
        return (
          state.selectedServer !== null &&
          state.toolSelectionMode === 'auto' &&
          state.naturalLanguageTaskDescription.length >= 20
        );

      default:
        return false;
    }
  }, [state, determineFinalMode]);

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

  const setToolSelectionMode = useCallback((mode: ToolSelectionMode) => {
    setState((prev) => ({ ...prev, toolSelectionMode: mode }));
  }, []);

  const setTool = useCallback((tool: McpToolReference | null) => {
    setState((prev) => ({ ...prev, selectedTool: tool }));
  }, []);

  const setParameterConfigMode = useCallback((mode: ParameterConfigMode) => {
    setState((prev) => ({ ...prev, parameterConfigMode: mode }));
  }, []);

  const setNaturalLanguageTaskDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, naturalLanguageTaskDescription: description }));
  }, []);

  const setNaturalLanguageParamDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, naturalLanguageParamDescription: description }));
  }, []);

  return {
    // State
    state,

    // Computed
    finalMode: determineFinalMode(),
    canProceed: canProceed(),
    isComplete,

    // Navigation
    nextStep,
    prevStep,
    reset,

    // Setters
    setServer,
    setToolSelectionMode,
    setTool,
    setParameterConfigMode,
    setNaturalLanguageTaskDescription,
    setNaturalLanguageParamDescription,
  };
}
