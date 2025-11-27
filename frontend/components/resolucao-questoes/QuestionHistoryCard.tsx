'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuestionHistory } from '@/hooks/useQuestionHistory';
import { useQuestionStats } from '@/contexts/QuestionStatsContext';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';

interface QuestionHistoryCardProps {
  questionId: string;
  isAnswered: boolean;
  refreshTrigger?: number;
  showOnlyIfAnsweredInSession?: boolean;
}

export function QuestionHistoryCard({ questionId, isAnswered, refreshTrigger, showOnlyIfAnsweredInSession }: QuestionHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Usar stats do contexto (já pré-carregados)
  const { getStats, isLoading: isLoadingFromContext } = useQuestionStats();
  const statsFromContext = getStats(questionId);
  const loadingFromContext = isLoadingFromContext(questionId);
  
  // Carregar histórico separadamente (lazy)
  const { history, stats: statsFromHook, refetchStats, refetchHistory } = useQuestionHistory(questionId, true);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  
  // Usar stats do contexto OU do hook (priorizar hook se disponível)
  const stats = statsFromHook || statsFromContext;
  const loading = loadingFromContext;

  // Detectar regressão (quebrou sequência de acertos)
  const hasRegression = () => {
    if (!history || history.length < 3) return false;
    
    // Ordenar por data (mais recente primeiro)
    const sorted = [...history].sort((a, b) => 
      new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime()
    );
    
    // Última tentativa foi erro
    if (!sorted[0]?.is_correct) {
      // Verificar se tinha 2+ acertos CONSECUTIVOS IMEDIATAMENTE ANTES
      let consecutiveCorrect = 0;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].is_correct) {
          consecutiveCorrect++;
        } else {
          // Encontrou um erro, para de contar
          break;
        }
      }
      // Só retorna true se tinha 2+ acertos consecutivos logo antes do erro atual
      return consecutiveCorrect >= 2;
    }
    return false;
  };

  // Marcar histórico como carregado se a questão já foi respondida
  useEffect(() => {
    if (isAnswered && history && history.length > 0) {
      setHistoryLoaded(true);
    }
  }, [isAnswered, history]);

  // Quando responde a questão, recarrega e expande automaticamente
  useEffect(() => {
    if (isAnswered && refreshTrigger) {
      setLoadingHistory(true);
      
      Promise.all([
        refetchStats(),
        refetchHistory()
      ]).then(() => {
        setHistoryLoaded(true);
        setLoadingHistory(false);
        // Expande automaticamente após carregar
        setTimeout(() => {
          setIsExpanded(true);
        }, 100);
      });
    }
  }, [refreshTrigger]);
  
  // Quando isAnswered muda para true (primeira vez que responde), buscar stats
  useEffect(() => {
    if (isAnswered && !stats && !loading) {
      setLoadingHistory(true);
      Promise.all([
        refetchStats(),
        refetchHistory()
      ]).then(() => {
        setHistoryLoaded(true);
        setLoadingHistory(false);
      });
    }
  }, [isAnswered, stats, loading]);

  // Mostrar loading no header se está carregando
  const isLoading = loading || loadingHistory;

  // Não mostrar nada se não tem tentativas (após carregar completamente)
  if (!loading && !loadingHistory && (!stats || stats.total_attempts === 0)) {
    return null;
  }

  if (showOnlyIfAnsweredInSession && !isAnswered && !loading) {
    return null;
  }

  // Skeleton enquanto carrega - SEMPRE mostra para evitar layout shift
  if ((loading || loadingHistory) && !stats) {
    return (
      <div className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark 
                      rounded-xl shadow-lg border-2 border-border-light dark:border-border-dark animate-pulse">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-8 bg-border-light dark:bg-border-dark rounded-full" />
              <div className="h-4 w-48 bg-border-light dark:bg-border-dark rounded" />
              <div className="w-4 h-4 border-2 border-border-light dark:border-border-dark border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-24 bg-border-light dark:bg-border-dark rounded-lg" />
              <div className="h-8 w-24 bg-border-light dark:bg-border-dark rounded-lg" />
            </div>
          </div>
          <div className="w-5 h-5 bg-border-light dark:bg-border-dark rounded" />
        </div>
      </div>
    );
  }

  const getStudyModeLabel = (mode: string) => {
    switch (mode) {
      case 'normal_list':
        return 'Lista';
      case 'simulated_exam':
        return 'Simulado';
      case 'unified_review':
        return 'Revisão';
      default:
        return mode;
    }
  };

  const formatPercentage = (value: number) => {
    if (value === Math.floor(value)) {
      return `${value}%`;
    }
    return `${value.toFixed(1)}%`;
  };

  const handleToggleComparison = async () => {
    if (!showComparison) {
      await refetchStats(true);
    }
    setShowComparison(!showComparison);
  };

  const handleToggleExpand = async () => {
    const willExpand = !isExpanded;
    
    // Se vai expandir e não tem histórico, carrega primeiro
    if (willExpand && !historyLoaded) {
      setLoadingHistory(true);
      await refetchHistory();
      setHistoryLoaded(true);
      setLoadingHistory(false);
      // Expande após carregar
      setIsExpanded(true);
    } else {
      // Se já tem histórico ou vai fechar, apenas toggle
      setIsExpanded(willExpand);
    }
  };

  return (
    <div 
      ref={cardRef}
      className="bg-gradient-to-br from-surface-light to-background-light dark:from-surface-dark dark:to-background-dark 
                    rounded-xl shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl 
                    border-2 border-border-light dark:border-border-dark 
                    transition-all duration-300 hover:scale-[1.005] group">
      {/* Header */}
      <button
        onClick={handleToggleExpand}
        className="w-full px-6 py-4 flex items-center justify-between 
                   hover:bg-primary/5 dark:hover:bg-primary/10 
                   transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full 
                          group-hover:h-10 transition-all duration-300" />
            <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary 
                           group-hover:text-primary transition-colors duration-300">
              Histórico desta questão
            </span>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {!isLoading && hasRegression() && (
              <div className="flex items-center justify-center w-6 h-6 bg-warning/20 rounded-full animate-pulse">
                <span className="material-symbols-outlined text-warning text-base">
                  priority_high
                </span>
              </div>
            )}
          </div>
          
          {!isLoading && stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg 
                          bg-background-light dark:bg-background-dark 
                          border border-border-light dark:border-border-dark
                          shadow-sm">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                Tentativas:
              </span>
              <span className="font-bold text-primary">
                {stats.total_attempts}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg 
                          bg-background-light dark:bg-background-dark 
                          border border-border-light dark:border-border-dark
                          shadow-sm">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">
                Média:
              </span>
              <span className={`font-bold ${
                stats.accuracy_rate >= 70 
                  ? 'text-success' 
                  : stats.accuracy_rate >= 50 
                    ? 'text-warning' 
                    : 'text-error'
              }`}>
                {formatPercentage(stats.accuracy_rate)}
              </span>
            </div>
          </div>
          )}
        </div>

        <div className="p-2 rounded-lg hover:bg-primary/10 transition-all duration-200">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary 
                                 group-hover:text-primary transition-colors" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary 
                                   group-hover:text-primary transition-colors" />
          )}
        </div>
      </button>

      {/* Conteúdo expandido */}
      <div 
        ref={contentRef}
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 space-y-6 border-t-2 border-border-light dark:border-border-dark pt-6 
                      bg-background-light/50 dark:bg-background-dark/50">
          
          {/* Destaque: Acertou na primeira tentativa */}
          {history && history.length > 0 && history[history.length - 1].attempt_number === 1 && history[history.length - 1].is_correct && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-success/5 rounded-xl -z-10" />
              <div className="relative bg-success/10 border-2 border-success/30 rounded-xl p-4 
                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-300 hover:scale-[1.01] group/badge">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-success/20 rounded-lg 
                                flex items-center justify-center shadow-md
                                group-hover/badge:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-success text-xl">
                      check_circle
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-success">
                    Você acertou esta questão na primeira tentativa!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Alerta: Quebrou sequência de acertos (Regressão) */}
          {hasRegression() && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-warning/10 to-warning/5 rounded-xl -z-10" />
              <div className="relative bg-warning/10 border-2 border-warning/30 rounded-xl p-4 
                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-300 hover:scale-[1.01] group/badge">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-warning/20 rounded-lg 
                                flex items-center justify-center shadow-md
                                group-hover/badge:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-warning text-xl">
                      priority_high
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-warning-dark dark:text-warning">
                    Atenção: Você errou uma questão que costumava acertar!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative group/stat">
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-success/10 rounded-xl -z-10" />
              <div className="relative bg-background-light dark:bg-background-dark rounded-xl p-4 
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-300 hover:scale-[1.02]">
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2 font-medium">
                  Acertos
                </div>
                <div className="text-3xl font-bold text-success">
                  {stats.correct_attempts}
                </div>
              </div>
            </div>

            <div className="relative group/stat">
              <div className="absolute inset-0 bg-gradient-to-br from-error/5 to-error/10 rounded-xl -z-10" />
              <div className="relative bg-background-light dark:bg-background-dark rounded-xl p-4 
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-300 hover:scale-[1.02]">
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2 font-medium">
                  Erros
                </div>
                <div className="text-3xl font-bold text-error">
                  {stats.total_attempts - stats.correct_attempts}
                </div>
              </div>
            </div>

            <div className="relative group/stat">
              <div className={`absolute inset-0 rounded-xl -z-10 ${
                stats.current_streak.type === 'correct' && stats.current_streak.count > 0
                  ? 'bg-gradient-to-br from-success/5 to-success/10'
                  : 'bg-gradient-to-br from-border-light/5 to-border-light/10 dark:from-border-dark/5 dark:to-border-dark/10'
              }`} />
              <div className="relative bg-background-light dark:bg-background-dark rounded-xl p-4 
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-300 hover:scale-[1.02]">
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2 font-medium">
                  Streak de acertos
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-sm shadow-md ${
                    stats.current_streak.type === 'correct' && stats.current_streak.count > 0
                      ? 'bg-green-500'
                      : 'bg-gray-400 dark:bg-gray-600'
                  }`} />
                  <span className={`text-3xl font-bold ${
                    stats.current_streak.type === 'correct' && stats.current_streak.count > 0
                      ? 'text-success'
                      : 'text-text-light-secondary dark:text-text-dark-secondary'
                  }`}>
                    {stats.current_streak.type === 'correct' ? stats.current_streak.count : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico das últimas tentativas */}
          {history && history.length > 0 && (
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl" />
              <div className="relative bg-background-light dark:bg-background-dark rounded-xl p-5 
                            border-2 border-border-light dark:border-border-dark
                            shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                            transition-all duration-300">
                <div className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-4 
                              flex items-center gap-2">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  Últimas tentativas <span className="text-xs font-normal text-text-light-secondary dark:text-text-dark-secondary">(máx 5)</span>
                </div>
                <div className="space-y-3">
                  {history.slice(0, 5).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex items-start gap-3 p-3 rounded-lg
                               bg-surface-light dark:bg-surface-dark
                               border border-border-light dark:border-border-dark
                               hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10
                               shadow-sm hover:shadow-md dark:shadow-dark-lg
                               transition-all duration-300 hover:scale-[1.01] group/attempt"
                    >
                      <div className={`w-6 h-6 rounded-sm flex-shrink-0 shadow-md
                                    group-hover/attempt:scale-110 transition-transform duration-300 ${
                        attempt.is_correct ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-text-light-secondary dark:text-text-dark-secondary">
                            {(() => {
                              const date = new Date(attempt.answered_at);
                              if (isNaN(date.getTime())) return 'Data inválida';
                              return date.toLocaleDateString('pt-BR', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              }) + ' às ' + date.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            })()}
                          </span>
                          {attempt.selected_alternative_letter && (
                            <>
                              <span className="text-text-light-secondary dark:text-text-dark-secondary">•</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-text-light-secondary/10 dark:bg-text-dark-secondary/10 
                                              flex items-center justify-center border border-text-light-secondary/20 dark:border-text-dark-secondary/20">
                                  <span className="text-[10px] font-bold text-text-light-secondary dark:text-text-dark-secondary">
                                    {attempt.selected_alternative_letter}
                                  </span>
                                </div>
                                <span className="text-text-light-secondary dark:text-text-dark-secondary text-[11px]">
                                  marcada
                                </span>
                              </div>
                            </>
                          )}
                          {attempt.study_mode && (
                            <>
                              <span className="text-text-light-secondary dark:text-text-dark-secondary">•</span>
                              <span className="px-3 py-1.5 rounded-md font-semibold shadow-sm bg-primary/10 text-primary border border-primary/20 min-w-[80px] text-center inline-block">
                                {getStudyModeLabel(attempt.study_mode)}
                              </span>
                            </>
                          )}
                          {attempt.was_focus_mode && (
                            <>
                              <span className="text-text-light-secondary dark:text-text-dark-secondary">•</span>
                              <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-semibold 
                                           border border-primary/20 shadow-sm">
                                Modo Foco
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Distribuição por modo */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-xl" />
            <div className="relative bg-background-light dark:bg-background-dark rounded-xl p-5 
                          border-2 border-border-light dark:border-border-dark
                          shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                          transition-all duration-300">
              <div className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary mb-4 
                            flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                Distribuição por modo
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg
                             bg-surface-light dark:bg-surface-dark
                             border border-border-light dark:border-border-dark
                             hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10
                             transition-all duration-300">
                  <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary min-w-[80px]">
                    Lista
                  </span>
                  <span className="text-sm font-bold text-primary px-4 py-1 rounded-lg 
                               bg-primary/10 border border-primary/20 shadow-sm w-[70px] text-center">
                    {stats.attempts_by_mode.normal_list}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg
                             bg-surface-light dark:bg-surface-dark
                             border border-border-light dark:border-border-dark
                             hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10
                             transition-all duration-300">
                  <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary min-w-[80px]">
                    Simulado
                  </span>
                  <span className="text-sm font-bold text-primary px-4 py-1 rounded-lg 
                               bg-primary/10 border border-primary/20 shadow-sm w-[70px] text-center">
                    {stats.attempts_by_mode.simulated_exam}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg
                             bg-surface-light dark:bg-surface-dark
                             border border-border-light dark:border-border-dark
                             hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10
                             transition-all duration-300">
                  <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary min-w-[80px]">
                    Revisão
                  </span>
                  <span className="text-sm font-bold text-primary px-4 py-1 rounded-lg 
                               bg-primary/10 border border-primary/20 shadow-sm w-[70px] text-center">
                    {stats.attempts_by_mode.unified_review}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Toggle de comparação */}
          <button
            onClick={handleToggleComparison}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 
                     bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary
                     text-white rounded-xl font-semibold
                     shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                     transition-all duration-300 hover:scale-[1.02] group/button"
          >
            <Users className="w-5 h-5 group-hover/button:scale-110 transition-transform duration-300" />
            <span>
              {showComparison ? 'Ocultar' : 'Comparar com outros usuários'}
            </span>
          </button>

          {/* Comparação com outros usuários - com animação suave */}
          <div 
            ref={comparisonRef}
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showComparison ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {stats.global_stats && (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl" />
                <div className="relative bg-background-light dark:bg-background-dark rounded-xl p-5 
                              border-2 border-primary/30
                              shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl
                              transition-all duration-300 space-y-5">
                  <div className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    Comparação com outros usuários
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-primary/10 border-2 border-primary/30 
                                  shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {formatPercentage(stats.accuracy_rate)}
                      </div>
                      <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                        Sua média
                      </div>
                    </div>

                    <div className="text-center p-4 rounded-lg bg-surface-light dark:bg-surface-dark 
                                  border-2 border-border-light dark:border-border-dark
                                  shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                      <div className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary mb-1">
                        {formatPercentage(stats.global_stats.global_accuracy_rate)}
                      </div>
                      <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                        Média global
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t-2 border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between p-3 rounded-lg
                                 bg-surface-light dark:bg-surface-dark
                                 border border-border-light dark:border-border-dark
                                 hover:bg-primary/5 dark:hover:bg-primary/10
                                 transition-all duration-300">
                      <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                        Usuários que acertaram (qualquer tentativa)
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {formatPercentage(stats.global_stats.users_correct_any_attempt_percentage)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg
                                 bg-surface-light dark:bg-surface-dark
                                 border border-border-light dark:border-border-dark
                                 hover:bg-primary/5 dark:hover:bg-primary/10
                                 transition-all duration-300">
                      <span className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                        Usuários que acertaram de primeira
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {formatPercentage(stats.global_stats.users_correct_first_attempt_percentage)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
