'use client';

import React from 'react';
import { AdminBadge } from '../ui/AdminBadge';
import type { DiscountType } from '@/types/admin/coupon';

interface CouponTypeBadgeProps {
  discountType: DiscountType;
  discountValue: number;
}

export function CouponTypeBadge({ discountType, discountValue }: CouponTypeBadgeProps) {
  if (discountType === 'percentage') {
    return (
      <AdminBadge
        label={`${discountValue}% OFF`}
        variant="info"
        icon="percent"
      />
    );
  }

  return (
    <AdminBadge
      label={`R$ ${discountValue.toFixed(2)} OFF`}
      variant="success"
      icon="payments"
    />
  );
}
