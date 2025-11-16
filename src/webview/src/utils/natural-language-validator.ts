/**
 * Natural Language Input Validation Utilities
 *
 * Feature: 001-mcp-natural-language-mode
 * Purpose: Validate natural language input for AI Parameter Config and AI Tool Selection modes
 *
 * Based on: specs/001-mcp-natural-language-mode/tasks.md T034
 */

import { useEffect, useState } from 'react';

/**
 * Validate natural language parameter description
 *
 * Rules:
 * - Required input (≥1 character after trim)
 *
 * @param description - Parameter description to validate
 * @returns Error message (i18n key) or null if valid
 */
export function validateParameterDescription(description: string): string | null {
  // Empty check
  if (!description || description.trim().length === 0) {
    return 'mcp.error.paramDescRequired';
  }

  return null;
}

/**
 * Validate natural language task description
 *
 * Rules:
 * - Required input (≥1 character after trim)
 *
 * @param taskDescription - Task description to validate
 * @returns Error message (i18n key) or null if valid
 */
export function validateTaskDescription(taskDescription: string): string | null {
  // Empty check
  if (!taskDescription || taskDescription.trim().length === 0) {
    return 'mcp.error.taskDescRequired';
  }

  return null;
}

/**
 * Custom React hook for debounced validation
 *
 * Validates the input value after a specified delay (debounce).
 * Useful for real-time validation without excessive re-renders.
 *
 * @param value - Value to validate
 * @param validationFn - Validation function (e.g., validateParameterDescription)
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Error message (i18n key) or null if valid
 */
export function useDebouncedValidation(
  value: string,
  validationFn: (value: string) => string | null,
  delay: number = 300
): string | null {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up debounce timer
    const timeoutId = setTimeout(() => {
      const validationError = validationFn(value);
      setError(validationError);
    }, delay);

    // Clean up timer on value change or unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, validationFn, delay]);

  return error;
}
