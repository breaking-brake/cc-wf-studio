/**
 * Spinner Component
 *
 * A simple circular loading spinner using CSS animation.
 */

import type React from 'react';

export interface SpinnerProps {
  /** Spinner size in pixels (default: 32) */
  size?: number;
  /** Border thickness in pixels (default: 3) */
  thickness?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 32, thickness = 3 }) => {
  return (
    <>
      <div
        className="spinner"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `${thickness}px solid var(--vscode-progressBar-background)`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
        }}
      />
      <style>
        {`
          .spinner {
            animation: spinner-spin 1s linear infinite;
          }
          @keyframes spinner-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};
