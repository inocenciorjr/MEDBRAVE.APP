import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { NewQuestionProvider } from './NewQuestionContext';
import CreateQuestionPage from './CreateQuestionPage';
import QuestionFiltersStep from './QuestionFiltersStep';

const NewQuestionFlow: React.FC = () => {
  console.log('🔄 NewQuestionFlow - Componente montado');
  
  return (
    <NewQuestionProvider>
      <Routes>
        <Route path="create" element={<CreateQuestionPage />} />
        <Route path="filters" element={<QuestionFiltersStep />} />
      </Routes>
    </NewQuestionProvider>
  );
};

export default NewQuestionFlow; 