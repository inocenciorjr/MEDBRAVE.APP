'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { getSubFiltersMap } from '@/lib/services/filterService';

interface SubFilter {
  id: string;
  name: string;
  filter_id: string;
  parent_id?: string | null;
  level: number;
}

interface AlternativeStats {
  id: string;
  text: string;
  count: number;
  percentage: number;
  isCorrect: boolean;
}

interface QuestionStat {
  questionId: string;
  questionNumber: number;
  questionContent: string;
  correctAnswer: string;
  totalResponses: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  alternativeStats: AlternativeStats[];
  filterIds?: string[];
  subFilterIds?: string[];
}

interface SimuladoQuestionAnalyticsProps {
  simuladoId: string;
  questionStats: QuestionStat[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const QUESTIONS_PER_PAGE = 20;

export function SimuladoQuestionAnalytics({ questionStats }: SimuladoQuestionAnalyticsProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionStat | null>(
    questionStats.length > 0 ? questionStats[0] : null
  );
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar');
  const [currentPage, setCurrentPage] = useState(0);
  const [filterType, setFilterType] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Função para construir caminhos hierárquicos dos filtros
  const buildFilterPaths = (subFilterIds: string[] | undefined): string[][] => {
    if (!subFilterIds || subFilterIds.length === 0 || subFiltersMap.size === 0) {
      return [];
    }

    // Filtrar apenas subfiltros de especialidades (não incluir Ano e Universidade)
    const specialtyIds = subFilterIds.filter(id =>
      !id.startsWith('Ano da Prova_') &&
      !id.startsWith('Universidade_')
    );

    // Agrupar IDs por filtro raiz
    const pathsByRoot = new Map<string, string[]>();

    specialtyIds.forEach(id => {
      const rootId = id.split('_')[0];
      if (!pathsByRoot.has(rootId)) {
        pathsByRoot.set(rootId, []);
      }
      pathsByRoot.get(rootId)!.push(id);
    });

    // Construir caminhos hierárquicos
    const paths: string[][] = [];

    pathsByRoot.forEach((ids) => {
      // Ordenar IDs por profundidade (mais profundo primeiro)
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

      // Adicionar o filtro raiz primeiro
      const rootFilter = subFiltersMap.get(rootId);
      if (rootFilter) {
        path.push(rootFilter.name);
      }

      // Construir IDs incrementalmente e buscar os nomes
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

  // Função para obter instituição
  const getInstitution = (subFilterIds: string[] | undefined): string | null => {
    if (!subFilterIds) return null;
    const institutionId = subFilterIds.find(id => id.startsWith('Universidade_'));
    if (institutionId) {
      const subFilter = subFiltersMap.get(institutionId);
      return subFilter?.name || null;
    }
    return null;
  };

  // Função para obter ano
  const getYear = (subFilterIds: string[] | undefined): string | null => {
    if (!subFilterIds) return null;
    const yearId = subFilterIds.find(id => id.startsWith('Ano da Prova_'));
    if (yearId) {
      const parts = yearId.split('_');
      return parts[parts.length - 1];
    }
    return null;
  };

  // Filtrar questões
  const filteredQuestions = useMemo(() => {
    let filtered = questionStats;

    // Filtrar por dificuldade (baseado na acurácia)
    if (filterType === 'easy') {
      filtered = filtered.filter(q => q.accuracy >= 70);
    } else if (filterType === 'medium') {
      filtered = filtered.filter(q => q.accuracy >= 40 && q.accuracy < 70);
    } else if (filterType === 'hard') {
      filtered = filtered.filter(q => q.accuracy < 40);
    }

    // Filtrar por busca (número da questão)
    if (searchQuery) {
      const num = parseInt(searchQuery);
      if (!isNaN(num)) {
        filtered = filtered.filter(q => q.questionNumber === num);
      }
    }

    return filtered;
  }, [questionStats, filterType, searchQuery]);

  // Paginação
  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  // Estatísticas resumidas
  const stats = useMemo(() => {
    const easy = questionStats.filter(q => q.accuracy >= 70).length;
    const medium = questionStats.filter(q => q.accuracy >= 40 && q.accuracy < 70).length;
    const hard = questionStats.filter(q => q.accuracy < 40).length;
    return { easy, medium, hard, total: questionStats.length };
  }, [questionStats]);

  if (questionStats.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                      dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-500">
            quiz
          </span>
        </div>
        <p className="text-lg font-medium text-text-light-secondary dark:text-text-dark-secondary">
          Nenhuma resposta registrada ainda
        </p>
      </div>
    );
  }

  // Dados para o gráfico de barras (paginado)
  const accuracyData = paginatedQuestions.map((q) => ({
    name: `Q${q.questionNumber}`,
    accuracy: q.accuracy,
    total: q.totalResponses,
    questionNumber: q.questionNumber
  }));

  // Dados para o gráfico de alternativas da questão selecionada
  const alternativeData = selectedQuestion?.alternativeStats.map(alt => ({
    name: alt.id,
    value: alt.count,
    percentage: alt.percentage,
    isCorrect: alt.isCorrect,
    text: alt.text.length > 50 ? alt.text.substring(0, 50) + '...' : alt.text
  })) || [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                      rounded-xl p-4 shadow-xl dark:shadow-dark-xl">
          <p className="font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            {data.name}
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Acurácia: <span className="font-bold text-primary">{data.accuracy?.toFixed(1)}%</span>
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Respostas: <span className="font-bold">{data.total}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const AlternativeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-light dark:bg-surface-dark border-2 border-border-light dark:border-border-dark 
                      rounded-xl p-4 shadow-xl dark:shadow-dark-xl max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-4 h-4 rounded-full ${data.isCorrect ? 'bg-gradient-to-br from-emerald-500 to-green-500' : 'bg-slate-400'}`}></span>
            <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
              Alternativa {data.name} {data.isCorrect && '✓'}
            </p>
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
            {data.text}
          </p>
          <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
            {data.value} respostas ({data.percentage?.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (accuracy >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 70) return 'from-emerald-500 to-green-500';
    if (accuracy >= 40) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getBarColor = (accuracy: number) => {
    if (accuracy >= 70) return '#10b981';
    if (accuracy >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-6">
      {/* Resumo de Dificuldade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => { setFilterType('all'); setCurrentPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]
            ${filterType === 'all'
              ? 'bg-gradient-to-br from-primary/20 to-violet-500/20 border-primary shadow-lg shadow-primary/20'
              : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'}`}
        >
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{stats.total}</p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Total</p>
        </button>
        <button
          onClick={() => { setFilterType('easy'); setCurrentPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]
            ${filterType === 'easy'
              ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'}`}
        >
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.easy}</p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Fáceis (≥70%)</p>
        </button>
        <button
          onClick={() => { setFilterType('medium'); setCurrentPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]
            ${filterType === 'medium'
              ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'}`}
        >
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.medium}</p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Médias (40-70%)</p>
        </button>
        <button
          onClick={() => { setFilterType('hard'); setCurrentPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02]
            ${filterType === 'hard'
              ? 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500 shadow-lg shadow-red-500/20'
              : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'}`}
        >
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.hard}</p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Difíceis (&lt;40%)</p>
        </button>
      </div>

      {/* Gráfico de Acurácia por Questão */}
      <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                    rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 
                          flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <span className="material-symbols-outlined text-white">bar_chart</span>
            </div>
            <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Acurácia por Questão
            </h4>
          </div>

          {/* Busca por número */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Ir para Q..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              className="w-28 px-3 py-2 rounded-lg border-2 border-border-light dark:border-border-dark
                       bg-background-light dark:bg-background-dark text-sm
                       focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-2 rounded-lg hover:bg-border-light dark:hover:bg-border-dark"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accuracyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="accuracy"
                radius={[4, 4, 0, 0]}
                onClick={(data: any) => {
                  const q = questionStats.find(qs => qs.questionNumber === data.questionNumber);
                  if (q) setSelectedQuestion(q);
                }}
                cursor="pointer"
              >
                {accuracyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={selectedQuestion?.questionNumber === entry.questionNumber ? '#8b5cf6' : getBarColor(entry.accuracy)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded-lg hover:bg-border-light dark:hover:bg-border-dark disabled:opacity-50"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all
                      ${currentPage === pageNum
                        ? 'bg-gradient-to-r from-primary to-violet-500 text-white'
                        : 'hover:bg-border-light dark:hover:bg-border-dark'}`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-lg hover:bg-border-light dark:hover:bg-border-dark disabled:opacity-50"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>

            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary ml-2">
              {currentPage * QUESTIONS_PER_PAGE + 1}-{Math.min((currentPage + 1) * QUESTIONS_PER_PAGE, filteredQuestions.length)} de {filteredQuestions.length}
            </span>
          </div>
        )}
      </div>


      {/* Seletor de Questão (Badges) */}
      <div className="flex flex-wrap gap-3">
        {paginatedQuestions.map((q) => (
          <button
            key={q.questionId}
            onClick={() => setSelectedQuestion(q)}
            className={`
              px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300
              border-2 shadow-md hover:shadow-lg hover:scale-105
              ${selectedQuestion?.questionId === q.questionId
                ? 'bg-gradient-to-r from-primary to-violet-500 text-white border-primary shadow-primary/30'
                : 'bg-background-light dark:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary border-border-light dark:border-border-dark hover:border-primary/50'
              }
            `}
          >
            Q{q.questionNumber}
            <span className={`ml-2 ${selectedQuestion?.questionId === q.questionId
              ? 'text-white/80'
              : getAccuracyColor(q.accuracy)
              }`}>
              {q.accuracy.toFixed(0)}%
            </span>
          </button>
        ))}
      </div>

      {/* Paginação dos badges (se necessário) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-lg hover:bg-border-light dark:hover:bg-border-dark disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary px-3">
            Página {currentPage + 1} de {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 rounded-lg hover:bg-border-light dark:hover:bg-border-dark disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}

      {/* Detalhes da Questão Selecionada */}
      {selectedQuestion && (
        <div className="bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark 
                      rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                      shadow-xl dark:shadow-dark-xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAccuracyBg(selectedQuestion.accuracy)} 
                              flex items-center justify-center shadow-lg text-white font-bold text-lg`}>
                  Q{selectedQuestion.questionNumber}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                    Questão {selectedQuestion.questionNumber}
                  </h4>
                  <p className={`text-sm font-semibold ${getAccuracyColor(selectedQuestion.accuracy)}`}>
                    {selectedQuestion.accuracy.toFixed(1)}% de acurácia
                  </p>
                </div>
              </div>
              <div 
                className="text-sm text-text-light-secondary dark:text-text-dark-secondary leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_img]:mx-auto [&_img]:block [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3"
                dangerouslySetInnerHTML={{ __html: selectedQuestion.questionContent }}
              />

              {/* Filtros da questão */}
              {selectedQuestion.subFilterIds && selectedQuestion.subFilterIds.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* Instituição e Ano */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getInstitution(selectedQuestion.subFilterIds) && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg
                        bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                        {getInstitution(selectedQuestion.subFilterIds)}
                      </span>
                    )}

                    {getYear(selectedQuestion.subFilterIds) && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg
                        bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                        {getYear(selectedQuestion.subFilterIds)}
                      </span>
                    )}
                  </div>

                  {/* Caminhos hierárquicos dos filtros */}
                  {buildFilterPaths(selectedQuestion.subFilterIds).length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {buildFilterPaths(selectedQuestion.subFilterIds).map((path, pathIndex) => (
                        <div
                          key={pathIndex}
                          className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-hide"
                        >
                          {path.map((name, nameIndex) => (
                            <div key={nameIndex} className="flex items-center gap-1.5 flex-shrink-0">
                              {nameIndex > 0 && (
                                <span className="text-text-light-tertiary dark:text-text-dark-tertiary">→</span>
                              )}
                              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-text-light-secondary dark:text-text-dark-secondary rounded-md border border-border-light dark:border-border-dark whitespace-nowrap">
                                {name}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => setViewMode('bar')}
                className={`p-3 rounded-xl transition-all duration-200 ${viewMode === 'bar'
                  ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30'
                  : 'bg-border-light dark:bg-border-dark hover:bg-primary/10'
                  }`}
              >
                <span className="material-symbols-outlined">bar_chart</span>
              </button>
              <button
                onClick={() => setViewMode('pie')}
                className={`p-3 rounded-xl transition-all duration-200 ${viewMode === 'pie'
                  ? 'bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/30'
                  : 'bg-border-light dark:bg-border-dark hover:bg-primary/10'
                  }`}
              >
                <span className="material-symbols-outlined">pie_chart</span>
              </button>
            </div>
          </div>

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark
                          border-2 border-border-light dark:border-border-dark shadow-md">
              <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">Respostas</p>
              <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {selectedQuestion.totalResponses}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20
                          border-2 border-emerald-200 dark:border-emerald-800/50 shadow-md">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Acertos</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {selectedQuestion.correctCount}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20
                          border-2 border-red-200 dark:border-red-800/50 shadow-md">
              <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Erros</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {selectedQuestion.incorrectCount}
              </p>
            </div>
          </div>

          {/* Gráfico de Alternativas */}
          <div className="h-72 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'bar' ? (
                <BarChart data={alternativeData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" domain={[0, 'dataMax']} />
                  <YAxis type="category" dataKey="name" width={40} />
                  <Tooltip content={<AlternativeTooltip />} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {alternativeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCorrect ? '#10b981' : COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={alternativeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name}: ${props.percentage?.toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={800}
                  >
                    {alternativeData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isCorrect ? '#10b981' : COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<AlternativeTooltip />} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Lista de Alternativas */}
          <div className="space-y-3">
            {selectedQuestion.alternativeStats.map((alt) => (
              <div
                key={alt.id}
                className={`
                  p-4 rounded-xl flex items-center gap-4 transition-all duration-200 hover:scale-[1.01]
                  ${alt.isCorrect
                    ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 dark:from-emerald-900/20 dark:via-green-900/20 dark:to-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700/50 shadow-md shadow-emerald-500/10'
                    : 'bg-gradient-to-r from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark border-2 border-border-light dark:border-border-dark'
                  }
                `}
              >
                <span className={`
                  w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-md
                  ${alt.isCorrect
                    ? 'bg-gradient-to-br from-emerald-500 to-green-500 text-white shadow-emerald-500/30'
                    : 'bg-border-light dark:bg-border-dark text-text-light-primary dark:text-text-dark-primary'
                  }
                `}>
                  {alt.id}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-light-primary dark:text-text-dark-primary truncate">
                    {alt.text}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-light-primary dark:text-text-dark-primary">
                    {alt.count}
                  </p>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    {alt.percentage.toFixed(1)}%
                  </p>
                </div>
                {alt.isCorrect && (
                  <span className="material-symbols-outlined text-emerald-500 text-xl">check_circle</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
