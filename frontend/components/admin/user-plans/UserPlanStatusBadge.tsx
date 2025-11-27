'use client';

import React from 'react';
import { AdminBadge } from '../ui/AdminBadge';
import type { UserPlanStatus } from '@/types/admin/plan';

interface UserPlanStatusBadgeProps {
  status: UserPlanStatus;
}

export function UserPlanStatusBadge({ status }: UserPlanStatusBadgeProps) {
  const statusConfig: Record<UserPlanStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; icon: string }> = {
    ACTIVE: { label: 'Ativo', variant: 'success', icon: 'check_circle' },
    PENDING_PAYMENT: { label: 'Aguardando Pagamento', variant: 'warning', icon: 'pending' },
    EXPIRED: { label: 'Expirado', variant: 'error', icon: 'event_busy' },
    CANCELLED: { label: 'Cancelado', variant: 'neutral', icon: 'cancel' },
    SUSPENDED: { label: 'Suspenso', variant: 'error', icon: 'block' },
    TRIAL: { label: 'Trial', variant: 'info', icon: 'schedule' },
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
