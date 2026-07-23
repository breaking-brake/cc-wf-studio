/**
 * Generate Workflow Tour Popover
 *
 * A lightweight popover offered when a workflow has no tour yet. Wraps a
 * caller-supplied trigger (the surface's tour button) and lets the user pick an
 * AI agent and generate a tour. Shared by the canvas tour button and the
 * in-editor Overview tour button.
 *
 * The actual generation is injected via `onGenerate(provider)` so the component
 * stays decoupled from the VSCode bridge (the CLI preview, which cannot
 * generate, simply never renders this).
 */

import * as Popover from '@radix-ui/react-popover';
import type { AiEditingProvider } from '@shared/types/messages';
import { GraduationCap } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useEnabledAiProviders } from '../hooks/useEnabledAiProviders';
import { useTranslation } from '../i18n/i18n-context';

interface GenerateTourPopoverProps {
  /** Launch tour generation with the chosen agent. Resolves when launched. */
  onGenerate: (provider: AiEditingProvider) => Promise<void> | void;
  /** The trigger element (the surface's tour button). */
  children: React.ReactNode;
  /** 'create' (no tour yet) or 'regenerate' (replace an existing tour). */
  mode?: 'create' | 'regenerate';
}

export function GenerateTourPopover({
  onGenerate,
  children,
  mode = 'create',
}: GenerateTourPopoverProps) {
  const providers = useEnabledAiProviders();
  const { t } = useTranslation();
  const copy =
    mode === 'regenerate'
      ? {
          heading: t('workflowTour.popover.regenerateHeading'),
          description: t('workflowTour.popover.regenerateDescription'),
          button: t('workflowTour.popover.regenerateButton'),
          running: t('workflowTour.popover.regenerating'),
        }
      : {
          heading: t('workflowTour.popover.emptyHeading'),
          description: t('workflowTour.popover.emptyDescription'),
          button: t('workflowTour.generate'),
          running: t('workflowTour.popover.generating'),
        };
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AiEditingProvider>('claude-code');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fall back to Claude Code if the selected provider is no longer enabled
  // (e.g. its extension/CLI was toggled off after selection).
  useEffect(() => {
    if (!providers.some((p) => p.provider === selectedProvider)) {
      setSelectedProvider('claude-code');
    }
  }, [providers, selectedProvider]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      await onGenerate(selectedProvider);
    } catch {
      // Error surfaced by the extension host
    } finally {
      setIsGenerating(false);
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          sideOffset={8}
          align="end"
          style={{
            width: '270px',
            backgroundColor: 'var(--vscode-editorWidget-background)',
            color: 'var(--vscode-editorWidget-foreground, var(--vscode-foreground))',
            border: '1px solid var(--vscode-widget-border, var(--vscode-panel-border))',
            borderRadius: '6px',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
            padding: '12px',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <GraduationCap size={14} />
            <span style={{ fontSize: '12px' }}>{copy.heading}</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              lineHeight: 1.5,
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            {copy.description}
          </div>

          {/* Agent selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span
              style={{
                fontSize: '10px',
                opacity: 0.7,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {t('workflowTour.popover.agent')}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {providers.map((p) => {
                const isSelected = selectedProvider === p.provider;
                return (
                  <button
                    key={p.provider}
                    type="button"
                    onClick={() => setSelectedProvider(p.provider)}
                    disabled={isGenerating}
                    aria-pressed={isSelected}
                    style={{
                      padding: '3px 8px',
                      fontSize: '10px',
                      borderRadius: '10px',
                      cursor: isGenerating ? 'default' : 'pointer',
                      border: isSelected
                        ? '1px solid var(--vscode-focusBorder)'
                        : '1px solid var(--vscode-panel-border)',
                      backgroundColor: isSelected
                        ? 'var(--vscode-button-background)'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--vscode-button-foreground)'
                        : 'var(--vscode-foreground)',
                      opacity: isGenerating ? 0.6 : 1,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              fontSize: '11px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '3px',
              cursor: isGenerating ? 'wait' : 'pointer',
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            <GraduationCap size={12} />
            {isGenerating ? copy.running : copy.button}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
