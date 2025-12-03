'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { mentorProgramService, MentorProgram } from '@/lib/services/mentorProgramService';
import { Plus } from 'lucide-react';
import { CreateProgramModal } from '@/components/mentor/mentorias';
import { ProgramGrid, ProgramGridSkeleton } from '@/components/mentor/mentorias/ProgramGrid';

type TabId = 'all' | 'draft' | 'pending' | 'active' | 'closed';

export default function ProgramasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [programs, setPrograms] = useState<MentorProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mentorProgramService.getMyPrograms();
      setPrograms(data);
    } catch (err: any) {
      console.error('Erro ao carregar programas:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPrograms = programs.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'draft') return p.status === 'draft';
    if (activeTab === 'pending') return p.status === 'pending_approval';
    if (activeTab === 'active') return ['approved', 'active'].includes(p.status);
    if (activeTab === 'closed') return ['closed', 'rejected'].includes(p.status);
    return true;
  });

  const statusCounts = {
    all: programs.length,
    draft: programs.filter(p => p.status === 'draft').length,
    pending: programs.filter(p => p.status === 'pending_approval').length,
    active: programs.filter(p => ['approved', 'active'].includes(p.status)).length,
    closed: programs.filter(p => ['closed', 'rejected'].includes(p.status)).length,
  };


  const handleAction = async (programId: string, action: 'submit' | 'activate' | 'close' | 'delete') => {
    try {
      switch (action) {
        case 'submit':
          await mentorProgramService.submitForApproval(programId);
          break;
        case 'activate':
          await mentorProgramService.activateProgram(programId);
          break;
        case 'close':
          await mentorProgramService.closeProgram(programId);
          break;
        case 'delete':
          if (confirm('Tem certeza que deseja excluir este programa?')) {
            await mentorProgramService.deleteProgram(programId);
          } else return;
          break;
      }
      loadPrograms();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Mentorias', icon: 'folder_special', href: '/mentor/mentorias' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Minhas Mentorias
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Crie e gerencie suas mentorias (Intensivão, Extensivo, etc.)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão Modal (para comparação) */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 border-2 border-primary text-primary rounded-xl font-semibold
              hover:bg-primary/5 transition-all duration-200
              flex items-center gap-2"
            title="Abrir modal (para comparação)"
          >
            <span className="material-symbols-outlined text-xl">open_in_new</span>
            Modal
          </button>
          
          {/* Botão Página (principal) */}
          <button
            onClick={() => router.push('/mentor/mentorias/novo')}
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold
              hover:bg-primary/90 transition-all duration-200
              shadow-lg hover:shadow-xl shadow-primary/30
              hover:scale-105 active:scale-[0.98]
              flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar Mentoria
          </button>
        </div>
      </div>


      {/* Tabs */}
      <TabGroup
        tabs={[
          { id: 'all', label: `Todos (${statusCounts.all})`, icon: 'folder' },
          { id: 'draft', label: `Rascunhos (${statusCounts.draft})`, icon: 'edit_note' },
          { id: 'pending', label: `Pendentes (${statusCounts.pending})`, icon: 'pending' },
          { id: 'active', label: `Ativos (${statusCounts.active})`, icon: 'check_circle' },
          { id: 'closed', label: `Encerrados (${statusCounts.closed})`, icon: 'cancel' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

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
      ) : (
        <ProgramGrid
          programs={filteredPrograms}
          onAction={handleAction}
          showActions={true}
          variant="mentor"
          itemsPerPage={6}
          emptyState={
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
              border border-border-light dark:border-border-dark text-center">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <div className="relative p-5 bg-primary/10 rounded-2xl">
                  <span className="material-symbols-outlined text-primary text-5xl">folder_special</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                {activeTab === 'all' ? 'Nenhuma mentoria criada' : 'Nenhuma mentoria nesta categoria'}
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md mx-auto">
                Crie mentorias para organizar seus alunos por turma ou tipo de preparação.
              </p>
              {activeTab === 'all' && (
                <button
                  onClick={() => router.push('/mentor/mentorias/novo')}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
                    hover:bg-primary/90 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Criar Primeira Mentoria
                </button>
              )}
            </div>
          }
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateProgramModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadPrograms();
          }}
        />
      )}
    </div>
  );
}
