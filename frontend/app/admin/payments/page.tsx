'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminInput } from '@/components/admin/ui/AdminInput';
import { PaymentsTable } from '@/components/admin/payments/PaymentsTable';
import { RefundPaymentModal } from '@/components/admin/payments/RefundPaymentModal';
import { CancelPaymentModal } from '@/components/admin/payments/CancelPaymentModal';
import type { Payment, PaymentStatus } from '@/types/admin/payment';
import type { SortDirection } from '@/types/admin/common';
import {
  getAllPayments,
  refundPayment,
  cancelPayment,
} from '@/services/admin/paymentService';

type SortField = 'user' | 'amount' | 'status' | 'createdAt';

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refundModal, setRefundModal] = useState<Payment | null>(null);
  const [cancelModal, setCancelModal] = useState<Payment | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllPayments();
      setPayments(result.items);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments.filter((payment) => {
      const matchesSearch =
        searchQuery === '' ||
        payment.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.externalId?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'user') {
        aVal = a.user?.name || a.userId;
        bVal = b.user?.name || b.userId;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [payments, searchQuery, statusFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const approvedAmount = payments
      .filter((p) => p.status === 'APPROVED')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      total: payments.length,
      approved: payments.filter((p) => p.status === 'APPROVED').length,
      pending: payments.filter((p) => p.status === 'PENDING').length,
      failed: payments.filter((p) => p.status === 'REJECTED' || p.status === 'FAILED').length,
      totalAmount,
      approvedAmount,
    };
  }, [payments]);

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(field as SortField);
    setSortDirection(direction);
  };

  const handleView = (payment: Payment) => {
    router.push(`/admin/payments/${payment.id}`);
  };

  const handleRefundConfirm = async (reason: string) => {
    if (!refundModal) return;
    await refundPayment(refundModal.id, { reason });
    setRefundModal(null);
    loadPayments();
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelModal) return;
    await cancelPayment(cancelModal.id, { reason });
    setCancelModal(null);
    loadPayments();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Erro ao carregar pagamentos
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">{error}</p>
          <AdminButton onClick={loadPayments} icon="refresh">Tentar novamente</AdminButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Admin', icon: 'dashboard', href: '/admin' }, { label: 'Pagamentos', icon: 'payments' }]} />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">Gestão de Pagamentos</h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Visualize e gerencie pagamentos da plataforma</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <AdminStats title="Total" value={stats.total} icon="payments" color="blue" />
          <AdminStats title="Aprovados" value={stats.approved} icon="check_circle" color="green" />
          <AdminStats title="Pendentes" value={stats.pending} icon="pending" color="orange" />
          <AdminStats title="Falhados" value={stats.failed} icon="error" color="red" />
          <div className="md:col-span-2">
            <AdminCard>
              <div className="space-y-1">
                <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Receita Total</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(stats.approvedAmount)}</div>
                <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  De {formatCurrency(stats.totalAmount)} processados
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
        <AdminCard>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <AdminInput placeholder="Buscar por usuário, plano ou ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon="search" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary">
                <option value="all">Todos os Status</option>
                <option value="PENDING">Pendentes</option>
                <option value="APPROVED">Aprovados</option>
                <option value="REJECTED">Rejeitados</option>
                <option value="REFUNDED">Reembolsados</option>
                <option value="CANCELLED">Cancelados</option>
                <option value="FAILED">Falhados</option>
                <option value="CHARGEBACK">Chargeback</option>
              </select>
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Mostrando {filteredAndSortedPayments.length} de {payments.length} pagamentos
            </div>
          </div>
        </AdminCard>
        <AdminCard>
          <PaymentsTable
            payments={filteredAndSortedPayments}
            onView={handleView}
            onRefund={(payment) => setRefundModal(payment)}
            onCancel={(payment) => setCancelModal(payment)}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </AdminCard>
        {filteredAndSortedPayments.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">payments</span>
            <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">Nenhum pagamento encontrado</h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              {searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Nenhum pagamento registrado ainda'}
            </p>
          </div>
        )}
      </div>
      {refundModal && (
        <RefundPaymentModal
          payment={refundModal}
          isOpen={true}
          onClose={() => setRefundModal(null)}
          onConfirm={handleRefundConfirm}
        />
      )}
      {cancelModal && (
        <CancelPaymentModal
          payment={cancelModal}
          isOpen={true}
          onClose={() => setCancelModal(null)}
          onConfirm={handleCancelConfirm}
        />
      )}
    </>
  );
}
