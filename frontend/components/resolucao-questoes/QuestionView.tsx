'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Question, ToolMode } from '@/types/resolucao-questoes';
import { useQuestionState } from '@/lib/hooks/useQuestionState';
import { useFocusMode } from '@/lib/contexts/FocusModeContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { QuestionHeader } from './QuestionHeader';
import { QuestionBody } from './QuestionBody';
import { Alternatives } from './Alternatives';
import { NavigationButtons } from './NavigationButtons';
import { ReportLink } from './ReportLink';
import { NavigationPanel } from './NavigationPanel';
import { StylesPanel } from './StylesPanel';
import { QuestionStylesPanel } from './QuestionStylesPanel';
import { ActionBar } from './ActionBar';
import { MobileBottomNav } from './MobileBottomNav';
import { SummaryModal } from './modals/SummaryModal';
import { CommentsModal } from './modals/CommentsModal';
import { ReportModal } from './modals/ReportModal';
import { UpdateNoteAlert } from './UpdateNoteAlert';
import { getNotesForQuestion } from '@/lib/api/updateNotes';
import { AddToErrorNotebookModal } from '@/components/error-notebook/AddToErrorNotebookModal';
import { QuestionHistoryCard } from './QuestionHistoryCard';
import { errorNotebookService } from '@/services/errorNotebookService';

interface QuestionViewProps {
  question: Question;
  questionList: Question[];
  listId?: string;
  onNavigate?: (index: number) => void;
  isSimulatedMode?: boolean; // Modo simulado: oculta explicação, resposta correta, comentários, etc.
  isActiveReview?: boolean; // Indica se está em modo de revisão ativa (FSRS)
  reviewSessionId?: string; // ID da sessão de revisão (para atualizar progresso)
}

