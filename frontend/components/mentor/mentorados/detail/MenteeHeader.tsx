'use client';

import { ArrowLeft, Clock, Calendar } from 'lucide-react';

interface MenteeHeaderProps {
  mentee: {
    name: string;
    email: string;
    avatar?: string;
    status: string;
    startDate: string;
    endDate?: string;
  };
  onBack: () => void;
}

export function MenteeHeader({ mentee, onBack }: MenteeHeaderProps) {
  const daysRemaining = mentee.endDate 
    ? Math.ceil((new Date(mentee.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { 
      label: string; 
      gradient: string;
      bgGradient: string;
      textColor: string;
      borderColor: string;
      glow: string;
    }> = {
      ACTIVE: { 
        label: 'Ativo', 
        gradient: 'from-emerald-500 to-green-500',
        bgGradient: 'from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        borderColor: 'border-emerald-300 dark:border-emerald-700/50',
        glow: 'shadow-emerald-500/20'
      },
      active: { 
        label: 'Ativo', 
        gradient: 'from-emerald-500 to-green-500',
        bgGradient: 'from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        borderColor: 'border-emerald-300 dark:border-emerald-700/50',
        glow: 'shadow-emerald-500/20'
      },
      SUSPENDED: { 
        label: 'Suspenso', 
        gradient: 'from-amber-500 to-orange-500',
        bgGradient: 'from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20',
        textColor: 'text-amber-700 dark:text-amber-400',
        borderColor: 'border-amber-300 dark:border-amber-700/50',
        glow: 'shadow-amber-500/20'
      },
      suspended: { 
        label: 'Suspenso', 
        gradient: 'from-amber-500 to-orange-500',
        bgGradient: 'from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-900/20',
        textColor: 'text-amber-700 dark:text-amber-400',
        borderColor: 'border-amber-300 dark:border-amber-700/50',
        glow: 'shadow-amber-500/20'
      },
      EXPIRED: { 
        label: 'Expirado', 
        gradient: 'from-red-500 to-rose-500',
        bgGradient: 'from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-900/20',
        textColor: 'text-red-700 dark:text-red-400',
        borderColor: 'border-red-300 dark:border-red-700/50',
        glow: 'shadow-red-500/20'
      },
      expired: { 
        label: 'Expirado', 
        gradient: 'from-red-500 to-rose-500',
        bgGradient: 'from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-900/20',
        textColor: 'text-red-700 dark:text-red-400',
        borderColor: 'border-red-300 dark:border-red-700/50',
        glow: 'shadow-red-500/20'
      },
      CANCELLED: { 
        label: 'Cancelado', 
        gradient: 'from-slate-500 to-gray-500',
        bgGradient: 'from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-800/20',
        textColor: 'text-slate-600 dark:text-slate-400',
        borderColor: 'border-slate-300 dark:border-slate-600/50',
        glow: 'shadow-slate-500/20'
      },
      cancelled: { 
        label: 'Cancelado', 
        gradient: 'from-slate-500 to-gray-500',
        bgGradient: 'from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-slate-800/20',
        textColor: 'text-slate-600 dark:text-slate-400',
        borderColor: 'border-slate-300 dark:border-slate-600/50',
        glow: 'shadow-slate-500/20'
      },
    };
    return configs[status] || configs.ACTIVE;
  };

  const statusConfig = getStatusConfig(mentee.status);

  const getDaysRemainingConfig = () => {
    if (daysRemaining === null) return null;
    if (daysRemaining <= 0) return { 
      gradient: 'from-red-500 to-rose-500', 
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50'
    };
    if (daysRemaining <= 7) return { 
      gradient: 'from-red-500 to-rose-500', 
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50'
    };
    if (daysRemaining <= 30) return { 
      gradient: 'from-amber-500 to-orange-500', 
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50'
    };
    return { 
      gradient: 'from-emerald-500 to-green-500', 
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50'
    };
  };

  const daysConfig = getDaysRemainingConfig();

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
              <ArrowLeft className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary 
                             group-hover/btn:text-primary transition-colors duration-200" />
            </button>
            
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden 
                            bg-gradient-to-br from-primary/20 to-violet-500/20 
                            border-2 border-border-light dark:border-border-dark
                            shadow-xl group-hover:shadow-2xl transition-all duration-300">
                {mentee.avatar ? (
                  <img src={mentee.avatar} alt={mentee.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center 
                                bg-gradient-to-br from-primary to-violet-500">
                    <span className="text-3xl md:text-4xl font-bold text-white">
                      {mentee.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              {/* Status indicator dot */}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full 
                            bg-gradient-to-br ${statusConfig.gradient} 
                            border-2 border-white dark:border-surface-dark
                            shadow-lg ${statusConfig.glow}`} />
            </div>
            
            <div className="space-y-3">
              {/* Name and Status */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-display font-bold 
                             text-text-light-primary dark:text-text-dark-primary">
                  {mentee.name}
                </h1>
                <span className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                  bg-gradient-to-r ${statusConfig.bgGradient} ${statusConfig.textColor}
                  border-2 ${statusConfig.borderColor}
                  shadow-lg ${statusConfig.glow}
                  transition-all duration-300 hover:scale-105
                `}>
                  <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${statusConfig.gradient} animate-pulse`} />
                  {statusConfig.label}
                </span>
              </div>
              
              {/* Email */}
              <p className="text-text-light-secondary dark:text-text-dark-secondary font-medium">
                {mentee.email}
              </p>
              
              {/* Meta Info */}
              <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                {/* Days Remaining */}
                {daysConfig && daysRemaining !== null && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg
                                ${daysConfig.bg} border ${daysConfig.border}
                                transition-all duration-200 hover:scale-105 group/stat`}>
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${daysConfig.gradient} 
                                  flex items-center justify-center shadow-md
                                  group-hover/stat:shadow-lg transition-shadow`}>
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className={`font-bold ${daysConfig.text}`}>
                        {daysRemaining > 0 ? daysRemaining : 0}
                      </span>
                      <span className={`text-sm ml-1 ${daysConfig.text} opacity-80`}>
                        dias restantes
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Start Date */}
                {mentee.startDate && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                                bg-slate-50 dark:bg-slate-800/20 
                                border border-slate-200 dark:border-slate-700/50
                                transition-all duration-200 hover:scale-105 group/stat">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-gray-500 
                                  flex items-center justify-center shadow-md
                                  group-hover/stat:shadow-lg transition-shadow">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm text-slate-600 dark:text-slate-400">Desde </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {new Date(mentee.startDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
