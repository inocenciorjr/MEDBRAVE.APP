'use client';

export interface Step {
  id: string;
  label: string;
  order: number;
  status: 'completed' | 'current' | 'upcoming';
}

interface StepperProps {
  steps: Step[];
  currentStep: string;
  onStepClick?: (stepId: string) => void;
}

export default function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div>
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center relative">
              <button
                onClick={() => onStepClick?.(step.id)}
                disabled={!onStepClick}
                className={`relative flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm z-10 transition-all duration-300 ${
                  step.status === 'completed' || step.status === 'current'
                    ? 'bg-primary text-white shadow-xl shadow-primary/40'
                    : 'bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary shadow-lg'
                } ${onStepClick ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
              >
                {step.status === 'completed' ? (
                  <span className="material-symbols-outlined text-xl">check</span>
                ) : (
                  <span>{step.order}</span>
                )}
              </button>
              <span
                className={`mt-2 font-semibold text-sm sm:text-base transition-all duration-300 ${
                  step.status === 'current'
                    ? 'text-primary dark:text-white'
                    : step.status === 'completed'
                    ? 'text-text-light-primary dark:text-text-dark-primary'
                    : 'text-text-light-secondary dark:text-text-dark-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-auto h-1 -mx-1 transition-all duration-300 ${
                  step.status === 'completed'
                    ? 'bg-primary'
                    : 'bg-gray-300 dark:bg-border-dark'
                }`}
                style={{
                  boxShadow: step.status === 'completed' 
                    ? 'inset 0 2px 4px rgba(0,0,0,0.25)' 
                    : 'inset 0 2px 4px rgba(0,0,0,0.2)',
                }}
              ></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
