'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Simulado {
  id: string;
  name: string;
  description?: string;
  questionsCount: number;
  visibility: 'public' | 'private' | 'selected';
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
  respondentsCount: number;
  averageScore?: number;
}

type TabId = 'all' | 'active' | 'draft' | 'closed';

export default function SimuladosPage() {
  const router = useRouter();
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadSimulados = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // TODO: Implementar chamada real à API
        setSimulados([]);
      } catch (error) {
        console.error('Erro ao carregar simulados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSimulados();
  }, []);

  const filteredSimulados = useMemo(() => {
    let result = [...simulados];

    if (activeTab !== 'all') {
      result = result.filter(s => s.status === activeTab);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [simulados, activeTab, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: simulados.length,
    active: simulados.filter(s => s.status === 'active').length,
    draft: simulados.filter(s => s.status === 'draft').length,
    closed: simulados.filter(s => s.status === 'closed').length,
  }), [simulados]);

  const getStatusBadge = (status: Simulado['status']) => {
    const styles = {
      active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      draft: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      closed: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    };
    const labels = { active: 'Ativo', draft: 'Rascunho', closed: 'Encerrado' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getVisibilityIcon = (visibility: Simulado['visibility']) => {
    const icons = { public: 'public', private: 'lock', selected: 'group' };
    const labels = { public: 'Público', private: 'Privado', selected: 'Selecionados' };
    return (
      <span className="flex items-center gap-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">
        <span className="material-symbols-outlined text-sm">{icons[visibility]}</span>
        {labels[visibility]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Simulados', icon: 'quiz', href: '/mentor/simulados' },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
            Simulados
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Crie e gerencie simulados personalizados para seus mentorados
          </p>
        </div>
        <button
          onClick={() => router.push('/mentor/simulados/criar')}
          className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold
            hover:bg-primary/90 transition-all duration-200
            shadow-lg hover:shadow-xl shadow-primary/30
            hover:scale-105 active:scale-[0.98]
            flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Criar Simulado
        </button>
      </div>

      {/* Tabs e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <TabGroup
          tabs={[
            { id: 'all', label: `Todos (${statusCounts.all})`, icon: 'list' },
            { id: 'active', label: `Ativos (${statusCounts.active})`, icon: 'play_circle' },
            { id: 'draft', label: `Rascunhos (${statusCounts.draft})`, icon: 'edit_note' },
            { id: 'closed', label: `Encerrados (${statusCounts.closed})`, icon: 'check_circle' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
        />

        <div className="relative lg:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
            text-text-light-secondary dark:text-text-dark-secondary text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar simulado..."
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
      </div>

      {/* Lista de Simulados */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
              border border-border-light dark:border-border-dark animate-pulse">
              <div className="space-y-3">
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredSimulados.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-12
          border border-border-light dark:border-border-dark text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-cyan-500/20 rounded-2xl blur-xl" />
            <div className="relative p-5 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl">
              <span className="material-symbols-outlined text-cyan-600 dark:text-cyan-400 text-5xl">
                {searchQuery ? 'search_off' : 'quiz'}
              </span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum simulado criado'}
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md mx-auto">
            {searchQuery 
              ? 'Tente buscar por outro termo'
              : 'Crie simulados personalizados para avaliar o conhecimento dos seus mentorados.'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push('/mentor/simulados/criar')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all duration-200
                shadow-lg hover:shadow-xl shadow-primary/30
                hover:scale-105 active:scale-[0.98]
                inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Criar Primeiro Simulado
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSimulados.map((simulado) => (
            <div
              key={simulado.id}
              onClick={() => router.push(`/mentor/simulados/${simulado.id}`)}
              className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
                border border-border-light dark:border-border-dark
                hover:border-primary/30 hover:shadow-lg dark:hover:shadow-dark-lg
                transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary
                    group-hover:text-primary transition-colors truncate">
                    {simulado.name}
                  </h3>
                  {simulado.description && (
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 line-clamp-2">
                      {simulado.description}
                    </p>
                  )}
                </div>
                <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary
                  group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 ml-2">
                  chevron_right
                </span>
              </div>

              <div className="flex items-center gap-2 mb-4">
                {getStatusBadge(simulado.status)}
                {getVisibilityIcon(simulado.visibility)}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-text-light-secondary dark:text-text-dark-secondary">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">help</span>
                    {simulado.questionsCount} questões
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">group</span>
                    {simulado.respondentsCount} respostas
                  </span>
                </div>
                {simulado.averageScore !== undefined && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {simulado.averageScore.toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Criado {formatDistanceToNow(new Date(simulado.createdAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
