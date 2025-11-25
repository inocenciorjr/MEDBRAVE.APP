'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyAccuracy {
  month: string; // YYYY-MM format
  accuracy: number;
  questions: number;
}

interface AccuracyLineChartProps {
  data: MonthlyAccuracy[];
  showComparison?: boolean;
  comparisonData?: Array<{
    month: string;
    averageAccuracy: number;
  }>;
  loading?: boolean;
}

export function AccuracyLineChart({
  data,
  showComparison = false,
  comparisonData,
  loading = false,
}: AccuracyLineChartProps) {
  const [showGlobalAverage, setShowGlobalAverage] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('year');
  const [globalData, setGlobalData] = useState<Array<{ month: string; averageAccuracy: number }>>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Buscar dados globais quando ativar comparação
  useEffect(() => {
    if (showGlobalAverage && showComparison) {
      loadGlobalData();
    }
  }, [showGlobalAverage, selectedYear, timePeriod, showComparison]);

  const loadGlobalData = async () => {
    try {
      setLoadingGlobal(true);
      const { statisticsService } = await import('@/services/statisticsService');
      
      // Calcular datas baseado no período selecionado
      let startDate: Date;
      let endDate = new Date();
      
      if (timePeriod === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (timePeriod === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        // year
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
      }
      
      const data = await statisticsService.getGlobalAccuracyByMonth(startDate, endDate);
      setGlobalData(data);
    } catch (error) {
      console.error('Erro ao carregar dados globais:', error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  // Extrair anos disponíveis dos dados
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.forEach(item => {
      const year = parseInt(item.month.split('-')[0]);
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // Mais recente primeiro
  }, [data]);

  // Filtrar dados pelo ano selecionado
  const yearData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const filteredData = data.filter(item => item.month.startsWith(selectedYear.toString()));
    
    // Criar array com todos os 12 meses
    return monthNames.map((name, index) => {
      const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
      const monthData = filteredData.find(d => d.month === monthKey);
      const globalMonthData = globalData.find(d => d.month === monthKey);
      
      return {
        month: name,
        userAccuracy: monthData?.accuracy || 0,
        globalAccuracy: globalMonthData?.averageAccuracy || 0,
        questions: monthData?.questions || 0,
        hasData: !!monthData,
      };
    });
  }, [data, globalData, selectedYear]);

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-80 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
          Média Mensal de Acertos
        </h3>
        <div className="flex flex-col items-center justify-center h-80 text-text-light-secondary dark:text-text-dark-secondary">
          <span className="material-symbols-outlined text-5xl mb-2 opacity-50">
            bar_chart
          </span>
          <p>Nenhum dado disponível ainda</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      if (!data.hasData) {
        return (
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 shadow-lg">
            <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              {data.month} {selectedYear}
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              Sem dados neste mês
            </p>
          </div>
        );
      }
      
      return (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            {data.month} {selectedYear}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary"></div>
              <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                Você: <span className="font-bold">{data.userAccuracy.toFixed(1)}%</span>
              </p>
            </div>
            {showGlobalAverage && data.globalAccuracy > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-text-light-secondary dark:bg-text-dark-secondary opacity-60"></div>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Média Global: <span className="font-semibold">{data.globalAccuracy.toFixed(1)}%</span>
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2 pt-2 border-t border-border-light dark:border-border-dark">
            {data.questions} questões respondidas
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            Média Mensal de Acertos
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Acurácia média por mês em {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Período */}
          <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1">
            {(['week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timePeriod === period
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
              >
                {period === 'week' ? 'Semana' : period === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>

          {/* Seletor de Ano (apenas quando período = ano) */}
          {timePeriod === 'year' && availableYears.length > 1 && (
            <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    selectedYear === year
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Toggle Comparação */}
          {showComparison && (
            <button
              onClick={() => setShowGlobalAverage(!showGlobalAverage)}
              disabled={loadingGlobal}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                showGlobalAverage
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-border-light dark:bg-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-border-light/80 dark:hover:bg-border-dark/80'
              }`}
            >
              <span className={`material-symbols-outlined text-lg ${loadingGlobal ? 'animate-spin' : ''}`}>
                {loadingGlobal ? 'refresh' : showGlobalAverage ? 'visibility' : 'visibility_off'}
              </span>
              Comparar
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={yearData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
            opacity={0.3}
          />
          <XAxis
            dataKey="month"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickLine={false}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '13px',
            }}
            iconType="circle"
          />
          <Bar
            dataKey="userAccuracy"
            fill="#8b5cf6"
            radius={[6, 6, 0, 0]}
            name="Sua Média"
            animationDuration={800}
          />
          {showGlobalAverage && (
            <Bar
              dataKey="globalAccuracy"
              fill="#9ca3af"
              radius={[6, 6, 0, 0]}
              name="Média Global"
              opacity={0.6}
              animationDuration={800}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
