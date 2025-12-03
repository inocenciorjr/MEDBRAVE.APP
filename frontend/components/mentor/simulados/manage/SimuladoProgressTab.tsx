'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface Assignment {
  id: string;
  user_id: string;
  mentorship_id: string | null;
  status: 'pending' | 'available' | 'started' | 'completed' | 'expired';
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  correct_count: number;
  incorrect_count: number;
  time_spent_seconds: number;
  is_public_subscription: boolean;
  user?: {
    display_name: string;
    email: string;
    photo_url: string | null;
  };
  mentorship?: {
    title: string;
    program_title?: string;
  };
}

interface SimuladoProgressTabProps {
  simuladoId: string;
}

export function SimuladoProgressTab({ simuladoId }: SimuladoProgressTabProps) {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'started' | 'completed'>('all');

  useEffect(() => {
    const loadAssignments = async () => {
      if (!token) return;

      try {
        const response = await fetch(
          `/api/mentorship/mentor-simulados/${simuladoId}/assignments`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAssignments(data.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar progresso:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, [simuladoId, token]);

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; icon: string; gradient: string; bg: string; text: string; border: string }> = {
      pending: {
        label: 'Aguardando',
        icon: 'schedule',
        gradient: 'from-slate-500 to-gray-500',
        bg: 'bg-slate-50 dark:bg-slate-800/20',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700/50'
      },
      available: {
        label: 'Disponível',
        icon: 'play_circle',
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/50'
      },
      started: {
        label: 'Em Andamento',
        icon: 'pending',
        gradient: 'from-amber-500 to-orange-500',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/50'
      },
      completed: {
        label: 'Finalizado',
        icon: 'check_circle',
        gradient: 'from-emerald-500 to-green-500',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/50'
      },
      expired: {
        label: 'Expirado',
        icon: 'cancel',
        gradient: 'from-red-500 to-rose-500',
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800/50'
      }
    };
    return config[status] || config.pending;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${secs}s`;
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'available'].includes(a.status);
    if (filter === 'started') return a.status === 'started';
    if (filter === 'completed') return a.status === 'completed';
    return true;
  });

  // Estatísticas
  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => ['pending', 'available'].includes(a.status)).length,
    started: assignments.filter(a => a.status === 'started').length,
    completed: assignments.filter(a => a.status === 'completed').length
  };

  const statCards = [
    { key: 'total', label: 'Total', value: stats.total, icon: 'group', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30' },
    { key: 'pending', label: 'Aguardando', value: stats.pending, icon: 'schedule', gradient: 'from-slate-500 to-gray-500', shadow: 'shadow-slate-500/30' },
    { key: 'started', label: 'Em Andamento', value: stats.started, icon: 'pending', gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/30' },
    { key: 'completed', label: 'Finalizados', value: stats.completed, icon: 'check_circle', gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/30' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-28 bg-gradient-to-r from-border-light to-border-light/50 
                                  dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          ))}
        </div>
        <div className="animate-pulse h-16 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
        <div className="animate-pulse h-96 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                      rounded-2xl p-5 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
                      group"
          >
            {/* Background glow */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full blur-2xl 
                          group-hover:opacity-20 transition-opacity duration-300`} />

            <div className="relative flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} 
                            flex items-center justify-center shadow-lg ${stat.shadow}
                            group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined text-white text-2xl">{stat.icon}</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {stat.value}
                </p>
                <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                    rounded-2xl p-4 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {([
            { id: 'all', label: 'Todos', icon: 'apps' },
            { id: 'pending', label: 'Aguardando', icon: 'schedule' },
            { id: 'started', label: 'Em Andamento', icon: 'pending' },
            { id: 'completed', label: 'Finalizados', icon: 'check_circle' }
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold 
                transition-all duration-300 whitespace-nowrap
                ${filter === f.id
                  ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30 scale-105'
                  : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border-2 border-border-light dark:border-border-dark hover:border-primary/50 hover:text-primary'
                }
              `}
            >
              <span className="material-symbols-outlined text-lg">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Participantes */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-cyan-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-cyan-500/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        {filteredAssignments.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                          dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">
                group_off
              </span>
            </div>
            <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Nenhum participante encontrado
            </p>
            <p className="text-sm text-text-light-secondary/70 dark:text-text-dark-secondary/70 mt-2">
              Tente ajustar os filtros ou adicione participantes ao simulado
            </p>
          </div>
        ) : (
          <div className="divide-y-2 divide-border-light/50 dark:divide-border-dark/50">
            {filteredAssignments.map((assignment, index) => {
              const statusConfig = getStatusConfig(assignment.status);

              return (
                <div
                  key={assignment.id}
                  className="p-5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200
                           animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 
                                    flex items-center justify-center overflow-hidden border-2 border-primary/20
                                    shadow-lg">
                        {assignment.user?.photo_url ? (
                          <img src={assignment.user.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-primary text-2xl">person</span>
                        )}
                      </div>
                      {/* Status indicator dot */}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br ${statusConfig.gradient} 
                                    border-2 border-surface-light dark:border-surface-dark shadow-md`}>
                        <span className="material-symbols-outlined text-white text-xs flex items-center justify-center h-full">
                          {statusConfig.icon}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <p className="font-bold text-text-light-primary dark:text-text-dark-primary truncate">
                          {assignment.user?.display_name || 'Usuário'}
                        </p>
                        {assignment.is_public_subscription && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold
                                         bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700
                                         dark:from-purple-900/40 dark:to-violet-900/40 dark:text-purple-400
                                         border border-purple-200 dark:border-purple-800/50">
                            Público
                          </span>
                        )}
                        {assignment.mentorship?.program_title && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold
                                         bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700
                                         dark:from-blue-900/40 dark:to-cyan-900/40 dark:text-blue-400
                                         border border-blue-200 dark:border-blue-800/50">
                            {assignment.mentorship.program_title}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate">
                        {assignment.user?.email}
                      </p>
                    </div>

                    {/* Score & Time */}
                    <div className="flex items-center gap-6">
                      {assignment.status === 'completed' && (
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${(assignment.score || 0) >= 70
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : (assignment.score || 0) >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                            }`}>
                            {formatPercentSimple(assignment.score)}
                          </p>
                          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                            {assignment.correct_count}/{assignment.correct_count + assignment.incorrect_count} acertos
                          </p>
                        </div>
                      )}

                      {assignment.time_spent_seconds > 0 && (
                        <div className="text-right px-4 py-2 rounded-lg bg-background-light dark:bg-background-dark
                                      border border-border-light dark:border-border-dark">
                          <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                            {formatTime(assignment.time_spent_seconds)}
                          </p>
                          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                            Tempo
                          </p>
                        </div>
                      )}

                      {/* Status Badge */}
                      <span className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                        ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}
                        shadow-sm
                      `}>
                        <span className="material-symbols-outlined text-base">{statusConfig.icon}</span>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Datas */}
                  {(assignment.started_at || assignment.completed_at) && (
                    <div className="mt-4 pt-4 border-t border-border-light/50 dark:border-border-dark/50 
                                  flex gap-6 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      {assignment.started_at && (
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
                          Iniciou: {format(new Date(assignment.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {assignment.completed_at && (
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">check</span>
                          Finalizou: {format(new Date(assignment.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
