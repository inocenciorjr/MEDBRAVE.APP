'use client';

import React from 'react';
import { AdminStats } from '@/components/admin/ui/AdminStats';

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">Dashboard Financeiro</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Visualize métricas financeiras da plataforma</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStats title="Receita Total" value="R$ 0" icon="account_balance" color="blue" />
        <AdminStats title="Receita Mensal" value="R$ 0" icon="trending_up" color="green" />
        <AdminStats title="Taxa de Conversão" value="0%" icon="conversion_path" color="purple" />
        <AdminStats title="Churn" value="0%" icon="trending_down" color="red" />
      </div>
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
        <span className="material-symbols-outlined text-6xl text-text-light-tertiary dark:text-text-dark-tertiary mb-4">account_balance</span>
        <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">Dashboard Financeiro</h3>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  );
}
