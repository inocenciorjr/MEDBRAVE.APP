'use client';

import React, { useState, useEffect } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { studySessionService } from '@/services/studySessionService';

interface StudyTimeChartProps {
  averageDailyStudyTime?: number;
  daysStudied?: number;
}

interface StudyTimeData {
  date: string;
  minutes: number;
  sessions: number;
}

export function StudyTimeChart({ averageDailyStudyTime = 0, daysStudied = 0 }: StudyTimeChartProps) {
  const [data, setData] = useState<StudyTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  useEffect(() => {
    loadData();
    
    // Atualizar a cada 1 minuto
    const interval = setInterval(loadData, 60000);
    
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await studySessionService.getStudyTimeByDay(timeRange);
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dados de tempo de estudo:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-64 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  const formatDate = (dateStr: string) => {
    // Parse da data no formato YYYY-MM-DD sem conversão de timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
    return `${dayNum} ${monthName}`;
  };

  // Calcular estatísticas
  const totalMinutes = data.reduce((acc, d) => acc + d.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgMinutes = data.length > 0 ? Math.round(totalMinutes / data.length) : 0;
  const maxMinutes = Math.max(...data.map(d => d.minutes), 0);
  const daysWithStudy = data.filter(d => d.minutes > 0).length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4 shadow-xl">
          <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
            {formatDate(data.date)}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Tempo:
                </span>
              </div>
              <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                {formatTime(data.minutes)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Sessões:
                </span>
              </div>
              <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                {data.sessions}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg transition-all duration-300 hover:shadow-xl dark:hover:shadow-dark-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            Tempo de Estudo
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Evolução do seu tempo de estudo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`p-2 rounded-md transition-all ${
                chartType === 'area'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
              title="Gráfico de área"
            >
              <span className="material-symbols-outlined text-sm">show_chart</span>
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded-md transition-all ${
                chartType === 'bar'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
              title="Gráfico de barras"
            >
              <span className="material-symbols-outlined text-sm">bar_chart</span>
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === days
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">schedule</span>
            <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Total
            </span>
          </div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {totalHours}h
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-green-500 text-lg">trending_up</span>
            <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Média/Dia
            </span>
          </div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {formatTime(avgMinutes)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-blue-500 text-lg">calendar_today</span>
            <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Dias Ativos
            </span>
          </div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {daysWithStudy}/{timeRange}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10 rounded-lg p-4 border border-orange-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-orange-500 text-lg">star</span>
            <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Recorde
            </span>
          </div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {formatTime(maxMinutes)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '11px' }}
            tickLine={false}
            tickFormatter={formatDate}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '11px' }}
            tickLine={false}
            tickFormatter={(value) => {
              const hours = Math.floor(value / 60);
              return hours > 0 ? `${hours}h` : `${value}m`;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgMinutes}
            stroke="#10b981"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: `Média: ${formatTime(avgMinutes)}`,
              position: 'insideTopRight',
              fill: '#10b981',
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          {chartType === 'area' ? (
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#colorMinutes)"
              animationDuration={1000}
            />
          ) : (
            <Bar
              dataKey="minutes"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
          )}
          <Line
            type="monotone"
            dataKey="sessions"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            yAxisId="right"
            hide
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
