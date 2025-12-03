'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { pluralizeCommon } from '@/lib/utils/pluralize';

interface GlobalSpecialtyStatItem {
  filterId: string;
  filterName: string;
  totalQuestions: number;
  totalResponses: number;
  correctCount: number;
  accuracy: number;
  averageTimeSeconds: number;
  trend: 'up' | 'down' | 'stable';
}

interface GlobalSubspecialtyStatItem {
  subFilterId: string;
  subFilterName: string;
  filterId: string;
  level: string;
  totalQuestions: number;
  totalResponses: number;
  correctCount: number;
  accuracy: number;
}

interface GlobalSpecialtyChartsProps {
  specialties: GlobalSpecialtyStatItem[];
  subspecialties: GlobalSubspecialtyStatItem[];
  isLoading: boolean;
}

const SPECIALTY_COLORS: Record<string, string> = {
  'Cirurgia': '#8b5cf6',
  'ClinicaMedica': '#3b82f6',
  'Ginecologia': '#10b981',
  'Obstetricia': '#f59e0b',
  'MedicinaPreventiva': '#ef4444',
  'Pediatria': '#ec4899',
  'Outros': '#06b6d4',
};

const SPECIALTY_NAMES: Record<string, string> = {
  'Cirurgia': 'Cirurgia',
  'ClinicaMedica': 'Clínica Médica',
  'Ginecologia': 'Ginecologia',
  'Obstetricia': 'Obstetrícia',
  'MedicinaPreventiva': 'Medicina Preventiva',
  'Pediatria': 'Pediatria',
  'Outros': 'Outros',
};

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export function GlobalSpecialtyCharts({ specialties, subspecialties, isLoading }: GlobalSpecialtyChartsProps) {
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'pie'>('bar');
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set());

  const chartData = useMemo(() => {
    return specialties.map((stat, index) => ({
      name: stat.filterName.length > 12 ? stat.filterName.substring(0, 12) + '...' : stat.filterName,
      fullName: stat.filterName,
      accuracy: stat.accuracy,
      questions: stat.totalQuestions,
      responses: stat.totalResponses,
      correct: stat.correctCount,
      color: SPECIALTY_COLORS[stat.filterId] || COLORS[index % COLORS.length]
    }));
  }, [specialties]);

  const groupedSubspecialties = useMemo(() => {
    const groups = new Map<string, GlobalSubspecialtyStatItem[]>();
    subspecialties.forEach(sub => {
      if (!groups.has(sub.filterId)) {
        groups.set(sub.filterId, []);
      }
      groups.get(sub.filterId)!.push(sub);
    });
    groups.forEach(subs => subs.sort((a, b) => a.subFilterName.localeCompare(b.subFilterName, 'pt-BR')));
    return groups;
  }, [subspecialties]);

  const toggleSpecialty = (filterId: string) => {
    setExpandedSpecialties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) newSet.delete(filterId);
      else newSet.add(filterId);
      return newSet;
    });
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (accuracy >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAccuracyGradient = (accuracy: number) => {
    if (accuracy >= 70) return 'from-emerald-500 to-green-500';
    if (accuracy >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                      rounded-xl p-4 shadow-xl dark:shadow-dark-xl">
          <p className="font-bold text-text-light-primary dark:text-text-dark-primary mb-2">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Acurácia: <span className="font-bold text-primary">{data.accuracy?.toFixed(1)}%</span>
            </p>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Questões: <span className="font-bold">{data.questions}</span>
            </p>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              Acertos: <span className="font-bold text-emerald-600">{data.correct}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-80 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
        <div className="animate-pulse h-64 bg-gradient-to-r from-border-light to-border-light/50 
                      dark:from-border-dark dark:to-border-dark/50 rounded-2xl" />
      </div>
    );
  }

  if (specialties.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                      dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">medical_services</span>
        </div>
        <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
          Nenhuma estatística por especialidade disponível
        </p>
      </div>
    );
  }

  const chartTypeButtons = [
    { id: 'bar', icon: 'bar_chart', label: 'Barras' },
    { id: 'radar', icon: 'radar', label: 'Radar' },
    { id: 'pie', icon: 'pie_chart', label: 'Pizza' }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 
                        flex items-center justify-center shadow-lg shadow-pink-500/30">
            <span className="material-symbols-outlined text-white">medical_services</span>
          </div>
          <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Desempenho Global por Especialidade
          </h4>
        </div>
        <div className="flex gap-2">
          {chartTypeButtons.map((type) => (
            <button
              key={type.id}
              onClick={() => setChartType(type.id)}
              className={`p-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105
                ${chartType === type.id
                  ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg'
                  : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border-2 border-border-light dark:border-border-dark'
                }`}
              title={type.label}
            >
              <span className="material-symbols-outlined">{type.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl p-6 border-2 border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
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
                <Radar name="Acurácia" dataKey="accuracy" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                <Legend />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: any) => `${name} ${value?.toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="accuracy"
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accordion de Subespecialidades */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 
                        flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="material-symbols-outlined text-white">category</span>
          </div>
          <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Detalhamento por Subespecialidade
          </h4>
        </div>

        {specialties.map((specialty) => {
          const subs = groupedSubspecialties.get(specialty.filterId) || [];
          const isExpanded = expandedSpecialties.has(specialty.filterId);
          const color = SPECIALTY_COLORS[specialty.filterId] || '#6366f1';

          return (
            <div key={specialty.filterId}
                 className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark
                          rounded-2xl border-2 border-border-light dark:border-border-dark shadow-lg overflow-hidden">
              <button
                onClick={() => toggleSpecialty(specialty.filterId)}
                className="w-full p-5 flex items-center justify-between hover:bg-primary/5 dark:hover:bg-primary/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 rounded-full shadow-md" style={{ backgroundColor: color }} />
                  <div className="text-left">
                    <h5 className="font-bold text-text-light-primary dark:text-text-dark-primary text-lg">
                      {SPECIALTY_NAMES[specialty.filterId] || specialty.filterName}
                    </h5>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      {subs.length} subespecialidades • {pluralizeCommon.questao(specialty.totalQuestions)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-bold ${getAccuracyColor(specialty.accuracy)}`}>
                    {specialty.accuracy.toFixed(1)}%
                  </span>
                  <span className={`material-symbols-outlined text-2xl transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-5 space-y-3 border-t border-border-light/50 dark:border-border-dark/50 pt-4 max-h-[350px] overflow-y-auto">
                  {subs.map((sub) => (
                    <div key={sub.subFilterId}
                         className="p-4 rounded-xl bg-background-light dark:bg-background-dark border border-border-light/50 dark:border-border-dark/50"
                         style={{ borderLeftWidth: '4px', borderLeftColor: color }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">{sub.subFilterName}</span>
                        <span className={`text-lg font-bold ${getAccuracyColor(sub.accuracy)}`}>{sub.accuracy.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
                        <span className="px-2 py-1 rounded bg-surface-light dark:bg-surface-dark">{pluralizeCommon.questao(sub.totalQuestions)}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{pluralizeCommon.acerto(sub.correctCount)}</span>
                      </div>
                      <div className="h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${getAccuracyGradient(sub.accuracy)}`}
                             style={{ width: `${sub.accuracy}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
