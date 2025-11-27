'use client';

import React from 'react';
import { AdminCard } from '../ui/AdminCard';
import { AdminInput } from '../ui/AdminInput';
import type { PlanLimits } from '@/types/admin/plan';

interface PlanLimitsFormProps {
  limits: PlanLimits;
  onChange: (limits: PlanLimits) => void;
}

export function PlanLimitsForm({ limits, onChange }: PlanLimitsFormProps) {
  const updateLimit = (key: keyof PlanLimits, value: any) => {
    onChange({
      ...limits,
      [key]: value,
    });
  };

  const handleNumberChange = (key: keyof PlanLimits, value: string) => {
    const numValue = value === '' ? null : parseInt(value);
    updateLimit(key, numValue);
  };

  const handleBooleanChange = (key: keyof PlanLimits, checked: boolean) => {
    updateLimit(key, checked);
  };

  return (
    <div className="space-y-6">
      {/* Questões */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Limites de Questões
          </h3>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdminInput
            label="Questões por Dia"
            type="number"
            value={limits.maxQuestionsPerDay ?? ''}
            onChange={(e) => handleNumberChange('maxQuestionsPerDay', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
          <AdminInput
            label="Listas por Dia"
            type="number"
            value={limits.maxQuestionListsPerDay ?? ''}
            onChange={(e) => handleNumberChange('maxQuestionListsPerDay', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
          <AdminInput
            label="Simulados por Mês"
            type="number"
            value={limits.maxSimulatedExamsPerMonth ?? ''}
            onChange={(e) => handleNumberChange('maxSimulatedExamsPerMonth', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
        </div>
      </AdminCard>

      {/* FSRS/SRS */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Limites de Revisão (FSRS/SRS)
          </h3>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminInput
            label="Cards FSRS"
            type="number"
            value={limits.maxFSRSCards ?? ''}
            onChange={(e) => handleNumberChange('maxFSRSCards', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
          <AdminInput
            label="Revisões por Dia"
            type="number"
            value={limits.maxReviewsPerDay ?? ''}
            onChange={(e) => handleNumberChange('maxReviewsPerDay', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
        </div>
      </AdminCard>

      {/* Flashcards */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Limites de Flashcards
          </h3>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminInput
            label="Flashcards Criados"
            type="number"
            value={limits.maxFlashcardsCreated ?? ''}
            onChange={(e) => handleNumberChange('maxFlashcardsCreated', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
          <AdminInput
            label="Decks de Flashcards"
            type="number"
            value={limits.maxFlashcardDecks ?? ''}
            onChange={(e) => handleNumberChange('maxFlashcardDecks', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
        </div>
      </AdminCard>

      {/* IA Features */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Limites de IA
          </h3>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AdminInput
            label="Consultas Pulse AI por Dia"
            type="number"
            value={limits.maxPulseAIQueriesPerDay ?? ''}
            onChange={(e) => handleNumberChange('maxPulseAIQueriesPerDay', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
          <AdminInput
            label="Explicações por Dia"
            type="number"
            value={limits.maxQuestionExplanationsPerDay ?? ''}
            onChange={(e) => handleNumberChange('maxQuestionExplanationsPerDay', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
          <AdminInput
            label="Geração de Conteúdo por Mês"
            type="number"
            value={limits.maxContentGenerationPerMonth ?? ''}
            onChange={(e) => handleNumberChange('maxContentGenerationPerMonth', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
        </div>
      </AdminCard>

      {/* Funcionalidades Premium */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Funcionalidades Premium
          </h3>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.canExportData}
              onChange={(e) => handleBooleanChange('canExportData', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              Exportar Dados
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.canCreateCustomLists}
              onChange={(e) => handleBooleanChange('canCreateCustomLists', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              Criar Listas Personalizadas
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.canAccessAdvancedStatistics}
              onChange={(e) => handleBooleanChange('canAccessAdvancedStatistics', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              Estatísticas Avançadas
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.canUseErrorNotebook}
              onChange={(e) => handleBooleanChange('canUseErrorNotebook', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              Caderno de Erros
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.canAccessMentorship}
              onChange={(e) => handleBooleanChange('canAccessMentorship', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              Mentoria
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.canUseOfflineMode}
              onChange={(e) => handleBooleanChange('canUseOfflineMode', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              Modo Offline
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={limits.canCustomizeInterface}
              onChange={(e) => handleBooleanChange('canCustomizeInterface', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
              Personalizar Interface
            </span>
          </label>
        </div>
      </AdminCard>

      {/* Suporte */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Suporte
          </h3>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Nível de Suporte
            </label>
            <select
              value={limits.supportLevel}
              onChange={(e) => updateLimit('supportLevel', e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="basic">Básico</option>
              <option value="priority">Prioritário</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <AdminInput
            label="Tickets de Suporte por Mês"
            type="number"
            value={limits.maxSupportTicketsPerMonth ?? ''}
            onChange={(e) => handleNumberChange('maxSupportTicketsPerMonth', e.target.value)}
            placeholder="Ilimitado"
            helpText="Deixe vazio para ilimitado"
          />
        </div>
      </AdminCard>
    </div>
  );
}
