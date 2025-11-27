'use client';

import React from 'react';
import { AdminTable, type ColumnDef } from '../ui/AdminTable';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import type { Payment } from '@/types/admin/payment';
import type { SortDirection } from '@/types/admin/common';

interface PaymentsTableProps {
  payments: Payment[];
  loading?: boolean;
  onView?: (payment: Payment) => void;
  onRefund?: (payment: Payment) => void;
  onCancel?: (payment: Payment) => void;
  onSort?: (field: string, direction: SortDirection) => void;
  sortField?: string;
  sortDirection?: SortDirection;
}

export function PaymentsTable({
  payments,
  loading = false,
  onView,
  onRefund,
  onCancel,
  onSort,
  sortField,
  sortDirection,
}: PaymentsTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const columns: ColumnDef<Payment>[] = [
    {
      key: 'user',
      label: 'Usuário',
      render: (_, payment) => (
        <div>
          <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {payment.user?.name || 'N/A'}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {payment.user?.email || payment.userId}
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plano',
      render: (_, payment) => (
        <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
          {payment.plan?.name || payment.planId}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Valor',
      sortable: true,
      render: (_, payment) => (
        <div>
          <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {formatCurrency(payment.amount, payment.currency)}
          </div>
          {payment.discountAmount > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400">
              -{formatCurrency(payment.discountAmount, payment.currency)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Método',
      render: (_, payment) => <PaymentMethodBadge method={payment.paymentMethod} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, payment) => <PaymentStatusBadge status={payment.status} />,
    },
    {
      key: 'createdAt',
      label: 'Data',
      sortable: true,
      render: (_, payment) => (
        <div>
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {formatDate(payment.createdAt)}
          </div>
          {payment.paidAt && (
            <div className="text-xs text-green-600 dark:text-green-400">
              Pago: {formatDate(payment.paidAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'coupon',
      label: 'Cupom',
      render: (_, payment) =>
        payment.coupon ? (
          <span className="font-mono text-xs text-text-light-primary dark:text-text-dark-primary">
            {payment.coupon.code}
          </span>
        ) : (
          <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            -
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, payment) => (
        <div className="flex gap-1">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(payment);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Ver detalhes"
            >
              <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
                visibility
              </span>
            </button>
          )}
          {onRefund && payment.status === 'APPROVED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefund(payment);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Reembolsar"
            >
              <span className="material-symbols-outlined text-lg text-purple-600 dark:text-purple-400">
                undo
              </span>
            </button>
          )}
          {onCancel && payment.status === 'PENDING' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(payment);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Cancelar"
            >
              <span className="material-symbols-outlined text-lg text-red-600 dark:text-red-400">
                cancel
              </span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminTable
      data={payments}
      columns={columns}
      loading={loading}
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
      onRowClick={onView}
      emptyMessage="Nenhum pagamento encontrado"
    />
  );
}
