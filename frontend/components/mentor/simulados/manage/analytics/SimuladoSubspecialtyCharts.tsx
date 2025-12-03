'use client';

import { useState, useMemo } from 'react';
import { pluralizeCommon } from '@/lib/utils/pluralize';

interface SubspecialtyStat {
  subFilterId: string;
  subFilterName: string;
  filterId: string;
  level: string;
  totalQuestions: number;
  totalResponses?: number;
  correctCount: number;
  incorrectCount?: number;
  accuracy: number;
  averageTimeSeconds?: number;
}

interface SpecialtyStat {
  filterName: string;
  filterId?: string;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
}

interface SimuladoSubspecialtyChartsProps {
  subspecialtyStats: SubspecialtyStat[];
  specialtyStats?: SpecialtyStat[];
  title?: string;
}

// Cores por especialidade (mesmas do SimuladoSpecialtyCharts)
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

export function SimuladoSubspecialtyCharts({ 
  subspecialtyStats, 
  specialtyStats,
  title = 'Desempenho por Subespecialidade'
}: SimuladoSubspecialtyChartsProps) {
  const [expandedSpecialties, setExpandedSpecialties] = useState<Set<string>>(new Set());


  // Agrupar subespecialidades por especialidade (filterId)
  const groupedBySpecialty = useMemo(() => {
    const groups = new Map<string, SubspecialtyStat[]>();
    
    subspecialtyStats.forEach(stat => {
      const filterId = stat.filterId;
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
  }, [subspecialtyStats]);

  // Calcular estatísticas agregadas por especialidade
  // Usar specialtyStats do backend se disponível (contagem correta de questões)
  const specialtyAggregates = useMemo(() => {
    const aggregates = new Map<string, { totalQuestions: number; correctCount: number; accuracy: number }>();
    
    // Se temos specialtyStats do backend, usar diretamente
    if (specialtyStats && specialtyStats.length > 0) {
      specialtyStats.forEach(spec => {
        // O filterId pode vir como filterName (ex: "Cirurgia") ou como filterId
        const key = spec.filterId || spec.filterName;
        aggregates.set(key, {
          totalQuestions: spec.totalQuestions,
          correctCount: spec.correctCount,
          accuracy: spec.accuracy
        });
      });
    } else {
      // Fallback: agregar das subespecialidades (pode ter contagem duplicada)
      groupedBySpecialty.forEach((stats, filterId) => {
        const totalQuestions = stats.reduce((sum, s) => sum + s.totalQuestions, 0);
        const correctCount = stats.reduce((sum, s) => sum + s.correctCount, 0);
        const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
        
        aggregates.set(filterId, { totalQuestions, correctCount, accuracy });
      });
    }

    return aggregates;
  }, [specialtyStats, groupedBySpecialty]);

  // Ordenar especialidades pela ordem definida
  const sortedSpecialties = useMemo(() => {
    return [...groupedBySpecialty.keys()].sort((a, b) => {
      const indexA = SPECIALTY_ORDER.indexOf(a);
      const indexB = SPECIALTY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [groupedBySpecialty]);

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

  if (subspecialtyStats.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                      dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">
            category
          </span>
        </div>
        <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
          Nenhuma estatística por subespecialidade disponível
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 
                        flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="material-symbols-outlined text-white">category</span>
          </div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              {title}
            </h4>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
              BETA
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                     bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary 
                     border-2 border-border-light dark:border-border-dark hover:border-primary/50
                     flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">unfold_more</span>
            Expandir
          </button>
          <button
            onClick={collapseAll}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                     bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary 
                     border-2 border-border-light dark:border-border-dark hover:border-primary/50
                     flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">unfold_less</span>
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
          const displayName = SPECIALTY_NAMES[filterId] || filterId;

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
                  <span className={`material-symbols-outlined text-2xl text-text-light-secondary dark:text-text-dark-secondary
                                  transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
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
                        animationDelay: `${index * 30}ms`,
                        borderLeftWidth: '4px',
                        borderLeftColor: color
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                            {stat.subFilterName}
                          </span>
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full flex-shrink-0
                            ${stat.level === '1' 
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            }
                          `}>
                            Nível {stat.level}
                          </span>
                        </div>
                        <span className={`text-lg font-bold ${getAccuracyColor(stat.accuracy)} flex-shrink-0 ml-2`}>
                          {stat.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
                        <span className="px-2 py-1 rounded bg-surface-light dark:bg-surface-dark">
                          {pluralizeCommon.questao(stat.totalQuestions)}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {pluralizeCommon.acerto(stat.correctCount)}
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          {pluralizeCommon.erro(stat.incorrectCount || 0)}
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
            Por isso, a soma das questões nas subespecialidades pode ser maior que o total de questões do simulado.
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
            {subspecialtyStats.length}
          </p>
        </div>
      </div>
    </div>
  );
}
