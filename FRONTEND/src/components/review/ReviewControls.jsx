import React from 'react';

/**
 * Componente de controles para navegação durante a sessão de revisão
 * Inclui botões para anterior, próximo, revelar resposta, etc.
 */
const ReviewControls = ({
  onPrevious,
  onNext,
  onRevealAnswer,
  canGoPrevious = false,
  canGoNext = false,
  showAnswer = false,
  autoAdvance = false,
  loading = false
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between gap-4">
        {/* Botão Anterior */}
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious || loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            canGoPrevious && !loading
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>

        {/* Controles Centrais */}
        <div className="flex items-center gap-3">
          {/* Botão Revelar Resposta */}
          {!showAnswer && (
            <button
              onClick={onRevealAnswer}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Revelar Resposta
            </button>
          )}

          {/* Indicador de Auto-Avanço */}
          {autoAdvance && showAnswer && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium">Avançando automaticamente...</span>
            </div>
          )}

          {/* Atalhos de Teclado */}
          <div className="hidden md:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border">
                ←
              </kbd>
              <span>Anterior</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border">
                →
              </kbd>
              <span>Próximo</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border">
                Space
              </kbd>
              <span>Revelar</span>
            </div>
          </div>
        </div>

        {/* Botão Próximo */}
        <button
          onClick={onNext}
          disabled={!canGoNext || loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            canGoNext && !loading
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          Próximo
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Barra de Ações Secundárias */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {/* Espaço reservado para ações futuras */}
          <div className="flex items-center gap-2">
            {/* Os botões FSRS agora estão no ReviewCard */}
          </div>

          {/* Ações Adicionais */}
          <div className="flex items-center gap-2">
            {/* Marcar para Revisão */}
            <button
              className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Marcar para revisão posterior"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Marcar
            </button>

            {/* Reportar Problema */}
            <button
              className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Reportar problema com esta questão"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Reportar
            </button>

            {/* Adicionar Nota */}
            <button
              className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              title="Adicionar nota pessoal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook para atalhos de teclado
export const useKeyboardShortcuts = ({
  onPrevious,
  onNext,
  onRevealAnswer,
  canGoPrevious,
  canGoNext,
  showAnswer
}) => {
  React.useEffect(() => {
    const handleKeyPress = (event) => {
      // Ignorar se estiver digitando em um input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (canGoPrevious) {
            event.preventDefault();
            onPrevious();
          }
          break;
        case 'ArrowRight':
          if (canGoNext) {
            event.preventDefault();
            onNext();
          }
          break;
        case ' ': // Espaço
          if (!showAnswer) {
            event.preventDefault();
            onRevealAnswer();
          }
          break;
        case 'Enter':
          if (showAnswer && canGoNext) {
            event.preventDefault();
            onNext();
          } else if (!showAnswer) {
            event.preventDefault();
            onRevealAnswer();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onPrevious, onNext, onRevealAnswer, canGoPrevious, canGoNext, showAnswer]);
};

export default ReviewControls;