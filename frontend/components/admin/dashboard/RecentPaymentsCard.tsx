'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { PaymentStatusBadge } from '../payments/PaymentStatusBadge';
import { PaymentMethodBadge } from '../payments/PaymentMethodBadge';
import { getAllPayments } from '@/services/admin/paymentService';
import type { Payment } from '@/types/admin/payment';

interface RecentPaymentsCardProps {
  payments?: Payment[];
}

export function RecentPaymentsCard({ payments: propPayments }: RecentPaymentsCardProps) {
  const [payments, setPayments] = useState<Payment[]>(propPayments || []);
  const [loading, setLoading] = useState(!propPayments);

  useEffect(() => {
    if (!propPayments) {
      loadData();
    }
  }, [propPayments]);

  const loadData = async () => {
    try {
      const result = await getAllPayments();
      setPayments(result.items.slice(0, 10)); // Get last 10
    } catch (error) {
      console.error('Error loading recent payments:', error);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Pagamentos Recentes
          </h3>
        }
      >
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminCard>
    );
  }

  if (payments.length === 0) {
    return (
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Pagamentos Recentes
          </h3>
        }
      >
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            payments
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhum pagamento recente
          </p>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard
      header={
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Pagamentos Recentes
          </h3>
          <Link
            href="/admin/payments"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Ver todos
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        {payments.map((payment) => (
          <Link
            key={payment.id}
            href={`/admin/payments/${payment.id}`}
            className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {payment.user?.name || 'N/A'}
                  </span>
                  <PaymentMethodBadge method={payment.paymentMethod} />
                </div>
                <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  {payment.plan?.name || payment.planId} • {formatDate(payment.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold text-text-light-primary dark:text-text-dark-primary">
                    {formatCurrency(payment.amount, payment.currency)}
                  </div>
                  {payment.discountAmount > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      -{formatCurrency(payment.discountAmount, payment.currency)}
                    </div>
                  )}
                </div>
                <PaymentStatusBadge status={payment.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AdminCard>
  );
}
