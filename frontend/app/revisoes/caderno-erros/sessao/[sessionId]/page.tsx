'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Difficulty } from '@/types/flashcards';
import { ErrorNotebookEntry, errorNotebookService } from '@/services/errorNotebookService';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Question } from '@/types/resolucao-questoes';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { QuestionHeader } from '@/components/resolucao-questoes/QuestionHeader';
import { AddToErrorNotebookModal } from '@/components/error-notebook/AddToErrorNotebookModal';
import { DifficultyButtons } from '@/components/flashcards/DifficultyButtons';
import { useToast } from '@/lib/contexts/ToastContext';
import { ImageModal } from '@/components/resolucao-questoes';
import { ErrorNotebookNavigationPanel } from '@/components/error-notebook/ErrorNotebookNavigationPanel';
import { useStudySession } from '@/hooks/useStudySession';
import { useCadernoErrosEntry } from '@/hooks/queries';

console.log('🔥🔥🔥 MÓDULO CARREGADO - ReviewErrorNotebookPage [sessionId] 🔥🔥🔥');

export default function ReviewErrorNotebookPage({ params }: { params: Promise<{ sessionId: string }> }) {
  console.log('🎨 COMPONENTE RENDERIZADO - ReviewErrorNotebookPage');
  const { sessionId } = use(params);
  console.log('📌 sessionId extraído:', sessionId);
  const router = useRouter();
  const toast = useToast();
  const { startSession, endSession } = useStudySession('review');

  const [entryIds, setEntryIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [entry, setEntry] = useState<ErrorNotebookEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullQuestion, setFullQuestion] = useState<Question | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [focusedAlternativeId, setFocusedAlternativeId] = useState<string | undefined>(undefined);
  const [showProfessorComment, setShowProfessorComment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const reviewStartTime = useRef(Date.now());
  const [reviewedEntries, setReviewedEntries] = useState<Map<string, Difficulty>>(new Map());
  const [entryStates, setEntryStates] = useState<Map<string, 'again' | 'hard' | 'good' | 'easy'>>(new Map());

  console.log('💡 ANTES DOS useEffects - sessionId:', sessionId);

  // Iniciar sessão de revisão ao montar
  useEffect(() => {
    console.log('🔵 useEffect 1 (startSession) EXECUTADO');
    startSession();
    return () => {
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar

  // Carregar sessão do backend
  useEffect(() => {
    console.log('⚡ useEffect START - sessionId:', sessionId);
    
    const loadSession = async () => {
      try {
        console.log('📡 Fetching session...');
        const response = await fetchWithAuth(`/api/review-sessions/${sessionId}`);
        console.log('📡 Response da sessão:', response.status);

        if (!response.ok) {
          throw new Error('Sessão não encontrada');
        }

        const result = await response.json();
        console.log('📦 Result da sessão:', result);
        const reviewSession = result.data.session;
        console.log('📋 Review session:', reviewSession);

        if (reviewSession.content_type !== 'ERROR_NOTEBOOK') {
          throw new Error('Sessão inválida para caderno de erros');
        }

        const reviewIds = reviewSession.review_ids;
        console.log('🔍 Review IDs da sessão:', reviewIds, 'length:', reviewIds?.length);
        
        if (!reviewIds || reviewIds.length === 0) {
          alert('Não há itens do caderno de erros para revisar!');
          router.push('/revisoes');
          return;
        }

        // Buscar os cards FSRS diretamente pelos IDs para pegar os content_ids
        console.log('🔍 Buscando cards FSRS pelos IDs:', reviewIds);
        
        const cardsResponse = await fetchWithAuth(
          `/api/fsrs/cards?ids=${reviewIds.join(',')}`
        );
        
        if (!cardsResponse.ok) {
          console.error('❌ Erro ao buscar cards FSRS');
          alert('Não foi possível carregar os cards!');
          router.push('/revisoes');
          return;
        }
        
        const cardsResult = await cardsResponse.json();
        console.log('📦 Cards result:', cardsResult);
        
        if (!cardsResult.success || !cardsResult.data?.cards) {
          console.error('❌ Nenhum card encontrado');
          alert('Não foi possível carregar as entradas do caderno de erros!');
          router.push('/revisoes');
          return;
        }
        
        // Extrair os content_ids dos cards
        const entryIdsToUse = cardsResult.data.cards
          .map((card: any) => card.content_id)
          .filter((id: string) => id);
        
        console.log('✅ Entry IDs extraídos:', entryIdsToUse);
        
        if (entryIdsToUse.length === 0) {
          console.error('❌ Nenhum entry ID encontrado nos cards');
          alert('Não foi possível carregar as entradas do caderno de erros!');
          router.push('/revisoes');
          return;
        }

        setEntryIds(entryIdsToUse);
        
        // Restaurar índice salvo
        if (reviewSession.current_index !== undefined && reviewSession.current_index < entryIdsToUse.length) {
          setCurrentIndex(reviewSession.current_index);
        } else {
          setCurrentIndex(0);
        }

        // Carregar entradas já revisadas hoje
        const todayResponse = await fetchWithAuth('/unified-reviews/today?limit=1000');
        
        if (todayResponse.ok) {
          const todayResult = await todayResponse.json();
          const todayReviews = todayResult.data?.reviews || [];
          
          // Mapear grade (0-3) para difficulty
          const gradeToQuality: Record<number, Difficulty> = {
            0: 'again',
            1: 'hard',
            2: 'good',
            3: 'easy',
          };
          
          // Filtrar apenas ERROR_NOTEBOOK que estão na sessão atual
          const entryIdsSet = new Set(entryIdsToUse);
          const reviewedMap = new Map<string, Difficulty>();
          
          todayReviews
            .filter((r: any) => r.content_type === 'ERROR_NOTEBOOK' && entryIdsSet.has(r.content_id))
            .forEach((r: any) => {
              const difficulty = gradeToQuality[r.last_grade] || 'good';
              reviewedMap.set(r.content_id, difficulty);
            });
          
          console.log('✅ [loadSession] Entradas já revisadas hoje:', reviewedMap.size);
          setReviewedEntries(reviewedMap);
          setEntryStates(reviewedMap);
        }
      } catch (error) {
        console.error('💥 ERRO no loadSession:', error);
        console.error('💥 Stack:', error instanceof Error ? error.stack : 'N/A');
        alert('Erro ao carregar sessão. Tente novamente.');
        router.push('/revisoes');
      }
    };

    console.log('🎯 Chamando loadSession()...');
    loadSession();
  }, [sessionId, router]);

  // Usar React Query para carregar entry atual
  const currentEntryId = entryIds[currentIndex] || '';
  const { data: entryData } = useCadernoErrosEntry(currentEntryId);
  
  useEffect(() => {
    if (entryData) {
      setEntry(entryData);
      setLoading(false);
      
      // Buscar dados completos da questão
      if (entryData.question_id) {
        fetchWithAuth(`/api/questions/${entryData.question_id}`)
          .then(async (response) => {
            if (response.ok) {
              const questionData = await response.json();
              setFullQuestion(questionData.data);
            }
          })
          .catch(err => console.error('[ReviewPage] Error fetching question:', err));
      }
    }
  }, [entryData]);

  // Função para adicionar event listeners em imagens
  const setupImageListeners = (element: HTMLElement) => {
    const images = element.querySelectorAll('img');
    images.forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.style.transition = 'transform 0.2s';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '1rem auto';
      img.style.borderRadius = '0.5rem';
      img.style.border = '2px solid #e5e7eb';

      img.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.02)';
      });

      img.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
      });

      img.addEventListener('click', () => {
        setSelectedImage(img.src);
      });
    });
  };

  const handleReview = async (difficulty: Difficulty) => {
    try {
      const reviewTimeMs = Date.now() - reviewStartTime.current;
      
      // Mapear Difficulty para grade FSRS (0-3)
      const gradeMap: Record<Difficulty, number> = {
        'again': 0,  // FSRS AGAIN
        'hard': 1,   // FSRS HARD
        'good': 2,   // FSRS GOOD
        'easy': 3,   // FSRS EASY
      };
      
      const grade = gradeMap[difficulty];
      const entryId = entryIds[currentIndex];
      
      // Marcar como revisado ANTES de enviar para o backend
      setReviewedEntries(prev => new Map(prev).set(entryId, difficulty));
      setEntryStates(prev => new Map(prev).set(entryId, difficulty));
      
      // Registrar revisão e atualizar progresso em background sem bloquear a UI
      Promise.all([
        fetchWithAuth('/unified-reviews/record', {
          method: 'POST',
          body: JSON.stringify({
            content_type: 'ERROR_NOTEBOOK',
            content_id: entryId,
            grade: grade,
            review_time_ms: reviewTimeMs,
          }),
        }),
        fetchWithAuth(`/api/review-sessions/${sessionId}/progress`, {
          method: 'PUT',
          body: JSON.stringify({
            current_index: currentIndex + 1,
            completed_ids: [...Array.from(reviewedEntries.keys()), entryId],
          }),
        })
      ]).catch((error) => {
        console.error('Erro ao registrar revisão:', error);
        // Remover da lista de revisados em caso de erro
        setReviewedEntries(prev => {
          const newMap = new Map(prev);
          newMap.delete(entryId);
          return newMap;
        });
        setEntryStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(entryId);
          return newMap;
        });
      });
      
      toast.success('Revisão registrada!');
      
      // Navegar IMEDIATAMENTE para próxima entrada ou voltar ao planner
      if (currentIndex < entryIds.length - 1) {
        setCurrentIndex(currentIndex + 1);
        // Resetar o timer para a próxima entrada
        reviewStartTime.current = Date.now();
      } else {
        toast.success('Todas as revisões foram concluídas!');
        router.push('/revisoes');
      }
    } catch (error) {
      console.error('Erro ao registrar revisão:', error);
      toast.error('Erro ao registrar revisão. Tente novamente.');
      // Remover da lista de revisados em caso de erro
      setReviewedEntries(prev => {
        const newMap = new Map(prev);
        newMap.delete(entryIds[currentIndex]);
        return newMap;
      });
      setEntryStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(entryIds[currentIndex]);
        return newMap;
      });
    }
  };

  const handleNavigate = (index: number) => {
    if (index >= 0 && index < entryIds.length) {
      setCurrentIndex(index);
    }
  };

  if (loading) {
    return null; // O loading.tsx já mostra o skeleton
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center bg-surface-light dark:bg-surface-dark p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">
            Entrada não encontrada
          </h2>
          <button
            onClick={() => router.push('/revisoes')}
            className="bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Voltar para Planner
          </button>
        </div>
      </div>
    );
  }

  const questionData = entry.question_data;

  return (
    <div className="flex flex-col h-full relative">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Caderno de Erros', icon: 'book', href: '/caderno-erros' },
            { label: 'Revisão', icon: 'visibility' },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto -m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black">
        <div className="flex gap-6 w-full px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">

          {/* Question Header */}
          {fullQuestion && (
            <>
              <QuestionHeader
                question={fullQuestion}
                likes={0}
                dislikes={0}
              />

              {/* Toolbar */}
              <div className="flex items-center justify-end mb-6">
                <div className="flex items-center gap-3">
                  <button
                    className="p-2 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors"
                    aria-label="Destacar texto"
                    title="Destacar texto"
                  >
                    <span className="material-symbols-outlined text-xl">border_color</span>
                  </button>

                  <div className="w-px h-6 bg-border-light dark:bg-border-dark" />

                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors"
                    aria-label="Imprimir questão"
                    title="Imprimir questão"
                  >
                    <span className="material-symbols-outlined text-xl">print</span>
                  </button>

                  <button
                    className="p-2 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="Relatar erro na questão"
                    title="Relatar erro na questão"
                  >
                    <span className="material-symbols-outlined text-xl">flag</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Resumo da Questão */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 space-y-6 shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-shadow duration-300">

            {/* Enunciado */}
            <div>
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 uppercase tracking-wide">
                Enunciado
              </h3>
              <div
                ref={(el) => {
                  if (el) {
                    setupImageListeners(el);
                  }
                }}
                className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary [&_img]:mx-auto [&_img]:block [&_img]:my-4"
                dangerouslySetInnerHTML={{ __html: entry.question_statement }}
              />
            </div>

            {/* Alternativas */}
            {questionData?.alternatives && questionData.alternatives.length > 0 && (
              <div className="pt-4 border-t border-border-light dark:border-border-dark">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 uppercase tracking-wide">
                  Alternativas
                </h3>
                <div className="space-y-3">
                  {questionData.alternatives.map((alt: any, index: number) => {
                    const isCorrect = alt.id === (fullQuestion?.correctAlternative || entry.correct_answer);
                    const isUserAnswer = alt.id === entry.user_original_answer;
                    const hasComment = entry.alternative_comments?.[alt.id];
                    const letter = String.fromCharCode(65 + index);

                    return (
                      <div key={alt.id} className="space-y-2">
                        <div
                          className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-default
                                      hover:shadow-md dark:hover:shadow-dark-md hover:scale-[1.01] ${isCorrect
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                              : isUserAnswer
                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                : 'border-border-light dark:border-border-dark hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${isCorrect
                              ? 'bg-green-500 text-white'
                              : isUserAnswer
                                ? 'bg-red-500 text-white'
                                : 'bg-background-light dark:bg-background-dark text-text-light-primary dark:text-text-dark-primary'
                              }`}>
                              {letter}
                            </span>
                            <div
                              ref={(el) => {
                                if (el) {
                                  setupImageListeners(el);
                                }
                              }}
                              className="flex-1 text-sm text-text-light-secondary dark:text-text-dark-secondary"
                              dangerouslySetInnerHTML={{ __html: alt.text }}
                            />
                            {isCorrect && (
                              <span className="material-symbols-outlined text-green-500 text-xl">
                                check_circle
                              </span>
                            )}
                            {isUserAnswer && !isCorrect && (
                              <span className="material-symbols-outlined text-red-500 text-xl">
                                cancel
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Comentário da alternativa */}
                        {hasComment ? (
                          <div className="ml-6 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark shadow-sm hover:shadow-md dark:shadow-dark-md transition-shadow duration-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">edit_note</span>
                                <span className="text-xs font-semibold text-primary uppercase">
                                  Seu comentário para alternativa {letter}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setFocusedAlternativeId(alt.id);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
                                title="Editar comentário"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                            </div>
                            <div
                              ref={(el) => {
                                if (el) {
                                  setupImageListeners(el);
                                }
                              }}
                              className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                              dangerouslySetInnerHTML={{ __html: entry.alternative_comments![alt.id] }}
                            />
                          </div>
                        ) : (
                          <div className="ml-6">
                            <button
                              onClick={() => {
                                setFocusedAlternativeId(alt.id);
                                setIsEditModalOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-border-light dark:border-border-dark hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-all duration-200 hover:scale-[1.02] active:scale-95"
                            >
                              <span className="material-symbols-outlined text-base">add</span>
                              <span className="text-xs font-medium">Adicionar comentário para alternativa {letter}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Suas Anotações */}
          <div className="space-y-4">
            {/* Conceito Chave */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">lightbulb</span>
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wide">
                  Conceito Chave
                </h3>
              </div>
              <div
                ref={(el) => {
                  if (el) {
                    setupImageListeners(el);
                  }
                }}
                className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                dangerouslySetInnerHTML={{ __html: entry.user_note }}
              />
            </div>

            {/* Por que errei */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">psychology</span>
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wide">
                  Por que errei
                </h3>
              </div>
              <div
                ref={(el) => {
                  if (el) {
                    setupImageListeners(el);
                  }
                }}
                className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                dangerouslySetInnerHTML={{ __html: entry.user_explanation }}
              />
            </div>
          </div>

          {/* Comentário */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-shadow duration-300">
            {questionData?.professorComment ? (
              <>
                <button
                  onClick={() => setShowProfessorComment(!showProfessorComment)}
                  className="w-full flex items-center justify-between p-6 hover:bg-background-light dark:hover:bg-background-dark transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">comment</span>
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wide">
                      Comentário
                    </h3>
                  </div>
                  <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                    {showProfessorComment ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {showProfessorComment && (
                  <div className="px-6 pb-6 pt-2 animate-in fade-in duration-300">
                    <div
                      ref={(el) => {
                        if (el) {
                          setupImageListeners(el);
                        }
                      }}
                      className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                      dangerouslySetInnerHTML={{ __html: questionData.professorComment }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    chat_bubble_outline
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                    Nenhum comentário disponível
                  </h3>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary max-w-sm">
                    Esta questão ainda não possui um comentário explicativo do professor.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Revisão */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-shadow duration-300">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">rate_review</span>
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wide">
                Avalie a questão:
              </h3>
            </div>
            <DifficultyButtons
              onSelect={handleReview}
              contentType="ERROR_NOTEBOOK"
              contentId={entryIds[currentIndex]}
              selectedDifficulty={reviewedEntries.get(entryIds[currentIndex])}
              disabled={reviewedEntries.has(entryIds[currentIndex])}
              onCardDeleted={() => {
                toast.success('Item removido das revisões!');
                // Navegar para próxima entrada ou voltar ao planner
                if (currentIndex < entryIds.length - 1) {
                  setCurrentIndex(currentIndex + 1);
                } else {
                  setTimeout(() => router.push('/revisoes'), 1000);
                }
              }}
            />
          </div>

          </div>

          {/* Sidebar - Navigation Panel */}
          <aside className="flex-shrink-0 w-80 space-y-6">
            <ErrorNotebookNavigationPanel
              entries={entryIds.map(id => ({ id } as ErrorNotebookEntry))}
              currentEntryId={entryIds[currentIndex]}
              onEntryClick={handleNavigate}
              entryStates={entryStates}
            />
          </aside>

        </div>
      </div>

      {/* Modal de Edição */}
      {fullQuestion && isEditModalOpen && (
        <AddToErrorNotebookModal
          question={fullQuestion}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setFocusedAlternativeId(undefined);
          }}
          onSuccess={async () => {
            // Recarregar entry atualizada
            const data = await errorNotebookService.getUserEntries({});
            const updatedEntry = data.entries.find(e => e.id === entryIds[currentIndex]);
            if (updatedEntry) {
              setEntry(updatedEntry);
            }
          }}
          existingEntry={entry}
          focusedAlternativeId={focusedAlternativeId}
        />
      )}

      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImage}
        isOpen={selectedImage !== null}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
