'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { mentorProgramService, MentorProgram } from '@/lib/services/mentorProgramService';
import { ProgramGridSkeleton } from '@/components/mentor/mentorias';
import { Users, Plus, FolderOpen } from 'lucide-react';

/**
 * Página de Mentorados - Mostra os programas de mentoria
 * O mentor deve acessar um programa para ver/adicionar mentorados
 */
export default function MentoradosPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<MentorProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mentorProgramService.getMyPrograms();
      // Filtrar apenas programas ativos ou aprovados (onde pode ter mentorados)
      const activePrograms = data.filter(p => ['active', 'approved'].includes(p.status));
      setPrograms(activePrograms);
    } catch (err: any) {
      console.error('Erro ao carregar programas:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Contagem total de mentorados em todos os programas
  const totalMentees = programs.reduce((acc, p) => acc + (p.activeParticipantsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Mentorados', icon: 'groups', href: '/mentor/mentorados' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Mentorados
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Selecione um programa para gerenciar os mentorados
          </p>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold text-primary">{totalMentees} mentorados</span>
          </div>
          <button
            onClick={() => router.push('/mentor/mentorias')}
            className="px-4 py-2 border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary font-medium
              hover:bg-surface-light dark:hover:bg-surface-dark transition-colors
              flex items-center gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Ver Todos Programas
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <ProgramGridSkeleton count={6} />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button onClick={loadPrograms} className="mt-4 text-primary hover:underline">
            Tentar novamente
          </button>
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
          border border-border-light dark:border-border-dark text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
            <div className="relative p-5 bg-primary/10 rounded-2xl">
              <span className="material-symbols-outlined text-primary text-5xl">folder_special</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            Nenhum programa ativo
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md mx-auto">
            Você precisa ter um programa de mentoria ativo para adicionar mentorados.
            Crie um programa e aguarde a aprovação do admin.
          </p>
          <button
            onClick={() => router.push('/mentor/mentorias')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
              hover:bg-primary/90 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar Programa
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Clique em um programa para ver e gerenciar os mentorados desse programa.
              Você só pode adicionar mentorados dentro de um programa ativo.
            </p>
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => (
              <div
                key={program.id}
                onClick={() => router.push(`/mentor/mentorias/${program.id}?tab=mentees`)}
                className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden
                  border border-border-light dark:border-border-dark
                  hover:border-primary/40 hover:shadow-xl dark:hover:shadow-dark-xl
                  transition-all duration-300 cursor-pointer group"
              >
                {/* Cover */}
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                  {program.coverImageUrl ? (
                    <img 
                      src={program.coverImageUrl} 
                      alt={program.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-primary/30">school</span>
                    </div>
                  )}
                  
                  {/* Badge de mentorados */}
                  <div className="absolute bottom-3 right-3">
                    <span className="px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
                      rounded-full text-sm font-semibold text-text-light-primary dark:text-text-dark-primary
                      flex items-center gap-1.5 shadow-lg">
                      <Users className="w-4 h-4 text-primary" />
                      {program.activeParticipantsCount} mentorados
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-text-light-primary dark:text-text-dark-primary
                    group-hover:text-primary transition-colors mb-2 line-clamp-1">
                    {program.title}
                  </h3>
                  
                  {program.description && (
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary
                      line-clamp-2 mb-4">
                      {program.description}
                    </p>
                  )}

                  <button className="w-full py-2.5 bg-primary/10 text-primary rounded-xl
                    font-semibold text-sm hover:bg-primary/20 transition-colors
                    flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">groups</span>
                    Gerenciar Mentorados
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
