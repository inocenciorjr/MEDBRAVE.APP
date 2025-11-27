'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface ReviewsData {
  total: number;
  byType: {
    questions: number;
    flashcards: number;
    errorNotebook: number;
  };
}

interface ReviewsChartProps {
  data: ReviewsData;
  loading?: boolean;
}

const COLORS = {
  questions: '#8b5cf6',
  flashcards: '#10b981',
  errorNotebook: '#f59e0b',
};

const LABELS = {
  questions: 'Questões',
  flashcards: 'Flashcards',
  errorNotebook: 'Caderno de Erros',
};

export function ReviewsChart({ data, loading = false }: ReviewsChartProps) {
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

  const chartData = [
    { name: LABELS.questions, value: data.byType.questions, color: COLORS.questions },
    { name: LABELS.flashcards, value: data.byType.flashcards, color: COLORS.flashcards },
    { name: LABELS.errorNotebook, value: data.byType.errorNotebook, color: COLORS.errorNotebook },
  ].filter(item => item.value > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / data.total) * 100).toFixed(1);
      return (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3 shadow-xl">
          <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            {payload[0].name}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Revisões:
              </span>
              <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">
                {payload[0].value}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Percentual:
              </span>
              <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">
                {percentage}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    const percentage = ((entry.value / data.total) * 100).toFixed(0);
    return `${percentage}%`;
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg transition-all duration-300 hover:shadow-xl dark:hover:shadow-dark-xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Revisões por Tipo
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Distribuição das suas revisões
        </p>
      </div>

      {/* Total */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-primary mb-1">
          {data.total}
        </div>
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          revisões totais
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-12 text-text-light-secondary dark:text-text-dark-secondary">
          Nenhuma revisão realizada ainda
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border-light dark:border-border-dark">
        <div className="text-center">
          <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
            {data.byType.questions}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Questões
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
            {data.byType.flashcards}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Flashcards
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
            {data.byType.errorNotebook}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            Cad. Erros
          </div>
        </div>
      </div>
    </div>
  );
}
