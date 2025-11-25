'use client';

import React, { useState } from 'react';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminTable, ColumnDef } from '@/components/admin/ui/AdminTable';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminInput';
import { SearchInput } from '@/components/flashcards/SearchInput';

interface AuditLog {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export default function AuditPage() {
  const [logs] = useState<AuditLog[]>([]);
  const [loading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const getActionBadgeVariant = (action: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    if (action.includes('CREATE')) return 'success';
    if (action.includes('UPDATE')) return 'info';
    if (action.includes('DELETE')) return 'error';
    if (action.includes('LOGIN')) return 'neutral';
    return 'neutral';
  };

  const columns: ColumnDef<AuditLog>[] = [
    {
      key: 'timestamp',
      label: 'Data/Hora',
      sortable: true,
      render: (_, log) => (
        <div className="text-sm">
          <div>{new Date(log.timestamp).toLocaleDateString('pt-BR')}</div>
          <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
          </div>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Ação',
      sortable: true,
      render: (_, log) => (
        <AdminBadge
          label={log.action}
          variant={getActionBadgeVariant(log.action)}
          size="sm"
        />
      )
    },
    {
      key: 'performedBy',
      label: 'Usuário',
      render: (_, log) => (
        <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
          {log.performedBy}
        </div>
      )
    },
    {
      key: 'description',
      label: 'Descrição',
      render: (_, log) => (
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary max-w-md">
          {log.description}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
            Logs de Auditoria
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Visualize logs de auditoria de ações administrativas
          </p>
        </div>
        <AdminButton variant="outline">
          <span className="material-symbols-outlined text-sm mr-2">download</span>
          Exportar CSV
        </AdminButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminStats title="Total de Logs" value={logs.length} icon="history" color="blue" />
        <AdminStats title="Últimas 24h" value={0} icon="schedule" color="green" />
        <AdminStats title="Ação Mais Comum" value="N/A" icon="trending_up" color="purple" />
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchInput
            placeholder="Buscar logs..."
            value={search}
            onChange={setSearch}
            fullWidth
          />
          <AdminSelect
            value={actionFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActionFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Todas as ações' },
              { value: 'CREATE', label: 'Criação' },
              { value: 'UPDATE', label: 'Atualização' },
              { value: 'DELETE', label: 'Exclusão' },
              { value: 'LOGIN', label: 'Login' }
            ]}
          />
          <AdminInput
            type="date"
            placeholder="Data"
          />
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            Logs ({logs.length})
          </h2>
        </div>
        <AdminTable
          data={logs}
          columns={columns}
          loading={loading}
          emptyMessage="Nenhum log de auditoria encontrado"
        />
      </div>
    </div>
  );
}
