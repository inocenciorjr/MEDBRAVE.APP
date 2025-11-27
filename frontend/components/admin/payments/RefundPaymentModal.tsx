'use client';

import React, { useState } from 'react';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminTextarea } from '@/components/admin/ui/AdminInput';
import type { Payment } from '@/types/admin/payment';

interface RefundPaymentModalProps {
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function RefundPaymentModal({
  payment,
  isOpen,
  onClose,
  onConfirm,
}: RefundPaymentModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Motivo do reembolso é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao reembolsar pagamento');
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
      title="Reembolsar Pagamento"
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
            Tem certeza que deseja reembolsar este pagamento?
          </p>
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
            <p>Usuário: <strong>{payment.user?.name || payment.userId}</strong></p>
            <p>Valor: <strong>{formatCurrency(payment.amount, payment.currency)}</strong></p>
            <p>Método: <strong>{payment.paymentMethod}</strong></p>
          </div>
        </div>

        <AdminTextarea
          label="Motivo do Reembolso"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          placeholder="Descreva o motivo do reembolso..."
          rows={4}
        />

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
              warning
            </span>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              <p className="font-medium mb-1">Atenção:</p>
              <p>Esta ação é irreversível. O valor será devolvido ao usuário e o plano pode ser cancelado.</p>
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
            variant="danger"
            loading={loading}
            icon="undo"
          >
            Reembolsar
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
}
