'use client';

import { useMemo } from 'react';
import { BookOpen, Target, Clock, Users, TrendingUp } from 'lucide-react';
import { MenteeStatCard, statCardPresets } from '../MenteeStatCard';
import { MenteePerformanceData } from '@/lib/services/mentorAnalyticsService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface MenteeOverviewTabProps {
  performance: MenteePerformanceData | null;
  menteeStatus: string;
  daysRemaining: number | null;
}

export function MenteeOverviewTab({ performance, menteeStatus, daysRemaining }: MenteeOverviewTabProps) {
  const evolutionChartData = useMemo(() => {
    if (!performance?.evolution) return [];
    return performance.evolution.map(e => ({
      name: e.simuladoName.length > 15 ? e.simuladoName.substring(0, 15) + '...' : e.simuladoName,
      score: e.score,
      acertos: e.correctAnswers,
      total: e.totalQuestions,
      tempo: Math.round(e.timeSpentSeconds / 60),
    }));
  }, [performance?.evolution]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Ativo',
      active: 'Ativo',
      SUSPENDED: 'Suspenso',
      suspended: 'Suspenso',
      EXPIRED: 'Expirado',
      expired: 'Expirado',
      CANCELLED: 'Cancelado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MenteeStatCard 
          icon={BookOpen} 
          label="Simulados" 
          value={performance?.completedSimulados || 0}
          subtitle={`de ${performance?.totalSimulados || 0}`}
          {...statCardPresets.blue}
        />
        <MenteeStatCard 
          icon={Target} 
          label="Média de Acertos" 
          value={`${Math.round(performance?.averageScore || 0)}%`}
          {...statCardPresets.green}
        />
        <MenteeStatCard 
          icon={Clock} 
          label="Dias Restantes" 
          value={daysRemaining !== null ? (daysRemaining > 0 ? daysRemaining : 0) : '-'}
          {...statCardPresets.purple}
        />
        <MenteeStatCard 
          icon={Users} 
          label="Status" 
          value={getStatusLabel(menteeStatus)}
          {...statCardPresets.orange}
        />
      </div>

      {/* Evolution Chart */}
      {evolutionChartData.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 
                            flex items-center justify-center shadow-lg shadow-violet-500/30">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Evolução nos Simulados
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  Acompanhe o progresso ao longo do tempo
                </p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionChartData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="currentColor" className="text-border-light dark:text-border-dark" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'currentColor' }} 
                  className="text-text-light-secondary dark:text-text-dark-secondary"
                  axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                  tickLine={{ stroke: 'currentColor', opacity: 0.2 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-text-light-secondary dark:text-text-dark-secondary"
                  axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                  tickLine={{ stroke: 'currentColor', opacity: 0.2 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'score' ? `${value}%` : value,
                    name === 'score' ? 'Pontuação' : name
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--surface-light)',
                    borderColor: 'var(--border-light)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  name="Pontuação %" 
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 8, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                  fill="url(#scoreGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Empty State */}
      {evolutionChartData.length === 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-slate-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-slate-500/10 
                      rounded-2xl p-12 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-slate-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                          dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
              Nenhum dado de evolução
            </h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
              Os dados de evolução aparecerão quando o mentorado completar simulados.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
