'use client';

import { Simulado } from '@/types';

interface SimuladoCardProps {
  simulado: Simulado;
}

const themeColors = {
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-900/50',
    progressBg: 'bg-violet-200 dark:bg-violet-800',
    progressBar: 'bg-primary',
    border: 'border-violet-50 dark:border-violet-900/50',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/50',
    progressBg: 'bg-indigo-200 dark:bg-indigo-800',
    progressBar: 'bg-indigo-500',
    border: 'border-indigo-50 dark:border-indigo-900/50',
  },
  fuchsia: {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/50',
    progressBg: 'bg-fuchsia-200 dark:bg-fuchsia-800',
    progressBar: 'bg-fuchsia-500',
    border: 'border-fuchsia-50 dark:border-fuchsia-900/50',
  },
};

export default function SimuladoCard({ simulado }: SimuladoCardProps) {
  const colors = themeColors[simulado.theme];
  const iconColor = simulado.theme === 'violet' ? 'text-primary' : `text-${simulado.theme}-500`;

  return (
    <div
      className={`${colors.bg} p-4 rounded-lg shadow-xl dark:shadow-dark-xl hover:shadow-2xl dark:hover:shadow-dark-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary">
            {simulado.title}
          </h3>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {simulado.startDate} - {simulado.endDate}
          </p>
        </div>
        <button className="text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      {/* Tags */}
      <div className="flex gap-2 mb-4">
        {simulado.tags.map((tag) => (
          <span
            key={tag.id}
            className={`text-xs font-medium ${tag.color} px-2 py-1 rounded-full`}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Participants */}
      <div className="flex justify-between items-end text-sm mb-2">
        <div className="text-text-light-secondary dark:text-text-dark-secondary">
          Participantes:
        </div>
        <div className="flex -space-x-2">
          {simulado.participants.slice(0, 2).map((participant) => (
            <img
              key={participant.id}
              src={participant.avatar}
              alt={participant.name}
              className={`w-6 h-6 rounded-full border-2 ${colors.border}`}
            />
          ))}
          {simulado.totalParticipants > 2 && (
            <div
              className={`w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-text-light-primary dark:text-text-dark-primary border-2 ${colors.border}`}
            >
              +{simulado.totalParticipants - 2}
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex justify-between items-center text-sm mb-2">
        <div className="text-text-light-secondary dark:text-text-dark-secondary">
          Progresso:
        </div>
        <div className="font-bold text-text-light-primary dark:text-text-dark-primary">
          {simulado.progress}%
        </div>
      </div>
      <div className={`w-full ${colors.progressBg} rounded-full h-1.5 mb-4`}>
        <div
          className={`${colors.progressBar} h-1.5 rounded-full transition-all duration-500`}
          style={{ width: `${simulado.progress}%` }}
        ></div>
      </div>

      {/* Footer */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
          <span className={`material-symbols-outlined text-base ${iconColor}`}>
            folder
          </span>
          Arquivos: <span>{simulado.filesCount}</span>
        </div>
        <div className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
          <span className={`material-symbols-outlined text-base ${iconColor}`}>
            task_alt
          </span>
          Questões: <span>{simulado.questionsCount}</span>
        </div>
      </div>
    </div>
  );
}
