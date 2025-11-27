'use client';

import { useState, useEffect } from 'react';
import { ErrorNotebookEntry } from '@/services/errorNotebookService';

interface ErrorNotebookReviewModalProps {
  entry: ErrorNotebookEntry;
  isOpen: boolean;
  onClose: () => void;
}

export function ErrorNotebookReviewModal({
  entry,
  isOpen,
  onClose,
}: ErrorNotebookReviewModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [showProfessorComment, setShowProfessorComment] = useState(false);
  const [showAlternativeComments, setShowAlternativeComments] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
        setShowProfessorComment(false);
        setShowAlternativeComments(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'MEDIUM': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'HARD': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'VERY_HARD': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY': return 'Fácil';
      case 'MEDIUM': return 'Média';
      case 'HARD': return 'Difícil';
      case 'VERY_HARD': return 'Muito Difícil';
      default: return difficulty;
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Revisão do Erro
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(entry.difficulty)}`}>
                {getDifficultyLabel(entry.difficulty)}
              </span>
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {entry.question_subject}
              </span>
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Confiança: {entry.confidence}/5
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all hover:scale-110 active:scale-95"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Informações da Questão */}
          {entry.question_data && (
            <div className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
                Informações da Questão
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">Instituição</span>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {entry.question_data.institution}
                  </p>
                </div>
                <div>
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">Ano</span>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {entry.question_data.year}
                  </p>
                </div>
                <div>
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">Tópico</span>
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {entry.question_data.topic}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enunciado */}
          <div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              Enunciado
            </h3>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
              dangerouslySetInnerHTML={{ __html: entry.question_statement }}
            />
          </div>

          {/* Alternativas */}
          {entry.question_data?.alternatives && (
            <div>
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
                Alternativas
              </h3>
              <div className="space-y-2">
                {entry.question_data.alternatives.map((alt) => {
                  const isCorrect = alt.text === entry.correct_answer;
                  const isUserAnswer = alt.text === entry.user_original_answer;
                  
                  return (
                    <div key={alt.id} className="space-y-2">
                      <div
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : isUserAnswer
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-border-light dark:border-border-dark'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                            {alt.letter})
                          </span>
                          <div 
                            className="flex-1 text-sm text-text-light-secondary dark:text-text-dark-secondary"
                            dangerouslySetInnerHTML={{ __html: alt.text }}
                          />
                          {isCorrect && (
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                              check_circle
                            </span>
                          )}
                          {isUserAnswer && !isCorrect && (
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                              cancel
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comentário da Alternativa */}
                      {entry.alternative_comments?.[alt.id] && showAlternativeComments && (
                        <div className="ml-8 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                            Seu comentário:
                          </p>
                          <div 
                            className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                            dangerouslySetInnerHTML={{ __html: entry.alternative_comments[alt.id] }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Toggle para mostrar comentários */}
              {entry.alternative_comments && Object.keys(entry.alternative_comments).length > 0 && (
                <button
                  onClick={() => setShowAlternativeComments(!showAlternativeComments)}
                  className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showAlternativeComments ? 'visibility_off' : 'visibility'}
                  </span>
                  {showAlternativeComments ? 'Ocultar' : 'Mostrar'} comentários nas alternativas
                </button>
              )}
            </div>
          )}

          {/* Suas Anotações */}
          <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border border-primary/20 dark:border-primary/30">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">edit_note</span>
              Suas Anotações
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Conceito Chave
                </h4>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                  dangerouslySetInnerHTML={{ __html: entry.user_note }}
                />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
                  Por que você errou
                </h4>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                  dangerouslySetInnerHTML={{ __html: entry.user_explanation }}
                />
              </div>
            </div>
          </div>

          {/* Comentário do Professor */}
          {entry.question_data?.professorComment && (
            <div>
              <button
                onClick={() => setShowProfessorComment(!showProfessorComment)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-3"
              >
                <span className="material-symbols-outlined">
                  {showProfessorComment ? 'expand_less' : 'expand_more'}
                </span>
                {showProfessorComment ? 'Ocultar' : 'Mostrar'} comentário do professor
              </button>

              {showProfessorComment && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined">school</span>
                    Comentário do Professor
                  </h3>
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                    dangerouslySetInnerHTML={{ __html: entry.question_data.professorComment }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark p-6 flex justify-between items-center">
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Adicionado em {new Date(entry.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
