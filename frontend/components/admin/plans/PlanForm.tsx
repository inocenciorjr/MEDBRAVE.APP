'use client';

import React, { useState } from 'react';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/ui/AdminInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { PlanLimitsForm } from './PlanLimitsForm';
import type { Plan, CreatePlanPayload, PlanLimits } from '@/types/admin/plan';

interface PlanFormProps {
  plan?: Plan;
  onSubmit: (data: CreatePlanPayload) => Promise<void>;
  onCancel: () => void;
}

const getDefaultLimits = (): PlanLimits => ({
  maxQuestionsPerDay: null,
  maxQuestionListsPerDay: null,
  maxSimulatedExamsPerMonth: null,
  maxFSRSCards: null,
  maxReviewsPerDay: null,
  maxFlashcardsCreated: null,
  maxFlashcardDecks: null,
  maxPulseAIQueriesPerDay: null,
  maxQuestionExplanationsPerDay: null,
  maxContentGenerationPerMonth: null,
  canExportData: false,
  canCreateCustomLists: false,
  canAccessAdvancedStatistics: false,
  canUseErrorNotebook: false,
  canAccessMentorship: false,
  canUseOfflineMode: false,
  canCustomizeInterface: false,
  supportLevel: 'basic',
  maxSupportTicketsPerMonth: null,
});

export function PlanForm({ plan, onSubmit, onCancel }: PlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<string[]>(plan?.features || []);
  const [newFeature, setNewFeature] = useState('');

  const [formData, setFormData] = useState<CreatePlanPayload>({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    currency: plan?.currency || 'BRL',
    durationDays: plan?.durationDays || 30,
    isActive: plan?.isActive ?? true,
    isPublic: plan?.isPublic ?? true,
    features: plan?.features || [],
    interval: plan?.interval || 'monthly',
    limits: plan?.limits || getDefaultLimits(),
    badge: plan?.badge || '',
    highlight: plan?.highlight || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        ...formData,
        features,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar plano');
    } finally {
      setLoading(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">
              error
            </span>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Informações Básicas */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Informações Básicas
          </h3>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="Nome do Plano"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Ex: Plano Premium"
              icon="workspace_premium"
            />

            <AdminInput
              label="Badge (opcional)"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              placeholder="Ex: POPULAR, MELHOR CUSTO-BENEFÍCIO"
              icon="label"
            />
          </div>

          <AdminTextarea
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="Descrição detalhada do plano..."
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminInput
              label="Preço"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              required
              placeholder="99.90"
              icon="payments"
            />

            <AdminSelect
              label="Moeda"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={[
                { value: 'BRL', label: 'BRL (R$)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
              ]}
            />

            <AdminSelect
              label="Intervalo"
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
              options={[
                { value: 'monthly', label: 'Mensal' },
                { value: 'yearly', label: 'Anual' },
              ]}
            />
          </div>

          <AdminInput
            label="Duração (dias)"
            type="number"
            value={formData.durationDays}
            onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) || 0 })}
            required
            placeholder="30"
            helpText="Número de dias de validade do plano"
            icon="schedule"
          />

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                Plano Ativo
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                Plano Público
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.highlight}
                onChange={(e) => setFormData({ ...formData, highlight: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                Destacar Plano
              </span>
            </label>
          </div>
        </div>
      </AdminCard>

      {/* Features */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Recursos do Plano
          </h3>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <AdminInput
              placeholder="Digite um recurso..."
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFeature();
                }
              }}
            />
            <AdminButton
              type="button"
              variant="outline"
              icon="add"
              onClick={addFeature}
            >
              Adicionar
            </AdminButton>
          </div>

          {features.length > 0 && (
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">
                      check_circle
                    </span>
                    <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                      {feature}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">
                      close
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      {/* Limites */}
      <PlanLimitsForm
        limits={{ ...getDefaultLimits(), ...formData.limits }}
        onChange={(limits) => setFormData({ ...formData, limits })}
      />

      {/* Actions */}
      <div className="flex justify-end gap-4 sticky bottom-0 bg-background-light dark:bg-background-dark py-4 border-t border-border-light dark:border-border-dark">
        <AdminButton
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </AdminButton>
        <AdminButton
          type="submit"
          loading={loading}
          icon="save"
        >
          {plan ? 'Atualizar' : 'Criar'} Plano
        </AdminButton>
      </div>
    </form>
  );
}
