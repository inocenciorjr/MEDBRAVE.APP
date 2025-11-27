'use client';

import React from 'react';
import { AdminStats } from '../ui/AdminStats';
import type { FinancialStats } from '@/services/admin/statsService';

interface FinancialStatsGridProps {
  stats: FinancialStats;
}

export function FinancialStatsGrid({ stats }: FinancialStatsGridProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AdminStats
        title="Receita Total"
        value={formatCurrency(stats.totalRevenue)}
        icon="payments"
        color="green"
      />
      <AdminStats
        title="Pagamentos Aprovados"
        value={stats.approvedPayments}
        icon="check_circle"
        color="blue"
      />
      <AdminStats
        title="Planos Ativos"
        value={stats.activeUserPlans}
        icon="workspace_premium"
        color="purple"
      />
      <AdminStats
        title="Cupons Ativos"
        value={stats.activeCoupons}
        icon="local_offer"
        color="orange"
      />
    </div>
  );
}
