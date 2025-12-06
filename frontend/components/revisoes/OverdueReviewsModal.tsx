'use client';

import { useState } from 'react';
import { useOverdueReviews, type OverdueStats } from '@/hooks/useOverdueReviews';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: OverdueStats;
  onComplete?: () => void;
}

export function OverdueReviewsModal({ isOpen, onClose, stats, onComplete }: Props) {
  const { rescheduleReviews, deleteReviews, loading } = useOverdueReviews();
  const [selectedOption, setSelectedOption] = useState<'keep' | 'reschedule' | 'delete'>('reschedule');
  const [daysToDistribute, setDaysToDistribute] = useState(7);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    let success = false;

    switch (selectedOption) {
      case 'keep':
        // Apenas fecha o modal - as revisões continuam atrasadas
        // e aparecerão na página de revisões quando você acessar
        onComplete?.();
        onClose();
        return;

      case 'reschedule':
        success = await rescheduleReviews({ daysToDistribute });
        break;

      case 'delete':
        success = await deleteReviews({ deleteAll: true });
        break;
    }

    if (success) {
      onComplete?.();
      onClose();
    }
  };

  const estimatedTimePerDay = Math.ceil((stats.total_overdue * 45) / 60 / (daysToDistribute || 1));

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" onClick={onClose} />
      
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl 
                      border-2 border-border-light dark:border-border-dark
                      w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b-2 border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <span className="material-symbols-outlined text-orange-500 text-2xl sm:text-3xl">
                warning
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                Revisões Atrasadas
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Você tem revisões pendentes que precisam de atenção
            </p>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg sm:rounded-xl border-2 border-orange-200 dark:border-orange-800">
                <p className="text-xs sm:text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-0.5 sm:mb-1">
                  Total Atrasadas
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.total_overdue}
                </p>
              </div>

              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl border-2 border-red-200 dark:border-red-800">
                <p className="text-xs sm:text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-0.5 sm:mb-1">
                  Muito Atrasadas
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                  {stats.very_overdue}
                </p>
                <p className="text-[10px] sm:text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5 sm:mt-1">
                  Mais de 30 dias
                </p>
              </div>
            </div>

            {/* Por tipo */}
            {Object.keys(stats.by_type).length > 0 && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl">
                <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
                  Por Tipo:
                </p>
                <div className="space-y-2">
                  {Object.entries(stats.by_type).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        {type === 'QUESTION' ? '📝 Questões' : 
                         type === 'FLASHCARD' ? '🗂️ Flashcards' : 
                         '📔 Caderno de Erros'}
                      </span>
                      <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opções */}
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                O que você deseja fazer?
              </p>

              {/* Opção 1: Manter */}
              <div
                className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                  selectedOption === 'keep'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                onClick={() => setSelectedOption('keep')}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="radio"
                    checked={selectedOption === 'keep'}
                    onChange={() => setSelectedOption('keep')}
                    className="mt-0.5 sm:mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm sm:text-base text-text-light-primary dark:text-text-dark-primary mb-0.5 sm:mb-1">
                      Fazer Todas Agora
                    </p>
                    <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      Manter as datas e fazer todas as {stats.total_overdue} revisões
                    </p>
                    <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 mt-1.5 sm:mt-2">
                      ⏱️ Tempo estimado: ~{Math.ceil((stats.total_overdue * 45) / 60)} minutos
                    </p>
                  </div>
                </div>
              </div>

              {/* Opção 2: Reagendar */}
              <div
                className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                  selectedOption === 'reschedule'
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-primary/50'
                }`}
                onClick={() => setSelectedOption('reschedule')}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="radio"
                    checked={selectedOption === 'reschedule'}
                    onChange={() => setSelectedOption('reschedule')}
                    className="mt-0.5 sm:mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm sm:text-base text-text-light-primary dark:text-text-dark-primary mb-0.5 sm:mb-1">
                      Reagendar (Recomendado)
                    </p>
                    <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2 sm:mb-3">
                      Distribuir revisões ao longo dos próximos dias
                    </p>

                    {selectedOption === 'reschedule' && (
                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="block text-xs sm:text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                          Distribuir ao longo de quantos dias?
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={daysToDistribute}
                          onChange={(e) => setDaysToDistribute(parseInt(e.target.value) || 7)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-3 sm:px-4 py-2 rounded-lg border-2 border-border-light dark:border-border-dark
                                   bg-surface-light dark:bg-surface-dark text-sm sm:text-base
                                   text-text-light-primary dark:text-text-dark-primary
                                   focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">
                          📊 ~{Math.ceil(stats.total_overdue / daysToDistribute)} revisões/dia (~{estimatedTimePerDay} min/dia)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Opção 3: Deletar */}
              <div
                className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all ${
                  selectedOption === 'delete'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-border-light dark:border-border-dark hover:border-red-300'
                }`}
                onClick={() => setSelectedOption('delete')}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="radio"
                    checked={selectedOption === 'delete'}
                    onChange={() => setSelectedOption('delete')}
                    className="mt-0.5 sm:mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm sm:text-base text-text-light-primary dark:text-text-dark-primary mb-0.5 sm:mb-1">
                      Deletar Todas
                    </p>
                    <p className="text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary">
                      Remover permanentemente todas as revisões atrasadas
                    </p>
                    <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mt-1.5 sm:mt-2">
                      🗑️ ATENÇÃO: Esta ação não pode ser desfeita!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t-2 border-border-light dark:border-border-dark flex justify-end gap-2 sm:gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-border-light dark:border-border-dark rounded-lg sm:rounded-xl 
                       font-semibold text-sm sm:text-base text-text-light-primary dark:text-text-dark-primary 
                       hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base
                       hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1.5 sm:gap-2"
            >
              {loading && (
                <span className="material-symbols-outlined animate-spin text-lg sm:text-xl">
                  progress_activity
                </span>
              )}
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
