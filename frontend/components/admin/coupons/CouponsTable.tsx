'use client';

import React from 'react';
import { AdminTable, type ColumnDef } from '@/components/admin/ui/AdminTable';
import { CouponStatusBadge } from './CouponStatusBadge';
import { CouponTypeBadge } from './CouponTypeBadge';
import type { Coupon } from '@/types/admin/coupon';
import type { SortDirection } from '@/types/admin/common';

interface CouponsTableProps {
  coupons: Coupon[];
  loading?: boolean;
  onEdit?: (coupon: Coupon) => void;
  onDelete?: (coupon: Coupon) => void;
  onToggleStatus?: (coupon: Coupon) => void;
  onSort?: (field: string, direction: SortDirection) => void;
  sortField?: string;
  sortDirection?: SortDirection;
}

export function CouponsTable({
  coupons,
  loading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onSort,
  sortField,
  sortDirection,
}: CouponsTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const columns: ColumnDef<Coupon>[] = [
    {
      key: 'code',
      label: 'Código',
      sortable: true,
      render: (_, coupon) => (
        <div>
          <div className="font-mono font-bold text-text-light-primary dark:text-text-dark-primary">
            {coupon.code}
          </div>
          {coupon.description && (
            <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {coupon.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'discountType',
      label: 'Desconto',
      render: (_, coupon) => (
        <CouponTypeBadge
          discountType={coupon.discountType}
          discountValue={coupon.discountValue}
        />
      ),
    },
    {
      key: 'timesUsed',
      label: 'Uso',
      sortable: true,
      render: (_, coupon) => (
        <div className="text-sm">
          <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {coupon.timesUsed} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
          </div>
          {coupon.maxUses && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div
                className="bg-primary rounded-full h-1.5 transition-all"
                style={{
                  width: `${Math.min((coupon.timesUsed / coupon.maxUses) * 100, 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'expirationDate',
      label: 'Expiração',
      sortable: true,
      render: (_, coupon) =>
        coupon.expirationDate ? (
          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {formatDate(coupon.expirationDate)}
          </span>
        ) : (
          <span className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
            Sem expiração
          </span>
        ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (_, coupon) => <CouponStatusBadge coupon={coupon} />,
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, coupon) => (
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(coupon);
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
                onToggleStatus(coupon);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={coupon.isActive ? 'Desativar' : 'Ativar'}
            >
              <span className="material-symbols-outlined text-lg text-orange-600 dark:text-orange-400">
                {coupon.isActive ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(coupon);
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
      data={coupons}
      columns={columns}
      loading={loading}
      onSort={onSort}
      sortField={sortField}
      sortDirection={sortDirection}
      emptyMessage="Nenhum cupom encontrado"
    />
  );
}
