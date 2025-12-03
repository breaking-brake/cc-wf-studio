/**
 * Claude Code Workflow Studio - Styled Tooltip Component
 *
 * Reusable tooltip component with VSCode-consistent styling
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import type React from 'react';

interface StyledTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  delayDuration?: number;
}

const tooltipContentStyle: React.CSSProperties = {
  backgroundColor: 'var(--vscode-editorHoverWidget-background)',
  color: 'var(--vscode-editorHoverWidget-foreground)',
  border: '1px solid var(--vscode-editorHoverWidget-border)',
  borderRadius: '3px',
  padding: '6px 8px',
  fontSize: '12px',
  maxWidth: '250px',
  zIndex: 10000,
};

const tooltipArrowStyle: React.CSSProperties = {
  fill: 'var(--vscode-editorHoverWidget-border)',
};

/**
 * StyledTooltip Component
 *
 * A reusable tooltip with VSCode-consistent styling.
 * Wraps radix-ui Tooltip with predefined styles.
 */
export const StyledTooltip: React.FC<StyledTooltipProps> = ({
  children,
  content,
  side = 'bottom',
  sideOffset = 5,
  delayDuration = 300,
}) => {
  return (
    <Tooltip.Provider delayDuration={delayDuration}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side={side} sideOffset={sideOffset} style={tooltipContentStyle}>
            {content}
            <Tooltip.Arrow style={tooltipArrowStyle} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

/**
 * StyledTooltipProvider Component
 *
 * Use this when you need multiple tooltips sharing the same Provider.
 * This avoids nesting multiple Providers.
 */
export const StyledTooltipProvider: React.FC<{
  children: React.ReactNode;
  delayDuration?: number;
}> = ({ children, delayDuration = 300 }) => {
  return <Tooltip.Provider delayDuration={delayDuration}>{children}</Tooltip.Provider>;
};

/**
 * StyledTooltipItem Component
 *
 * Use inside StyledTooltipProvider for multiple tooltips.
 */
export const StyledTooltipItem: React.FC<{
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}> = ({ children, content, side = 'bottom', sideOffset = 5 }) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={sideOffset} style={tooltipContentStyle}>
          {content}
          <Tooltip.Arrow style={tooltipArrowStyle} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
