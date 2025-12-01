'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';

interface AnalyticsData {
  totalMentees: number;
  activeMentees: number;
  totalSimulados: number;
  totalQuestionsAnswered: number;
  averageAccuracy: number;
  totalMeetings: number;
  menteesProgress: { name: string; progress: number; accuracy: number }[];
  simuladosPerformance: { name: string; respondents: number; avgScore: number }[];
}

type TabId = 'overview' | 'mentees' | 'simulados';

export default function AnalisesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // TODO: Implementar chamada real à API
        setData({
          totalMentees: 0,
          activeMentees: 0,
          totalSimulados: 0,
          totalQuestionsAnswered: 0,
          averageAccuracy: 0,
          totalMeetings: 0,
          menteesProgress: [],
          simuladosPerformance: [],
        });
      } catch (error) {
        console.error('Erro ao carregar análises:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const StatCard = ({ title, value, icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: string;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
      border border-border-light dark:border-border-dark
      shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
      transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Mentor', icon: 'school', href: '/mentor' },
          { label: 'Análises', icon: 'analytics', href: '/mentor/analises' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
          Análises
        </h1>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
          Acompanhe o desempenho dos seus mentorados
        </p>
      </div>

      {/* Tabs */}
      <TabGroup
        tabs={[
          { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
          { id: 'mentees', label: 'Por Mentorado', icon: 'person' },
          { id: 'simulados', label: 'Por Simulado', icon: 'quiz' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-5
              border border-border-light dark:border-border-dark animate-pulse">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && data && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total de Mentorados"
                  value={data.totalMentees}
                  icon="groups"
                  color="bg-primary/10 text-primary"
                  subtitle={`${data.activeMentees} ativos`}
                />
                <StatCard
                  title="Simulados Criados"
                  value={data.totalSimulados}
                  icon="quiz"
                  color="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
                />
                <StatCard
                  title="Questões Respondidas"
                  value={data.totalQuestionsAnswered}
                  icon="help"
                  color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                />
                <StatCard
                  title="Taxa de Acerto Média"
                  value={`${data.averageAccuracy.toFixed(1)}%`}
                  icon="percent"
                  color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                />
              </div>

              {/* Placeholder para gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
                  border border-border-light dark:border-border-dark">
                  <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
                    Evolução de Acertos
                  </h3>
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-2">
                        show_chart
                      </span>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        Gráfico em desenvolvimento
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-6
                  border border-border-light dark:border-border-dark">
                  <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
                    Distribuição por Especialidade
                  </h3>
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-2">
                        pie_chart
                      </span>
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        Gráfico em desenvolvimento
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mentees' && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl
              border border-border-light dark:border-border-dark overflow-hidden">
              <div className="p-6 border-b border-border-light dark:border-border-dark">
                <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Desempenho por Mentorado
                </h3>
              </div>
              {data?.menteesProgress.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-2">
                    group_off
                  </span>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    Nenhum dado de mentorado disponível
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {data?.menteesProgress.map((mentee, index) => (
                    <div key={index} className="p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                            {mentee.name}
                          </p>
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {mentee.accuracy.toFixed(1)}% de acerto
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{mentee.progress}%</p>
                          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">progresso</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'simulados' && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl
              border border-border-light dark:border-border-dark overflow-hidden">
              <div className="p-6 border-b border-border-light dark:border-border-dark">
                <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Desempenho por Simulado
                </h3>
              </div>
              {data?.simuladosPerformance.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-2">
                    quiz
                  </span>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    Nenhum simulado criado ainda
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {data?.simuladosPerformance.map((simulado, index) => (
                    <div key={index} className="p-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                            {simulado.name}
                          </p>
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                            {simulado.respondents} respondentes
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {simulado.avgScore.toFixed(1)}%
                          </p>
                          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">média</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
