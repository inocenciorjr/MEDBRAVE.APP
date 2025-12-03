'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { simulatedExamService } from '@/services/simulatedExamService';

interface ListStats {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
}

interface PendingList {
  id: string;
  name: string;
  type: 'list';
  stats: ListStats;
  createdAt?: string;
  createdAtRaw?: number;
}

interface PendingSimulado {
  id: string;
  name: string;
  type: 'simulado';
  status: 'in_progress' | 'not_started';
  resultId?: string;
  totalQuestions: number;
  answeredQuestions?: number;
  correctCount?: number;
  incorrectCount?: number;
  isMentor?: boolean;
  createdAt?: string;
  createdAtRaw?: number;
}

type PendingItem = PendingList | PendingSimulado;

export function PendingItemsSection() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingItem[]>([]);

  const parseDate = (dateValue: unknown): { formatted: string; timestamp: number } => {
    if (!dateValue) return { formatted: '', timestamp: 0 };
    let dateString: string;
    if (typeof dateValue === 'object' && dateValue !== null && 'value' in dateValue) {
      dateString = (dateValue as { value?: string }).value || '';
    } else if (typeof dateValue === 'string') {
      dateString = dateValue;
    } else {
      return { formatted: '', timestamp: 0 };
    }
    if (!dateString) return { formatted: '', timestamp: 0 };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { formatted: '', timestamp: 0 };
    return {
      formatted: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      timestamp: date.getTime(),
    };
  };

  const loadPendingItems = useCallback(async () => {
    try {
      setLoading(true);
      const pendingItems: PendingItem[] = [];

      try {
        const listsResponse = await api.get('/question-lists');
        if (listsResponse.data.success) {
          const lists = listsResponse.data.data || [];
          const listsWithStats = await Promise.all(
            lists.slice(0, 15).map(async (list: Record<string, unknown>) => {
              try {
                const statsResponse = await api.get(`/question-lists/${list.id}/stats`);
                return { ...list, stats: statsResponse.data.data };
              } catch {
                return { ...list, stats: null };
              }
            })
          );

          listsWithStats.forEach((list) => {
            if (list.stats) {
              const stats = list.stats as ListStats;
              const isInProgress = stats.answered > 0 && stats.answered < stats.total;
              const isNotStarted = stats.answered === 0 && stats.total > 0;
              if (isInProgress || isNotStarted) {
                const dateInfo = parseDate(list.created_at);
                pendingItems.push({
                  id: list.id as string,
                  name: list.name as string,
                  type: 'list',
                  stats: {
                    total: stats.total || 0,
                    answered: stats.answered || 0,
                    correct: stats.correct || 0,
                    incorrect: stats.incorrect || 0,
                  },
                  createdAt: dateInfo.formatted,
                  createdAtRaw: dateInfo.timestamp,
                });
              }
            }
          });
        }
      } catch (error) {
        console.error('Erro ao carregar listas:', error);
      }

      try {
        const [simulados, results] = await Promise.all([
          simulatedExamService.getUserSimulatedExams(),
          simulatedExamService.listUserResults(),
        ]);

        // Criar mapa de resultados por exam_id
        const resultsMap = new Map<string, any>();
        results.forEach((result: any) => {
          const existingResult = resultsMap.get(result.simulated_exam_id);
          // Manter o resultado mais recente ou em progresso
          if (!existingResult || result.status === 'in_progress') {
            resultsMap.set(result.simulated_exam_id, result);
          }
        });

        simulados.forEach((sim) => {
          const simAny = sim as any;
          const userResult = resultsMap.get(simAny.id);
          const questionCount = simAny.question_count || simAny.questions?.length || 0;

          const simDateInfo = parseDate(simAny.created_at);
          if (userResult?.status === 'in_progress') {
            pendingItems.push({
              id: simAny.id,
              name: simAny.title || simAny.name,
              type: 'simulado',
              status: 'in_progress',
              resultId: userResult.id,
              totalQuestions: questionCount,
              answeredQuestions: (userResult.correct_count || 0) + (userResult.incorrect_count || 0),
              correctCount: userResult.correct_count || 0,
              incorrectCount: userResult.incorrect_count || 0,
              isMentor: simAny.assigned_by_mentor,
              createdAt: simDateInfo.formatted,
              createdAtRaw: simDateInfo.timestamp,
            });
          } else if (!userResult || userResult?.status === 'abandoned') {
            // Não iniciado ou abandonado
            pendingItems.push({
              id: simAny.id,
              name: simAny.title || simAny.name,
              type: 'simulado',
              status: 'not_started',
              totalQuestions: questionCount,
              isMentor: simAny.assigned_by_mentor,
              createdAt: simDateInfo.formatted,
              createdAtRaw: simDateInfo.timestamp,
            });
          }
          // Simulados com status 'completed' são ignorados (já finalizados)
        });
      } catch (error) {
        console.error('Erro ao carregar simulados:', error);
      }

      // Separar listas e simulados
      const lists = pendingItems.filter(item => item.type === 'list');
      const simulados = pendingItems.filter(item => item.type === 'simulado');

      // Ordenar cada grupo: em progresso primeiro, depois por data mais recente
      const sortItems = (items: PendingItem[]) => {
        return items.sort((a, b) => {
          const aInProgress = a.type === 'list'
            ? (a as PendingList).stats.answered > 0
            : (a as PendingSimulado).status === 'in_progress';
          const bInProgress = b.type === 'list'
            ? (b as PendingList).stats.answered > 0
            : (b as PendingSimulado).status === 'in_progress';
          if (aInProgress && !bInProgress) return -1;
          if (!aInProgress && bInProgress) return 1;

          return (b.createdAtRaw || 0) - (a.createdAtRaw || 0);
        });
      };

      sortItems(lists);
      sortItems(simulados);

      // Pegar até 4 listas e até 4 simulados, totalizando 6
      const maxLists = simulados.length > 0 ? Math.min(4, lists.length) : 6;
      const maxSimulados = lists.length > 0 ? Math.min(4, simulados.length) : 6;
      const selectedLists = lists.slice(0, maxLists);
      const selectedSimulados = simulados.slice(0, maxSimulados);

      // Combinar e ordenar por data mais recente para exibição
      const combined = [...selectedLists, ...selectedSimulados];
      combined.sort((a, b) => {
        return (b.createdAtRaw || 0) - (a.createdAtRaw || 0);
      });

      setItems(combined.slice(0, 6));
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingItems();
    const handleUpdate = () => loadPendingItems();
    window.addEventListener('lists-updated', handleUpdate);
    window.addEventListener('simulados-updated', handleUpdate);
    return () => {
      window.removeEventListener('lists-updated', handleUpdate);
      window.removeEventListener('simulados-updated', handleUpdate);
    };
  }, [loadPendingItems]);

  const handleItemClick = (item: PendingItem) => {
    if (item.type === 'list') {
      router.push(`/resolucao-questoes/${item.id}`);
    } else {
      const simulado = item as PendingSimulado;
      if (simulado.status === 'in_progress' && simulado.resultId) {
        router.push(`/simulados/${item.id}/resolver?resultId=${simulado.resultId}`);
      } else {
        router.push(`/simulados/${item.id}/configurar`);
      }
    }
  };

  const getProgress = (item: PendingItem) => {
    if (item.type === 'list') {
      const list = item as PendingList;
      return list.stats.total > 0 ? Math.round((list.stats.answered / list.stats.total) * 100) : 0;
    }
    const sim = item as PendingSimulado;
    if (sim.status === 'not_started') return 0;
    return sim.totalQuestions > 0 ? Math.round(((sim.answeredQuestions || 0) / sim.totalQuestions) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 w-40 bg-border-light dark:bg-border-dark rounded animate-pulse" />
        {[1, 2].map((i) => (
          <div key={i} className="h-28 bg-border-light dark:bg-border-dark rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <h3 className="font-display font-semibold text-text-light-secondary dark:text-text-dark-secondary mb-3">
          Listas e Simulados
        </h3>
        <div className="text-center py-6 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
          <span className="material-symbols-outlined text-3xl mb-2 block opacity-50 text-text-light-secondary dark:text-text-dark-secondary">
            inbox
          </span>
          <p className="text-sm font-inter text-text-light-secondary dark:text-text-dark-secondary">
            Nenhuma lista ou simulado
          </p>
        </div>
      </div>
    );
  }


  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-text-light-secondary dark:text-text-dark-secondary">
          Listas e Simulados
        </h3>
        <button
          onClick={() => router.push('/lista-questoes/minhas-listas')}
          className="group px-3 py-1.5 rounded-lg text-sm font-display font-medium 
                     bg-primary/10 dark:bg-primary/20 text-primary 
                     hover:bg-primary hover:text-white
                     border border-primary/20 hover:border-primary
                     shadow-sm hover:shadow-md hover:shadow-primary/20
                     transition-all duration-300 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">list_alt</span>
          Ver todas
          <span className="material-symbols-outlined text-base transition-transform duration-300 group-hover:translate-x-0.5">
            arrow_forward
          </span>
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const percentage = getProgress(item);
          const isInProgress = item.type === 'list'
            ? (item as PendingList).stats.answered > 0
            : (item as PendingSimulado).status === 'in_progress';

          return (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleItemClick(item)}
              className="w-full rounded-xl overflow-hidden bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/40 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg dark:hover:shadow-dark-lg text-left group"
            >
              <div className="p-3 pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10 dark:bg-primary/20">
                    <span className="material-symbols-outlined text-xl text-primary">
                      {item.type === 'list' ? 'article' : 'schedule'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-semibold text-sm text-text-light-primary dark:text-text-dark-primary truncate block">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {item.createdAt && (
                        <span className="text-xs font-inter text-text-light-secondary dark:text-text-dark-secondary">
                          {item.createdAt}
                        </span>
                      )}
                      {item.type === 'simulado' && (item as PendingSimulado).isMentor && (
                        <span className="px-1.5 py-0.5 text-[10px] font-inter font-semibold bg-primary/10 dark:bg-primary/20 text-primary rounded">
                          Mentor
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[10px] font-inter font-semibold rounded ${isInProgress
                          ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                          : 'bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary'
                        }`}>
                        {isInProgress ? 'Em progresso' : 'Não iniciado'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </div>
              </div>
              <div className="px-3 pb-3">
                <div className="relative w-full h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary to-primary/80"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-inter">
                  {item.type === 'list' ? (
                    <>
                      <div className="flex items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary">
                        <span className="material-symbols-outlined text-sm text-primary">help</span>
                        <span>{(item as PendingList).stats.total}</span>
                      </div>
                      <div className="flex items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary">
                        <span className="material-symbols-outlined text-sm opacity-60">radio_button_checked</span>
                        <span>{(item as PendingList).stats.answered}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>{(item as PendingList).stats.correct}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        <span>{(item as PendingList).stats.incorrect}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary">
                        <span className="material-symbols-outlined text-sm text-primary">help</span>
                        <span>{(item as PendingSimulado).totalQuestions}</span>
                      </div>
                      <div className="flex items-center gap-1 text-text-light-secondary dark:text-text-dark-secondary">
                        <span className="material-symbols-outlined text-sm opacity-60">radio_button_checked</span>
                        <span>{(item as PendingSimulado).answeredQuestions || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>{(item as PendingSimulado).correctCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        <span>{(item as PendingSimulado).incorrectCount || 0}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
