'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { 
  SimuladoRankingSection, 
  SimuladoQuestionAnalytics, 
  SimuladoSpecialtyCharts,
  SimuladoSubspecialtyCharts
} from './analytics';
import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface SimuladoAnalyticsTabProps {
  simuladoId: string;
}

export function SimuladoAnalyticsTab({ simuladoId }: SimuladoAnalyticsTabProps) {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'ranking' | 'questions' | 'specialties' | 'subspecialties'>('ranking');

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(
          `/api/mentorship/mentor-simulados/${simuladoId}/analytics`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data.data);
        }
      } catch (error) {
        console.error('Erro ao carregar analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [simuladoId, token]);

  const summaryCards = [
    { 
      key: 'completed', 
      label: 'Finalizados', 
      value: analytics?.summary?.completedCount || 0,
      icon: 'check_circle', 
      gradient: 'from-emerald-500 to-green-500', 
      shadow: 'shadow-emerald-500/30',
      suffix: ''
    },
    { 
      key: 'average', 
      label: 'Média Geral', 
      value: formatPercentSimple(analytics?.summary?.averageScore),
      icon: 'percent', 
      gradient: 'from-blue-500 to-cyan-500', 
      shadow: 'shadow-blue-500/30',
      suffix: ''
    },
    { 
      key: 'time', 
      label: 'Tempo Médio', 
      value: Math.round((analytics?.summary?.averageTimeSeconds || 0) / 60),
      icon: 'timer', 
      gradient: 'from-violet-500 to-purple-500', 
      shadow: 'shadow-violet-500/30',
      suffix: 'm'
    },
    { 
      key: 'highest', 
      label: 'Maior Nota', 
      value: formatPercentSimple(analytics?.summary?.highestScore),
      icon: 'trending_up', 
      gradient: 'from-orange-500 to-amber-500', 
      shadow: 'shadow-orange-500/30',
      suffix: ''
    }
  ];

  const sections = [
    { id: 'ranking', label: 'Ranking Geral', icon: 'leaderboard', gradient: 'from-amber-500 to-orange-500' },
    { id: 'questions', label: 'Por Questão', icon: 'quiz', gradient: 'from-cyan-500 to-blue-500' },
    { id: 'specialties', label: 'Por Especialidade', icon: 'medical_services', gradient: 'from-pink-500 to-rose-500' },
    { id: 'subspecialties', label: 'Por Subespecialidade', icon: 'category', gradient: 'from-teal-500 to-cyan-500', beta: true }
  ] as const;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-28 bg-gradient-to-r from-border-light to-border-light/50 
                                  dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          ))}
        </div>
        <div className="animate-pulse h-96 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                    rounded-2xl p-16 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl text-center">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                        dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">
              analytics
            </span>
          </div>
          <h3 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
            Sem dados disponíveis
          </h3>
          <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
            Os analytics estarão disponíveis quando participantes completarem o simulado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div 
            key={card.key}
            className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                      rounded-2xl p-5 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
                      group"
          >
            {/* Background glow */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full blur-2xl 
                          group-hover:opacity-20 transition-opacity duration-300`} />
            
            <div className="relative flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} 
                            flex items-center justify-center shadow-lg ${card.shadow}
                            group-hover:scale-110 transition-transform duration-300`}>
                <span className="material-symbols-outlined text-white text-2xl">{card.icon}</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  {card.value}{card.suffix}
                </p>
                <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  {card.label}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navegação de Seções */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-pink-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-pink-500/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        {/* Tabs */}
        <div className="flex border-b-2 border-border-light dark:border-border-dark">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`
                flex-1 flex items-center justify-center gap-3 px-6 py-5 text-sm font-semibold 
                transition-all duration-300 relative group
                ${activeSection === section.id
                  ? 'text-primary'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }
                ${index > 0 ? 'border-l border-border-light/50 dark:border-border-dark/50' : ''}
              `}
            >
              {/* Active indicator */}
              {activeSection === section.id && (
                <>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${section.gradient}`} />
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r ${section.gradient} blur-md opacity-60`} />
                </>
              )}
              
              {/* Hover background */}
              <div className={`
                absolute inset-0 transition-all duration-300
                ${activeSection === section.id
                  ? 'bg-gradient-to-b from-primary/10 via-primary/5 to-transparent'
                  : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-border-light/30 dark:group-hover:from-border-dark/30 group-hover:to-transparent'
                }
              `} />
              
              {/* Icon */}
              <div className={`
                relative z-10 w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300 shadow-sm
                ${activeSection === section.id
                  ? `bg-gradient-to-br ${section.gradient} shadow-lg`
                  : 'bg-background-light dark:bg-background-dark group-hover:bg-border-light dark:group-hover:bg-border-dark'
                }
              `}>
                <span className={`
                  material-symbols-outlined text-xl
                  ${activeSection === section.id ? 'text-white' : 'text-text-light-secondary dark:text-text-dark-secondary'}
                `}>
                  {section.icon}
                </span>
              </div>
              
              <span className="relative z-10 hidden sm:inline">{section.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeSection === 'ranking' && (
            <SimuladoRankingSection 
              simuladoId={simuladoId}
              ranking={analytics.ranking || []}
            />
          )}
          
          {activeSection === 'questions' && (
            <SimuladoQuestionAnalytics 
              simuladoId={simuladoId}
              questionStats={analytics.questionStats || []}
            />
          )}
          
          {activeSection === 'specialties' && (
            <SimuladoSpecialtyCharts 
              simuladoId={simuladoId}
              specialtyStats={analytics.specialtyStats || []}
            />
          )}
          
          {activeSection === 'subspecialties' && (
            <SimuladoSubspecialtyCharts 
              subspecialtyStats={analytics.subspecialtyStats || []}
              specialtyStats={analytics.specialtyStats || []}
            />
          )}
        </div>
      </div>
    </div>
  );
}
