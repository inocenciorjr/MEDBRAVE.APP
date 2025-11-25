'use client';

import React from 'react';
import { AdminStats } from '@/components/admin/ui/AdminStats';

export default function AIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">MEDBRAVE AI</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Insights gerados por IA sobre a plataforma</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStats title="Insights Gerados" value={0} icon="psychology" color="blue" />
        <AdminStats title="Padrões Identificados" value={0} icon="pattern" color="green" />
        <AdminStats title="Anomalias Detectadas" value={0} icon="warning" color="orange" />
        <AdminStats title="Previsões Ativas" value={0} icon="trending_up" color="purple" />
      </div>
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
        <span className="material-symbols-outlined text-6xl text-text-light-tertiary dark:text-text-dark-tertiary mb-4">psychology</span>
        <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">MEDBRAVE AI</h3>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  );
}
