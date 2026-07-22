/**
 * DuplicateButton Component
 *
 * ノード複製ボタンコンポーネント
 * ノードが選択されている時のみ、DeleteButtonの左隣に表示される
 */

import type React from 'react';
import { useWorkflowStore } from '../../stores/workflow-store';

interface DuplicateButtonProps {
  nodeId: string;
  selected: boolean;
}

/**
 * 複製ボタンコンポーネント
 *
 * @param nodeId - 複製対象のノードID
 * @param selected - ノードが選択されているかどうか
 */
export const DuplicateButton: React.FC<DuplicateButtonProps> = ({ nodeId, selected }) => {
  const { duplicateNode } = useWorkflowStore();

  if (!selected) {
    return null;
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // ノードの選択イベントを防ぐ
    duplicateNode(nodeId);
  };

  return (
    <button
      type="button"
      onClick={handleButtonClick}
      className="nodrag nopan" // ReactFlowのドラッグ・パンを無効化
      style={{
        position: 'absolute',
        top: '2px',
        right: '24px',
        width: '18px',
        height: '18px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        zIndex: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      title="Duplicate node"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
        aria-labelledby="duplicate-icon-title"
      >
        <title id="duplicate-icon-title">Duplicate</title>
        <rect
          x="3.25"
          y="3.25"
          width="5.5"
          height="5.5"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M6.75 1.75H2.75C2.19772 1.75 1.75 2.19772 1.75 2.75V6.75"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
};

export default DuplicateButton;
