'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  progress: number;
  lastActivity: string;
  mentorshipDays: number;
}

export default function MentorMenteesOverview() {
  const router = useRouter();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Buscar mentorados reais da API
    setMentees([]);
    setIsLoading(false);
  }, []);

  const getStatusBadge = (status: Mentee['status']) => {
    const styles = {
      active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      inactive: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    };
    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      pending: 'Pendente',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
        border border-border-light dark:border-border-dark
        shadow-lg dark:shadow-dark-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden
      border border-border-light dark:border-border-dark
      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
      transition-all duration-300">
      {/* Header */}
      <div className="p-5 md:p-6 border-b border-border-light dark:border-border-dark
        bg-gradient-to-r from-background-light to-transparent dark:from-background-dark">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
              Mentorados
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
              {mentees.length} aluno{mentees.length !== 1 ? 's' : ''} sob sua mentoria
            </p>
          </div>
          <button
            onClick={() => router.push('/mentor/mentorados')}
            className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 dark:hover:bg-primary/10
              rounded-xl transition-all duration-200 flex items-center gap-1"
          >
            Ver todos
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 md:p-6">
        {mentees.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative p-5 bg-primary/10 rounded-2xl">
                <span className="material-symbols-outlined text-primary text-5xl">
                  group_add
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
              Nenhum mentorado ainda
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-sm mx-auto">
              Comece adicionando alunos à sua lista de mentorados para acompanhar o progresso deles.
            </p>
            <button
              onClick={() => router.push('/mentor/mentorados?action=add')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all duration-200
                shadow-lg hover:shadow-xl shadow-primary/30
                hover:scale-105 active:scale-[0.98]
                flex items-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined">person_add</span>
              Adicionar Mentorado
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {mentees.slice(0, 5).map((mentee) => (
              <div
                key={mentee.id}
                onClick={() => router.push(`/mentor/mentorados/${mentee.id}`)}
                className="flex items-center gap-4 p-4 rounded-xl
                  bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark
                  hover:border-primary/30 hover:shadow-md dark:hover:shadow-dark-lg
                  transition-all duration-200 cursor-pointer group"
              >
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex-shrink-0
                  ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-200">
                  {mentee.avatar ? (
                    <Image src={mentee.avatar} alt={mentee.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-xl">person</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                      {mentee.name}
                    </h4>
                    {getStatusBadge(mentee.status)}
                  </div>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {mentee.mentorshipDays} dias de mentoria
                  </p>
                </div>

                {/* Progress */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                    {mentee.progress}%
                  </p>
                  <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${mentee.progress}%` }}
                    />
                  </div>
                </div>

                {/* Arrow */}
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary
                  group-hover:text-primary group-hover:translate-x-1 transition-all duration-200">
                  chevron_right
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
