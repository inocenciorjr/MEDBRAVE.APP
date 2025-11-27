'use client';

import { useState } from 'react';
import { format, addDays } from 'date-fns';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReviews: string[];
  onSuccess: () => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  selectedReviews,
  onSuccess,
}: RescheduleModalProps) {
  const [mode, setMode] = useState<'specific' | 'distribute'>('specific');
  const [specificDate, setSpecificDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [distributeStartDate, setDistributeStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [distributeDays, setDistributeDays] = useState(7);
  const [loading, setLoading] = useState(false);
  
  // Data mínima para modo distribuir: amanhã
  const minDateDistribute = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { fetchWithAuth } = await import('@/lib/utils/fetchWithAuth');

      await fetchWithAuth('/reviews/reschedule', {
        method: 'POST',
        body: JSON.stringify({
          reviewIds: selectedReviews,
          mode,
          specificDate: mode === 'specific' ? specificDate : undefined,
          distributeDays: mode === 'distribute' ? distributeDays : undefined,
          distributeStartDate: mode === 'distribute' ? distributeStartDate : undefined,
        }),
      });

      // Disparar evento global para atualizar outras páginas
      window.dispatchEvent(new CustomEvent('reviews-updated'));

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao reagendar:', error);
      alert('Erro ao reagendar revisões');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl 
                      border-2 border-border-light dark:border-border-dark w-full max-w-md
                      animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
              Reagendar Revisões
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-light dark:hover:bg-background-dark rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                close
              </span>
            </button>
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
            {selectedReviews.length} revisõ{selectedReviews.length === 1 ? 'ão' : 'es'} selecionada{selectedReviews.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Modo de Reagendamento
            </label>
            
            <div className="space-y-2">
              <button
                onClick={() => setMode('specific')}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
                           ${mode === 'specific'
                             ? 'border-primary bg-primary/5 dark:bg-primary/10'
                             : 'border-border-light dark:border-border-dark hover:border-primary/50'
                           }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                  ${mode === 'specific' ? 'border-primary' : 'border-border-light dark:border-border-dark'}`}>
                    {mode === 'specific' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                      Data Específica
                    </p>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      Reagendar todas para uma data específica
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('distribute')}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
                           ${mode === 'distribute'
                             ? 'border-primary bg-primary/5 dark:bg-primary/10'
                             : 'border-border-light dark:border-border-dark hover:border-primary/50'
                           }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                  ${mode === 'distribute' ? 'border-primary' : 'border-border-light dark:border-border-dark'}`}>
                    {mode === 'distribute' && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                      Distribuir
                    </p>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      Distribuir uniformemente ao longo de vários dias
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Date Input */}
          {mode === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                Nova Data
              </label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-border-light dark:border-border-dark
                           bg-surface-light dark:bg-surface-dark
                           text-text-light-primary dark:text-text-dark-primary
                           focus:border-primary focus:ring-4 focus:ring-primary/20
                           transition-all duration-200"
              />
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                ⚠️ Não é possível reagendar para hoje ou para a mesma data original.
              </p>
            </div>
          )}

          {/* Distribute Options */}
          {mode === 'distribute' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  A partir de qual data?
                </label>
                <input
                  type="date"
                  value={distributeStartDate}
                  onChange={(e) => setDistributeStartDate(e.target.value)}
                  min={minDateDistribute}
                  className="w-full px-4 py-3 rounded-lg border-2 border-border-light dark:border-border-dark
                             bg-surface-light dark:bg-surface-dark
                             text-text-light-primary dark:text-text-dark-primary
                             focus:border-primary focus:ring-4 focus:ring-primary/20
                             transition-all duration-200"
                />
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
                  ⚠️ Distribuição deve começar a partir de amanhã.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  Distribuir em quantos dias?
                </label>
                <input
                  type="number"
                  value={distributeDays}
                  onChange={(e) => setDistributeDays(parseInt(e.target.value))}
                  min={1}
                  max={90}
                  className="w-full px-4 py-3 rounded-lg border-2 border-border-light dark:border-border-dark
                             bg-surface-light dark:bg-surface-dark
                             text-text-light-primary dark:text-text-dark-primary
                             focus:border-primary focus:ring-4 focus:ring-primary/20
                             transition-all duration-200"
                />
                <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    🎯 Distribuição Inteligente
                  </p>
                  <ul className="text-xs text-text-light-secondary dark:text-text-dark-secondary space-y-1">
                    <li>• ~{Math.ceil(selectedReviews.length / distributeDays)} revisões por dia</li>
                    <li>• <strong className="text-red-500">Prioridade 1:</strong> Cards que você errou (reaprendendo)</li>
                    <li>• <strong className="text-yellow-500">Prioridade 2:</strong> Cards em aprendizado</li>
                    <li>• <strong className="text-blue-500">Prioridade 3:</strong> Cards novos e difíceis</li>
                    <li>• <strong className="text-green-500">Prioridade 4:</strong> Cards consolidados</li>
                    <li>• Horários distribuídos entre 8h e 20h</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-light dark:border-border-dark flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-border-light dark:border-border-dark
                       hover:bg-background-light dark:hover:bg-background-dark
                       transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-primary text-white
                       hover:bg-primary/90 transition-colors font-medium
                       disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Reagendando...
              </>
            ) : (
              'Reagendar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
