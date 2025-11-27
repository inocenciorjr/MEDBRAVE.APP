'use client';

import React from 'react';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import type { PaymentStatus } from '@/types/admin/payment';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const statusConfig: Record<PaymentStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; icon: string }> = {
    PENDING: { label: 'Pendente', variant: 'warning', icon: 'pending' },
    APPROVED: { label: 'Aprovado', variant: 'success', icon: 'check_circle' },
    REJECTED: { label: 'Rejeitado', variant: 'error', icon: 'cancel' },
    REFUNDED: { label: 'Reembolsado', variant: 'info', icon: 'undo' },
    CANCELLED: { label: 'Cancelado', variant: 'neutral', icon: 'block' },
    CHARGEBACK: { label: 'Chargeback', variant: 'error', icon: 'report' },
    FAILED: { label: 'Falhou', variant: 'error', icon: 'error' },
  };

  const config = statusConfig[status];

  return (
    <AdminBadge
      label={config.label}
      variant={config.variant}
      icon={config.icon}
    />
  );
}
