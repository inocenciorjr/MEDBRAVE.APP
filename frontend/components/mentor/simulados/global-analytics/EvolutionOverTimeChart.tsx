'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import { formatPercentSimple } from '@/lib/utils/formatPercent';

interface EvolutionBySimulado {
  simuladoId: string;
  simuladoName: string;
  date: string;
  averageScore: number;
  participantsCount: number;
  completionRate: number;
}

interface EvolutionByPeriod {
  period: string;
  periodLabel: string;
  averageScore: number;
  totalResponses: number;
  accuracy: number;
}

interface EvolutionBySpecialty {
  filterId: string;
  filterName: string;
  evolution: Array<{
    date: string;
    simuladoName: string;
    accuracy: number;
  }>;
}

interface EvolutionOverTimeChartProps {
  bySimulado: EvolutionBySimulado[];
  byPeriod: EvolutionByPeriod[];
  bySpecialty: EvolutionBySpecialty[];
  isLoading: boolean;
}

const SPECIALTY_COLORS: Record<string, string> = {
  'Cirurgia': '#8b5cf6',
  'ClinicaMedica': '#3b82f6',
  'Ginecologia': '#10b981',
  'Obstetricia': '#f59e0b',
  'MedicinaPreventiva': '#ef4444',
  'Pediatria': '#ec4899',
};

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export function EvolutionOverTimeChart({ bySimulado, byPeriod, bySpecialty, isLoading }: EvolutionOverTimeChartProps) {
  const [viewMode, setViewMode] = useState<'simulado' | 'period' | 'specialty'>('simulado');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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

  if (bySimulado.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                      dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">trending_up</span>
        </div>
        <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
          Dados de evolução não disponíveis
        </p>
      </div>
    );
  }

  const simuladoData = bySimulado.map(s => ({
    name: s.simuladoName.length > 15 ? s.simuladoName.substring(0, 15) + '...' : s.simuladoName,
    fullName: s.simuladoName,
    date: formatDate(s.date),
    score: s.averageScore,
    participants: s.participantsCount,
    completion: s.completionRate
  }));

  const viewModes = [
    { id: 'simulado', label: 'Por Simulado', icon: 'quiz' },
    { id: 'period', label: 'Por Período', icon: 'calendar_month' },
    { id: 'specialty', label: 'Por Especialidade', icon: 'medical_services' }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 
                        flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <span className="material-symbols-outlined text-white">trending_up</span>
          </div>
          <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Evolução ao Longo do Tempo
          </h4>
        </div>
        <div className="flex gap-2">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2
                ${viewMode === mode.id
                  ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30'
                  : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border-2 border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
            >
              <span className="material-symbols-outlined text-lg">{mode.icon}</span>
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl p-6 border-2 border-border-light dark:border-border-dark shadow-xl dark:shadow-dark-xl">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'simulado' ? (
              <AreaChart data={simuladoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" name="Média" stroke="#8b5cf6" strokeWidth={3}
                      fill="url(#scoreGradient)" dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }} />
              </AreaChart>
            ) : viewMode === 'period' ? (
              <LineChart data={byPeriod} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="averageScore" name="Média" stroke="#8b5cf6" strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }} activeDot={{ r: 8 }} />
              </LineChart>
            ) : (
              <LineChart 
                data={bySpecialty[0]?.evolution || []}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="simuladoName" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {bySpecialty.slice(0, 6).map((specialty, index) => (
                  <Line
                    key={specialty.filterId}
                    data={specialty.evolution}
                    type="monotone"
                    dataKey="accuracy"
                    name={specialty.filterName}
                    stroke={SPECIALTY_COLORS[specialty.filterId] || COLORS[index]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Simulados */}
      {viewMode === 'simulado' && (
        <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                      rounded-2xl overflow-hidden border-2 border-border-light dark:border-border-dark shadow-xl">
          <div className="grid grid-cols-5 gap-4 p-4 bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 
                        text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary uppercase">
            <div className="col-span-2">Simulado</div>
            <div className="text-center">Data</div>
            <div className="text-center">Participantes</div>
            <div className="text-center">Média</div>
          </div>
          <div className="divide-y divide-border-light/50 dark:divide-border-dark/50 max-h-[300px] overflow-y-auto">
            {bySimulado.map((sim, index) => (
              <div key={sim.simuladoId}
                   className="grid grid-cols-5 gap-4 p-4 items-center hover:bg-primary/5 transition-all animate-fadeIn"
                   style={{ animationDelay: `${index * 30}ms` }}>
                <div className="col-span-2 font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                  {sim.simuladoName}
                </div>
                <div className="text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  {formatDate(sim.date)}
                </div>
                <div className="text-center">
                  <span className="px-2 py-1 rounded-lg bg-background-light dark:bg-background-dark text-sm font-semibold">
                    {sim.participantsCount}
                  </span>
                </div>
                <div className="text-center">
                  <span className={`text-lg font-bold ${
                    sim.averageScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
                    sim.averageScore >= 50 ? 'text-amber-600 dark:text-amber-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {formatPercentSimple(sim.averageScore)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
