'use client';

import { useState, useEffect } from 'react';
import { UserGoalsInput } from '@/services/userGoalsService';

interface GoalsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goals: UserGoalsInput) => Promise<void>;
  currentGoals?: {
    daily_questions_goal: number;
    daily_accuracy_goal: number;
  } | null;
}

export function GoalsConfigModal({ isOpen, onClose, onSave, currentGoals }: GoalsConfigModalProps) {
  const [questionsGoal, setQuestionsGoal] = useState(100);
  const [accuracyGoal, setAccuracyGoal] = useState(70);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentGoals) {
      setQuestionsGoal(currentGoals.daily_questions_goal);
      setAccuracyGoal(currentGoals.daily_accuracy_goal);
    }
  }, [currentGoals]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        daily_questions_goal: questionsGoal,
        daily_accuracy_goal: accuracyGoal,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar metas:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-border-light dark:border-border-dark">
        <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-6">
          Configurar Metas Diárias
        </h2>

        <div className="space-y-6">
          {/* Meta de Questões */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Meta de Questões por Dia
            </label>
            <input
              type="number"
              min="0"
              value={questionsGoal}
              onChange={(e) => setQuestionsGoal(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark
                       bg-background-light dark:bg-background-dark
                       text-text-light-primary dark:text-text-dark-primary
                       focus:border-primary focus:outline-none transition-colors"
            />
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Quantas questões você quer responder por dia?
            </p>
          </div>

          {/* Meta de Desempenho */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Meta de Desempenho (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={accuracyGoal}
              onChange={(e) => setAccuracyGoal(Math.min(100, parseInt(e.target.value) || 0))}
              className="w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark
                       bg-background-light dark:bg-background-dark
                       text-text-light-primary dark:text-text-dark-primary
                       focus:border-primary focus:outline-none transition-colors"
            />
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Qual porcentagem de acerto você quer alcançar?
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-6 py-3 rounded-xl font-semibold
                     bg-surface-light dark:bg-surface-dark
                     text-text-light-primary dark:text-text-dark-primary
                     border-2 border-border-light dark:border-border-dark
                     hover:bg-background-light dark:hover:bg-background-dark
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 rounded-xl font-semibold
                     bg-primary text-white
                     hover:bg-primary/90
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Salvando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check</span>
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
