'use client';

import { useEffect } from 'react';
import { Question } from '@/types/resolucao-questoes';

interface SummaryModalProps {
  question: Question;
  isOpen: boolean;
  onClose: () => void;
}

export function SummaryModal({ question, isOpen, onClose }: SummaryModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            Resumo da Questão
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all hover:scale-110 active:scale-95"
            aria-label="Fechar resumo"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações da Questão */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-4 shadow-sm border border-border-light dark:border-border-dark">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              Informações
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Instituição:</span>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{question.institution}</p>
              </div>
              <div>
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Ano:</span>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{question.year}</p>
              </div>
              <div>
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Assunto:</span>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{question.subject}</p>
              </div>
              <div>
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Tópico:</span>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{question.topic}</p>
              </div>
            </div>
          </div>

          {/* Enunciado */}
          <div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              Enunciado
            </h3>
            <div 
              className="prose dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
              dangerouslySetInnerHTML={{ __html: question.text }}
            />
          </div>

          {/* Alternativas */}
          <div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              Alternativas
            </h3>
            <div className="space-y-2">
              {question.alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className={`p-4 rounded-lg border-2 shadow-sm hover:shadow-md transition-all ${
                    alt.id === question.correctAlternative
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border-light dark:border-border-dark'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-text-light-primary dark:text-text-dark-primary">
                      {alt.letter})
                    </span>
                    <div 
                      className="flex-1 text-text-light-secondary dark:text-text-dark-secondary"
                      dangerouslySetInnerHTML={{ __html: alt.text }}
                    />
                    {alt.id === question.correctAlternative && (
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                        check_circle
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comentário do Professor (se existir) */}
          {question.professorComment && (
            <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-4 shadow-sm border border-primary/20 dark:border-primary/30">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">school</span>
                Comentário do Professor
              </h3>
              <div 
                className="prose dark:prose-invert max-w-none text-text-light-secondary dark:text-text-dark-secondary"
                dangerouslySetInnerHTML={{ __html: question.professorComment }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
