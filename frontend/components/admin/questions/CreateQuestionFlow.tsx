'use client';

import React from 'react';
import { NewQuestionProvider } from '@/lib/contexts/NewQuestionContext';

interface CreateQuestionFlowProps {
  children: React.ReactNode;
}

const CreateQuestionFlow: React.FC<CreateQuestionFlowProps> = ({ children }) => {
  console.log('🔄 CreateQuestionFlow - Componente montado');
  
  return (
    <NewQuestionProvider>
      {children}
    </NewQuestionProvider>
  );
};

export default CreateQuestionFlow;
