'use client';

import React, { useState } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';

export interface BulkQuestion {
  numero: string;
  enunciado: string;
  alternativas: string[];
  correta?: number | number[];
  dificuldade?: string;
  status?: string;
  tags?: string[];
  filterIds?: string[];
  subFilterIds?: string[];
  explicacao?: string;
  imagem?: string;
  tempId?: string;
  id?: string;
}

export interface CategorizationButtonProps {
  questions: BulkQuestion[];
  selectedQuestions?: Set<number>;
  onCategorizationStart: () => void;
  onCategorizationComplete: (results: any[]) => void;
  disabled?: boolean;
}

export const CategorizationButton: React.FC<CategorizationButtonProps> = ({
  questions,
  selectedQuestions,
  onCategorizationStart,
  onCategorizationComplete,
  disabled = false,
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const questionsToProcess = selectedQuestions && selectedQuestions.size > 0
    ? questions.filter((_, idx) => selectedQuestions.has(idx))
    : questions;

  const uncategorizedQuestions = questionsToProcess.filter(
    q => !q.filterIds || q.filterIds.length === 0
  );

  const toast = useToast();
  
  const handleClick = () => {
    if (uncategorizedQuestions.length === 0) {
      toast.info('Todas as questões já estão categorizadas!');
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onCategorizationStart();
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={disabled || questions.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        <span className="material-symbols-outlined">auto_awesome</span>
        <span>Categorizar com IA</span>
        {uncategorizedQuestions.length > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {uncategorizedQuestions.length}
          </span>
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">auto_awesome</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Categorizar com IA
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {uncategorizedQuestions.length} questão(ões) será(ão) categorizada(s) automaticamente usando IA.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">info</span>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">O que será analisado:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Enunciado completo da questão</li>
                    <li>Todas as alternativas</li>
                    <li>Gabarito (resposta correta)</li>
                    <li>Imagens (se houver)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg"
              >
                Iniciar Categorização
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
