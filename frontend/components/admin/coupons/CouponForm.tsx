'use client';

import React, { useState, useEffect } from 'react';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/ui/AdminInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import type { Coupon, CreateCouponPayload } from '@/types/admin/coupon';
import type { Plan } from '@/types/admin/plan';
import { getAllPlans } from '@/services/admin/planService';

interface CouponFormProps {
  coupon?: Coupon;
  onSubmit: (data: CreateCouponPayload) => Promise<void>;
  onCancel: () => void;
}

export function CouponForm({ coupon, onSubmit, onCancel }: CouponFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [formData, setFormData] = useState<CreateCouponPayload>({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discountType: coupon?.discountType || 'percentage',
    discountValue: coupon?.discountValue || 0,
    expirationDate: coupon?.expirationDate
      ? new Date(coupon.expirationDate).toISOString().split('T')[0]
      : '',
    maxUses: coupon?.maxUses || undefined,
    isActive: coupon?.isActive ?? true,
    applicablePlanIds: coupon?.applicablePlanIds || [],
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const result = await getAllPlans();
      setPlans(result.items);
    } catch (err) {
      console.error('Error loading plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validações
      if (!formData.code.trim()) {
        throw new Error('Código do cupom é obrigatório');
      }

      if (formData.discountValue <= 0) {
        throw new Error('Valor do desconto deve ser maior que zero');
      }

      if (formData.discountType === 'percentage' && formData.discountValue > 100) {
        throw new Error('Desconto percentual não pode ser maior que 100%');
      }

      const payload: CreateCouponPayload = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        expirationDate: formData.expirationDate
          ? new Date(formData.expirationDate).toISOString()
          : undefined,
        applicablePlanIds:
          formData.applicablePlanIds && formData.applicablePlanIds.length > 0
            ? formData.applicablePlanIds
            : undefined,
      };

      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cupom');
    } finally {
      setLoading(false);
    }
  };

  const togglePlan = (planId: string) => {
    const currentPlans = formData.applicablePlanIds || [];
    if (currentPlans.includes(planId)) {
      setFormData({
        ...formData,
        applicablePlanIds: currentPlans.filter((id) => id !== planId),
      });
    } else {
      setFormData({
        ...formData,
        applicablePlanIds: [...currentPlans, planId],
      });
    }
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
            Informações do Cupom
          </h3>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="Código do Cupom"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              required
              placeholder="Ex: PROMO2024"
              icon="local_offer"
              helpText="Será convertido para maiúsculas"
              disabled={!!coupon} // Não permite editar código de cupom existente
            />

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  Cupom Ativo
                </span>
              </label>
            </div>
          </div>

          <AdminTextarea
            label="Descrição (opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição do cupom..."
            rows={2}
          />
        </div>
      </AdminCard>

      {/* Desconto */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Configuração de Desconto
          </h3>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminSelect
              label="Tipo de Desconto"
              value={formData.discountType}
              onChange={(e) =>
                setFormData({ ...formData, discountType: e.target.value as any })
              }
              options={[
                { value: 'percentage', label: 'Percentual (%)' },
                { value: 'fixed_amount', label: 'Valor Fixo (R$)' },
              ]}
            />

            <AdminInput
              label={
                formData.discountType === 'percentage'
                  ? 'Percentual de Desconto'
                  : 'Valor do Desconto'
              }
              type="number"
              step={formData.discountType === 'percentage' ? '1' : '0.01'}
              value={formData.discountValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountValue: parseFloat(e.target.value) || 0,
                })
              }
              required
              placeholder={formData.discountType === 'percentage' ? '20' : '50.00'}
              icon={formData.discountType === 'percentage' ? 'percent' : 'payments'}
              helpText={
                formData.discountType === 'percentage'
                  ? 'Valor entre 1 e 100'
                  : 'Valor em reais'
              }
            />
          </div>
        </div>
      </AdminCard>

      {/* Limites e Validade */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Limites e Validade
          </h3>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="Máximo de Usos (opcional)"
              type="number"
              value={formData.maxUses || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxUses: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="Ilimitado"
              icon="redeem"
              helpText="Deixe vazio para ilimitado"
            />

            <AdminInput
              label="Data de Expiração (opcional)"
              type="date"
              value={formData.expirationDate}
              onChange={(e) =>
                setFormData({ ...formData, expirationDate: e.target.value })
              }
              icon="event"
              helpText="Deixe vazio para sem expiração"
            />
          </div>
        </div>
      </AdminCard>

      {/* Planos Aplicáveis */}
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Planos Aplicáveis
          </h3>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Selecione os planos onde este cupom pode ser usado. Deixe vazio para aplicar
            a todos os planos.
          </p>

          {loadingPlans ? (
            <div className="text-center py-4">
              <span className="material-symbols-outlined animate-spin text-primary">
                progress_activity
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plans.map((plan) => {
                const isSelected =
                  formData.applicablePlanIds?.includes(plan.id) || false;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => togglePlan(plan.id)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border-light dark:border-border-dark hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                          {plan.name}
                        </div>
                        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: plan.currency,
                          }).format(plan.price)}
                        </div>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary">
                          check_circle
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {formData.applicablePlanIds && formData.applicablePlanIds.length === 0 && (
            <div className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
              Cupom aplicável a todos os planos
            </div>
          )}
        </div>
      </AdminCard>

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
        <AdminButton type="submit" loading={loading} icon="save">
          {coupon ? 'Atualizar' : 'Criar'} Cupom
        </AdminButton>
      </div>
    </form>
  );
}
