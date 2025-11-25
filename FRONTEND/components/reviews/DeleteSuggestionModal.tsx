'use client';

import { useEffect, useState } from 'react';

interface DeleteSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onKeep: () => void;
  consecutiveCount: number;
  grade: 'good' | 'easy';
  scheduledDays: number;
}

export function DeleteSuggestionModal({
  isOpen,
  onClose,
  onDelete,
  onKeep,
  consecutiveCount,
  grade,
  scheduledDays,
}: DeleteSuggestionModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

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

  const gradeText = grade === 'good' ? 'Bom' : 'Fácil';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl dark:shadow-dark-2xl max-w-lg w-full transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-border-light dark:border-border-dark bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark shadow-lg">
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Sugestão de Remoção da Agenda
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Análise de desempenho do sistema de revisão espaçada
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status atual */}
          <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 
                        border-2 border-primary/30 rounded-xl shadow-lg hover:shadow-xl 
                        dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-all duration-300 hover:scale-[1.01]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b-2 border-primary/20">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Status da Revisão
                </span>
                <span className="px-3 py-1 bg-primary/20 dark:bg-primary/30 rounded-full text-xs font-bold text-primary">
                  Ativa
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                    Avaliação
                  </p>
                  <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                    {gradeText}
                  </p>
                </div>
                
                <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                    Sequência
                  </p>
                  <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                    {consecutiveCount}x consecutivas
                  </p>
                </div>
              </div>

              <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-lg shadow-md hover:shadow-lg transition-all duration-200">
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  Próxima revisão programada
                </p>
                <p className="text-2xl font-bold text-primary">
                  {scheduledDays} {scheduledDays === 1 ? 'dia' : 'dias'}
                </p>
              </div>
            </div>
          </div>

          {/* Explicação */}
          <div className="p-5 bg-background-light dark:bg-background-dark rounded-xl border-2 border-border-light dark:border-border-dark shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-all duration-300">
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary leading-relaxed">
              Este item foi avaliado como <span className="font-bold text-primary">"{gradeText}"</span> por{' '}
              <span className="font-bold text-primary">{consecutiveCount} vezes consecutivas</span>, 
              indicando domínio consistente do conteúdo. A próxima revisão está programada para daqui a{' '}
              <span className="font-bold text-primary">{scheduledDays} {scheduledDays === 1 ? 'dia' : 'dias'}</span>.
            </p>
          </div>

          {/* Sugestão */}
          <div className="p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 
                        border-2 border-yellow-300 dark:border-yellow-700 rounded-xl shadow-lg hover:shadow-xl 
                        dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-all duration-300 hover:scale-[1.01]">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-300 uppercase tracking-wider mb-3">
              Recomendação do Sistema
            </p>
            <p className="text-sm text-yellow-900 dark:text-yellow-200 leading-relaxed">
              Caso considere que já fixou adequadamente este conteúdo, você pode removê-lo da agenda de revisão programada MedBrave. 
              Isso permitirá focar seus estudos em itens que necessitam de maior atenção.
            </p>
            <p className="text-xs text-yellow-800 dark:text-yellow-400 mt-3 pt-3 border-t-2 border-yellow-300 dark:border-yellow-700">
              Esta ação pode ser revertida a qualquer momento através do Gerenciador de Revisões.
            </p>
          </div>

          {/* Consequências */}
          <div className="p-5 bg-surface-light dark:bg-surface-dark rounded-xl border-2 border-border-light dark:border-border-dark shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl transition-all duration-300">
            <p className="text-xs font-bold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider mb-3">
              Ao remover da agenda
            </p>
            <ul className="space-y-2.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200">
                <span className="text-primary mt-0.5 font-bold">•</span>
                <span>O item será excluído do sistema de revisão espaçada</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200">
                <span className="text-primary mt-0.5 font-bold">•</span>
                <span>Não haverá mais notificações ou lembretes sobre este conteúdo</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200">
                <span className="text-primary mt-0.5 font-bold">•</span>
                <span>O conteúdo original permanecerá disponível para consulta</span>
              </li>
              <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-all duration-200">
                <span className="text-primary mt-0.5 font-bold">•</span>
                <span>Você poderá reativá-lo posteriormente no Gerenciador de Revisões</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t-2 border-border-light dark:border-border-dark bg-gradient-to-br from-background-light to-surface-light dark:from-background-dark dark:to-surface-dark shadow-lg">
          <button
            onClick={onKeep}
            className="px-6 py-3 text-sm font-bold text-text-light-primary dark:text-text-dark-primary 
                     bg-surface-light dark:bg-surface-dark hover:bg-background-light dark:hover:bg-background-dark 
                     rounded-xl border-2 border-border-light dark:border-border-dark
                     transition-all duration-200 hover:scale-105 hover:-translate-y-0.5
                     shadow-lg hover:shadow-xl dark:shadow-dark-lg dark:hover:shadow-dark-xl"
          >
            Manter na Agenda
          </button>
          <button
            onClick={onDelete}
            className="px-6 py-3 text-sm font-bold text-white bg-primary hover:bg-primary/90 
                     rounded-xl transition-all duration-200 hover:scale-105 hover:-translate-y-0.5
                     shadow-xl hover:shadow-2xl"
          >
            Remover da Agenda
          </button>
        </div>
      </div>
    </div>
  );
}
