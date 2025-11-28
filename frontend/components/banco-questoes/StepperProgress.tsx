'use client';

import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface StepperProgressProps {
  currentStep: 'geral' | 'assuntos' | 'anos' | 'instituicoes';
}

const steps = [
  { id: 'geral', label: 'Geral', description: 'Nome e pasta', order: 1 },
  { id: 'assuntos', label: 'Assuntos', description: 'Filtros e temas', order: 2 },
  { id: 'anos', label: 'Anos', description: 'Período das provas', order: 3 },
  { id: 'instituicoes', label: 'Instituições', description: 'Bancas e locais', order: 4 },
];

export default function StepperProgress({ currentStep }: StepperProgressProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  const handleStepClick = (stepId: string) => {
    // Permite navegar livremente entre todos os steps
    router.push(`/banco-questoes/criar/${stepId}`);
  };

  // Mobile + Tablet: Indicador compacto com dots
  if (isMobile) {
    return (
      <div className="w-full mb-6">
        {/* Current Step Info */}
        <div className="text-center mb-4">
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
            Passo {currentIndex + 1} de {steps.length}
          </div>
          <div className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            {steps[currentIndex].label}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {steps[currentIndex].description}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                className={`
                  h-2 rounded-full transition-all duration-300
                  ${isCurrent ? 'w-8 bg-primary' : 'w-2'}
                  ${isCompleted ? 'bg-green-500' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-300 dark:bg-gray-600' : ''}
                `}
                aria-label={`Ir para ${step.label}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop: Stepper original
  return (
    <div className="w-full mb-8 relative z-10">
      <div className="flex items-center relative">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div
              key={step.id}
              className="relative flex-1 first:flex-none first:w-auto"
              style={{ 
                zIndex: steps.length - index,
                marginLeft: index === 0 ? '0' : '-24px'
              }}
            >
              {/* Chevron Step Button */}
              <button
                onClick={() => handleStepClick(step.id)}
                className={`
                  relative w-full h-24 flex items-center justify-center gap-5 px-10
                  transition-all duration-300 ease-in-out cursor-pointer
                  ${isCompleted ? 'bg-surface-light dark:bg-surface-dark shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl hover:-translate-y-0.5' : ''}
                  ${isCurrent ? 'bg-primary shadow-2xl shadow-primary/30 dark:shadow-primary/20 scale-[1.02]' : ''}
                  ${isUpcoming ? 'bg-gray-300/90 dark:bg-gray-700/90 shadow-md dark:shadow-dark-md hover:shadow-lg dark:hover:shadow-dark-lg hover:-translate-y-0.5' : ''}
                  ${index === 0 ? 'rounded-l-xl pl-8' : ''}
                  ${index === steps.length - 1 ? 'rounded-r-xl pr-10' : ''}
                `}
                style={{
                  clipPath: index === steps.length - 1
                    ? index === 0
                      ? 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)'
                      : 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 24px 50%)'
                    : index === 0
                    ? 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)'
                    : 'polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 24px 50%)',
                }}
              >
                {/* Icon Circle */}
                <div className={`
                  flex items-center justify-center w-14 h-14 rounded-full flex-shrink-0
                  transition-all duration-300
                  ${isCompleted ? 'bg-green-500 shadow-lg shadow-green-500/30' : ''}
                  ${isCurrent ? 'bg-white shadow-xl shadow-white/30 scale-110' : ''}
                  ${isUpcoming ? 'bg-gray-400 dark:bg-gray-500 shadow-md' : ''}
                `}>
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-3xl font-bold text-white">check</span>
                  ) : (
                    <span className={`
                      font-bold text-2xl
                      ${isCurrent ? 'text-primary' : 'text-white dark:text-gray-300'}
                    `}>
                      {step.order}
                    </span>
                  )}
                </div>

                {/* Text Content */}
                <div className="flex-1 text-center min-w-0">
                  <div className={`
                    font-bold text-lg leading-tight mb-1.5
                    ${isCurrent ? 'text-white' : ''}
                    ${isCompleted ? 'text-text-light-primary dark:text-text-dark-primary' : ''}
                    ${isUpcoming ? 'text-gray-700 dark:text-gray-300' : ''}
                  `}>
                    {step.label}
                  </div>
                  <div className={`
                    text-sm leading-tight
                    ${isCurrent ? 'text-white/90' : ''}
                    ${isCompleted ? 'text-text-light-secondary dark:text-text-dark-secondary' : ''}
                    ${isUpcoming ? 'text-gray-600 dark:text-gray-400' : ''}
                  `}>
                    {step.description}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
