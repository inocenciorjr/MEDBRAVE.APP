'use client';

import React, { useState } from 'react';
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

type TimeRange = 'week' | 'month';

interface ChartData {
  period: string;
  questions: number;
  accuracy: number;
}

interface QuestionsPerMonthChartProps {
  weekData?: ChartData[];
  monthData?: ChartData[];
  loading?: boolean;
}

export const QuestionsPerMonthChart = React.memo(function QuestionsPerMonthChart({
  weekData = [],
  monthData = [],
  loading = false,
}: QuestionsPerMonthChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTimeRangeChange = (newRange: TimeRange) => {
    if (newRange === timeRange) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setTimeRange(newRange);
      setTimeout(() => setIsTransitioning(false), 100);
    }, 300);
  };

  const currentData = timeRange === 'week' ? weekData : monthData;

  if (loading) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-border-light dark:bg-border-dark rounded w-1/3"></div>
          <div className="h-8 bg-border-light dark:bg-border-dark rounded w-48 mt-4"></div>
          <div className="h-64 bg-border-light dark:bg-border-dark rounded"></div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            {data.period}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Questões:
                </span>
              </div>
              <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">
                {data.questions}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Acertos:
                </span>
              </div>
              <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">
                {data.accuracy.toFixed(1)}%
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
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Questões Respondidas
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Quantidade e porcentagem de acertos ao longo do tempo
        </p>
      </div>

      {/* Time Range Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleTimeRangeChange('week')}
          disabled={isTransitioning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            timeRange === 'week'
              ? 'bg-primary text-white shadow-md'
              : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/10 hover:text-primary border border-border-light dark:border-border-dark'
          } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">calendar_view_week</span>
          Última Semana
        </button>
        <button
          onClick={() => handleTimeRangeChange('month')}
          disabled={isTransitioning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            timeRange === 'month'
              ? 'bg-primary text-white shadow-md'
              : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/10 hover:text-primary border border-border-light dark:border-border-dark'
          } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined text-sm">calendar_month</span>
          Por Mês
        </button>
      </div>

      {/* Chart with transition */}
      <div
        className={`transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              opacity={0.3}
            />
            <XAxis
              dataKey="period"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickLine={false}
              label={{ value: 'Questões', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#9ca3af' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickLine={false}
              domain={[0, 100]}
              label={{ value: 'Acertos (%)', angle: 90, position: 'insideRight', style: { fontSize: '12px', fill: '#9ca3af' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              iconType="circle"
            />
            <Bar
              yAxisId="left"
              dataKey="questions"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              name="Questões"
              animationDuration={1000}
              maxBarSize={60}
            />
            <Bar
              yAxisId="right"
              dataKey="accuracy"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
              name="Acertos (%)"
              animationDuration={1000}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
