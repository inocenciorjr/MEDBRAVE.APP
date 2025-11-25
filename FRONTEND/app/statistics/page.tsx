'use client';

import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { TabGroup } from '@/components/ui/TabGroup';
import { useStatistics, useRankings } from '@/hooks/useStatistics';
import { AccuracyLineChart } from '@/components/statistics/AccuracyLineChart';
import { SpecialtyBarChart } from '@/components/statistics/SpecialtyBarChart';
import { StreakCard } from '@/components/statistics/StreakCard';
import { QuestionsPerMonthChart } from '@/components/statistics/QuestionsPerMonthChart';
import { WeeklyStudyTimeCard } from '@/components/statistics/WeeklyStudyTimeCard';
import { StatisticsPageSkeleton } from '@/components/skeletons';
import { ChartSkeleton, CardSkeleton } from '@/components/skeletons';

// Lazy load dos componentes menos críticos
const StudyHeatmap = lazy(() => import('@/components/statistics/StudyHeatmap').then(m => ({ default: m.StudyHeatmap })));
const RankingTable = lazy(() => import('@/components/statistics/RankingTable').then(m => ({ default: m.RankingTable })));
const StudyTimeChart = lazy(() => import('@/components/statistics/StudyTimeChart').then(m => ({ default: m.StudyTimeChart })));
const UniversityPerformanceChart = lazy(() => import('@/components/statistics/UniversityPerformanceChart').then(m => ({ default: m.UniversityPerformanceChart })));
const SubspecialtyPerformanceChart = lazy(() => import('@/components/statistics/SubspecialtyPerformanceChart').then(m => ({ default: m.SubspecialtyPerformanceChart })));
const ReviewsChart = lazy(() => import('@/components/statistics/ReviewsChart').then(m => ({ default: m.ReviewsChart })));

