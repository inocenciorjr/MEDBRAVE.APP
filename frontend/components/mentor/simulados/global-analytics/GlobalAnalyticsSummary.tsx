'use client';

import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface GlobalAnalyticsSummaryData {
  totalSimulados: number;
  activeSimulados: number;
  totalParticipants: number;
  totalResponses: number;
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  averageScore: number;
  averageTimePerSimulado: number;
  completionRate: number;
}

interface GlobalAnalyticsSummaryProps {
  data: GlobalAnalyticsSummaryData | null;
  isLoading: boolean;
}

export function GlobalAnalyticsSummary({ data, isLoading }: GlobalAnalyticsSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse h-28 bg-gradient-to-r from-border-light to-border-light/50 
                                dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const formatTime = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  const cards = [
    {
      key: 'simulados',
      label: 'Simulados',
      value: data.totalSimulados,
      subValue: `${data.activeSimulados} ativos`,
      icon: 'quiz',
      gradient: 'from-violet-500 to-purple-500',
      shadow: 'shadow-violet-500/30'
    },
    {
      key: 'participants',
      label: 'Participantes',
      value: data.totalParticipants,
      subValue: `${data.totalResponses} respostas`,
      icon: 'groups',
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/30'
    },
    {
      key: 'questions',
      label: 'Questões Respondidas',
      value: data.totalQuestionsAnswered.toLocaleString('pt-BR'),
      icon: 'help_outline',
      gradient: 'from-emerald-500 to-green-500',
      shadow: 'shadow-emerald-500/30'
    },
    {
      key: 'accuracy',
      label: 'Acurácia Geral',
      value: formatPercentSimple(data.overallAccuracy),
      subValue: `Média: ${formatPercentSimple(data.averageScore)}`,
      icon: 'target',
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/30'
    },
    {
      key: 'time',
      label: 'Tempo Médio',
      value: formatTime(data.averageTimePerSimulado),
      subValue: `${data.completionRate.toFixed(0)}% conclusão`,
      icon: 'timer',
      gradient: 'from-pink-500 to-rose-500',
      shadow: 'shadow-pink-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.key}
          className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                    rounded-2xl p-5 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
                    group"
        >
          <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full blur-2xl 
                        group-hover:opacity-20 transition-opacity duration-300`} />
          
          <div className="relative flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} 
                          flex items-center justify-center shadow-lg ${card.shadow}
                          group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
              <span className="material-symbols-outlined text-white text-xl">{card.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary truncate">
                {card.value}
              </p>
              <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {card.label}
              </p>
              {card.subValue && (
                <p className="text-xs text-text-light-secondary/70 dark:text-text-dark-secondary/70 mt-0.5">
                  {card.subValue}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
