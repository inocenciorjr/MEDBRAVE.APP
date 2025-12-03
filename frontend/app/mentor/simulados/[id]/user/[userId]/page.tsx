'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  ResponsiveContainer,
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
import { formatPercentSimple } from '@/lib/utils/formatPercent';
import { getSubFiltersMap } from '@/lib/services/filterService';
import { SimuladoSubspecialtyCharts } from '@/components/mentor/simulados/manage/analytics';

interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id?: string | null;
  level: number;
}

interface UserPerformance {
  user: {
    id: string;
    displayName: string;
    email: string;
    photoUrl: string | null;
  };
  assignment: {
    score: number;
    correctCount: number;
    incorrectCount: number;
    timeSpentSeconds: number;
    startedAt: string;
    completedAt: string;
  };
  answers: Array<{
    questionId: string;
    questionNumber: number;
    questionContent: string;
    selectedAlternativeId: string;
    selectedAlternativeText: string;
    correctAlternativeId: string;
    correctAlternativeText: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
    filterName?: string;
    subFilterIds?: string[];
    alternatives?: Array<{
      letter: string;
      text: string;
      isCorrect: boolean;
      isSelected: boolean;
    }>;
  }>;
  specialtyPerformance: Array<{
    filterName: string;
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
  }>;
  subspecialtyPerformance?: Array<{
    subFilterId: string;
    subFilterName: string;
    filterId: string;
    level: string;
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
  }>;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function UserPerformancePage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  
  const simuladoId = params.id as string;
  const userId = params.userId as string;

  const [performance, setPerformance] = useState<UserPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'answers' | 'specialty' | 'subspecialty'>('answers');
  const [subFiltersMap, setSubFiltersMap] = useState<Map<string, SubFilter>>(new Map());

