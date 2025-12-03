'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';

interface SpecialtyStat {
  filterId: string;
  filterName: string;
  totalQuestions: number;
  totalResponses: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  averageTimeSeconds: number;
}

interface SimuladoSpecialtyChartsProps {
  simuladoId: string;
  specialtyStats: SpecialtyStat[];
}

const COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export function SimuladoSpecialtyCharts({ specialtyStats }: SimuladoSpecialtyChartsProps) {
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'pie' | 'line'>('bar');

  if (specialtyStats.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                      dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">
            medical_services
          </span>
        </div>
        <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
          Nenhuma estatística por especialidade disponível
        </p>
      </div>
    );
  }

  // Preparar dados para os gráficos
  const chartData = specialtyStats.map((stat, index) => ({
    name: stat.filterName.length > 15 ? stat.filterName.substring(0, 15) + '...' : stat.filterName,
    fullName: stat.filterName,
    accuracy: stat.accuracy,
    questions: stat.totalQuestions,
    responses: stat.totalResponses,
    correct: stat.correctCount,
    incorrect: stat.incorrectCount,
    avgTime: Math.round(stat.averageTimeSeconds / 60),
    color: COLORS[index % COLORS.length]
  }));

  // Dados para o gráfico de pizza (distribuição de questões)
  const pieData = specialtyStats.map((stat, index) => ({
    name: stat.filterName,
    value: stat.totalQuestions,
    color: COLORS[index % COLORS.length]
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                      rounded-xl p-4 shadow-xl dark:shadow-dark-xl">
          <p className="font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
            {data.fullName || data.name}
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-text-light-secondary dark:text-text-dark-secondary flex justify-between gap-4">
              <span>Acurácia:</span>
              <span className="font-bold text-primary">{data.accuracy?.toFixed(1)}%</span>
            </p>
            <p className="text-text-light-secondary dark:text-text-dark-secondary flex justify-between gap-4">
              <span>Questões:</span>
              <span className="font-bold">{data.questions}</span>
            </p>
            <p className="text-text-light-secondary dark:text-text-dark-secondary flex justify-between gap-4">
              <span>Acertos:</span>
              <span className="font-bold text-emerald-600">{data.correct}</span>
            </p>
            <p className="text-text-light-secondary dark:text-text-dark-secondary flex justify-between gap-4">
              <span>Erros:</span>
              <span className="font-bold text-red-600">{data.incorrect}</span>
            </p>
            {data.avgTime > 0 && (
              <p className="text-text-light-secondary dark:text-text-dark-secondary flex justify-between gap-4">
                <span>Tempo médio:</span>
                <span className="font-bold">{data.avgTime}min</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartTypeButtons = [
    { id: 'bar', icon: 'bar_chart', label: 'Barras', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'radar', icon: 'radar', label: 'Radar', gradient: 'from-violet-500 to-purple-500' },
    { id: 'pie', icon: 'pie_chart', label: 'Pizza', gradient: 'from-pink-500 to-rose-500' },
    { id: 'line', icon: 'show_chart', label: 'Linha', gradient: 'from-emerald-500 to-green-500' }
  ] as const;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (accuracy >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Calcular estatísticas
  const bestPerformance = specialtyStats.reduce((best, curr) => curr.accuracy > best.accuracy ? curr : best, specialtyStats[0]);
  const worstPerformance = specialtyStats.reduce((worst, curr) => curr.accuracy < worst.accuracy ? curr : worst, specialtyStats[0]);
  const averageAccuracy = specialtyStats.reduce((sum, s) => sum + s.accuracy, 0) / specialtyStats.length;

  return (
    <div className="space-y-6">
      {/* Seletor de Tipo de Gráfico */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 
                        flex items-center justify-center shadow-lg shadow-pink-500/30">
            <span className="material-symbols-outlined text-white">medical_services</span>
          </div>
          <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Desempenho por Especialidade
          </h4>
        </div>
        <div className="flex gap-2">
          {chartTypeButtons.map((type) => (
            <button
              key={type.id}
              onClick={() => setChartType(type.id)}
              className={`
                p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105
                ${chartType === type.id
                  ? `bg-gradient-to-r ${type.gradient} text-white shadow-lg`
                  : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border-2 border-border-light dark:border-border-dark hover:border-primary/50'
                }
              `}
              title={type.label}
            >
              <span className="material-symbols-outlined">{type.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accuracy" radius={[8, 8, 0, 0]} animationDuration={800}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : chartType === 'radar' ? (
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Acurácia"
                  dataKey="accuracy"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.5}
                  animationDuration={800}
                />
                <Legend />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            ) : chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) => 
                    `${(name || '').substring(0, 10)}${(name || '').length > 10 ? '...' : ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                  animationDuration={800}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Detalhes */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl overflow-hidden border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        {/* Header */}
        <div className="grid grid-cols-6 gap-4 p-5 bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 
                      text-sm font-bold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
          <div className="col-span-2">Especialidade</div>
          <div className="text-center">Questões</div>
          <div className="text-center">Acertos</div>
          <div className="text-center">Erros</div>
          <div className="text-center">Acurácia</div>
        </div>

        <div className="divide-y divide-border-light/50 dark:divide-border-dark/50">
          {specialtyStats.map((stat, index) => (
            <div 
              key={stat.filterId} 
              className="grid grid-cols-6 gap-4 p-5 items-center hover:bg-primary/5 dark:hover:bg-primary/10 
                       transition-all duration-200 animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="col-span-2 flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-md" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-text-light-primary dark:text-text-dark-primary font-medium truncate">
                  {stat.filterName}
                </span>
              </div>
              <div className="text-center">
                <span className="px-3 py-1.5 rounded-lg bg-background-light dark:bg-background-dark
                               text-text-light-primary dark:text-text-dark-primary font-semibold
                               border border-border-light dark:border-border-dark">
                  {stat.totalQuestions}
                </span>
              </div>
              <div className="text-center text-emerald-600 dark:text-emerald-400 font-bold">
                {stat.correctCount}
              </div>
              <div className="text-center text-red-600 dark:text-red-400 font-bold">
                {stat.incorrectCount}
              </div>
              <div className="text-center">
                <span className={`font-bold text-lg ${getAccuracyColor(stat.accuracy)}`}>
                  {stat.accuracy.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50 
                      dark:from-emerald-900/20 dark:via-green-900/20 dark:to-emerald-900/20 
                      rounded-2xl p-5 border-2 border-emerald-200 dark:border-emerald-800/50
                      shadow-xl shadow-emerald-500/10 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-xl" />
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
            Melhor Desempenho
          </p>
          <p className="font-bold text-text-light-primary dark:text-text-dark-primary truncate mb-1">
            {bestPerformance?.filterName || '-'}
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {bestPerformance?.accuracy.toFixed(1)}%
          </p>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-rose-50 to-red-50 
                      dark:from-red-900/20 dark:via-rose-900/20 dark:to-red-900/20 
                      rounded-2xl p-5 border-2 border-red-200 dark:border-red-800/50
                      shadow-xl shadow-red-500/10 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-xl" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
            Pior Desempenho
          </p>
          <p className="font-bold text-text-light-primary dark:text-text-dark-primary truncate mb-1">
            {worstPerformance?.filterName || '-'}
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {worstPerformance?.accuracy.toFixed(1)}%
          </p>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-violet-50 
                      dark:from-violet-900/20 dark:via-purple-900/20 dark:to-violet-900/20 
                      rounded-2xl p-5 border-2 border-violet-200 dark:border-violet-800/50
                      shadow-xl shadow-violet-500/10 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-xl" />
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">
            Média Geral
          </p>
          <p className="text-2xl font-bold text-primary mt-4">
            {averageAccuracy.toFixed(1)}%
          </p>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 
                      dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-blue-900/20 
                      rounded-2xl p-5 border-2 border-blue-200 dark:border-blue-800/50
                      shadow-xl shadow-blue-500/10 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-xl" />
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
            Especialidades
          </p>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mt-4">
            {specialtyStats.length}
          </p>
        </div>
      </div>
    </div>
  );
}
