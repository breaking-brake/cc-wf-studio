/**
 * Responsive Font Sizes Hook
 *
 * Calculates font sizes based on panel width for responsive design.
 * Used by RefinementChatPanel and its child components.
 */

import { useMemo } from 'react';

export type PanelSizeMode = 'compact' | 'normal' | 'expanded';

export interface ResponsiveFontSizes {
  base: number;
  small: number;
  xsmall: number;
  button: number;
  title: number;
}

const BREAKPOINTS = {
  COMPACT_MAX: 280,
  EXPANDED_MIN: 450,
} as const;

const BASE_FONT_SIZES: ResponsiveFontSizes = {
  base: 13,
  small: 11,
  xsmall: 10,
  button: 12,
  title: 13,
};

const SCALE_FACTORS: Record<PanelSizeMode, number> = {
  compact: 0.85,
  normal: 1.0,
  expanded: 1.1,
};

/**
 * Determines panel size mode based on width
 */
export function getPanelSizeMode(width: number): PanelSizeMode {
  if (width < BREAKPOINTS.COMPACT_MAX) return 'compact';
  if (width > BREAKPOINTS.EXPANDED_MIN) return 'expanded';
  return 'normal';
}

/**
 * Hook for calculating responsive font sizes based on panel width
 *
 * @param width - Current panel width in pixels
 * @returns Font sizes object with base, small, xsmall, button, and title sizes
 */
export function useResponsiveFontSizes(width: number): ResponsiveFontSizes {
  return useMemo(() => {
    const mode = getPanelSizeMode(width);
    const scale = SCALE_FACTORS[mode];

    return {
      base: Math.round(BASE_FONT_SIZES.base * scale),
      small: Math.round(BASE_FONT_SIZES.small * scale),
      xsmall: Math.round(BASE_FONT_SIZES.xsmall * scale),
      button: Math.round(BASE_FONT_SIZES.button * scale),
      title: Math.round(BASE_FONT_SIZES.title * scale),
    };
  }, [width]);
}
