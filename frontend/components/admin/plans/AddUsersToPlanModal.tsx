'use client';

import { useState } from 'react';
import { AdminModal } from '../ui/AdminModal';
import { AdminButton } from '../ui/AdminButton';
import { AdminInput } from '../ui/AdminInput';
import { useToast } from '@/lib/contexts/ToastContext';
import { createUserPlan } from '@/services/admin/userPlanService';
import type { PaymentMethod } from '@/types/admin/plan';

interface AddUsersToPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  onSuccess: () => void;
}

export function AddUsersToPlanModal({
  isOpen,
  onClose,
  planId,
  planName,
  onSuccess,
}: AddUsersToPlanModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [userIds, setUserIds] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('admin');
  const [autoRenew, setAutoRenew] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ids = userIds
      .split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      toast.error('Adicione pelo menos um ID de usuário');
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      const results = await Promise.allSettled(
        ids.map(userId =>
          createUserPlan({
            userId,
            planId,
            startDate,
            endDate,
            paymentMethod,
            autoRenew,
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`${successful} usuário(s) adicionado(s) com sucesso!`);
      }
      if (failed > 0) {
        toast.error(`${failed} usuário(s) falharam ao ser adicionados`);
      }

      if (successful > 0) {
        handleClose();
        onSuccess();
      }
    } catch (error: any) {
      toast.error('Erro ao adicionar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUserIds('');
    setDurationDays(30);
    setPaymentMethod('admin');
    setAutoRenew(false);
    onClose();
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Adicionar Usuários ao Plano: ${planName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              IDs dos Usuários *
            </label>
            <textarea
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              placeholder="Cole os IDs dos usuários, um por linha&#10;exemplo:&#10;uuid-1&#10;uuid-2&#10;uuid-3"
              rows={8}
              className="w-full px-4 py-3 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
              required
            />
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
              {userIds.split('\n').filter(id => id.trim().length > 0).length} usuário(s)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AdminInput
              label="Duração (dias) *"
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
              min="1"
              required
            />

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

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">
                info
              </span>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Atenção:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Todos os usuários receberão o mesmo plano</li>
                  <li>A data de início será hoje</li>
                  <li>IDs inválidos serão ignorados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

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
            icon="person_add"
          >
            Adicionar Usuários
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
