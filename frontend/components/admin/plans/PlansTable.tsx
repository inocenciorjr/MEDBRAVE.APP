'use client';

import React from 'react';
import { AdminTable, type ColumnDef } from '@/components/admin/ui/AdminTable';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { PlanStatusBadge } from './PlanStatusBadge';
import { PlanIntervalBadge } from './PlanIntervalBadge';
import type { Plan } from '@/types/admin/plan';
import type { SortDirection } from '@/types/admin/common';

interface PlansTableProps {
  plans: Plan[];
  loading?: boolean;
  onEdit?: (plan: Plan) => void;
  onDelete?: (plan: Plan) => void;
  onToggleStatus?: (plan: Plan) => void;
  onDuplicate?: (plan: Plan) => void;
  onSort?: (field: string, direction: SortDirection) => void;
  sortField?: string;
  sortDirection?: SortDirection;
}

export function PlansTable({
  plans,
  loading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onSort,
  sortField,
  sortDirection,
}: PlansTableProps) {
  const columns: ColumnDef<Plan>[] = [
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      render: (_, plan) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
              {plan.name}
            </div>
            {plan.badge && (
              <AdminBadge
                label={plan.badge}
                variant="warning"
                size="sm"
              />
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Preço',
      sortable: true,
      render: (_, plan) => (
        <div>
          <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: plan.currency,
            }).format(plan.price)}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            /{plan.interval === 'monthly' ? 'mês' : 'ano'}
          </div>
        </div>
      ),
    },
    {
      key: 'durationDays',
      label: 'Duração',
      sortable: true,
      render: (_, plan) => (
        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          {plan.durationDays} dias
        </span>
      ),
    },
    {
      key: 'interval',
      label: 'Intervalo',
      render: (_, plan) => <PlanIntervalBadge interval={plan.interval} />,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (_, plan) => <PlanStatusBadge plan={plan} />,
    },
    {
      key: 'isPublic',
      label: 'Visibilidade',
      render: (_, plan) =>
        plan.isPublic ? (
          <AdminBadge label="Público" variant="success" icon="public" size="sm" />
        ) : (
          <AdminBadge label="Privado" variant="neutral" icon="lock" size="sm" />
        ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, plan) => (
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(plan);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
                edit
              </span>
            </button>
          )}
          {onToggleStatus && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(plan);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={plan.isActive ? 'Desativar' : 'Ativar'}
            >
              <span className="material-symbols-outlined text-lg text-orange-600 dark:text-orange-400">
                {plan.isActive ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(plan);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Duplicar"
            >
              <span className="material-symbols-outlined text-lg text-purple-600 dark:text-purple-400">
                content_copy
              </span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(plan);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Deletar"
            >
              <span className="material-symbols-outlined text-lg text-red-600 dark:text-red-400">
                delete
              </span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminTable
      data={plans}
      columns={columns}
      loading={loading}
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
      emptyMessage="Nenhum plano encontrado"
    />
  );
}
