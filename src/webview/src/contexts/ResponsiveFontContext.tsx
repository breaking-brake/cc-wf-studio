/**
 * Responsive Font Context
 *
 * Provides responsive font sizes to child components based on panel width.
 * Used by RefinementChatPanel and its child components.
 */

import { createContext, type ReactNode, useContext } from 'react';
import { type ResponsiveFontSizes, useResponsiveFontSizes } from '../hooks/useResponsiveFontSizes';

const ResponsiveFontContext = createContext<ResponsiveFontSizes | null>(null);

interface ResponsiveFontProviderProps {
  width: number;
  children: ReactNode;
}

/**
 * Provider component that calculates and distributes responsive font sizes
 */
export function ResponsiveFontProvider({ width, children }: ResponsiveFontProviderProps) {
  const fontSizes = useResponsiveFontSizes(width);

  return (
    <ResponsiveFontContext.Provider value={fontSizes}>{children}</ResponsiveFontContext.Provider>
  );
}

/**
 * Hook to access responsive font sizes from context
 * Returns default sizes if used outside of ResponsiveFontProvider
 */
export function useResponsiveFonts(): ResponsiveFontSizes {
  const context = useContext(ResponsiveFontContext);
  if (!context) {
    // Fallback to default sizes if used outside provider
    return {
      base: 13,
      small: 11,
      xsmall: 10,
      button: 12,
      title: 13,
    };
  }
  return context;
}
