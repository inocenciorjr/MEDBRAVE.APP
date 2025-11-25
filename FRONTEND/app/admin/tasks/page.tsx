'use client';

import React from 'react';
import { AdminStats } from '@/components/admin/ui/AdminStats';

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">Tarefas Administrativas</h1>
        <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Gerencie tarefas administrativas</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStats title="Total" value={0} icon="task" color="blue" />
        <AdminStats title="Pendentes" value={0} icon="pending_actions" color="orange" />
        <AdminStats title="Em Progresso" value={0} icon="autorenew" color="purple" />
        <AdminStats title="Concluídas" value={0} icon="task_alt" color="green" />
      </div>
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-12 text-center border border-border-light dark:border-border-dark">
        <span className="material-symbols-outlined text-6xl text-text-light-tertiary dark:text-text-dark-tertiary mb-4">task</span>
        <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">Tarefas Administrativas</h3>
        <p className="text-text-light-secondary dark:text-text-dark-secondary">Funcionalidade em desenvolvimento</p>
      </div>
    </div>
  );
}