  // Carregar mapa de subfiltros
  useEffect(() => {
    async function loadFilters() {
      try {
        const map = await getSubFiltersMap();
        setSubFiltersMap(map);
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    const loadPerformance = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(
          `/api/mentorship/mentor-simulados/${simuladoId}/user/${userId}/performance`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPerformance(data.data);
        }
      } catch (error) {
        console.error('Erro ao carregar performance:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPerformance();
  }, [simuladoId, userId, token]);

  // Função para construir caminhos hierárquicos dos filtros
  const buildFilterPaths = (subFilterIds: string[] | undefined): string[][] => {
    if (!subFilterIds || subFilterIds.length === 0 || subFiltersMap.size === 0) {
      return [];
    }

    const specialtyIds = subFilterIds.filter(id => 
      !id.startsWith('Ano da Prova_') && !id.startsWith('Universidade_')
    );

    const pathsByRoot = new Map<string, string[]>();
    
    specialtyIds.forEach(id => {
      const rootId = id.split('_')[0];
      if (!pathsByRoot.has(rootId)) {
        pathsByRoot.set(rootId, []);
      }
      pathsByRoot.get(rootId)!.push(id);
    });

    const paths: string[][] = [];
    
    pathsByRoot.forEach((ids) => {
      const sortedIds = ids.sort((a, b) => {
        const depthA = (a.match(/_/g) || []).length;
        const depthB = (b.match(/_/g) || []).length;
        return depthB - depthA;
      });

      const deepestId = sortedIds[0];
      if (!deepestId) return;

      const path: string[] = [];
      const parts = deepestId.split('_');
      const rootId = parts[0];

      const rootFilter = subFiltersMap.get(rootId);
      if (rootFilter) {
        path.push(rootFilter.name);
      }

      for (let i = 1; i < parts.length; i++) {
        const partialId = parts.slice(0, i + 1).join('_');
        const subFilter = subFiltersMap.get(partialId);
        if (subFilter) {
          path.push(subFilter.name);
        }
      }

      if (path.length > 0) {
        paths.push(path);
      }
    });

    return paths;
  };

  const getInstitution = (subFilterIds: string[] | undefined): string | null => {
    if (!subFilterIds) return null;
    const institutionId = subFilterIds.find(id => id.startsWith('Universidade_'));
    if (institutionId) {
      const subFilter = subFiltersMap.get(institutionId);
      return subFilter?.name || null;
    }
    return null;
  };

  const getYear = (subFilterIds: string[] | undefined): string | null => {
    if (!subFilterIds) return null;
    const yearId = subFilterIds.find(id => id.startsWith('Ano da Prova_'));
    if (yearId) {
      const parts = yearId.split('_');
      return parts[parts.length - 1];
    }
    return null;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 70) return 'from-emerald-500 to-green-500';
    if (score >= 50) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-96 bg-gradient-to-r from-border-light to-border-light/50 dark:from-border-dark dark:to-border-dark/50 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="w-full py-8">
        <div className="px-4 sm:px-6 lg:px-8 text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">error</span>
          </div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Dados não encontrados
          </h2>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105 transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const { user, assignment, answers, specialtyPerformance, subspecialtyPerformance } = performance;

  const pieData = [
    { name: 'Acertos', value: assignment.correctCount, color: '#10b981' },
    { name: 'Erros', value: assignment.incorrectCount, color: '#ef4444' }
  ];

  const radarData = specialtyPerformance.map(sp => ({
    subject: sp.filterName.length > 12 ? sp.filterName.substring(0, 12) + '...' : sp.filterName,
    fullName: sp.filterName,
    accuracy: sp.accuracy,
    questions: sp.totalQuestions
  }));

  const statCards = [
    { label: 'Acertos', value: assignment.correctCount, icon: 'check_circle', gradient: 'from-emerald-500 to-green-500', shadow: 'shadow-emerald-500/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Erros', value: assignment.incorrectCount, icon: 'cancel', gradient: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/30', textColor: 'text-red-600 dark:text-red-400' },
    { label: 'Tempo Total', value: formatTime(assignment.timeSpentSeconds), icon: 'timer', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/30', textColor: 'text-text-light-primary dark:text-text-dark-primary' },
    { label: 'Questões', value: assignment.correctCount + assignment.incorrectCount, icon: 'quiz', gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/30', textColor: 'text-text-light-primary dark:text-text-dark-primary' }
  ];

  return (
    <div className="w-full bg-background-light dark:bg-background-dark">
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative flex items-center gap-6">
            <button
              onClick={() => router.back()}
              className="p-3 rounded-xl bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark
                       hover:border-primary/50 hover:bg-primary/5 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">arrow_back</span>
            </button>
            
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 overflow-hidden flex-shrink-0
                          border-2 border-primary/30 shadow-xl">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary">person</span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {user.displayName}
              </h1>
              <p className="text-text-light-secondary dark:text-text-dark-secondary">
                {user.email}
              </p>
            </div>

            <div className="text-right">
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r ${getScoreGradient(assignment.score)} shadow-xl`}>
                <span className="text-4xl font-bold text-white">
                  {formatPercentSimple(assignment.score)}
                </span>
              </div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
                Nota Final
              </p>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div 
              key={stat.label}
              className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                        dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                        rounded-2xl p-5 border-2 border-border-light dark:border-border-dark
                        shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]
                        group animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full blur-2xl 
                            group-hover:opacity-20 transition-opacity duration-300`} />
              
              <div className="relative flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} 
                              flex items-center justify-center shadow-lg ${stat.shadow}
                              group-hover:scale-110 transition-transform duration-300`}>
                  <span className="material-symbols-outlined text-white text-2xl">{stat.icon}</span>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </p>
                  <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pizza de Acertos/Erros */}
          <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-emerald-500/5 
                        dark:from-surface-dark dark:via-surface-dark dark:to-emerald-500/10 
                        rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                        shadow-xl dark:shadow-dark-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 
                            flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="material-symbols-outlined text-white">pie_chart</span>
              </div>
              <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Distribuição de Respostas
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar de Especialidades */}
          {radarData.length > 0 && (
            <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                          dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                          rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                          shadow-xl dark:shadow-dark-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 
                              flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <span className="material-symbols-outlined text-white">radar</span>
                </div>
                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                  Desempenho por Especialidade
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
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
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-cyan-500/5 
                      dark:from-surface-dark dark:via-surface-dark dark:to-cyan-500/10 
                      rounded-2xl border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl">
          <div className="flex border-b-2 border-border-light dark:border-border-dark">
            {[
              { id: 'answers', label: 'Respostas Detalhadas', icon: 'list_alt', gradient: 'from-cyan-500 to-blue-500' },
              { id: 'specialty', label: 'Por Especialidade', icon: 'medical_services', gradient: 'from-pink-500 to-rose-500' },
              { id: 'subspecialty', label: 'Por Subespecialidade', icon: 'category', gradient: 'from-teal-500 to-cyan-500' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'answers' | 'specialty' | 'subspecialty')}
                className={`
                  flex-1 flex items-center justify-center gap-3 px-6 py-5 text-sm font-semibold 
                  transition-all duration-300 relative group
                  ${activeTab === tab.id
                    ? 'text-primary'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                  }
                `}
              >
                {activeTab === tab.id && (
                  <>
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.gradient}`} />
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r ${tab.gradient} blur-md opacity-60`} />
                  </>
                )}
                
                <div className={`
                  absolute inset-0 transition-all duration-300
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-b from-primary/10 via-primary/5 to-transparent'
                    : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-border-light/30 dark:group-hover:from-border-dark/30 group-hover:to-transparent'
                  }
                `} />
                
                <div className={`
                  relative z-10 w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-300 shadow-sm
                  ${activeTab === tab.id
                    ? `bg-gradient-to-br ${tab.gradient} shadow-lg`
                    : 'bg-background-light dark:bg-background-dark group-hover:bg-border-light dark:group-hover:bg-border-dark'
                  }
                `}>
                  <span className={`
                    material-symbols-outlined text-xl
                    ${activeTab === tab.id ? 'text-white' : 'text-text-light-secondary dark:text-text-dark-secondary'}
                  `}>
                    {tab.icon}
                  </span>
                </div>
                
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'answers' && (
              <div className="space-y-4">
                {answers.map((answer, index) => (
                  <div
                    key={answer.questionId}
                    className={`
                      p-5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] animate-fadeIn
                      ${answer.isCorrect
                        ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-emerald-900/20 border-emerald-300 dark:border-emerald-700/50'
                        : 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-red-900/20 border-red-300 dark:border-red-700/50'
                      }
                    `}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg
                        ${answer.isCorrect
                          ? 'bg-gradient-to-br from-emerald-500 to-green-500 shadow-emerald-500/30'
                          : 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/30'
                        }
                      `}>
                        <span className="material-symbols-outlined text-white text-xl">
                          {answer.isCorrect ? 'check' : 'close'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                            Questão {answer.questionNumber}
                          </span>
                          {getInstitution(answer.subFilterIds) && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                              bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                              {getInstitution(answer.subFilterIds)}
                            </span>
                          )}
                          {getYear(answer.subFilterIds) && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                              bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                              {getYear(answer.subFilterIds)}
                            </span>
                          )}
                          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary px-2 py-1 rounded-lg bg-background-light dark:bg-background-dark">
                            ⏱️ {formatTime(answer.timeSpentSeconds)}
                          </span>
                        </div>
                        
                        {/* Caminhos hierárquicos dos filtros */}
                        {buildFilterPaths(answer.subFilterIds).length > 0 && (
                          <div className="flex flex-col gap-1 mb-3">
                            {buildFilterPaths(answer.subFilterIds).map((path, pathIndex) => (
                              <div key={pathIndex} className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-hide">
                                {path.map((name, nameIndex) => (
                                  <div key={nameIndex} className="flex items-center gap-1 flex-shrink-0">
                                    {nameIndex > 0 && (
                                      <span className="text-text-light-tertiary dark:text-text-dark-tertiary">→</span>
                                    )}
                                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-text-light-secondary dark:text-text-dark-secondary rounded border border-border-light dark:border-border-dark whitespace-nowrap text-[11px]">
                                      {name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div 
                          className="text-sm text-text-light-primary dark:text-text-dark-primary mb-4 leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3"
                          dangerouslySetInnerHTML={{ __html: answer.questionContent }}
                        />

                        {/* Lista de Alternativas */}
                        <div className="space-y-2">
                          {answer.alternatives?.map((alt) => {
                            const isUserAnswer = alt.isSelected;
                            const isCorrectAnswer = alt.isCorrect;
                            const isWrongSelection = isUserAnswer && !isCorrectAnswer;
                            
                            return (
                              <div
                                key={alt.letter}
                                className={`
                                  p-3 rounded-xl flex items-center gap-3 transition-all duration-200
                                  ${isCorrectAnswer
                                    ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700/50'
                                    : isWrongSelection
                                      ? 'bg-gradient-to-r from-red-50 via-rose-50 to-red-50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-red-900/20 border-2 border-red-300 dark:border-red-700/50'
                                      : 'bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark'
                                  }
                                `}
                              >
                                <span className={`
                                  w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0
                                  ${isCorrectAnswer
                                    ? 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/30'
                                    : isWrongSelection
                                      ? 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-md shadow-red-500/30'
                                      : 'bg-border-light dark:bg-border-dark text-text-light-primary dark:text-text-dark-primary'
                                  }
                                `}>
                                  {alt.letter}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${
                                    isCorrectAnswer 
                                      ? 'text-emerald-800 dark:text-emerald-200 font-medium' 
                                      : isWrongSelection
                                        ? 'text-red-800 dark:text-red-200 font-medium'
                                        : 'text-text-light-primary dark:text-text-dark-primary'
                                  }`}>
                                    {alt.text}
                                  </p>
                                </div>
                                {isCorrectAnswer && (
                                  <span className="material-symbols-outlined text-emerald-500 text-xl flex-shrink-0">check_circle</span>
                                )}
                                {isWrongSelection && (
                                  <span className="material-symbols-outlined text-red-500 text-xl flex-shrink-0">cancel</span>
                                )}
                                {isUserAnswer && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                                    Resposta do aluno
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'specialty' && (
              <div className="space-y-4">
                {specialtyPerformance.map((sp, index) => (
                  <div
                    key={sp.filterName}
                    className="p-5 rounded-xl bg-gradient-to-r from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                             border-2 border-border-light dark:border-border-dark shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01]
                             animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full shadow-md" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                          {sp.filterName}
                        </span>
                      </div>
                      <span className={`text-xl font-bold ${getScoreColor(sp.accuracy)}`}>
                        {formatPercentSimple(sp.accuracy)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
                      <span className="px-2 py-1 rounded bg-background-light dark:bg-background-dark">{sp.totalQuestions} questões</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{sp.correctCount} acertos</span>
                      <span className="text-red-600 dark:text-red-400 font-semibold">{sp.totalQuestions - sp.correctCount} erros</span>
                    </div>

                    <div className="h-3 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getScoreGradient(sp.accuracy)}`}
                        style={{ width: `${sp.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'subspecialty' && (
              <SimuladoSubspecialtyCharts 
                subspecialtyStats={(subspecialtyPerformance || []).map(sp => ({
                  ...sp,
                  totalResponses: sp.totalQuestions,
                  incorrectCount: sp.totalQuestions - sp.correctCount
                }))}
                specialtyStats={(specialtyPerformance || []).map(sp => ({
                  ...sp,
                  filterId: sp.filterName
                }))}
                title="Desempenho por Subespecialidade"
              />
            )}
          </div>
        </div>

        {/* Datas */}
        <div className="bg-gradient-to-r from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark 
                      rounded-2xl p-5 border-2 border-border-light dark:border-border-dark shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
              <span className="material-symbols-outlined text-emerald-500">play_arrow</span>
              Iniciado em: <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                {format(new Date(assignment.startedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </span>
            <span className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
              <span className="material-symbols-outlined text-blue-500">check</span>
              Finalizado em: <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                {format(new Date(assignment.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
