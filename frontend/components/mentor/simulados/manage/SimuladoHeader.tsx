'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SimuladoHeaderProps {
  simulado: {
    name: string;
    status: 'draft' | 'active' | 'closed';
    scheduled_at: string | null;
    question_count: number;
    respondents_count: number;
    visibility: 'public' | 'private' | 'selected';
  };
  canEdit: boolean;
  onBack: () => void;
}

export function SimuladoHeader({ simulado, canEdit, onBack }: SimuladoHeaderProps) {
  const getStatusBadge = () => {
    const statusConfig = {
      draft: { 
        label: 'Rascunho', 
        gradient: 'from-amber-500 to-orange-500',
        bgGradient: 'from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20',
        textColor: 'text-amber-700 dark:text-amber-400',
        borderColor: 'border-amber-300 dark:border-amber-700/50',
        icon: 'edit_note',
        glow: 'shadow-amber-500/20'
      },
      active: { 
        label: 'Ativo', 
        gradient: 'from-emerald-500 to-green-500',
        bgGradient: 'from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        borderColor: 'border-emerald-300 dark:border-emerald-700/50',
        icon: 'play_circle',
        glow: 'shadow-emerald-500/20'
      },
      closed: { 
        label: 'Encerrado', 
        gradient: 'from-slate-500 to-gray-500',
        bgGradient: 'from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-800/20',
        textColor: 'text-slate-600 dark:text-slate-400',
        borderColor: 'border-slate-300 dark:border-slate-600/50',
        icon: 'check_circle',
        glow: 'shadow-slate-500/20'
      }
    };
    const config = statusConfig[simulado.status];
    return (
      <span className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
        bg-gradient-to-r ${config.bgGradient} ${config.textColor}
        border-2 ${config.borderColor}
        shadow-lg ${config.glow}
        transition-all duration-300 hover:scale-105
      `}>
        <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${config.gradient} animate-pulse`} />
        <span className="material-symbols-outlined text-base">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getVisibilityBadge = () => {
    const visibilityConfig = {
      public: { label: 'Público', icon: 'public' },
      private: { label: 'Privado', icon: 'lock' },
      selected: { label: 'Selecionados', icon: 'group' }
    };
    const config = visibilityConfig[simulado.visibility];
    return (
      <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold
                      bg-slate-50 dark:bg-slate-800/30 
                      text-slate-600 dark:text-slate-400
                      border border-slate-200 dark:border-slate-700/50
                      transition-all duration-200 hover:scale-105">
        <span className="material-symbols-outlined text-lg">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const scheduledDate = simulado.scheduled_at ? new Date(simulado.scheduled_at) : null;
  const isScheduledInFuture = scheduledDate && scheduledDate > new Date();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark
                    shadow-xl hover:shadow-2xl dark:shadow-dark-xl dark:hover:shadow-dark-2xl
                    transition-all duration-500 group">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/15 via-cyan-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 group-hover:scale-110 transition-transform duration-700" />
      <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-gradient-to-r from-violet-500/5 to-pink-500/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Back Button */}
            <button
              onClick={onBack}
              className="p-3 rounded-xl bg-gradient-to-br from-background-light to-surface-light 
                       dark:from-background-dark dark:to-surface-dark 
                       border-2 border-border-light dark:border-border-dark
                       hover:border-primary/50 hover:from-primary/5 hover:to-primary/10 
                       dark:hover:from-primary/10 dark:hover:to-primary/20
                       shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                       transition-all duration-300 hover:scale-110 active:scale-95 group/btn"
            >
              <span className="material-symbols-outlined text-xl text-text-light-secondary dark:text-text-dark-secondary 
                             group-hover/btn:text-primary transition-colors duration-200">
                arrow_back
              </span>
            </button>
            
            <div className="space-y-4">
              {/* Title and Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold 
                             text-text-light-primary dark:text-text-dark-primary
                             bg-gradient-to-r from-text-light-primary to-text-light-secondary 
                             dark:from-text-dark-primary dark:to-text-dark-secondary
                             bg-clip-text">
                  {simulado.name}
                </h1>
                {getStatusBadge()}
              </div>
              
              {/* Meta Info */}
              <div className="flex items-center gap-3 md:gap-5 flex-wrap">
                {getVisibilityBadge()}
                
                {/* Questions Count */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                              bg-slate-50 dark:bg-slate-800/30 
                              border border-slate-200 dark:border-slate-700/50
                              transition-all duration-200 hover:scale-105 group/stat">
                  <span className="material-symbols-outlined text-lg text-slate-500 dark:text-slate-400">quiz</span>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{simulado.question_count}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">questões</span>
                  </div>
                </div>
                
                {/* Participants Count */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                              bg-slate-50 dark:bg-slate-800/30 
                              border border-slate-200 dark:border-slate-700/50
                              transition-all duration-200 hover:scale-105 group/stat">
                  <span className="material-symbols-outlined text-lg text-slate-500 dark:text-slate-400">group</span>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{simulado.respondents_count}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 ml-1">participantes</span>
                  </div>
                </div>
                
                {/* Schedule */}
                {scheduledDate && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                                bg-slate-50 dark:bg-slate-800/30 
                                border border-slate-200 dark:border-slate-700/50
                                transition-all duration-200 hover:scale-105">
                    <span className="material-symbols-outlined text-lg text-slate-500 dark:text-slate-400">schedule</span>
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {isScheduledInFuture ? 'Inicia em ' : 'Iniciou em '}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {format(scheduledDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit Status Badge */}
          <div className="flex-shrink-0">
            {canEdit ? (
              <div className="flex items-center gap-3 px-5 py-3 
                            bg-gradient-to-r from-emerald-100 via-emerald-50 to-green-50 
                            dark:from-emerald-900/40 dark:via-emerald-900/30 dark:to-green-900/20 
                            text-emerald-700 dark:text-emerald-400 
                            rounded-xl border-2 border-emerald-300 dark:border-emerald-700/50
                            shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/10
                            transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/30">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 
                              flex items-center justify-center shadow-md shadow-emerald-500/40">
                  <span className="material-symbols-outlined text-white">edit</span>
                </div>
                <div>
                  <span className="text-sm font-bold block">Editável</span>
                  <span className="text-xs opacity-80">Antes do início</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3 
                            bg-gradient-to-r from-red-100 via-red-50 to-rose-50 
                            dark:from-red-900/40 dark:via-red-900/30 dark:to-rose-900/20 
                            text-red-700 dark:text-red-400 
                            rounded-xl border-2 border-red-300 dark:border-red-700/50
                            shadow-lg shadow-red-500/20 dark:shadow-red-500/10
                            transition-all duration-300 hover:scale-105">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 
                              flex items-center justify-center shadow-md shadow-red-500/40">
                  <span className="material-symbols-outlined text-white">lock</span>
                </div>
                <div>
                  <span className="text-sm font-bold block">Bloqueado</span>
                  <span className="text-xs opacity-80">Simulado iniciado</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
