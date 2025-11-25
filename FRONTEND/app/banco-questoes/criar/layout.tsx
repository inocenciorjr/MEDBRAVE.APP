'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Stepper, { Step } from '@/components/banco-questoes/Stepper';
import { CreateListProvider } from './CreateListContext';

interface CriarListaLayoutProps {
  children: ReactNode;
}

const stepConfig = [
  { id: 'geral', label: 'Geral', order: 1 },
  { id: 'assuntos', label: 'Assuntos', order: 2 },
  { id: 'anos', label: 'Anos', order: 3 },
  { id: 'instituicoes', label: 'Instituições', order: 4 },
];

export default function CriarListaLayout({ children }: CriarListaLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentStepId = useMemo(() => {
    const match = pathname.match(/\/criar\/([^/]+)/);
    return match ? match[1] : 'geral';
  }, [pathname]);

  const steps: Step[] = useMemo(() => {
    const currentIndex = stepConfig.findIndex((s) => s.id === currentStepId);
    
    return stepConfig.map((step, index) => ({
      ...step,
      status: 
        index < currentIndex ? 'completed' :
        index === currentIndex ? 'current' :
        'upcoming',
    }));
  }, [currentStepId]);

  const handleStepClick = (stepId: string) => {
    router.push(`/banco-questoes/criar/${stepId}`);
  };

  return (
    <CreateListProvider>
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </div>
    </CreateListProvider>
  );
}
