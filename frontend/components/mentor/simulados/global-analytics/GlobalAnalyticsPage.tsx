'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { GlobalAnalyticsSummary } from './GlobalAnalyticsSummary';
import { GlobalRankingSection } from './GlobalRankingSection';
import { GlobalSpecialtyCharts } from './GlobalSpecialtyCharts';
import { SimuladoComparisonCharts } from './SimuladoComparisonCharts';
import { EvolutionOverTimeChart } from './EvolutionOverTimeChart';

interface GlobalAnalyticsData {
  summary: any;
  ranking: any[];
  specialties: any;
  evolution: any;
  simuladosList: Array<{ id: string; name: string; date: string }>;
}

export function GlobalAnalyticsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'ranking' | 'specialties' | 'evolution' | 'compare'>('ranking');
  const [data, setData] = useState<GlobalAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rankingPeriod, setRankingPeriod] = useState<'all' | '30d' | '60d' | '90d'>('all');

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    try {
      // Carregar todos os dados em paralelo
      const [summaryRes, rankingRes, specialtiesRes, evolutionRes, simuladosRes] = await Promise.all([
        fetch('/api/mentorship/analytics/global/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mentorship/analytics/global/ranking', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mentorship/analytics/global/specialties', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mentorship/analytics/global/evolution', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/mentorship/analytics/simulados', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [summary, ranking, specialties, evolution, simulados] = await Promise.all([
        summaryRes.ok ? summaryRes.json() : { data: null },
        rankingRes.ok ? rankingRes.json() : { data: [] },
        specialtiesRes.ok ? specialtiesRes.json() : { data: { specialties: [], subspecialties: [] } },
        evolutionRes.ok ? evolutionRes.json() : { data: { bySimulado: [], byPeriod: [], bySpecialty: [] } },
        simuladosRes.ok ? simuladosRes.json() : { data: [] }
      ]);

      setData({
        summary: summary.data,
        ranking: ranking.data || [],
        specialties: specialties.data || { specialties: [], subspecialties: [] },
        evolution: evolution.data || { bySimulado: [], byPeriod: [], bySpecialty: [] },
        simuladosList: (simulados.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          date: s.createdAt
        }))
      });
    } catch (error) {
      console.error('Erro ao carregar analytics globais:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRankingWithPeriod = async (period: 'all' | '30d' | '60d' | '90d') => {
    if (!token) return;

    try {
      const response = await fetch(`/api/mentorship/analytics/global/ranking?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setData(prev => prev ? { ...prev, ranking: result.data || [] } : null);
      }
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    }
  };

  const handlePeriodChange = (period: 'all' | '30d' | '60d' | '90d') => {
    setRankingPeriod(period);
    loadRankingWithPeriod(period);
  };

  const tabs = [
    { id: 'ranking', label: 'Ranking Global', icon: 'leaderboard', gradient: 'from-amber-500 to-orange-500' },
    { id: 'specialties', label: 'Por Especialidade', icon: 'medical_services', gradient: 'from-pink-500 to-rose-500' },
    { id: 'evolution', label: 'Evolução', icon: 'trending_up', gradient: 'from-emerald-500 to-green-500' },
    { id: 'compare', label: 'Comparar', icon: 'compare', gradient: 'from-blue-500 to-cyan-500' }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 
                      flex items-center justify-center shadow-xl shadow-violet-500/30">
          <span className="material-symbols-outlined text-white text-3xl">analytics</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Analytics Globais
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Visão consolidada de todos os seus simulados
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <GlobalAnalyticsSummary data={data?.summary || null} isLoading={loading} />

      {/* Tabs Navigation */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        <div className="flex border-b-2 border-border-light dark:border-border-dark overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 min-w-[140px] flex items-center justify-center gap-3 px-6 py-5 text-sm font-semibold 
                transition-all duration-300 relative group
                ${activeTab === tab.id
                  ? 'text-primary'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }
                ${index > 0 ? 'border-l border-border-light/50 dark:border-border-dark/50' : ''}
              `}
            >
              {activeTab === tab.id && (
                <>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.gradient}`} />
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r ${tab.gradient} blur-md opacity-60`} />
                </>
              )}
              
              <div className={`
                absolute inset-0 transition-all duration-300
                ${activeTab === tab.id
                  ? 'bg-gradient-to-b from-primary/10 via-primary/5 to-transparent'
                  : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-border-light/30 dark:group-hover:from-border-dark/30 group-hover:to-transparent'
                }
              `} />
              
              <div className={`
                relative z-10 w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300 shadow-sm
                ${activeTab === tab.id
                  ? `bg-gradient-to-br ${tab.gradient} shadow-lg`
                  : 'bg-background-light dark:bg-background-dark group-hover:bg-border-light dark:group-hover:bg-border-dark'
                }
              `}>
                <span className={`
                  material-symbols-outlined text-xl
                  ${activeTab === tab.id ? 'text-white' : 'text-text-light-secondary dark:text-text-dark-secondary'}
                `}>
                  {tab.icon}
                </span>
              </div>
              
              <span className="relative z-10 hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'ranking' && (
            <GlobalRankingSection
              ranking={data?.ranking || []}
              isLoading={loading}
              onPeriodChange={handlePeriodChange}
            />
          )}

          {activeTab === 'specialties' && (
            <GlobalSpecialtyCharts
              specialties={data?.specialties?.specialties || []}
              subspecialties={data?.specialties?.subspecialties || []}
              isLoading={loading}
            />
          )}

          {activeTab === 'evolution' && (
            <EvolutionOverTimeChart
              bySimulado={data?.evolution?.bySimulado || []}
              byPeriod={data?.evolution?.byPeriod || []}
              bySpecialty={data?.evolution?.bySpecialty || []}
              isLoading={loading}
            />
          )}

          {activeTab === 'compare' && (
            <SimuladoComparisonCharts
              simulados={data?.simuladosList || []}
              isLoading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
