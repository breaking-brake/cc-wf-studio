/**
 * Tool Execution Indicator Component
 *
 * Displays an animated indicator during Claude Code tool execution.
 * Shows tool name with animated dots (1→2→3→1 循環).
 *
 * Example: 🔨Bash: npm run build...
 */

import { useEffect, useState } from 'react';
import { useResponsiveFonts } from '../../contexts/ResponsiveFontContext';

interface ToolExecutionIndicatorProps {
  /** Tool information from claude-code-service (e.g., "Bash: npm run build") */
  toolInfo: string;
}

/**
 * ツール名から適切な絵文字を選択
 */
function getToolEmoji(toolName: string): string {
  const lowerTool = toolName.toLowerCase();
  if (lowerTool.includes('bash')) return '🔨';
  if (lowerTool.includes('read')) return '📄';
  if (lowerTool.includes('write')) return '✏️';
  if (lowerTool.includes('edit')) return '✏️';
  if (lowerTool.includes('grep')) return '🔍';
  if (lowerTool.includes('glob')) return '🔍';
  if (lowerTool.includes('task')) return '📋';
  return '🔧'; // デフォルト
}

export function ToolExecutionIndicator({ toolInfo }: ToolExecutionIndicatorProps) {
  const fontSizes = useResponsiveFonts();
  const [dotCount, setDotCount] = useState(1);

  // アニメーション: 500msごとに点を1→2→3→1と変化
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // 防御的実装: toolInfoが空の場合は表示しない
  if (!toolInfo || !toolInfo.trim()) {
    return null;
  }

  // ツール名と説明を分離
  const colonIndex = toolInfo.indexOf(':');
  const toolName = colonIndex !== -1 ? toolInfo.slice(0, colonIndex).trim() : toolInfo.trim();
  const toolDescription = colonIndex !== -1 ? toolInfo.slice(colonIndex + 1).trim() : '';

  // ツール名が空の場合は表示しない
  if (!toolName) {
    return null;
  }

  const emoji = getToolEmoji(toolName);

  // 点の文字列生成
  const dots = '.'.repeat(dotCount);

  return (
    <div
      style={{
        marginTop: '8px',
        marginBottom: '4px',
        fontSize: `${fontSizes.small}px`,
        color: 'var(--vscode-descriptionForeground)',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <span>{emoji}</span>
      <span>
        {toolName}
        {toolDescription && `: ${toolDescription}`}
        {dots}
      </span>
    </div>
  );
}
