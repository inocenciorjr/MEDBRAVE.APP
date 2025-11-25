'use client';

import React from 'react';
import { AdminStats } from '@/components/admin/ui/AdminStats';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
          Gestão de Pagamentos
        </h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
          Gerencie pagamentos da plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStats title="Total" value={0} icon="payments" color="blue" />
        <AdminStats title="Completos" value={0} icon="check_circle" color="green" />
        <AdminStats title="Pendentes" value={0} icon="pending" color="orange" />
        <AdminStats title="Falhados" value={0} icon="error" color="red" />
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
        <span className="material-symbols-outlined text-6xl text-text-light-tertiary dark:text-text-dark-tertiary mb-4">payments</span>
        <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          Gestão de Pagamentos
        </h3>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          Funcionalidade em desenvolvimento
        </p>
      </div>
    </div>
  );
}
