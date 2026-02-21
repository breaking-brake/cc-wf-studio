/**
 * AI Provider Badge Component
 *
 * Displays a colored badge indicating the AI provider platform
 * (Copilot, Claude Code, Codex, etc.)
 *
 * Theme-aware: automatically adjusts colors based on VS Code theme.
 */

import { useVSCodeTheme } from '../../hooks/useVSCodeTheme';

/**
 * Supported AI provider types
 * Add new providers here as needed
 */
export type AIProviderType = 'copilot' | 'claude' | 'codex' | 'roo' | 'gemini';

/**
 * Configuration for each AI provider
 */
const PROVIDER_CONFIG: Record<
  AIProviderType,
  {
    label: string;
    colors: { dark: string; light: string };
    textColors?: { dark: string; light: string };
  }
> = {
  copilot: {
    label: 'Copilot',
    colors: {
      light: '#00D0E8', // Copilot cyan
      dark: '#7B2D7B', // Dark purple
    },
  },
  claude: {
    label: 'Claude Code',
    colors: {
      light: '#DA7758', // Bright orange
      dark: '#A85A3D', // Dark orange
    },
  },
  codex: {
    label: 'Codex CLI',
    colors: {
      light: '#10A37F', // Bright green
      dark: '#0D8A6A', // Dark green
    },
  },
  roo: {
    label: 'Roo Code',
    colors: {
      light: '#FFFFFF', // White background (light theme)
      dark: '#1E1E1E', // Black background (dark theme)
    },
    textColors: {
      light: '#1E1E1E', // Black text (light theme)
      dark: '#FFFFFF', // White text (dark theme)
    },
  },
  gemini: {
    label: 'Gemini',
    colors: {
      light: '#4285F4', // Google Blue
      dark: '#1A73E8', // Darker Google Blue
    },
  },
};

/**
 * Size presets for the badge
 */
const SIZE_STYLES = {
  small: {
    fontSize: '10px',
    padding: '2px 6px',
  },
  medium: {
    fontSize: '11px',
    padding: '3px 8px',
  },
} as const;

export interface AIProviderBadgeProps {
  /** The AI provider type */
  provider: AIProviderType;
  /** Badge size variant */
  size?: 'small' | 'medium';
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

/**
 * AIProviderBadge Component
 *
 * Renders a colored badge for AI provider platforms.
 * Automatically adapts to VS Code light/dark theme.
 *
 * @example
 * ```tsx
 * <AIProviderBadge provider="copilot" />
 * <AIProviderBadge provider="claude" size="medium" />
 * ```
 */
export function AIProviderBadge({
  provider,
  size = 'small',
  className,
  style,
}: AIProviderBadgeProps) {
  const theme = useVSCodeTheme();
  const isLightTheme = theme === 'light';

  const config = PROVIDER_CONFIG[provider];
  const sizeStyle = SIZE_STYLES[size];

  if (!config) {
    console.warn(`[AIProviderBadge] Unknown provider type: ${provider}`);
    return null;
  }

  return (
    <span
      className={className}
      style={{
        ...sizeStyle,
        color: config.textColors
          ? isLightTheme
            ? config.textColors.light
            : config.textColors.dark
          : '#ffffff',
        backgroundColor: isLightTheme ? config.colors.light : config.colors.dark,
        border: config.textColors ? '1px solid var(--vscode-panel-border)' : 'none',
        borderRadius: '3px',
        display: 'inline-block',
        fontWeight: 600,
        letterSpacing: '0.3px',
        ...style,
      }}
    >
      {config.label}
    </span>
  );
}

/**
 * Get the label for a provider type without rendering a component
 */
export function getProviderLabel(provider: AIProviderType): string {
  return PROVIDER_CONFIG[provider]?.label ?? provider;
}

/**
 * Check if a string is a valid AIProviderType
 */
export function isValidProviderType(value: string): value is AIProviderType {
  return value in PROVIDER_CONFIG;
}
