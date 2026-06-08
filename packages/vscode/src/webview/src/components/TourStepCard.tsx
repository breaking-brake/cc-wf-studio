/**
 * Tour Step Card (presentational)
 *
 * The visual card for one guided-tour step: progress, title, description,
 * optional language lesson, and Prev / Next / Finish controls. Stateless —
 * the host owns the step index and node spotlighting. Shared by the canvas
 * tour player (`TourPanel`) and the read-only Overview tour.
 */

import type { AiEditingProvider, TourStep } from '@shared/types/messages';
import { ChevronLeft, ChevronRight, GraduationCap, RefreshCw, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { GenerateTourPopover } from './GenerateTourPopover';

interface TourStepCardProps {
  step: TourStep;
  /** 0-based index of the current step */
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  /**
   * 'floating' (default): an overlay card centred at the bottom (canvas).
   * 'docked': a panel that fills its container, used as a dedicated tour
   * area docked at the bottom of the Overview's right pane so it never
   * covers the instructions.
   */
  variant?: 'floating' | 'docked';
  /**
   * When provided, a "Regenerate" control is shown in the header that lets the
   * user pick an agent and regenerate this tour. Omit in read-only contexts
   * (e.g. ccwf preview) where generation isn't available.
   */
  onRegenerate?: (provider: AiEditingProvider) => Promise<void> | void;
}

export function TourStepCard({
  step,
  index,
  total,
  onPrev,
  onNext,
  onClose,
  variant = 'floating',
  onRegenerate,
}: TourStepCardProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const floatingStyle: CSSProperties = {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(520px, calc(100% - 48px))',
    border: '1px solid var(--vscode-widget-border, var(--vscode-panel-border))',
    borderRadius: '8px',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
    zIndex: 50,
  };
  const dockedStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxHeight: '45%',
    overflowY: 'auto',
    borderTop: '1px solid var(--vscode-widget-border, var(--vscode-panel-border))',
    flexShrink: 0,
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--vscode-editorWidget-background)',
        color: 'var(--vscode-editorWidget-foreground, var(--vscode-foreground))',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...(variant === 'docked' ? dockedStyle : floatingStyle),
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <GraduationCap size={14} />
        <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600 }}>
          {`Workflow Tour · ${index + 1} / ${total}`}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onRegenerate && (
            <GenerateTourPopover mode="regenerate" onGenerate={onRegenerate}>
              <button
                type="button"
                title="Regenerate this tour with an AI agent"
                aria-label="Regenerate workflow tour"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} />
                Regenerate
              </button>
            </GenerateTourPopover>
          )}
          <button
            type="button"
            onClick={onClose}
            title="End workflow tour"
            aria-label="End workflow tour"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          borderRadius: '2px',
          backgroundColor: 'var(--vscode-panel-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((index + 1) / total) * 100}%`,
            backgroundColor: 'var(--vscode-progressBar-background, var(--vscode-focusBorder))',
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      {/* Body */}
      <div style={{ fontSize: '13px', fontWeight: 600 }}>{step.title}</div>
      <div style={{ fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {step.description}
      </div>
      {step.languageLesson && (
        <div
          style={{
            fontSize: '11px',
            lineHeight: 1.6,
            padding: '6px 8px',
            borderRadius: '4px',
            backgroundColor: 'var(--vscode-textBlockQuote-background, rgba(127,127,127,0.12))',
            borderLeft: '2px solid var(--vscode-focusBorder)',
            color: 'var(--vscode-descriptionForeground)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {`💡 ${step.languageLesson}`}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '5px 10px',
            fontSize: '11px',
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none',
            borderRadius: '3px',
            cursor: isFirst ? 'default' : 'pointer',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          <ChevronLeft size={12} />
          Prev
        </button>
        <span style={{ marginLeft: 'auto' }} />
        {isLast ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '5px 14px',
              fontSize: '11px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '5px 12px',
              fontSize: '11px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Next
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
