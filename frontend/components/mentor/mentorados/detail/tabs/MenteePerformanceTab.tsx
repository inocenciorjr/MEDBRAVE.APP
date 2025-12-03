'use client';

import { useState, useMemo } from 'react';
import { Award, ChevronDown, ChevronUp } from 'lucide-react';
import { MenteePerformanceData, SubjectPerformance } from '@/lib/services/mentorAnalyticsService';
import { pluralizeCommon } from '@/lib/utils/pluralize';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

interface MenteePerformanceTabProps {
  performance: MenteePerformanceData | null;
  isLoading: boolean;
}

// Cores por especialidade
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

const SPECIALTY_ORDER = ['Cirurgia', 'ClinicaMedica', 'Ginecologia', 'Obstetricia', 'MedicinaPreventiva', 'Pediatria', 'Outros'];

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6'];

export function MenteePerformanceTab({ performance, isLoading }: MenteePerformanceTabProps) {
  const [activeSection, setActiveSection] = useState<'specialty' | 'subspecialty'>('specialty');
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set());

  // Agrupar por especialidade (filterId) para a seção de subespecialidades
  const groupedBySpecialty = useMemo(() => {
    if (!performance?.performanceBySubject) return new Map<string, SubjectPerformance[]>();
    
    const groups = new Map<string, SubjectPerformance[]>();
    
    performance.performanceBySubject.forEach(stat => {
      // Usar filterId do backend ou extrair do subFilterId como fallback
      const filterId = stat.filterId || stat.subFilterId?.split('_')[0] || 'Outros';
      if (!groups.has(filterId)) {
        groups.set(filterId, []);
      }
      groups.get(filterId)!.push(stat);
    });

    // Ordenar subespecialidades dentro de cada grupo por nome
    groups.forEach((stats) => {
      stats.sort((a, b) => a.subFilterName.localeCompare(b.subFilterName, 'pt-BR'));
    });

    return groups;
  }, [performance?.performanceBySubject]);

  // Calcular estatísticas agregadas por especialidade
  // Usar performanceBySpecialty do backend se disponível (contagem correta de questões)
  const specialtyAggregates = useMemo(() => {
    const aggregates = new Map<string, { 
      totalQuestions: number; 
      correctAnswers: number; 
      accuracy: number;
      name: string;
    }>();
    
    // Se temos performanceBySpecialty do backend, usar diretamente
    if (performance?.performanceBySpecialty && performance.performanceBySpecialty.length > 0) {
      performance.performanceBySpecialty.forEach(spec => {
        aggregates.set(spec.filterId, {
          totalQuestions: spec.totalQuestions,
          correctAnswers: spec.correctAnswers,
          accuracy: spec.accuracy,
          name: SPECIALTY_NAMES[spec.filterId] || spec.filterName || spec.filterId
        });
      });
    } else {
      // Fallback: agregar das subespecialidades (pode ter contagem duplicada)
      groupedBySpecialty.forEach((stats, filterId) => {
        const totalQuestions = stats.reduce((sum, s) => sum + s.totalAnswered, 0);
        const correctAnswers = stats.reduce((sum, s) => sum + s.correctAnswers, 0);
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        
        aggregates.set(filterId, { 
          totalQuestions, 
          correctAnswers, 
          accuracy,
          name: SPECIALTY_NAMES[filterId] || filterId
        });
      });
    }

    return aggregates;
  }, [performance?.performanceBySpecialty, groupedBySpecialty]);

  // Ordenar especialidades
  const sortedSpecialties = useMemo(() => {
    // Usar as chaves do specialtyAggregates que já considera performanceBySpecialty
    const keys = [...specialtyAggregates.keys()];
    return keys.sort((a, b) => {
      const indexA = SPECIALTY_ORDER.indexOf(a);
      const indexB = SPECIALTY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [specialtyAggregates]);

  // Dados para o gráfico de radar (por especialidade)
  const radarData = useMemo(() => {
    return sortedSpecialties.map(filterId => {
      const aggregate = specialtyAggregates.get(filterId);
      return {
        subject: (aggregate?.name || filterId).length > 12 
          ? (aggregate?.name || filterId).substring(0, 12) + '...' 
          : (aggregate?.name || filterId),
        fullName: aggregate?.name || filterId,
        accuracy: aggregate?.accuracy || 0,
        questions: aggregate?.totalQuestions || 0
      };
    });
  }, [sortedSpecialties, specialtyAggregates]);

  // Dados para o gráfico de barras (por especialidade)
  const barChartData = useMemo(() => {
    return sortedSpecialties.map(filterId => {
      const aggregate = specialtyAggregates.get(filterId);
      return {
        name: (aggregate?.name || filterId).length > 15 
          ? (aggregate?.name || filterId).substring(0, 15) + '...' 
          : (aggregate?.name || filterId),
        fullName: aggregate?.name || filterId,
        accuracy: Math.round(aggregate?.accuracy || 0),
        acertos: aggregate?.correctAnswers || 0,
        total: aggregate?.totalQuestions || 0,
        color: SPECIALTY_COLORS[filterId] || '#6366f1'
      };
    });
  }, [sortedSpecialties, specialtyAggregates]);

  const toggleSpecialty = (filterId: string) => {
    setExpandedSpecialties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterId)) {
        newSet.delete(filterId);
      } else {
        newSet.add(filterId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedSpecialties(new Set(sortedSpecialties));
  };

  const collapseAll = () => {
    setExpandedSpecialties(new Set());
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-[400px] bg-gradient-to-r from-border-light to-border-light/50 
                                  dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!performance?.performanceBySubject?.length) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                    rounded-2xl p-16 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                        dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
            <Award className="w-12 h-12 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-3">
            Nenhum dado de desempenho disponível
          </h3>
          <p className="text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
            Os dados de desempenho aparecerão quando o mentorado completar simulados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 
                      flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Award className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Desempenho por Especialidade
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Análise detalhada do desempenho em cada área
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Taxa de Acerto por Área */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-cyan-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-cyan-500/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 
                            flex items-center justify-center shadow-md shadow-cyan-500/30">
                <span className="material-symbols-outlined text-white text-xl">bar_chart</span>
              </div>
              <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Taxa de Acerto por Área
              </h3>
            </div>
            
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={barChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <defs>
                  <linearGradient id="barGradientMentee" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-text-light-secondary dark:text-text-dark-secondary"
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120} 
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-text-light-secondary dark:text-text-dark-secondary"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'accuracy') return [`${value}%`, 'Acurácia'];
                    return [value, name];
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--surface-light)',
                    borderColor: 'var(--border-light)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  }}
                  labelFormatter={(label) => {
                    const item = barChartData.find(d => d.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar 
                  dataKey="accuracy" 
                  fill="url(#barGradientMentee)" 
                  radius={[0, 8, 8, 0]}
                  className="drop-shadow-md"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart - Desempenho por Especialidade */}
        {radarData.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                        dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                        rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                        shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 
                              flex items-center justify-center shadow-md shadow-violet-500/30">
                  <span className="material-symbols-outlined text-white text-xl">radar</span>
                </div>
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  Desempenho por Especialidade
                </h3>
              </div>
              
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
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
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Acurácia']}
                    labelFormatter={(label) => {
                      const item = radarData.find(d => d.subject === label);
                      return item?.fullName || label;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Tabs for Specialty / Subspecialty */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-pink-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-pink-500/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        {/* Tabs Header */}
        <div className="flex border-b-2 border-border-light dark:border-border-dark">
          {[
            { id: 'specialty', label: 'Por Especialidade', icon: 'medical_services', gradient: 'from-pink-500 to-rose-500' },
            { id: 'subspecialty', label: 'Por Subespecialidade', icon: 'category', gradient: 'from-teal-500 to-cyan-500' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as 'specialty' | 'subspecialty')}
              className={`
                flex-1 flex items-center justify-center gap-3 px-6 py-5 text-sm font-semibold 
                transition-all duration-300 relative group
                ${activeSection === tab.id
                  ? 'text-primary'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }
              `}
            >
              {activeSection === tab.id && (
                <>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.gradient}`} />
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r ${tab.gradient} blur-md opacity-60`} />
                </>
              )}
              
              <div className={`
                absolute inset-0 transition-all duration-300
                ${activeSection === tab.id
                  ? 'bg-gradient-to-b from-primary/10 via-primary/5 to-transparent'
                  : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-border-light/30 dark:group-hover:from-border-dark/30 group-hover:to-transparent'
                }
              `} />
              
              <div className={`
                relative z-10 w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300 shadow-sm
                ${activeSection === tab.id
                  ? `bg-gradient-to-br ${tab.gradient} shadow-lg`
                  : 'bg-background-light dark:bg-background-dark group-hover:bg-border-light dark:group-hover:bg-border-dark'
                }
              `}>
                <span className={`
                  material-symbols-outlined text-xl
                  ${activeSection === tab.id ? 'text-white' : 'text-text-light-secondary dark:text-text-dark-secondary'}
                `}>
                  {tab.icon}
                </span>
              </div>
              
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeSection === 'specialty' && (
            <SpecialtyList 
              barChartData={barChartData}
              getAccuracyColor={getAccuracyColor}
              getAccuracyGradient={getAccuracyGradient}
            />
          )}
          
          {activeSection === 'subspecialty' && (
            <SubspecialtyAccordion
              sortedSpecialties={sortedSpecialties}
              groupedBySpecialty={groupedBySpecialty}
              specialtyAggregates={specialtyAggregates}
              expandedSpecialties={expandedSpecialties}
              toggleSpecialty={toggleSpecialty}
              expandAll={expandAll}
              collapseAll={collapseAll}
              getAccuracyColor={getAccuracyColor}
              getAccuracyGradient={getAccuracyGradient}
            />
          )}
        </div>
      </div>
    </div>
  );
}


// Componente de lista de especialidades
function SpecialtyList({ 
  barChartData, 
  getAccuracyColor, 
  getAccuracyGradient 
}: {
  barChartData: Array<{ name: string; fullName: string; accuracy: number; acertos: number; total: number; color: string }>;
  getAccuracyColor: (accuracy: number) => string;
  getAccuracyGradient: (accuracy: number) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 
                      flex items-center justify-center shadow-md shadow-emerald-500/30">
          <span className="material-symbols-outlined text-white text-xl">list_alt</span>
        </div>
        <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
          Detalhamento por Especialidade
        </h4>
      </div>
      
      <div className="space-y-3">
        {barChartData.map((item, idx) => (
          <div 
            key={idx} 
            className="p-5 rounded-xl bg-gradient-to-r from-background-light to-surface-light 
                     dark:from-background-dark dark:to-surface-dark
                     border-2 border-border-light dark:border-border-dark
                     hover:border-primary/30 transition-all duration-300 group"
            style={{ borderLeftWidth: '4px', borderLeftColor: item.color }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-md"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary 
                               group-hover:text-primary transition-colors">
                  {item.fullName}
                </span>
              </div>
              <span className={`text-xl font-bold ${getAccuracyColor(item.accuracy)}`}>
                {item.accuracy}%
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
              <span className="px-2 py-1 rounded bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
                {pluralizeCommon.questao(item.total)}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {pluralizeCommon.acerto(item.acertos)}
              </span>
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {pluralizeCommon.erro(item.total - item.acertos)}
              </span>
            </div>

            <div className="h-2.5 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getAccuracyGradient(item.accuracy)}`}
                style={{ width: `${item.accuracy}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de accordion de subespecialidades
function SubspecialtyAccordion({
  sortedSpecialties,
  groupedBySpecialty,
  specialtyAggregates,
  expandedSpecialties,
  toggleSpecialty,
  expandAll,
  collapseAll,
  getAccuracyColor,
  getAccuracyGradient
}: {
  sortedSpecialties: string[];
  groupedBySpecialty: Map<string, SubjectPerformance[]>;
  specialtyAggregates: Map<string, { totalQuestions: number; correctAnswers: number; accuracy: number; name: string }>;
  expandedSpecialties: Set<string>;
  toggleSpecialty: (filterId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  getAccuracyColor: (accuracy: number) => string;
  getAccuracyGradient: (accuracy: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* Header com botões */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 
                        flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="material-symbols-outlined text-white">category</span>
          </div>
          <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Desempenho por Subespecialidade
          </h4>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                     bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary 
                     border-2 border-border-light dark:border-border-dark hover:border-primary/50 hover:scale-105
                     flex items-center gap-2"
          >
            <ChevronDown className="w-4 h-4" />
            Expandir
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                     bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary 
                     border-2 border-border-light dark:border-border-dark hover:border-primary/50 hover:scale-105
                     flex items-center gap-2"
          >
            <ChevronUp className="w-4 h-4" />
            Recolher
          </button>
        </div>
      </div>

      {/* Lista de Especialidades com Accordion */}
      <div className="space-y-4">
        {sortedSpecialties.map((filterId) => {
          const subspecialties = groupedBySpecialty.get(filterId) || [];
          const aggregate = specialtyAggregates.get(filterId);
          const isExpanded = expandedSpecialties.has(filterId);
          const color = SPECIALTY_COLORS[filterId] || '#6366f1';
          const displayName = aggregate?.name || SPECIALTY_NAMES[filterId] || filterId;

          return (
            <div 
              key={filterId}
              className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark
                       rounded-2xl border-2 border-border-light dark:border-border-dark
                       shadow-lg dark:shadow-dark-lg overflow-hidden transition-all duration-300"
            >
              {/* Header da Especialidade (clicável) */}
              <button
                onClick={() => toggleSpecialty(filterId)}
                className="w-full p-5 flex items-center justify-between hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-5 h-5 rounded-full shadow-md flex-shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-left">
                    <h5 className="font-bold text-text-light-primary dark:text-text-dark-primary text-lg">
                      {displayName}
                    </h5>
                    <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      {subspecialties.length} subespecialidade{subspecialties.length !== 1 ? 's' : ''} • {pluralizeCommon.questao(aggregate?.totalQuestions || 0)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-bold ${getAccuracyColor(aggregate?.accuracy || 0)}`}>
                    {(aggregate?.accuracy || 0).toFixed(1)}%
                  </span>
                  <ChevronDown className={`w-6 h-6 text-text-light-secondary dark:text-text-dark-secondary
                                  transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Conteúdo Expandível */}
              <div 
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                `}
              >
                <div className="px-5 pb-5 space-y-3 border-t border-border-light/50 dark:border-border-dark/50 pt-4 max-h-[450px] overflow-y-auto">
                  {subspecialties.map((stat, index) => (
                    <div
                      key={stat.subFilterId}
                      className="p-4 rounded-xl bg-background-light dark:bg-background-dark
                               border border-border-light/50 dark:border-border-dark/50
                               hover:border-primary/30 transition-all duration-200"
                      style={{ 
                        borderLeftWidth: '4px',
                        borderLeftColor: color
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                          {stat.subFilterName}
                        </span>
                        <span className={`text-lg font-bold ${getAccuracyColor(stat.accuracy)}`}>
                          {stat.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
                        <span className="px-2 py-1 rounded bg-surface-light dark:bg-surface-dark">
                          {pluralizeCommon.questao(stat.totalAnswered)}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {pluralizeCommon.acerto(stat.correctAnswers)}
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          {pluralizeCommon.erro(stat.totalAnswered - stat.correctAnswers)}
                        </span>
                      </div>

                      <div className="h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getAccuracyGradient(stat.accuracy)}`}
                          style={{ width: `${stat.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota explicativa */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 
                    rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 flex-shrink-0">info</span>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Nota:</strong> Uma questão pode pertencer a múltiplas subespecialidades. 
            Por isso, a soma das questões nas subespecialidades pode ser maior que o total de questões respondidas.
          </p>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-violet-50 
                      dark:from-violet-900/20 dark:via-purple-900/20 dark:to-violet-900/20 
                      rounded-2xl p-5 border-2 border-violet-200 dark:border-violet-800/50
                      shadow-xl shadow-violet-500/10">
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">
            Especialidades Abordadas
          </p>
          <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {sortedSpecialties.length}
          </p>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-50 
                      dark:from-cyan-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 
                      rounded-2xl p-5 border-2 border-cyan-200 dark:border-cyan-800/50
                      shadow-xl shadow-cyan-500/10">
          <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
            Subespecialidades Abordadas
          </p>
          <p className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {Array.from(groupedBySpecialty.values()).reduce((sum, arr) => sum + arr.length, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
