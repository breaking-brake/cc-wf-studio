/**
 * MCP Node Wizard Hook
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Manage wizard state for MCP node configuration
 *
 * Based on: specs/001-mcp-natural-language-mode/extension-points.md Section 2.2
 * Task: T015
 */

import type { McpNodeData, McpNodeMode } from '@shared/types/mcp-node';
import { useCallback, useState } from 'react';

export enum WizardStep {
  ModeSelection = 0,
  ServerSelection = 1,
  ToolSelection = 2,
  Configuration = 3,
}

interface WizardState {
  currentStep: WizardStep;
  mode: McpNodeMode;
  serverId: string;
  toolName: string;
  toolDescription: string;
  naturalLanguageDescription: string;
  taskDescription: string;
}

interface UseMcpNodeWizardResult {
  // State
  currentStep: WizardStep;
  mode: McpNodeMode;
  serverId: string;
  toolName: string;
  toolDescription: string;
  naturalLanguageDescription: string;
  taskDescription: string;

  // State setters
  setMode: (mode: McpNodeMode) => void;
  setServerId: (serverId: string) => void;
  setToolName: (toolName: string) => void;
  setToolDescription: (description: string) => void;
  setNaturalLanguageDescription: (description: string) => void;
  setTaskDescription: (description: string) => void;

  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  canProceedToNext: () => boolean;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  getTotalSteps: () => number;

  // Utility
  reset: () => void;
}

/**
 * Custom hook for managing MCP node wizard state
 *
 * @param initialData - Optional initial node data for editing existing nodes
 * @returns Wizard state and navigation functions
 */
export function useMcpNodeWizard(initialData?: Partial<McpNodeData>): UseMcpNodeWizardResult {
  const [state, setState] = useState<WizardState>(() => ({
    currentStep: WizardStep.ModeSelection,
    mode: initialData?.mode || 'detailed',
    serverId: initialData?.serverId || '',
    toolName: initialData?.toolName || '',
    toolDescription: initialData?.toolDescription || '',
    naturalLanguageDescription: initialData?.naturalLanguageParamConfig?.description || '',
    taskDescription: initialData?.fullNaturalLanguageConfig?.taskDescription || '',
  }));

  /**
   * Set the selected mode
   */
  const setMode = useCallback((mode: McpNodeMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  /**
   * Set the selected server ID
   */
  const setServerId = useCallback((serverId: string) => {
    setState((prev) => ({ ...prev, serverId }));
  }, []);

  /**
   * Set the selected tool name
   */
  const setToolName = useCallback((toolName: string) => {
    setState((prev) => ({ ...prev, toolName }));
  }, []);

  /**
   * Set the tool description
   */
  const setToolDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, toolDescription: description }));
  }, []);

  /**
   * Set the natural language description (for naturalLanguageParam mode)
   */
  const setNaturalLanguageDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, naturalLanguageDescription: description }));
  }, []);

  /**
   * Set the task description (for fullNaturalLanguage mode)
   */
  const setTaskDescription = useCallback((description: string) => {
    setState((prev) => ({ ...prev, taskDescription: description }));
  }, []);

  /**
   * Get total number of steps based on selected mode
   */
  const getTotalSteps = useCallback((): number => {
    // Mode Selection (Step 0) is always included
    // Server Selection (Step 1) is always included
    // Tool Selection (Step 2) is skipped in fullNaturalLanguage mode
    // Configuration (Step 3) is always included
    return state.mode === 'fullNaturalLanguage' ? 3 : 4;
  }, [state.mode]);

  /**
   * Check if current step is the first step
   */
  const isFirstStep = useCallback((): boolean => {
    return state.currentStep === WizardStep.ModeSelection;
  }, [state.currentStep]);

  /**
   * Check if current step is the last step
   */
  const isLastStep = useCallback((): boolean => {
    const totalSteps = getTotalSteps();
    return state.currentStep === totalSteps - 1;
  }, [state.currentStep, getTotalSteps]);

  /**
   * Check if user can proceed to the next step
   */
  const canProceedToNext = useCallback((): boolean => {
    switch (state.currentStep) {
      case WizardStep.ModeSelection:
        // Mode must be selected (always has a default value)
        return true;

      case WizardStep.ServerSelection:
        // Server ID must be selected
        return state.serverId.trim() !== '';

      case WizardStep.ToolSelection:
        // Tool name must be selected (only if not in fullNaturalLanguage mode)
        if (state.mode === 'fullNaturalLanguage') {
          return true; // Skip this step
        }
        return state.toolName.trim() !== '';

      case WizardStep.Configuration:
        // Configuration validation depends on mode
        if (state.mode === 'detailed') {
          // For detailed mode, parameters will be validated by ParameterFormGenerator
          return true;
        } else if (state.mode === 'naturalLanguageParam') {
          // Natural language description must be at least 10 characters
          return state.naturalLanguageDescription.trim().length >= 10;
        } else if (state.mode === 'fullNaturalLanguage') {
          // Task description must be at least 20 characters
          return state.taskDescription.trim().length >= 20;
        }
        return false;

      default:
        return false;
    }
  }, [state]);

  /**
   * Navigate to the next step
   */
  const nextStep = useCallback(() => {
    if (!canProceedToNext()) {
      return;
    }

    setState((prev) => {
      let nextStep = prev.currentStep + 1;

      // Skip ToolSelection step for fullNaturalLanguage mode
      if (nextStep === WizardStep.ToolSelection && prev.mode === 'fullNaturalLanguage') {
        nextStep = WizardStep.Configuration;
      }

      const totalSteps = prev.mode === 'fullNaturalLanguage' ? 3 : 4;
      if (nextStep >= totalSteps) {
        return prev; // Already at last step
      }

      return {
        ...prev,
        currentStep: nextStep,
      };
    });
  }, [canProceedToNext]);

  /**
   * Navigate to the previous step
   */
  const previousStep = useCallback(() => {
    setState((prev) => {
      let prevStep = prev.currentStep - 1;

      // Skip ToolSelection step for fullNaturalLanguage mode when going back
      if (prevStep === WizardStep.ToolSelection && prev.mode === 'fullNaturalLanguage') {
        prevStep = WizardStep.ServerSelection;
      }

      if (prevStep < WizardStep.ModeSelection) {
        return prev; // Already at first step
      }

      return {
        ...prev,
        currentStep: prevStep,
      };
    });
  }, []);

  /**
   * Reset wizard to initial state
   */
  const reset = useCallback(() => {
    setState({
      currentStep: WizardStep.ModeSelection,
      mode: initialData?.mode || 'detailed',
      serverId: initialData?.serverId || '',
      toolName: initialData?.toolName || '',
      toolDescription: initialData?.toolDescription || '',
      naturalLanguageDescription: initialData?.naturalLanguageParamConfig?.description || '',
      taskDescription: initialData?.fullNaturalLanguageConfig?.taskDescription || '',
    });
  }, [initialData]);

  return {
    // State
    currentStep: state.currentStep,
    mode: state.mode,
    serverId: state.serverId,
    toolName: state.toolName,
    toolDescription: state.toolDescription,
    naturalLanguageDescription: state.naturalLanguageDescription,
    taskDescription: state.taskDescription,

    // State setters
    setMode,
    setServerId,
    setToolName,
    setToolDescription,
    setNaturalLanguageDescription,
    setTaskDescription,

    // Navigation
    nextStep,
    previousStep,
    canProceedToNext,
    isFirstStep,
    isLastStep,
    getTotalSteps,

    // Utility
    reset,
  };
}
