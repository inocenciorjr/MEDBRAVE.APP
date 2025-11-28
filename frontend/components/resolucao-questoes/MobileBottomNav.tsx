'use client';

import { useState } from 'react';
import { NavigationPanel } from './NavigationPanel';

interface MobileBottomNavProps {
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentIndex: number;
  totalQuestions: number;
  questionList: any[];
  questionStates: Map<string, 'correct' | 'incorrect' | 'unanswered' | 'answered'>;
  onNavigate: (indexOrId: number | string) => void;
  onSummary?: () => void;
  onErrorNotebook?: () => void;
  onComments?: () => void;
  isAnswered?: boolean;
  isSimulatedMode?: boolean;
}

export function MobileBottomNav({
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  currentIndex,
  totalQuestions,
  questionList,
  questionStates,
  onNavigate,
  onSummary,
  onErrorNotebook,
  onComments,
  isAnswered = false,
  isSimulatedMode = false,
}: MobileBottomNavProps) {
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);

  return (
    <>
      {/* Fixed Bottom Navigation Bar - Mobile + Tablet */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-light dark:bg-surface-dark border-t-2 border-border-light dark:border-border-dark shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Previous Button */}
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="p-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            aria-label="Questão anterior"
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>

          {/* Center: Current Question + View All Button */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              {currentIndex + 1} de {totalQuestions}
            </span>
            
            <button
              onClick={() => setShowNavigationModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg font-medium text-sm shadow-lg active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">apps</span>
              Ver todas
            </button>
            
            {/* Actions Menu Button - Only show if not simulated mode and answered */}
            {!isSimulatedMode && isAnswered && (onSummary || onErrorNotebook || onComments) && (
              <button
                onClick={() => setShowActionsModal(true)}
                className="p-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark transition-all active:scale-95"
                aria-label="Mais ações"
              >
                <span className="material-symbols-outlined text-xl">more_vert</span>
              </button>
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="p-2 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            aria-label="Próxima questão"
          >
            <span className="material-symbols-outlined text-2xl">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Navigation Modal */}
      {showNavigationModal && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowNavigationModal(false)}
          />
          <div className="relative w-full bg-surface-light dark:bg-surface-dark rounded-t-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                Navegação
              </h3>
              <button
                onClick={() => setShowNavigationModal(false)}
                className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Navigation Panel */}
            <div className="p-4">
              <NavigationPanel
                questions={questionList}
                currentQuestionId={questionList[currentIndex]?.id || ''}
                showEnunciado={false}
                onToggleEnunciado={() => {}}
                onQuestionClick={(indexOrId) => {
                  if (typeof indexOrId === 'number') {
                    onNavigate(indexOrId);
                  } else {
                    const index = questionList.findIndex(q => q?.id === indexOrId);
                    if (index !== -1) onNavigate(index);
                  }
                  setShowNavigationModal(false);
                }}
                questionStates={questionStates}
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions Modal */}
      {showActionsModal && (
        <div className="xl:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div 
            className="absolute inset-0" 
            onClick={() => setShowActionsModal(false)}
          />
          <div className="relative w-full bg-surface-light dark:bg-surface-dark rounded-t-2xl animate-slide-up">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                Ações
              </h3>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-2">
              {onSummary && (
                <button
                  onClick={() => {
                    onSummary();
                    setShowActionsModal(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-background-light dark:bg-background-dark hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-2xl text-primary">description</span>
                  <span className="text-base font-medium">Ver Resumo</span>
                </button>
              )}
              
              {onErrorNotebook && (
                <button
                  onClick={() => {
                    onErrorNotebook();
                    setShowActionsModal(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-background-light dark:bg-background-dark hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-2xl text-primary">book</span>
                  <span className="text-base font-medium">Adicionar ao Caderno de Erros</span>
                </button>
              )}
              
              {onComments && (
                <button
                  onClick={() => {
                    onComments();
                    setShowActionsModal(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-background-light dark:bg-background-dark hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-2xl text-primary">comment</span>
                  <span className="text-base font-medium">Ver Comentários</span>
                </button>
              )}
              
              <button
                onClick={() => setShowActionsModal(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-background-light dark:bg-background-dark hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 transition-colors active:scale-95 mt-4"
              >
                <span className="text-base font-medium text-text-light-secondary dark:text-text-dark-secondary">Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
