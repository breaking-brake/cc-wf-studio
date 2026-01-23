/**
 * VS Code Theme Detection Hook
 *
 * Detects the current VS Code theme (dark/light/high-contrast)
 * and reactively updates when the theme changes.
 *
 * VS Code adds these classes to the body element:
 * - vscode-dark: Dark theme
 * - vscode-light: Light theme
 * - vscode-high-contrast: High contrast theme
 */

import { useEffect, useState } from 'react';

export type VSCodeTheme = 'dark' | 'light' | 'high-contrast';

/**
 * Detect current VS Code theme from body class
 */
function detectTheme(): VSCodeTheme {
  if (typeof document === 'undefined') {
    return 'dark'; // SSR fallback
  }
  if (document.body.classList.contains('vscode-light')) {
    return 'light';
  }
  if (document.body.classList.contains('vscode-high-contrast')) {
    return 'high-contrast';
  }
  return 'dark'; // Default to dark
}

/**
 * Hook to detect and track VS Code theme changes
 *
 * @returns Current VS Code theme ('dark' | 'light' | 'high-contrast')
 *
 * @example
 * ```tsx
 * const theme = useVSCodeTheme();
 * const backgroundColor = theme === 'light' ? '#f0f0f0' : '#1e1e1e';
 * ```
 */
export function useVSCodeTheme(): VSCodeTheme {
  const [theme, setTheme] = useState<VSCodeTheme>(() => detectTheme());

  useEffect(() => {
    // Update theme on mount (in case initial detection was wrong)
    setTheme(detectTheme());

    // Watch for class changes on body element
    const observer = new MutationObserver(() => {
      setTheme(detectTheme());
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

/**
 * Check if current theme is dark (dark or high-contrast)
 */
export function useIsDarkTheme(): boolean {
  const theme = useVSCodeTheme();
  return theme === 'dark' || theme === 'high-contrast';
}
