'use client';

import React from 'react';
import { AdminBadge } from '../ui/AdminBadge';
import type { Coupon } from '@/types/admin/coupon';

interface CouponStatusBadgeProps {
  coupon: Coupon;
}

export function CouponStatusBadge({ coupon }: CouponStatusBadgeProps) {
  // Check if expired
  if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
    return (
      <AdminBadge
        label="Expirado"
        variant="error"
        icon="event_busy"
      />
    );
  }

  // Check if fully used
  if (coupon.maxUses && coupon.timesUsed >= coupon.maxUses) {
    return (
      <AdminBadge
        label="Esgotado"
        variant="warning"
        icon="block"
      />
    );
  }

  // Check if active
  if (coupon.isActive) {
    return (
      <AdminBadge
        label="Ativo"
        variant="success"
        icon="check_circle"
      />
    );
  }

  return (
    <AdminBadge
      label="Inativo"
      variant="neutral"
      icon="cancel"
    />
  );
}
