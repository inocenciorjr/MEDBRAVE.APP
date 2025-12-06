'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { studySessionService } from '@/services/studySessionService';

interface StudyTimeData {
  date: string;
  minutes: number;
  sessions: number;
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
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
  return `${dayNum} ${monthName}`;
};

// Tooltip definido fora do componente para evitar re-criação
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 shadow-xl">
        <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
          {formatDate(d.date)}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Tempo:</span>
          <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
            {formatTime(d.minutes)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function StudyTimeChartCompact() {
  const [data, setData] = useState<StudyTimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const loadData = useCallback(async (days: number, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const result = await studySessionService.getStudyTimeByDay(days);
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dados de tempo de estudo:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(timeRange, true);
    const interval = setInterval(() => loadData(timeRange, false), 60000);
    return () => clearInterval(interval);
  }, [timeRange, loadData]);

  const avgMinutes = useMemo(() => 
    data.length > 0 ? Math.round(data.reduce((acc, d) => acc + d.minutes, 0) / data.length) : 0
  , [data]);

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-xl dark:shadow-dark-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-40 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-xl dark:shadow-dark-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Tempo de Estudo
        </h2>
        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1">
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-md transition-all ${
                chartType === 'area'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">show_chart</span>
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md transition-all ${
                chartType === 'bar'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">bar_chart</span>
            </button>
          </div>
          {/* Time Range */}
          <div className="flex items-center gap-1 bg-background-light dark:bg-background-dark rounded-lg p-1">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                onClick={() => setTimeRange(days)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
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

      {/* Botão Ver Métricas */}
      <div className="flex justify-end mb-3">
        <a
          href="/statistics"
          className="group px-3 py-1.5 rounded-lg text-sm font-display font-medium 
                     bg-primary/10 dark:bg-primary/20 text-primary 
                     hover:bg-primary hover:text-white
                     border border-primary/20 hover:border-primary
                     shadow-sm hover:shadow-md hover:shadow-primary/20
                     transition-all duration-300 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-base">analytics</span>
          Ver métricas
          <span className="material-symbols-outlined text-base transition-transform duration-300 group-hover:translate-x-0.5">
            chevron_right
          </span>
        </a>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="colorMinutesCompact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '10px' }}
            tickLine={false}
            tickFormatter={formatDate}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '10px' }}
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
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          {chartType === 'area' ? (
            <Area
              type="monotone"
              dataKey="minutes"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#colorMinutesCompact)"
              animationDuration={800}
            />
          ) : (
            <Bar dataKey="minutes" fill="#8b5cf6" radius={[6, 6, 0, 0]} animationDuration={800} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
