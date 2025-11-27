'use client';

import React from 'react';

export interface CategorizationProgress {
  totalQuestions: number;
  processedQuestions: number;
  successCount: number;
  failureCount: number;
  ambiguousCount: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  currentQuestion?: {
    numero: string;
    status: 'processing' | 'success' | 'failed' | 'ambiguous';
  };
  percentage: number;
}

export interface CategorizationProgressModalProps {
  isOpen: boolean;
  progress: CategorizationProgress;
  onCancel?: () => void;
  onClose?: () => void;
  isComplete?: boolean;
}

export const CategorizationProgressModal: React.FC<CategorizationProgressModalProps> = ({
  isOpen,
  progress,
  onCancel,
  onClose,
  isComplete = false,
}) => {
  if (!isOpen) return null;

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isComplete ? 'Categorização Concluída' : 'Categorizando Questões'}
          </h2>
          {(isComplete || onCancel) && (
            <button
              onClick={isComplete ? onClose : onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progresso Geral
              </span>
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                {progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-gray-600 dark:text-gray-400 animate-spin">progress_activity</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Processadas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.processedQuestions}
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  / {progress.totalQuestions}
                </span>
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                <span className="text-xs text-green-700 dark:text-green-400">Sucesso</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {progress.successCount}
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">warning</span>
                <span className="text-xs text-yellow-700 dark:text-yellow-400">Ambíguas</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {progress.ambiguousCount}
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">cancel</span>
                <span className="text-xs text-red-700 dark:text-red-400">Falhas</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {progress.failureCount}
              </p>
            </div>
          </div>

          {/* Current Status */}
          {!isComplete && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0">progress_activity</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                    Processando lote {progress.currentBatch} de {progress.totalBatches}
                  </p>
                  {progress.currentQuestion && (
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Questão atual: {progress.currentQuestion.numero}
                    </p>
                  )}
                  {progress.estimatedTimeRemaining > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                      Tempo estimado: {formatTime(progress.estimatedTimeRemaining)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Completion Message */}
          {isComplete && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 flex-shrink-0">check_circle</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
                    Categorização concluída com sucesso!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400">
                    {progress.successCount} questões categorizadas, {progress.ambiguousCount} requerem revisão manual
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isComplete && onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            )}
            {isComplete && onClose && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
