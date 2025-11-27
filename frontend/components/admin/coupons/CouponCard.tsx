'use client';

import React from 'react';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { CouponStatusBadge } from './CouponStatusBadge';
import { CouponTypeBadge } from './CouponTypeBadge';
import type { Coupon } from '@/types/admin/coupon';

interface CouponCardProps {
  coupon: Coupon;
  onEdit?: (coupon: Coupon) => void;
  onDelete?: (coupon: Coupon) => void;
  onToggleStatus?: (coupon: Coupon) => void;
}

export function CouponCard({
  coupon,
  onEdit,
  onDelete,
  onToggleStatus,
}: CouponCardProps) {
  const usagePercentage = coupon.maxUses
    ? (coupon.timesUsed / coupon.maxUses) * 100
    : 0;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <AdminCard>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary font-mono">
              {coupon.code}
            </h3>
            <CouponTypeBadge
              discountType={coupon.discountType}
              discountValue={coupon.discountValue}
            />
          </div>
          {coupon.description && (
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {coupon.description}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-2">
          <CouponStatusBadge coupon={coupon} />
          {coupon.applicablePlanIds && coupon.applicablePlanIds.length > 0 && (
            <AdminBadge
              label={`${coupon.applicablePlanIds.length} planos`}
              variant="info"
              icon="workspace_premium"
              size="sm"
            />
          )}
        </div>

        {/* Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-light-secondary dark:text-text-dark-secondary">
              Uso
            </span>
            <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
              {coupon.timesUsed} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
            </span>
          </div>
          {coupon.maxUses && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Expiration */}
        {coupon.expirationDate && (
          <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <span className="material-symbols-outlined text-base align-middle mr-1">
              event
            </span>
            Expira em: {formatDate(coupon.expirationDate)}
          </div>
        )}

        {/* Created */}
        <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
          Criado em: {formatDate(coupon.createdAt)}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border-light dark:border-border-dark">
          {onEdit && (
            <AdminButton
              variant="outline"
              size="sm"
              icon="edit"
              onClick={() => onEdit(coupon)}
            >
              Editar
            </AdminButton>
          )}
          {onToggleStatus && (
            <AdminButton
              variant="outline"
              size="sm"
              icon={coupon.isActive ? 'visibility_off' : 'visibility'}
              onClick={() => onToggleStatus(coupon)}
            >
              {coupon.isActive ? 'Desativar' : 'Ativar'}
            </AdminButton>
          )}
          {onDelete && (
            <AdminButton
              variant="danger"
              size="sm"
              icon="delete"
              onClick={() => onDelete(coupon)}
            >
              Deletar
            </AdminButton>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
