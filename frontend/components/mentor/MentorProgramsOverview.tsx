'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mentorProgramService, MentorProgram } from '@/lib/services/mentorProgramService';
import { Plus } from 'lucide-react';
import { ProgramCard } from './mentorias/ProgramCard';

export default function MentorProgramsOverview() {
  const router = useRouter();
  const [programs, setPrograms] = useState<MentorProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const data = await mentorProgramService.getMyPrograms();
      setPrograms(data);
    } catch (error) {
      console.error('Erro ao carregar programas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
        border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[420px] bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activePrograms = programs.filter(p => ['active', 'approved'].includes(p.status));
  const pendingPrograms = programs.filter(p => p.status === 'pending_approval');

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
              Minhas Mentorias
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
              {activePrograms.length} mentoria{activePrograms.length !== 1 ? 's' : ''} ativa{activePrograms.length !== 1 ? 's' : ''}
              {pendingPrograms.length > 0 && ` • ${pendingPrograms.length} pendente${pendingPrograms.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/mentor/mentorias')}
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
        {programs.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative p-5 bg-primary/10 rounded-2xl">
                <span className="material-symbols-outlined text-primary text-5xl">folder_special</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
              Nenhuma mentoria criada
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-sm mx-auto">
              Crie mentorias (Intensivão, Extensivo, etc.) para organizar seus mentorados.
            </p>
            <button
              onClick={() => router.push('/mentor/mentorias?action=create')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all duration-200
                shadow-lg hover:shadow-xl shadow-primary/30
                hover:scale-105 active:scale-[0.98]
                flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Criar Mentoria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.slice(0, 6).map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                showActions={false}
                variant="mentor"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
