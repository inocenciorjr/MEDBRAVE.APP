'use client';

import React, { useState } from 'react';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminTextarea } from '@/components/admin/ui/AdminInput';
import type { Payment } from '@/types/admin/payment';

interface CancelPaymentModalProps {
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelPaymentModal({
  payment,
  isOpen,
  onClose,
  onConfirm,
}: CancelPaymentModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Motivo do cancelamento é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Pagamento"
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
            Tem certeza que deseja cancelar este pagamento pendente?
          </p>
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
            <p>Usuário: <strong>{payment.user?.name || payment.userId}</strong></p>
            <p>Valor: <strong>{formatCurrency(payment.amount, payment.currency)}</strong></p>
            <p>Método: <strong>{payment.paymentMethod}</strong></p>
          </div>
        </div>

        <AdminTextarea
          label="Motivo do Cancelamento"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Descreva o motivo do cancelamento..."
          rows={4}
        />

        <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
          O pagamento será marcado como cancelado e não poderá ser processado.
        </p>

        <div className="flex justify-end gap-4">
          <AdminButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Voltar
          </AdminButton>
          <AdminButton
            type="submit"
            variant="danger"
            loading={loading}
            icon="cancel"
          >
            Cancelar Pagamento
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
