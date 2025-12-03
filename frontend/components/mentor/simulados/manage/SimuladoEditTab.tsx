'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'sonner';

interface Question {
  questionId: string;
  type: 'bank' | 'custom';
  order: number;
}

interface QuestionDetails {
  id: string;
  content: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  correct_answer: string;
  explanation?: string;
  filter_ids?: string[];
  sub_filter_ids?: string[];
}

interface SimuladoEditTabProps {
  simulado: {
    id: string;
    name: string;
    description: string | null;
    questions: Question[];
    scheduled_at: string | null;
    time_limit_minutes: number | null;
    shuffle_questions: boolean;
    show_results: boolean;
  };
  canEdit: boolean;
  onUpdate: (updates: any) => Promise<boolean>;
  onRefresh: () => void;
}

export function SimuladoEditTab({ simulado, canEdit, onUpdate }: SimuladoEditTabProps) {
  const { token } = useAuth();
  const [questions, setQuestions] = useState<Question[]>(simulado.questions);
  const [questionDetails, setQuestionDetails] = useState<Map<string, QuestionDetails>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(simulado.scheduled_at || '');
  const [timeLimit, setTimeLimit] = useState(simulado.time_limit_minutes?.toString() || '');
  const [shuffleQuestions, setShuffleQuestions] = useState(simulado.shuffle_questions);
  const [showResults, setShowResults] = useState(simulado.show_results);
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar detalhes das questões
  useEffect(() => {
    const loadQuestionDetails = async () => {
      if (questions.length === 0 || !token) {
        setLoading(false);
        return;
      }

      try {
        const questionIds = questions.map(q => q.questionId);
        
        const response = await fetch(
          `/api/questions/batch`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: questionIds })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const detailsMap = new Map<string, QuestionDetails>();
          (data.data || data.questions || []).forEach((q: QuestionDetails) => {
            detailsMap.set(q.id, q);
          });
          setQuestionDetails(detailsMap);
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes das questões:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuestionDetails();
  }, [questions, token]);

  // Reordenar questão
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!canEdit) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    
    // Atualizar ordem
    newQuestions.forEach((q, i) => {
      q.order = i + 1;
    });

    setQuestions(newQuestions);
    setHasChanges(true);
  };

  // Remover questão
  const removeQuestion = (index: number) => {
    if (!canEdit) return;
    
    const newQuestions = questions.filter((_, i) => i !== index);
    newQuestions.forEach((q, i) => {
      q.order = i + 1;
    });

    setQuestions(newQuestions);
    setHasChanges(true);
  };

  // Salvar alterações
  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Não é possível editar após o horário de início');
      return;
    }

    setSaving(true);
    
    const updates: any = {
      questions,
      shuffleQuestions,
      showResults,
      timeLimitMinutes: timeLimit ? parseInt(timeLimit) : null,
      scheduledAt: scheduledAt || null
    };

    const success = await onUpdate(updates);
    
    if (success && token) {
      setHasChanges(false);
      // Atualizar também os simulados dos mentorados
      try {
        await fetch(
          `/api/mentorship/mentor-simulados/${simulado.id}/sync-assignments`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        toast.success('Simulados dos participantes atualizados!');
      } catch (error) {
        console.error('Erro ao sincronizar:', error);
      }
    }
    
    setSaving(false);
  };

  if (!canEdit) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-surface-light to-red-100/50 
                    dark:from-red-900/20 dark:via-surface-dark dark:to-red-900/10 
                    rounded-2xl p-12 border-2 border-red-200 dark:border-red-800/50
                    shadow-xl dark:shadow-dark-xl text-center">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-red-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 
                        flex items-center justify-center shadow-xl shadow-red-500/30">
            <span className="material-symbols-outlined text-white text-5xl">lock</span>
          </div>
          <h3 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-3">
            Edição Bloqueada
          </h3>
          <p className="text-red-600 dark:text-red-300 max-w-md mx-auto">
            O simulado já iniciou e não pode mais ser editado. As alterações só são permitidas antes do horário de início.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-violet-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-violet-500/10 
                    rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 
                          flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="material-symbols-outlined text-white text-xl">tune</span>
            </div>
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Configurações
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Data/Hora de Início */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                Data/Hora de Início
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={scheduledAt ? scheduledAt.slice(0, 16) : ''}
                  onChange={(e) => {
                    setScheduledAt(e.target.value ? new Date(e.target.value).toISOString() : '');
                    setHasChanges(true);
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark 
                           bg-gradient-to-r from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                           text-text-light-primary dark:text-text-dark-primary font-medium
                           focus:border-primary focus:ring-4 focus:ring-primary/20
                           shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>
            </div>

            {/* Tempo Limite */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">
                Tempo Limite (min)
              </label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => {
                  setTimeLimit(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="Sem limite"
                min="0"
                className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark 
                         bg-gradient-to-r from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                         text-text-light-primary dark:text-text-dark-primary font-medium
                         focus:border-primary focus:ring-4 focus:ring-primary/20
                         shadow-sm hover:shadow-md transition-all duration-200"
              />
            </div>

            {/* Embaralhar */}
            <div className="flex items-center gap-4 p-4 rounded-xl 
                          bg-gradient-to-r from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                          border-2 border-border-light dark:border-border-dark
                          shadow-sm hover:shadow-md transition-all duration-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => {
                    setShuffleQuestions(e.target.checked);
                    setHasChanges(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-border-light dark:bg-border-dark rounded-full peer 
                              peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-violet-500
                              peer-focus:ring-4 peer-focus:ring-primary/20
                              after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
                              after:bg-white after:rounded-full after:h-6 after:w-6 
                              after:transition-all after:shadow-md
                              peer-checked:after:translate-x-7
                              transition-all duration-300"></div>
              </label>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Embaralhar questões
              </span>
            </div>

            {/* Mostrar Resultados */}
            <div className="flex items-center gap-4 p-4 rounded-xl 
                          bg-gradient-to-r from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark
                          border-2 border-border-light dark:border-border-dark
                          shadow-sm hover:shadow-md transition-all duration-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showResults}
                  onChange={(e) => {
                    setShowResults(e.target.checked);
                    setHasChanges(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-border-light dark:bg-border-dark rounded-full peer 
                              peer-checked:bg-gradient-to-r peer-checked:from-primary peer-checked:to-violet-500
                              peer-focus:ring-4 peer-focus:ring-primary/20
                              after:content-[''] after:absolute after:top-0.5 after:left-[2px] 
                              after:bg-white after:rounded-full after:h-6 after:w-6 
                              after:transition-all after:shadow-md
                              peer-checked:after:translate-x-7
                              transition-all duration-300"></div>
              </label>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Mostrar resultados
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Questões */}
      <div className="relative overflow-hidden bg-gradient-to-br from-surface-light via-surface-light to-cyan-500/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-cyan-500/10 
                    rounded-2xl p-6 border-2 border-border-light dark:border-border-dark
                    shadow-xl dark:shadow-dark-xl transition-all duration-300 hover:shadow-2xl">
        {/* Background decoration */}
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 
                            flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <span className="material-symbols-outlined text-white text-xl">quiz</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                  Questões
                </h3>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  {questions.length} questão(ões) no simulado
                </p>
              </div>
            </div>
            
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl 
                         font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40
                         disabled:opacity-50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">save</span>
                    Salvar Alterações
                  </>
                )}
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-28 bg-gradient-to-r from-border-light to-border-light/50 
                                      dark:from-border-dark dark:to-border-dark/50 rounded-xl"></div>
              ))}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-100 
                            dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500">
                  quiz
                </span>
              </div>
              <p className="text-text-light-secondary dark:text-text-dark-secondary font-medium">
                Nenhuma questão adicionada ao simulado
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const details = questionDetails.get(question.questionId);
                
                return (
                  <div
                    key={question.questionId}
                    className="p-5 rounded-xl bg-gradient-to-r from-background-light via-surface-light to-background-light 
                             dark:from-background-dark dark:via-surface-dark dark:to-background-dark
                             border-2 border-border-light dark:border-border-dark
                             shadow-lg dark:shadow-dark-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]
                             group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Número e Controles */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 
                                      flex items-center justify-center shadow-lg shadow-primary/30
                                      text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveQuestion(index, 'up')}
                            disabled={index === 0}
                            className="p-2 rounded-lg bg-background-light dark:bg-background-dark 
                                     border border-border-light dark:border-border-dark
                                     hover:bg-primary/10 hover:border-primary/50 hover:text-primary
                                     disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-border-light
                                     transition-all duration-200"
                          >
                            <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                          </button>
                          <button
                            onClick={() => moveQuestion(index, 'down')}
                            disabled={index === questions.length - 1}
                            className="p-2 rounded-lg bg-background-light dark:bg-background-dark 
                                     border border-border-light dark:border-border-dark
                                     hover:bg-primary/10 hover:border-primary/50 hover:text-primary
                                     disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-border-light
                                     transition-all duration-200"
                          >
                            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                          </button>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm ${
                            question.type === 'custom' 
                              ? 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 dark:from-purple-900/40 dark:to-violet-900/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50'
                              : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/40 dark:to-cyan-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                          }`}>
                            {question.type === 'custom' ? '✨ Autoral' : '📚 Banco'}
                          </span>
                          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary font-mono bg-background-light dark:bg-background-dark px-2 py-1 rounded">
                            ID: {question.questionId.slice(0, 12)}...
                          </span>
                        </div>
                        
                        {details ? (
                          <p className="text-sm text-text-light-primary dark:text-text-dark-primary line-clamp-2 leading-relaxed">
                            {details.content}
                          </p>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary italic">
                              Carregando detalhes...
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Remover */}
                      <button
                        onClick={() => removeQuestion(index)}
                        className="p-3 rounded-xl text-red-500 
                                 bg-red-50 dark:bg-red-900/20 
                                 border-2 border-red-200 dark:border-red-800/50
                                 hover:bg-red-100 dark:hover:bg-red-900/40 
                                 hover:scale-110 active:scale-95
                                 shadow-sm hover:shadow-md
                                 transition-all duration-200 opacity-0 group-hover:opacity-100"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Aviso */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 
                    dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 
                    border-2 border-amber-200 dark:border-amber-800/50 rounded-2xl p-5
                    shadow-lg shadow-amber-500/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 
                        flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
            <span className="material-symbols-outlined text-white">info</span>
          </div>
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-1">Importante</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
              Ao salvar alterações, os simulados já criados para os participantes serão atualizados automaticamente.
              Isso só é possível enquanto o simulado não tiver iniciado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
