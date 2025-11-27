'use client';

import React from 'react';
import { AdminTable, type ColumnDef } from '@/components/admin/ui/AdminTable';
import { UserPlanStatusBadge } from './UserPlanStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';
import type { UserPlan } from '@/types/admin/plan';
import type { SortDirection } from '@/types/admin/common';

interface UserPlansTableProps {
  userPlans: UserPlan[];
  loading?: boolean;
  onView?: (userPlan: UserPlan) => void;
  onCancel?: (userPlan: UserPlan) => void;
  onRenew?: (userPlan: UserPlan) => void;
  onSort?: (field: string, direction: SortDirection) => void;
  sortField?: string;
  sortDirection?: SortDirection;
}

export function UserPlansTable({
  userPlans,
  loading = false,
  onView,
  onCancel,
  onRenew,
  onSort,
  sortField,
  sortDirection,
}: UserPlansTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const columns: ColumnDef<UserPlan>[] = [
    {
      key: 'user',
      label: 'Usuário',
      sortable: true,
      render: (_, userPlan) => (
        <div>
          <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {userPlan.user?.name || 'N/A'}
          </div>
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {userPlan.user?.email || userPlan.userId}
          </div>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plano',
      render: (_, userPlan) => (
        <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
          {userPlan.plan?.name || userPlan.planId}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, userPlan) => <UserPlanStatusBadge status={userPlan.status} />,
    },
    {
      key: 'paymentMethod',
      label: 'Método',
      render: (_, userPlan) => <PaymentMethodBadge method={userPlan.paymentMethod} />,
    },
    {
      key: 'startDate',
      label: 'Início',
      sortable: true,
      render: (_, userPlan) => (
        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          {formatDate(userPlan.startDate)}
        </span>
      ),
    },
    {
      key: 'endDate',
      label: 'Término',
      sortable: true,
      render: (_, userPlan) => {
        const daysRemaining = getDaysRemaining(userPlan.endDate);
        const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;
        const isExpired = daysRemaining < 0;

        return (
          <div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {formatDate(userPlan.endDate)}
            </div>
            {userPlan.status === 'ACTIVE' && (
              <div
                className={`text-xs ${
                  isExpired
                    ? 'text-red-600 dark:text-red-400'
                    : isExpiringSoon
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-text-light-tertiary dark:text-text-dark-tertiary'
                }`}
              >
                {isExpired
                  ? 'Expirado'
                  : daysRemaining === 0
                  ? 'Expira hoje'
                  : daysRemaining === 1
                  ? 'Expira amanhã'
                  : `${daysRemaining} dias`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'autoRenew',
      label: 'Auto-renovação',
      render: (_, userPlan) =>
        userPlan.autoRenew ? (
          <span className="material-symbols-outlined text-green-600 dark:text-green-400">
            check_circle
          </span>
        ) : (
          <span className="material-symbols-outlined text-gray-400">
            cancel
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, userPlan) => (
        <div className="flex gap-1">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(userPlan);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Ver detalhes"
            >
              <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
                visibility
              </span>
            </button>
          )}
          {onRenew && userPlan.status !== 'CANCELLED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRenew(userPlan);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Renovar"
            >
              <span className="material-symbols-outlined text-lg text-green-600 dark:text-green-400">
                autorenew
              </span>
            </button>
          )}
          {onCancel && userPlan.status === 'ACTIVE' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(userPlan);
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
      data={userPlans}
      columns={columns}
      loading={loading}
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
      onRowClick={onView}
      emptyMessage="Nenhum plano de usuário encontrado"
    />
  );
}
