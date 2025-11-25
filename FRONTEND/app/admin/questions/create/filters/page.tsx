'use client';

import React from 'react';
import CreateQuestionFlow from '@/components/admin/questions/CreateQuestionFlow';
import { QuestionFiltersStep } from '@/components/admin/questions/QuestionFiltersStep';

export default function QuestionFiltersPage() {
  return (
    <CreateQuestionFlow>
      <QuestionFiltersStep />
    </CreateQuestionFlow>
  );
}
