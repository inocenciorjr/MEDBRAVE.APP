'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface SimuladoOption {
  id: string;
  name: string;
  date: string;
}

interface SimuladoComparisonItem {
  id: string;
  name: string;
  date: string;
  participantsCount: number;
  averageScore: number;
  specialtyBreakdown: Array<{
    filterId: string;
    filterName: string;
    accuracy: number;
  }>;
}

interface ComparisonData {
  specialty: string;
  [simuladoName: string]: number | string;
}

interface SimuladoComparisonChartsProps {
  simulados: SimuladoOption[];
  isLoading: boolean;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function SimuladoComparisonCharts({ simulados, isLoading }: SimuladoComparisonChartsProps) {
  const { token } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<{
    simulados: SimuladoComparisonItem[];
    comparisonData: ComparisonData[];
  } | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const toggleSimulado = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 5) {
        return prev; // Máximo 5 simulados
      }
      return [...prev, id];
    });
  };

  const loadComparison = async () => {
    if (selectedIds.length < 2 || !token) return;

    setLoadingComparison(true);
    try {
      const response = await fetch('/api/mentorship/analytics/global/compare', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ simuladoIds: selectedIds })
      });

      if (response.ok) {
        const data = await response.json();
        setComparisonData(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar comparação:', error);
    } finally {
      setLoadingComparison(false);
    }
  };

  useEffect(() => {
    if (selectedIds.length >= 2) {
      loadComparison();
    } else {
      setComparisonData(null);
    }
  }, [selectedIds]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                      rounded-xl p-4 shadow-xl dark:shadow-dark-xl">
          <p className="font-bold text-text-light-primary dark:text-text-dark-primary mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value?.toFixed(1)}%</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse h-96 bg-gradient-to-r from-border-light to-border-light/50 
                    dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
    );
  }

  if (simulados.length < 2) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                      dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">compare</span>
        </div>
        <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
          Crie pelo menos 2 simulados para comparar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 
                      flex items-center justify-center shadow-lg shadow-blue-500/30">
          <span className="material-symbols-outlined text-white">compare</span>
        </div>
        <div>
          <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Comparar Simulados
          </h4>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Selecione 2 a 5 simulados para comparar
          </p>
        </div>
      </div>

      {/* Seletor de Simulados */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl p-5 border-2 border-border-light dark:border-border-dark shadow-xl">
        <div className="flex flex-wrap gap-3">
          {simulados.map((sim) => {
            const isSelected = selectedIds.includes(sim.id);
            const colorIndex = selectedIds.indexOf(sim.id);

            return (
              <button
                key={sim.id}
                onClick={() => toggleSimulado(sim.id)}
                disabled={!isSelected && selectedIds.length >= 5}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 
                          border-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                  ${isSelected
                    ? 'text-white shadow-lg'
                    : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border-border-light dark:border-border-dark hover:border-primary/50'
                  }`}
                style={isSelected ? {
                  backgroundColor: COLORS[colorIndex],
                  borderColor: COLORS[colorIndex]
                } : {}}
              >
                {isSelected && (
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                )}
                <span className="truncate max-w-[150px]">{sim.name}</span>
                <span className="text-xs opacity-70">{formatDate(sim.date)}</span>
              </button>
            );
          })}
        </div>

        {selectedIds.length > 0 && selectedIds.length < 2 && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            Selecione pelo menos mais {2 - selectedIds.length} simulado(s) para comparar
          </p>
        )}
      </div>

      {/* Gráfico de Comparação */}
      {loadingComparison ? (
        <div className="animate-pulse h-80 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
      ) : comparisonData && comparisonData.comparisonData.length > 0 ? (
        <>
          <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                        rounded-2xl p-6 border-2 border-border-light dark:border-border-dark shadow-xl">
            <h5 className="text-md font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
              Comparação por Especialidade
            </h5>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData.comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="specialty" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {comparisonData.simulados.map((sim, index) => (
                    <Bar
                      key={sim.id}
                      dataKey={sim.name}
                      fill={COLORS[index % COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonData.simulados.map((sim, index) => (
              <div key={sim.id}
                   className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark
                            rounded-2xl p-5 border-2 shadow-lg"
                   style={{ borderColor: COLORS[index % COLORS.length] }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <h6 className="font-bold text-text-light-primary dark:text-text-dark-primary truncate">
                    {sim.name}
                  </h6>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Média Geral</span>
                    <span className={`font-bold ${
                      sim.averageScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
                      sim.averageScore >= 50 ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {formatPercentSimple(sim.averageScore)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Participantes</span>
                    <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                      {sim.participantsCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Data</span>
                    <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                      {formatDate(sim.date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : selectedIds.length >= 2 ? (
        <div className="text-center py-12 text-text-light-secondary dark:text-text-dark-secondary">
          Nenhum dado de comparação disponível para os simulados selecionados
        </div>
      ) : null}
    </div>
  );
}
