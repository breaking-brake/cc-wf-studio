/**
 * Indeterminate Progress Bar Component
 *
 * Reusable indeterminate (infinite) progress bar for loading states.
 * Used across MCP server/tool loading operations and AI refinement with unlimited timeout.
 *
 * @example
 * ```tsx
 * <IndeterminateProgressBar label="Loading MCP servers..." />
 * ```
 */

import { useResponsiveFonts } from '../../contexts/ResponsiveFontContext';

interface IndeterminateProgressBarProps {
  /** Label text above progress bar */
  label: string;
}

export function IndeterminateProgressBar({ label }: IndeterminateProgressBarProps) {
  const fontSizes = useResponsiveFonts();

  return (
    <div
      style={{
        marginTop: '8px',
      }}
    >
      {/* Loading label */}
      <div
        style={{
          marginBottom: '6px',
          fontSize: `${fontSizes.small}px`,
          color: 'var(--vscode-descriptionForeground)',
          fontStyle: 'italic',
        }}
      >
        {label}
      </div>

      {/* Indeterminate progress bar */}
      <div
        style={{
          width: '100%',
          height: '4px',
          backgroundColor: 'var(--vscode-editor-background)',
          borderRadius: '2px',
          overflow: 'hidden',
          border: '1px solid var(--vscode-panel-border)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            height: '100%',
            width: '30%',
            backgroundColor: 'var(--vscode-progressBar-background)',
            animation: 'slide 1.5s ease-in-out infinite',
          }}
        />
      </div>

      <style>
        {`
          @keyframes slide {
            0% {
              left: -30%;
            }
            100% {
              left: 100%;
            }
          }
        `}
      </style>
    </div>
  );
}
