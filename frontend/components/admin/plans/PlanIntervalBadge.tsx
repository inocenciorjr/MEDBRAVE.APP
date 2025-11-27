'use client';

import React from 'react';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import type { PlanInterval } from '@/types/admin/plan';

interface PlanIntervalBadgeProps {
  interval: PlanInterval;
}

export function PlanIntervalBadge({ interval }: PlanIntervalBadgeProps) {
  if (interval === 'monthly') {
    return (
      <AdminBadge
        label="Mensal"
        variant="info"
        icon="calendar_month"
      />
    );
  }

  return (
    <AdminBadge
      label="Anual"
      variant="success"
      icon="calendar_today"
    />
  );
}
