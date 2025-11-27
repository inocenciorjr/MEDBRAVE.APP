'use client';

import React, { useState } from 'react';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminInput';
import type { UserPlan, PaymentMethod } from '@/types/admin/plan';

interface RenewUserPlanModalProps {
  userPlan: UserPlan;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (durationDays: number, paymentMethod: PaymentMethod) => Promise<void>;
}

export function RenewUserPlanModal({
  userPlan,
  isOpen,
  onClose,
  onConfirm,
}: RenewUserPlanModalProps) {
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ADMIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (durationDays <= 0) {
      setError('Duração deve ser maior que zero');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(durationDays, paymentMethod);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao renovar plano');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewEndDate = () => {
    const currentEnd = new Date(userPlan.endDate);
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + durationDays);
    return newEnd.toLocaleDateString('pt-BR');
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Renovar Plano de Usuário"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="space-y-2">
          <p className="text-text-light-primary dark:text-text-dark-primary">
            Renovar plano de{' '}
            <strong>{userPlan.user?.name || userPlan.userId}</strong>
          </p>
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
            <p>Plano: <strong>{userPlan.plan?.name || userPlan.planId}</strong></p>
            <p>Término atual: <strong>{new Date(userPlan.endDate).toLocaleDateString('pt-BR')}</strong></p>
          </div>
        </div>

        <AdminInput
          label="Duração da Renovação (dias)"
          type="number"
          value={durationDays}
          onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
          required
          min={1}
          placeholder="30"
          icon="schedule"
        />

        <AdminSelect
          label="Método de Pagamento"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          options={[
            { value: 'ADMIN', label: 'Admin (Manual)' },
            { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
            { value: 'PIX', label: 'PIX' },
            { value: 'BANK_SLIP', label: 'Boleto' },
            { value: 'FREE', label: 'Gratuito' },
            { value: 'OTHER', label: 'Outro' },
          ]}
        />

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
              info
            </span>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              <p className="font-medium mb-1">Nova data de término:</p>
              <p>{calculateNewEndDate()}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <AdminButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </AdminButton>
          <AdminButton
            type="submit"
            loading={loading}
            icon="autorenew"
          >
            Renovar Plano
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
