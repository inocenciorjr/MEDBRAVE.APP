'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ErrorNotebookEntry, errorNotebookService } from '@/services/errorNotebookService';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Question } from '@/types/resolucao-questoes';
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';
import { QuestionHeader } from '@/components/resolucao-questoes/QuestionHeader';
import { AddToErrorNotebookModal } from '@/components/error-notebook/AddToErrorNotebookModal';
import { DifficultyButtons } from '@/components/flashcards/DifficultyButtons';
import { Difficulty } from '@/types/flashcards';
import { useToast } from '@/lib/contexts/ToastContext';
import { ImageModal } from '@/components/resolucao-questoes';
import { ErrorNotebookNavigationPanel } from '@/components/error-notebook/ErrorNotebookNavigationPanel';
import { useCadernoErrosEntry } from '@/hooks/queries';


export default function ReviewErrorNotebookPage() {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;
  const toast = useToast();

  const [entryIds, setEntryIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [entry, setEntry] = useState<ErrorNotebookEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullQuestion, setFullQuestion] = useState<Question | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [focusedAlternativeId, setFocusedAlternativeId] = useState<string | undefined>(undefined);
  const [showProfessorComment, setShowProfessorComment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reviewStartTime] = useState(Date.now());

  // Inicializar IDs da URL ou usar apenas o ID atual
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idsParam = urlParams.get('ids');
    const currentParam = urlParams.get('current');

    if (idsParam) {
      const ids = idsParam.split(',');
      setEntryIds(ids);
      
      if (currentParam) {
        setCurrentIndex(parseInt(currentParam));
      } else {
        // Encontrar índice do ID atual
        const index = ids.indexOf(entryId);
        setCurrentIndex(index >= 0 ? index : 0);
      }
    } else {
      // Modo single entry
      setEntryIds([entryId]);
      setCurrentIndex(0);
    }
  }, [entryId]);

  // Usar React Query para carregar entry
  const { data: entryData } = useCadernoErrosEntry(entryIds[currentIndex] || entryId);
  
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
          .catch((err) => {
            console.error('[ReviewPage] Error fetching question:', err);
          });
      }
    }
  }, [entryData, toast]);

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
      const reviewTimeMs = Date.now() - reviewStartTime;
      
      // Mapear Difficulty para grade numérico
      const gradeMap: Record<Difficulty, number> = {
        'again': 0,
        'hard': 1,
        'good': 2,
        'easy': 3,
      };
      
      const grade = gradeMap[difficulty];
      await errorNotebookService.recordReview(entryId, grade, reviewTimeMs);
      
      toast.success('Revisão registrada com sucesso!');
      
      // Redirecionar de volta para o caderno de erros
      setTimeout(() => {
        router.push('/caderno-erros');
      }, 1000);
    } catch (error) {
      console.error('Erro ao registrar revisão:', error);
      toast.error('Erro ao registrar revisão. Tente novamente.');
    }
  };

  if (loading) {
    return null;
  }

  if (!entry) {
    return null;
  }

  const questionData = entry.question_data;

  return (
    <div className="flex flex-col h-full">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: 'Caderno de Erros', icon: 'book', href: '/caderno-erros' },
            { label: 'Revisão', icon: 'visibility' },
          ]}
        />
      </div>

      <div className="flex-1 overflow-auto -m-4 md:-m-8 min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-black dark:via-background-dark dark:to-black pb-48">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

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
        </div>
      </div>

      {/* Botões de Revisão */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-lg border-t border-border-light dark:border-border-dark shadow-2xl z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DifficultyButtons
            onSelect={handleReview}
            contentType="ERROR_NOTEBOOK"
            contentId={entryId}
            onCardDeleted={() => {
              toast.success('Item removido das revisões!');
              setTimeout(() => router.push('/caderno-erros'), 1000);
            }}
          />
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
            const updatedEntry = data.entries.find(e => e.id === entryId);
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
