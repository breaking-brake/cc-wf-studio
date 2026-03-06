import { Check, Copy } from 'lucide-react';
import { type CSSProperties, type ReactNode, useCallback, useState } from 'react';

interface CodeBlockProps {
  children: ReactNode;
  onCopy: () => void;
  style?: CSSProperties;
}

export function CodeBlock({ children, onCopy, style }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopy]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy to clipboard'}
        style={{
          position: 'absolute',
          top: '6px',
          right: '22px',
          background: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-widget-border, rgba(128,128,128,0.35))',
          borderRadius: '4px',
          padding: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: copied ? 'var(--vscode-testing-iconPassed, #4caf50)' : 'var(--vscode-foreground)',
          opacity: copied ? 1 : 0.6,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          if (!copied) e.currentTarget.style.opacity = '0.6';
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre
        style={{
          padding: '8px 12px',
          paddingRight: '36px',
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-widget-border, rgba(128,128,128,0.35))',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          color: 'var(--vscode-foreground)',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '300px',
          overflowY: 'auto',
          margin: 0,
          ...style,
        }}
      >
        {children}
      </pre>
    </div>
  );
}