export default function StatisticsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rankings'>('overview');

  const {
    statistics,
    loading: statsLoading,
    error: statsError,
    fetchStatisticsWithComparison,
    recalculate,
  } = useStatistics(token);

  const {
    accuracyRanking,
    questionsRanking,
    loading: rankingsLoading,
    fetchAccuracyRanking,
    fetchQuestionsRanking,
  } = useRankings(token);

  useEffect(() => {
    const getToken = async () => {
      const { supabase } = await import('@/config/supabase');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
      } else {
        router.push('/login');
      }
    };
    getToken();
  }, [router]);

  useEffect(() => {
    if (token) {
      fetchStatisticsWithComparison();
      fetchAccuracyRanking();
      fetchQuestionsRanking();
    }
  }, [token]);

  // Preparar dados para os gráficos com useMemo para evitar recálculos
  // IMPORTANTE: Hooks devem estar ANTES de qualquer early return
  const accuracyChartData = useMemo(() => {
    if (!statistics) return [];
    return Object.entries(statistics.accuracyByMonth).map(([month, accuracy]) => ({
      month,
      accuracy,
      questions: statistics.questionsByMonth[month] || 0,
    }));
  }, [statistics]);

  const specialtyChartData = useMemo(() => {
    if (!statistics) return [];
    
    // Função para formatar o nome da especialidade
    const formatSpecialtyName = (id: string): string => {
      // Remove prefixos de hierarquia (ex: "ClinicaMedica_Cardiologia" -> "Cardiologia")
      const parts = id.split('_');
      const name = parts[parts.length - 1];
      
      // Adiciona espaços antes de letras maiúsculas
      return name.replace(/([A-Z])/g, ' $1').trim();
    };
    
    return Object.entries(statistics.statsBySpecialty).map(([specialtyId, spec]: [string, any]) => ({
      name: formatSpecialtyName(specialtyId),
      accuracy: spec.accuracy,
      questions: spec.totalQuestions,
    }));
  }, [statistics]);

  // Preparar dados para o gráfico de questões (semana e mês)
  const weekData = useMemo(() => {
    if (!statistics?.heatmapData) return [];
    
    const last7Days = statistics.heatmapData.slice(-7);
    return last7Days.map(day => {
      // Parse da data no formato YYYY-MM-DD sem conversão de timezone
      const [year, month, dayNum] = day.date.split('-').map(Number);
      const date = new Date(year, month - 1, dayNum);
      return {
        period: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        questions: day.questionsAnswered || 0,
        accuracy: day.accuracy || 0,
      };
    });
  }, [statistics?.heatmapData]);

  const monthData = useMemo(() => {
    if (!statistics?.questionsByMonth || !statistics?.accuracyByMonth) return [];
    
    return Object.entries(statistics.questionsByMonth).map(([month, questions]) => {
      // month está no formato "YYYY-MM" (ex: "2025-11")
      const [year, monthNum] = month.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthName = monthNames[parseInt(monthNum) - 1];
      const yearShort = year.slice(-2);
      
      return {
        period: `${monthName}/${yearShort}`,
        questions: questions || 0,
        accuracy: statistics.accuracyByMonth[month] || 0,
      };
    });
  }, [statistics?.questionsByMonth, statistics?.accuracyByMonth]);

  const universityChartData = useMemo(() => {
    if (!statistics) return [];
    const entries = Object.entries(statistics.statsByUniversity || {});
    
    // Função para formatar o nome da universidade
    const formatUniversityName = (id: string): string => {
      // Remove "Universidade_Estado_" e formata o resto
      const parts = id.split('_');
      if (parts.length >= 3) {
        // Pega apenas o nome da universidade (última parte)
        const name = parts.slice(2).join(' ');
        // Adiciona espaços antes de letras maiúsculas e remove hífens
        return name.replace(/([A-Z])/g, ' $1').replace(/-/g, ' ').trim();
      }
      return id;
    };
    
    return entries.map(([id, stats]: [string, any]) => ({
      name: formatUniversityName(id),
      accuracy: stats.accuracy,
      questions: stats.totalQuestions,
      average: 0,
    }));
  }, [statistics]);

  // Subespecialidades: dados vazios inicialmente, o componente vai buscar
  const subspecialtyChartData = useMemo(() => {
    return [];
  }, []);

  const totalResponses = useMemo(() => {
    if (!statistics?.heatmapData) return statistics?.totalQuestionsAnswered || 0;
    return statistics.heatmapData.reduce((sum, day) => sum + (day.questionsAnswered || 0), 0);
  }, [statistics?.heatmapData, statistics?.totalQuestionsAnswered]);

  // Early returns DEPOIS de todos os hooks
  if (statsLoading && !statistics) {
    return <StatisticsPageSkeleton />;
  }

  if (statsError) {
    return (
      <div className="bg-rose-100 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-800 rounded-xl p-6 text-center">
        <span className="material-symbols-outlined text-5xl text-rose-600 dark:text-rose-400 mb-4">
          error
        </span>
        <p className="text-rose-800 dark:text-rose-300">{statsError}</p>
      </div>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[{ label: 'Estatísticas', icon: 'analytics', href: '/statistics' }]}
        />
      </div>

      {/* Background Wrapper */}
      <div className="-m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                Suas Estatísticas
              </h1>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Acompanhe seu progresso e desempenho
              </p>
            </div>
            
            {/* Botão Sincronizar */}
            <button
              onClick={recalculate}
              disabled={statsLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              title="Sincroniza todas as estatísticas do zero para garantir precisão total"
            >
              <span className="material-symbols-outlined text-lg">
                sync
              </span>
              {statsLoading ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>

          {/* Informação de última sincronização */}
          {statistics?.lastCalculated && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg mb-6">
              <span className="material-symbols-outlined text-primary text-base">check_circle</span>
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Sincronizado{' '}
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {(() => {
                    const lastCalc = new Date(statistics.lastCalculated);
                    const now = new Date();
                    const diffMs = now.getTime() - lastCalc.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    
                    if (diffMins < 1) return 'agora mesmo';
                    if (diffMins < 60) return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
                    if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
                    if (diffDays === 1) return 'ontem';
                    if (diffDays < 7) return `há ${diffDays} dias`;
                    return lastCalc.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
                  })()}
                </span>
              </span>
            </div>
          )}

          {/* Tabs */}
          <TabGroup
            tabs={[
              { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
              { id: 'rankings', label: 'Rankings', icon: 'leaderboard' },
            ]}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as 'overview' | 'rankings')}
            className="mb-8"
          />

          {/* Overview Tab */}
          {activeTab === 'overview' && statistics && (
        <div className="space-y-6">
          {/* Resumo Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card Questões */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent rounded-xl p-6 border border-primary/20 shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Respostas
                </span>
                <span className="material-symbols-outlined text-primary">quiz</span>
              </div>
              <div className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {totalResponses}
              </div>
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                {statistics.totalQuestionsAnswered} questões únicas • {statistics.overallAccuracy.toFixed(1)}% acertos
              </div>
            </div>

            {/* Card Horas Semanais */}
            <WeeklyStudyTimeCard />

            {/* Card Flashcards */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent rounded-xl p-6 border border-primary/20 shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Flashcards
                </span>
                <span className="material-symbols-outlined text-primary">style</span>
              </div>
              <div className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {statistics.totalFlashcardsStudied}
              </div>
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                estudados
              </div>
            </div>

            {/* Card Revisões */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent rounded-xl p-6 border border-primary/20 shadow-lg dark:shadow-dark-lg hover:shadow-xl dark:hover:shadow-dark-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Revisões
                </span>
                <span className="material-symbols-outlined text-primary">history</span>
              </div>
              <div className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {statistics.totalReviews}
              </div>
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                realizadas
              </div>
            </div>
          </div>

          {/* Streak e Revisões por Tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StreakCard
              currentStreak={statistics.streakData.currentStreak}
              longestStreak={statistics.streakData.longestStreak}
              lastActivityDate={statistics.streakData.lastActivityDate}
              loading={statsLoading}
            />
            <Suspense fallback={<ChartSkeleton />}>
              <ReviewsChart
                data={{
                  total: statistics.totalReviews,
                  byType: statistics.reviewsByType,
                }}
                loading={statsLoading}
              />
            </Suspense>
          </div>

          {/* Gráficos de Evolução */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AccuracyLineChart
              data={accuracyChartData}
              showComparison={true}
              loading={statsLoading}
            />
            <QuestionsPerMonthChart
              weekData={weekData}
              monthData={monthData}
              loading={statsLoading}
            />
          </div>

          {/* Tempo de Estudo */}
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <StudyTimeChart
              averageDailyStudyTime={statistics?.averageDailyStudyTime || 0}
              daysStudied={statistics?.daysStudiedThisMonth || 0}
            />
          </Suspense>

          {/* Desempenho por Especialidade e Universidade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SpecialtyBarChart
              data={specialtyChartData}
              showComparison={true}
              loading={statsLoading}
            />
            <Suspense fallback={<ChartSkeleton />}>
              <UniversityPerformanceChart
                data={universityChartData}
                showComparison={true}
                loading={statsLoading}
              />
            </Suspense>
          </div>

          {/* Desempenho por Subespecialidade - Linha Inteira */}
          <Suspense fallback={<ChartSkeleton className="h-96" />}>
            <SubspecialtyPerformanceChart
              data={subspecialtyChartData}
              showComparison={true}
              loading={statsLoading}
            />
          </Suspense>


        </div>
      )}

      {/* Rankings Tab */}
      {activeTab === 'rankings' && (
        <Suspense fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton className="h-96" />
            <ChartSkeleton className="h-96" />
          </div>
        }>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {accuracyRanking && (
              <RankingTable
                title="Ranking de Acertos"
                subtitle="Melhores acurácias gerais"
                top20={accuracyRanking.top20}
                currentUser={accuracyRanking.currentUser}
                totalUsers={accuracyRanking.totalUsers}
                valueLabel="%"
                loading={rankingsLoading}
              />
            )}
            {questionsRanking && (
              <RankingTable
                title="Ranking de Questões"
                subtitle="Mais questões respondidas"
                top20={questionsRanking.top20}
                currentUser={questionsRanking.currentUser}
                totalUsers={questionsRanking.totalUsers}
                valueLabel=" questões"
                loading={rankingsLoading}
              />
            )}
          </div>
        </Suspense>
      )}
        </div>
      </div>
    </>
  );
}
