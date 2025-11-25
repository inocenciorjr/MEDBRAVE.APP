'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface ComparisonData {
  period: string;
  accuracy: number;
  questions: number;
}

interface TemporalComparisonChartProps {
  current: { accuracy: number; questions: number };
  days30Ago: { accuracy: number; questions: number } | null;
  days60Ago: { accuracy: number; questions: number } | null;
  days90Ago: { accuracy: number; questions: number } | null;
  loading?: boolean;
}

export function TemporalComparisonChart({
  current,
  days30Ago,
  days60Ago,
  days90Ago,
  loading = false,
}: TemporalComparisonChartProps) {
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

  const data: ComparisonData[] = [
    days90Ago && { period: '90 dias atrás', ...days90Ago },
    days60Ago && { period: '60 dias atrás', ...days60Ago },
    days30Ago && { period: '30 dias atrás', ...days30Ago },
    { period: 'Atual', ...current },
  ].filter(Boolean) as ComparisonData[];

  const getBarColor = (index: number) => {
    const colors = ['#9ca3af', '#a855f7', '#8b5cf6', '#7c3aed'];
    return colors[index] || '#8b5cf6';
  };

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
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Acurácia:
              </span>
              <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">
                {data.accuracy.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Questões:
              </span>
              <span className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">
                {data.questions}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular evolução
  const accuracyChange = days30Ago 
    ? ((current.accuracy - days30Ago.accuracy) / days30Ago.accuracy) * 100 
    : 0;
  const questionsChange = days30Ago 
    ? ((current.questions - days30Ago.questions) / days30Ago.questions) * 100 
    : 0;

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-lg dark:shadow-dark-lg transition-all duration-300 hover:shadow-xl dark:hover:shadow-dark-xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
          Você vs Você
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Evolução temporal do seu desempenho
        </p>
      </div>

      {/* Evolution Cards */}
      {days30Ago && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Evolução Acurácia
              </span>
              <span className={`flex items-center gap-1 text-xs font-semibold ${
                accuracyChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {accuracyChange >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {Math.abs(accuracyChange).toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {current.accuracy.toFixed(1)}%
            </div>
          </div>

          <div className="p-4 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Evolução Questões
              </span>
              <span className={`flex items-center gap-1 text-xs font-semibold ${
                questionsChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {questionsChange >= 0 ? 'trending_up' : 'trending_down'}
                </span>
                {Math.abs(questionsChange).toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {current.questions}
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            dataKey="accuracy"
            radius={[8, 8, 0, 0]}
            name="Acurácia (%)"
            animationDuration={1000}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
