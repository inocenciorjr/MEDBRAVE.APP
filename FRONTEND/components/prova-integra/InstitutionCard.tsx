'use client';

import { useState } from 'react';
import { ExamInstitution, OfficialExam } from '@/types/official-exams';
import ExamCard from './ExamCard';

interface InstitutionCardProps {
  institution: ExamInstitution;
  onMenuClick: (exam: OfficialExam, buttonElement: HTMLButtonElement) => void;
  openMenuExamId: string | null;
}

interface GroupedExams {
  [key: string]: OfficialExam[];
}

export default function InstitutionCard({ 
  institution,
  onMenuClick,
  openMenuExamId
}: InstitutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Agrupa provas por tipo (examTypeFilterId)
  const groupedExams: GroupedExams = institution.exams.reduce((acc, exam) => {
    const type = exam.examTypeFilterId || 'Outros';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(exam);
    return acc;
  }, {} as GroupedExams);

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl 
                    shadow-xl dark:shadow-dark-xl hover:shadow-2xl dark:hover:shadow-dark-2xl 
                    border border-border-light dark:border-border-dark 
                    hover:scale-[1.01] transition-all duration-300 overflow-hidden">
      {/* Header - Toda área clicável */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex justify-between items-center hover:bg-background-light/50 dark:hover:bg-surface-dark/50 
                   transition-all duration-200 text-left group"
      >
        <div className="flex items-center gap-4">
          {/* Info */}
          <div>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider font-medium">
              Instituição
            </p>
            <p className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary 
                          group-hover:text-primary transition-colors duration-200">
              {institution.name}
            </p>
          </div>
        </div>

        {/* Arrow Icon */}
        <div className="flex items-center gap-4">
          <div className={`
            p-2.5 rounded-lg bg-background-light dark:bg-background-dark 
            shadow-md group-hover:shadow-lg
            transition-all duration-300
            ${isExpanded ? 'rotate-180 bg-primary/10 shadow-primary/20' : 'group-hover:bg-primary/5'}
          `}>
            <span className={`material-symbols-outlined transition-colors duration-200
                            ${isExpanded ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary'}`}>
              expand_more
            </span>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={`
          grid transition-all duration-500 ease-in-out
          ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
        `}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3">
            {/* Divider */}
            <div className="border-t border-border-light dark:border-border-dark" />

            {/* Grouped by Exam Type */}
            {Object.entries(groupedExams).map(([type, exams]) => (
            <div
              key={type}
              className="bg-background-light dark:bg-background-dark rounded-lg overflow-hidden
                         border border-border-light dark:border-border-dark
                         shadow-md hover:shadow-lg dark:shadow-dark-md dark:hover:shadow-dark-lg
                         hover:scale-[1.005] transition-all duration-300"
            >
              {/* Type Header - Toda área clicável */}
              <button
                onClick={() => toggleType(type)}
                className="w-full p-4 flex justify-between items-center hover:bg-surface-light/50 dark:hover:bg-surface-dark/50 
                           transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-base text-text-light-primary dark:text-text-dark-primary
                                  group-hover:text-primary transition-colors duration-200">
                      {type}
                    </p>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary font-medium">
                      {exams.length} {exams.length === 1 ? 'prova' : 'provas'}
                    </p>
                  </div>
                </div>

                <div className={`
                  p-2 rounded-md bg-surface-light dark:bg-surface-dark
                  shadow-sm group-hover:shadow-md
                  transition-all duration-300
                  ${expandedTypes.has(type) ? 'rotate-180 bg-primary/10 shadow-primary/20' : 'group-hover:bg-primary/5'}
                `}>
                  <span className={`material-symbols-outlined text-sm transition-colors duration-200
                                  ${expandedTypes.has(type) ? 'text-primary' : 'text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary'}`}>
                    expand_more
                  </span>
                </div>
              </button>

              {/* Exams List */}
              <div
                className={`
                  grid transition-all duration-500 ease-in-out
                  ${expandedTypes.has(type) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                `}
              >
                <div className="overflow-hidden">
                  <div className="p-4 bg-background-light dark:bg-background-dark">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {exams.map((exam) => (
                        <ExamCard 
                          key={exam.id} 
                          exam={exam}
                          onMenuClick={onMenuClick}
                          isMenuOpen={openMenuExamId === exam.id}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
