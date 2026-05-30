/**
 * DeleteButton Component
 *
 * ノード削除ボタンコンポーネント
 * ノードが選択されている時のみ表示される
 */

import type React from 'react';
import { useWorkflowStore } from '../../stores/workflow-store';

interface DeleteButtonProps {
  nodeId: string;
  selected: boolean;
}

/**
 * 削除ボタンコンポーネント
 *
 * @param nodeId - 削除対象のノードID
 * @param selected - ノードが選択されているかどうか
 */
export const DeleteButton: React.FC<DeleteButtonProps> = ({ nodeId, selected }) => {
  const { requestDeleteNode } = useWorkflowStore();

  if (!selected) {
    return null;
  }

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // ノードの選択イベントを防ぐ
    requestDeleteNode(nodeId);
  };

  return (
    <button
      type="button"
      onClick={handleButtonClick}
      className="nodrag nopan" // ReactFlowのドラッグ・パンを無効化
      style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        width: '18px',
        height: '18px',
        borderRadius: '3px',
        backgroundColor: 'var(--vscode-errorForeground)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
        padding: 0,
        zIndex: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--vscode-errorForeground)';
        e.currentTarget.style.opacity = '0.8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      title="Delete node"
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
        aria-labelledby="delete-icon-title"
      >
        <title id="delete-icon-title">Delete</title>
        <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
};

export default DeleteButton;