export function QuestionView({ question, questionList, listId, onNavigate, isSimulatedMode = false, isActiveReview = false, reviewSessionId }: QuestionViewProps) {
  const isMobile = useIsMobile();

  const {
    state,
    selectAlternative,
    confirmAnswer,
    addHighlight,
    removeHighlight,
    addTag,
    removeTag,
  } = useQuestionState(question, listId);

  // Carregar estados de todas as questões para o NavigationPanel
  const [questionStates, setQuestionStates] = useState<Map<string, 'correct' | 'incorrect' | 'unanswered' | 'answered'>>(new Map());

  const loadQuestionStates = useCallback(() => {
    const states = new Map<string, 'correct' | 'incorrect' | 'unanswered' | 'answered'>();
    const storageKeyPrefix = listId ? `question_state_${listId}_` : 'question_state_';

    // Carregar estados de TODAS as questões, INCLUINDO placeholders
    questionList.forEach(q => {
      if (!q?.id) return;

      // NÃO ignorar placeholders - tentar carregar o estado mesmo assim
      try {
        const saved = localStorage.getItem(`${storageKeyPrefix}${q.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.isAnswered) {
            // Questão confirmada (modo normal)
            states.set(q.id, parsed.isCorrect ? 'correct' : 'incorrect');
          } else if (parsed.selectedAlternative) {
            // Questão respondida mas não confirmada (modo simulado)
            states.set(q.id, 'answered');
          } else {
            states.set(q.id, 'unanswered');
          }
        } else {
          states.set(q.id, 'unanswered');
        }
      } catch (error) {
        console.error('Error loading state for question:', q.id, error);
        states.set(q.id, 'unanswered');
      }
    });

    setQuestionStates(states);
  }, [questionList, listId]);

  useEffect(() => {
    loadQuestionStates();

    // Listener para mudanças no localStorage (quando usuário seleciona alternativa)
    window.addEventListener('storage', loadQuestionStates);

    return () => {
      window.removeEventListener('storage', loadQuestionStates);
    };
  }, [loadQuestionStates]);

  const currentIndex = questionList.findIndex(q => q?.id === question.id);
  const canGoNext = currentIndex < questionList.length - 1;
  const canGoPrevious = currentIndex > 0;

  const goToNext = () => {
    if (canGoNext && onNavigate) {
      onNavigate(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (canGoPrevious && onNavigate) {
      onNavigate(currentIndex - 1);
    }
  };

  const goToQuestion = (indexOrId: number | string) => {
    if (!onNavigate) return;

    // Se for string (ID), encontrar o índice
    if (typeof indexOrId === 'string') {
      const index = questionList.findIndex(q => q?.id === indexOrId);
      if (index !== -1) {
        onNavigate(index);
      }
    } else {
      // Se for número, usar diretamente
      onNavigate(indexOrId);
    }
  };

  const [toolMode, setToolMode] = useState<ToolMode>('none');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showErrorNotebookModal, setShowErrorNotebookModal] = useState(false);
  const [existingNotebookEntry, setExistingNotebookEntry] = useState<any>(null);
  const [updateNotes, setUpdateNotes] = useState<any[]>([]);
  const [notebookRefreshTrigger, setNotebookRefreshTrigger] = useState(0);

  const { isFocusMode, setIsFocusMode } = useFocusMode();

  // Carregar estatísticas de alternativas após responder
  const [alternativeStats, setAlternativeStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (state.isAnswered) {
      // Carregar estatísticas quando a questão for respondida
      const loadStats = async () => {
        try {
          const { getQuestionAlternativeStats } = await import('@/lib/api/questions');
          const stats = await getQuestionAlternativeStats(question.id);
          setAlternativeStats(stats);
        } catch (error) {
          console.error('Erro ao carregar estatísticas de alternativas:', error);
        }
      };
      loadStats();
    } else {
      // Limpar estatísticas quando não estiver respondida
      setAlternativeStats({});
    }
  }, [state.isAnswered, question.id]);

  // Carregar notas de atualização quando a questão for respondida
  useEffect(() => {
    if (state.isAnswered) {
      const loadUpdateNotes = async () => {
        try {
          const notes = await getNotesForQuestion(question.id);
          setUpdateNotes(notes);
        } catch (error) {
          console.error('Erro ao carregar notas de atualização:', error);
        }
      };
      loadUpdateNotes();
    } else {
      setUpdateNotes([]);
    }
  }, [state.isAnswered, question.id]);

  const handleConfirmAnswer = async () => {
    const isCorrect = state.selectedAlternative === question.correctAlternative;

    // Confirmar resposta IMEDIATAMENTE (atualiza UI)
    confirmAnswer();

    // Recarregar estados após confirmar resposta (para atualizar NavigationPanel)
    setTimeout(() => {
      loadQuestionStates();
    }, 100);

    // Salvar resposta no backend em BACKGROUND sem bloquear UI
    if (listId && state.selectedAlternative) {
      const selectedAltId = state.selectedAlternative; // Captura o valor não-null
      (async () => {
        try {
          const { saveQuestionResponse } = await import('@/lib/api/questions');
          await saveQuestionResponse({
            questionId: question.id,
            questionListId: listId,
            selectedAlternativeId: selectedAltId,
            isCorrect,
            responseTimeSeconds: 0, // TODO: Implementar timer
            isActiveReview, // Passa se é revisão ativa para usar study_mode correto
          });

          // Se for revisão ativa com sessionId, atualizar progresso da sessão
          if (isActiveReview && reviewSessionId) {
            try {
              const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');
              const currentQuestionIndex = questionList.findIndex(q => q.id === question.id);

              await fetchWithAuth(`/api/review-sessions/${reviewSessionId}/progress`, {
                method: 'PATCH',
                body: JSON.stringify({
                  current_index: currentQuestionIndex + 1
                }),
              });

              console.log('✅ Progresso da sessão de revisão atualizado');
            } catch (error) {
              console.error('❌ Erro ao atualizar progresso da sessão:', error);
            }
          }
        } catch (error) {
          console.error('Erro ao salvar resposta:', error);
        }
      })();
    }
  };

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
  };

  return (
    <div className={`flex flex-col xl:flex-row gap-4 md:gap-6 transition-all duration-500 ease-in-out ${!isFocusMode ? 'w-full max-w-[1600px] mx-auto' : 'w-full justify-center'
      }`}>
      {/* Main Content Wrapper with Buttons */}
      <div className={`relative transition-all duration-500 ease-in-out ${!isFocusMode ? 'flex-1 min-w-0' : 'max-w-7xl w-full'
        }`}>
        <main className="relative w-full bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg dark:shadow-dark-xl flex flex-col overflow-y-auto transition-all duration-500 ease-in-out">
          <div className="p-4 md:p-6 xl:p-8 flex-grow pb-24 md:pb-6 xl:pb-8">
            <QuestionHeader
              question={question}
              likes={question.likes}
              dislikes={question.dislikes}
              hideFilters={isSimulatedMode}
            />

            <QuestionBody
              question={question}
              toolMode={toolMode}
              onToolModeChange={setToolMode}
              highlights={state.highlights}
              onAddHighlight={addHighlight}
              onRemoveHighlight={removeHighlight}
              isFocusMode={isFocusMode}
              onToggleFocusMode={toggleFocusMode}
            />

            {/* Aviso de questão não respondida */}
            {state.isAnswered && state.selectedAlternative === '__NOT_ANSWERED__' && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-600 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-2xl">
                    info
                  </span>
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                      Questão não respondida
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Você não marcou nenhuma alternativa nesta questão durante o simulado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Alternatives
              alternatives={question.alternatives.map(alt => ({
                ...alt,
                percentage: isSimulatedMode ? undefined : alternativeStats[alt.id]
              }))}
              selectedAlternative={state.selectedAlternative === '__NOT_ANSWERED__' ? null : state.selectedAlternative}
              isAnswered={isSimulatedMode ? false : state.isAnswered}
              correctAlternative={question.correctAlternative}
              onSelect={selectAlternative}
            />

            {/* Confirm Button - Oculto no modo simulado */}
            {!isSimulatedMode && !state.isAnswered && state.selectedAlternative && (
              <div className="mt-6 md:mt-8 flex justify-end">
                <button
                  onClick={handleConfirmAnswer}
                  className="w-full md:w-auto bg-primary text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-surface-dark"
                >
                  Confirmar Resposta
                </button>
              </div>
            )}

            {/* Alertas de Questão Anulada/Desatualizada */}
            {state.isAnswered && (question.isAnnulled || question.isOutdated) && (
              <div className="mt-6 md:mt-8 space-y-3">
                {question.isAnnulled && (
                  <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg p-3 md:p-4 shadow-md">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl md:text-2xl flex-shrink-0">
                        cancel
                      </span>
                      <h4 className="text-base md:text-lg font-bold text-red-800 dark:text-red-300">
                        Questão Anulada
                      </h4>
                    </div>
                  </div>
                )}

                {question.isOutdated && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 dark:border-purple-400 rounded-lg p-3 md:p-4 shadow-md">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl md:text-2xl flex-shrink-0">
                        schedule
                      </span>
                      <h4 className="text-base md:text-lg font-bold text-purple-800 dark:text-purple-300">
                        Questão Desatualizada
                      </h4>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notas de Atualização */}
            {state.isAnswered && updateNotes.length > 0 && (
              <div className="mt-8">
                {updateNotes.map((note) => (
                  <UpdateNoteAlert key={note.id} note={note} />
                ))}
              </div>
            )}

            {/* Card de histórico - aparece após responder */}
            {state.isAnswered && !isSimulatedMode && (
              <div className="mt-8">
                <QuestionHistoryCard
                  questionId={question.id}
                  isAnswered={state.isAnswered}
                />
              </div>
            )}

            {/* Desktop Navigation Buttons */}
            {!isFocusMode && !isMobile && (
              <div className="mt-12 pt-6 border-t border-border-light dark:border-border-dark">
                <NavigationButtons
                  onPrevious={goToPrevious}
                  onNext={goToNext}
                  canGoPrevious={canGoPrevious}
                  canGoNext={canGoNext}
                />
              </div>
            )}

            {/* Mobile: Add padding for bottom nav */}
            {isMobile && <div className="h-20" />}
          </div>

          {/* Desktop ActionBar - Hidden on mobile */}
          {!isSimulatedMode && (
            <div className="hidden xl:block">
              <ActionBar
                key={`actionbar-${question.id}-${notebookRefreshTrigger}`}
                onSummary={() => setShowSummaryModal(true)}
                onErrorNotebook={async () => {
                  // Buscar entry existente antes de abrir o modal
                  try {
                    const data = await errorNotebookService.getUserEntries({});
                    const existing = data.entries.find(entry => entry.question_id === question.id);
                    setExistingNotebookEntry(existing || null);
                  } catch (error) {
                    console.error('Erro ao buscar entry:', error);
                    setExistingNotebookEntry(null);
                  }
                  setShowErrorNotebookModal(true);
                }}
                onComments={() => setShowCommentsModal(true)}
                isAnswered={state.isAnswered}
                questionId={question.id}
              />
            </div>
          )}
        </main>

        {/* Focus Mode Navigation Buttons - Floating outside card (Desktop only) */}
        {isFocusMode && !isMobile && (
          <>
            {canGoPrevious && (
              <button
                onClick={goToPrevious}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center z-50"
                aria-label="Questão anterior"
              >
                <span className="material-symbols-outlined text-2xl">chevron_left</span>
              </button>
            )}
            {canGoNext && (
              <button
                onClick={goToNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center z-50"
                aria-label="Próxima questão"
              >
                <span className="material-symbols-outlined text-2xl">chevron_right</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Sidebar - Hidden in Focus Mode, Mobile and Tablet */}
      <aside className={`hidden xl:block flex-shrink-0 space-y-6 transition-all duration-500 ease-in-out overflow-hidden ${isFocusMode ? 'w-0 opacity-0' : 'w-80 opacity-100'
        }`}>
        <NavigationPanel
          questions={questionList}
          currentQuestionId={question.id}
          showEnunciado={true}
          onToggleEnunciado={() => { }}
          onQuestionClick={goToQuestion}
          questionStates={questionStates}
        />

        <QuestionStylesPanel
          questionId={question.id}
          isAnswered={state.isAnswered}
        />
      </aside>

      {/* Mobile Bottom Navigation */}
      {isMobile && !isFocusMode && (
        <MobileBottomNav
          onPrevious={goToPrevious}
          onNext={goToNext}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          currentIndex={currentIndex}
          totalQuestions={questionList.length}
          questionList={questionList}
          questionStates={questionStates}
          onNavigate={goToQuestion}
          onSummary={!isSimulatedMode ? () => setShowSummaryModal(true) : undefined}
          onErrorNotebook={!isSimulatedMode ? async () => {
            try {
              const data = await errorNotebookService.getUserEntries({});
              const existing = data.entries.find(entry => entry.question_id === question.id);
              setExistingNotebookEntry(existing || null);
            } catch (error) {
              console.error('Erro ao buscar entry:', error);
              setExistingNotebookEntry(null);
            }
            setShowErrorNotebookModal(true);
          } : undefined}
          onComments={!isSimulatedMode ? () => setShowCommentsModal(true) : undefined}
          isAnswered={state.isAnswered}
          isSimulatedMode={isSimulatedMode}
        />
      )}

      {/* Modals */}
      <SummaryModal
        question={question}
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
      />
      <CommentsModal
        questionId={question.id}
        professorComment={question.professorComment}
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
      />
      <ReportModal
        questionId={question.id}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
      <AddToErrorNotebookModal
        question={question}
        isOpen={showErrorNotebookModal}
        onClose={() => {
          setShowErrorNotebookModal(false);
          setExistingNotebookEntry(null);
        }}
        onSuccess={() => {
          // Forçar atualização do ActionBar
          setNotebookRefreshTrigger(prev => prev + 1);
        }}
        userSelectedAnswer={state.selectedAlternative || undefined}
        existingEntry={existingNotebookEntry}
      />
    </div>
  );
}
