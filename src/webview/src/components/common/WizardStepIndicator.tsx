/**
 * Wizard Step Indicator Component
 *
 * Visual step indicator for multi-step wizards showing:
 * - Completed steps with checkmark (✓)
 * - Current step with number
 * - Future steps with number (disabled)
 * - Connection lines between steps
 *
 * Accessibility: Properly structured with <nav>, <ol role="list">, and aria-current="step"
 */

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardStepIndicator({ currentStep, totalSteps }: WizardStepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <nav
      style={{
        marginBottom: '20px',
      }}
      aria-label="Wizard steps"
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {steps.map((step, index) => (
          <li key={step} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Step Circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor:
                  step <= currentStep
                    ? 'var(--vscode-focusBorder)'
                    : 'var(--vscode-editor-background)',
                border: step <= currentStep ? 'none' : '2px solid var(--vscode-panel-border)',
                color:
                  step <= currentStep
                    ? 'var(--vscode-editor-background)'
                    : 'var(--vscode-descriptionForeground)',
                transition: 'all 0.2s ease-in-out',
              }}
              aria-current={step === currentStep ? 'step' : undefined}
            >
              {step < currentStep ? '✓' : step}
            </div>

            {/* Connection Line */}
            {index < steps.length - 1 && (
              <div
                style={{
                  width: '24px',
                  height: '2px',
                  marginLeft: '8px',
                  backgroundColor:
                    step < currentStep ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)',
                  transition: 'background-color 0.2s ease-in-out',
                }}
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
