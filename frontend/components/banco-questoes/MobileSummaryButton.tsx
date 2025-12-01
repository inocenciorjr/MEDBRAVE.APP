'use client';

import { useState } from 'react';
import SummaryPanel from './SummaryPanel';
import { Subject, Institution } from '@/types/banco-questoes';

interface MobileSummaryButtonProps {
  data: {
    listName: string;
    selectedSubjects: Subject[];
    selectedYears: number[];
    selectedInstitutions: Institution[];
    selectedExamTypes?: string[];
    totalQuestions: number;
  };
  onEditStep: (step: string) => void;
  onRemoveSubject?: (subjectId: string) => void;
  onRemoveYear?: (year: number) => void;
  onRemoveInstitution?: (institutionId: string) => void;
  onClearFilters?: () => void;
  onPreviewQuestions?: () => void;
  onUpdateListName?: (name: string) => void;
}

export default function MobileSummaryButton({
  data,
  onEditStep,
  onRemoveSubject,
  onRemoveYear,
  onRemoveInstitution,
  onClearFilters,
  onPreviewQuestions,
  onUpdateListName,
}: MobileSummaryButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setShowModal(true)}
        className="xl:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-2xl hover:scale-105 transition-transform"
      >
        <span className="material-symbols-outlined">summarize</span>
        <span className="font-semibold">Resumo</span>
        {data.totalQuestions > 0 && (
          <span className="px-2 py-0.5 bg-white text-primary rounded-full text-xs font-bold">
            {data.totalQuestions}
          </span>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full bg-surface-light dark:bg-surface-dark rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
            {/* Header Fixo */}
            <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Resumo da Lista
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                  close
                </span>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4">
              <SummaryPanel
                data={data}
                onEditStep={(stepId) => {
                  setShowModal(false);
                  onEditStep(stepId);
                }}
                onRemoveSubject={onRemoveSubject}
                onRemoveYear={onRemoveYear}
                onRemoveInstitution={onRemoveInstitution}
                onClearFilters={onClearFilters}
                onPreviewQuestions={onPreviewQuestions}
                onUpdateListName={onUpdateListName}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
