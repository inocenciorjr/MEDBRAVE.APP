'use client';

import React, { useState, useEffect } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { AdminInput } from '../ui/AdminInput';
import type { Plan, PaymentMethod } from '@/types/admin/plan';
import { getAllPlans } from '@/services/admin/planService';
import { useToast } from '@/lib/contexts/ToastContext';

interface AddUserPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    userId: string;
    planId: string;
    startDate: Date;
    endDate: Date;
    paymentMethod: PaymentMethod;
    autoRenew: boolean;
  }) => Promise<void>;
  preselectedUserId?: string;
  preselectedUserEmail?: string;
}

export function AddUserPlanModal({
  isOpen,
  onClose,
  onConfirm,
  preselectedUserId,
  preselectedUserEmail,
}: AddUserPlanModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Form state
  const [userId, setUserId] = useState(preselectedUserId || '');
  const [userEmail, setUserEmail] = useState(preselectedUserEmail || '');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('admin');
  const [autoRenew, setAutoRenew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedUserId) setUserId(preselectedUserId);
    if (preselectedUserEmail) setUserEmail(preselectedUserEmail);
  }, [preselectedUserId, preselectedUserEmail]);

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const result = await getAllPlans();
      setPlans(result.items.filter(p => p.isActive));
    } catch (error: any) {
      toast.error('Erro ao carregar planos');
    } finally {
      setLoadingPlans(false);
    }
  };

  const calculateEndDate = () => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);
    return end;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId.trim()) {
      toast.error('ID do usuário é obrigatório');
      return;
    }

    if (!planId) {
      toast.error('Selecione um plano');
      return;
    }

    setLoading(true);
    try {
      await onConfirm({
        userId: userId.trim(),
        planId,
        startDate: new Date(startDate),
        endDate: calculateEndDate(),
        paymentMethod,
        autoRenew,
      });
      
      toast.success('Plano adicionado com sucesso!');
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUserId(preselectedUserId || '');
    setUserEmail(preselectedUserEmail || '');
    setPlanId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDurationDays(30);
    setPaymentMethod('admin');
    setAutoRenew(false);
    onClose();
  };

  const selectedPlan = plans.find(p => p.id === planId);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Adicionar Plano a Usuário"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Informações do Usuário
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              ID do Usuário *
            </label>
            <AdminInput
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID do usuário"
              disabled={!!preselectedUserId}
              required
            />
          </div>

          {userEmail && (
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Email: <span className="font-medium">{userEmail}</span>
            </div>
          )}
        </div>

        {/* Plan Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Seleção de Plano
          </h3>

          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Plano *
            </label>
            {loadingPlans ? (
              <div className="h-10 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
            ) : (
              <select
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  const plan = plans.find(p => p.id === e.target.value);
                  if (plan) {
                    setDurationDays(plan.durationDays);
                  }
                }}
                className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="">Selecione um plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - R$ {plan.price.toFixed(2)} ({plan.durationDays} dias)
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedPlan && (
            <div className="p-4 bg-background-light dark:bg-background-dark rounded-xl">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">Preço:</span>
                  <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                    R$ {selectedPlan.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">Duração:</span>
                  <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                    {selectedPlan.durationDays} dias
                  </span>
                </div>
                {selectedPlan.description && (
                  <div className="pt-2 border-t border-border-light dark:border-border-dark">
                    <p className="text-text-light-secondary dark:text-text-dark-secondary">
                      {selectedPlan.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Período do Plano
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Data de Início *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Duração (dias) *
              </label>
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                info
              </span>
              <span className="text-blue-700 dark:text-blue-300">
                Data de término: <strong>{calculateEndDate().toLocaleDateString('pt-BR')}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Payment & Options */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Configurações
          </h3>

          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Método de Pagamento *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              <option value="admin">Admin (Manual)</option>
              <option value="PIX">PIX</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoRenew"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-border-light dark:border-border-dark text-primary focus:ring-2 focus:ring-primary"
            />
            <label
              htmlFor="autoRenew"
              className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary cursor-pointer"
            >
              Ativar renovação automática
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-border-light dark:border-border-dark">
          <AdminButton
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </AdminButton>
          <AdminButton
            type="submit"
            loading={loading}
            icon="add"
          >
            Adicionar Plano
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
