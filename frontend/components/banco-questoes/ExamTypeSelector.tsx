'use client';

import { useEffect, useState } from 'react';

interface ExamType {
  id: string;
  name: string;
}

interface ExamTypeSelectorProps {
  selectedExamTypes: string[];
  onToggleExamType: (examTypeId: string) => void;
}

const EXAM_TYPES: ExamType[] = [
  { id: 'Revalida', name: 'Revalida' },
  { id: 'Provas Irmãs ( Revalida)', name: 'Provas Irmãs (Revalida)' },
  { id: 'R3', name: 'R3' },
  { id: 'Residência Médica', name: 'Residência Médica' },
];

export default function ExamTypeSelector({
  selectedExamTypes,
  onToggleExamType,
}: ExamTypeSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        Tipo de Prova (opcional)
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {EXAM_TYPES.map((examType) => {
          const isSelected = mounted && selectedExamTypes.includes(examType.id);

          return (
            <button
              key={examType.id}
              onClick={() => onToggleExamType(examType.id)}
              className={`
                p-4 rounded-xl font-semibold text-sm
                transition-all duration-200
                border-2
                shadow-lg dark:shadow-dark-lg
                ${isSelected
                  ? 'bg-primary text-white border-primary shadow-xl shadow-primary/40 dark:shadow-primary/30 scale-105'
                  : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary border-border-light dark:border-border-dark hover:border-primary/50 hover:shadow-xl dark:hover:shadow-dark-xl'
                }
                hover:scale-105 hover:-translate-y-0.5
              `}
            >
              <span className="text-center leading-tight">
                {examType.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
