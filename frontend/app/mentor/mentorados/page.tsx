'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import AddMenteeModal from '@/components/mentor/mentorados/AddMenteeModal';
import MenteeDetailsModal from '@/components/mentor/mentorados/MenteeDetailsModal';
import BatchActionsBar from '@/components/mentor/mentorados/BatchActionsBar';

interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending';
  progress: number;
  lastActivity: string;
  mentorshipDays: number;
  mentorshipEndDate?: string;
  questionsAnswered: number;
  accuracy: number;
}

type TabId = 'all' | 'active' | 'inactive' | 'pending';

export default function MentoradosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedMentees, setSelectedMentees] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState<Mentee | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'lastActivity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Abrir modal se action=add na URL
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowAddModal(true);
    }
  }, [searchParams]);

  // Carregar mentorados
  useEffect(() => {
    const loadMentees = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // TODO: Implementar chamada real à API
        // const response = await fetch('/api/mentorship/mentees', {
        //   headers: { Authorization: `Bearer ${session.access_token}` }
        // });
        
        setMentees([]);
      } catch (error) {
        console.error('Erro ao carregar mentorados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMentees();
  }, []);

  // Filtrar e ordenar mentorados
  const filteredMentees = useMemo(() => {
    let result = [...mentees];

    // Filtrar por tab
    if (activeTab !== 'all') {
      result = result.filter(m => m.status === activeTab);
    }

    // Filtrar por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
      );
    }

    // Ordenar
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
        case 'lastActivity':
          comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [mentees, activeTab, searchQuery, sortBy, sortOrder]);

  // Contadores por status
  const statusCounts = useMemo(() => ({
    all: mentees.length,
    active: mentees.filter(m => m.status === 'active').length,
    inactive: mentees.filter(m => m.status === 'inactive').length,
    pending: mentees.filter(m => m.status === 'pending').length,
  }), [mentees]);

  // Toggle seleção
  const toggleSelect = useCallback((id: string) => {
    setSelectedMentees(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Selecionar todos
  const selectAll = useCallback(() => {
    if (selectedMentees.size === filteredMentees.length) {
      setSelectedMentees(new Set());
    } else {
      setSelectedMentees(new Set(filteredMentees.map(m => m.id)));
    }
  }, [filteredMentees, selectedMentees.size]);

  const getStatusBadge = (status: Mentee['status']) => {
    const styles = {
      active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
      inactive: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-500/20',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-amber-500/20',
    };
    const labels = { active: 'Ativo', inactive: 'Inativo', pending: 'Pendente' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

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
            Gerencie seus alunos e acompanhe o progresso de cada um
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold
            hover:bg-primary/90 transition-all duration-200
            shadow-lg hover:shadow-xl shadow-primary/30
            hover:scale-105 active:scale-[0.98]
            flex items-center gap-2"
        >
          <span className="material-symbols-outlined">person_add</span>
          Adicionar Mentorado
        </button>
      </div>

      {/* Tabs e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <TabGroup
          tabs={[
            { id: 'all', label: `Todos (${statusCounts.all})`, icon: 'groups' },
            { id: 'active', label: `Ativos (${statusCounts.active})`, icon: 'check_circle' },
            { id: 'inactive', label: `Inativos (${statusCounts.inactive})`, icon: 'cancel' },
            { id: 'pending', label: `Pendentes (${statusCounts.pending})`, icon: 'pending' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />

        <div className="flex items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1 lg:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
              text-text-light-secondary dark:text-text-dark-secondary text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar mentorado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-light dark:bg-surface-dark
                border border-border-light dark:border-border-dark rounded-xl
                text-text-light-primary dark:text-text-dark-primary
                placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                transition-all duration-200"
            />
          </div>

          {/* Ordenação */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(by);
              setSortOrder(order);
            }}
            className="px-4 py-2.5 bg-surface-light dark:bg-surface-dark
              border border-border-light dark:border-border-dark rounded-xl
              text-text-light-primary dark:text-text-dark-primary
              focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
              transition-all duration-200 cursor-pointer"
          >
            <option value="name-asc">Nome A-Z</option>
            <option value="name-desc">Nome Z-A</option>
            <option value="progress-desc">Maior progresso</option>
            <option value="progress-asc">Menor progresso</option>
            <option value="lastActivity-desc">Mais recente</option>
            <option value="lastActivity-asc">Mais antigo</option>
          </select>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedMentees.size > 0 && (
        <BatchActionsBar
          selectedCount={selectedMentees.size}
          onClearSelection={() => setSelectedMentees(new Set())}
          onRemove={() => {/* TODO */}}
          onExtendTime={() => {/* TODO */}}
          onSendMessage={() => {/* TODO */}}
        />
      )}

      {/* Lista de Mentorados */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
              border border-border-light dark:border-border-dark animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMentees.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
          border border-border-light dark:border-border-dark text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
            <div className="relative p-5 bg-primary/10 rounded-2xl">
              <span className="material-symbols-outlined text-primary text-5xl">
                {searchQuery ? 'search_off' : 'group_add'}
              </span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum mentorado ainda'}
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md mx-auto">
            {searchQuery 
              ? 'Tente buscar por outro nome ou email'
              : 'Comece adicionando alunos à sua lista de mentorados para acompanhar o progresso deles.'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all duration-200
                shadow-lg hover:shadow-xl shadow-primary/30
                hover:scale-105 active:scale-[0.98]
                inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">person_add</span>
              Adicionar Mentorado
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-3 px-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary
                hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                {selectedMentees.size === filteredMentees.length ? 'check_box' : 'check_box_outline_blank'}
              </span>
              Selecionar todos
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMentees.map((mentee) => (
              <div
                key={mentee.id}
                className={`bg-surface-light dark:bg-surface-dark rounded-2xl p-5
                  border-2 transition-all duration-200 cursor-pointer group
                  ${selectedMentees.has(mentee.id)
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:shadow-lg dark:hover:shadow-dark-lg'
                  }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(mentee.id); }}
                    className="mt-1 flex-shrink-0"
                  >
                    <span className={`material-symbols-outlined text-xl transition-colors
                      ${selectedMentees.has(mentee.id) ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                      {selectedMentees.has(mentee.id) ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>

                  {/* Avatar */}
                  <div 
                    onClick={() => setSelectedMentee(mentee)}
                    className="relative w-14 h-14 rounded-full overflow-hidden bg-primary/10 flex-shrink-0
                      ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-200"
                  >
                    {mentee.avatar ? (
                      <Image src={mentee.avatar} alt={mentee.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-2xl">person</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => setSelectedMentee(mentee)}>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                        {mentee.name}
                      </h4>
                      {getStatusBadge(mentee.status)}
                    </div>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                      {mentee.email}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">quiz</span>
                        {mentee.questionsAnswered} questões
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">percent</span>
                        {mentee.accuracy}% acerto
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-light-secondary dark:text-text-dark-secondary">Progresso</span>
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                          {mentee.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                          style={{ width: `${mentee.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <AddMenteeModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          router.replace('/mentor/mentorados');
        }}
        onSuccess={() => {
          // Recarregar lista
          setShowAddModal(false);
          router.replace('/mentor/mentorados');
        }}
      />

      {selectedMentee && (
        <MenteeDetailsModal
          mentee={selectedMentee}
          onClose={() => setSelectedMentee(null)}
        />
      )}
    </div>
  );
}
