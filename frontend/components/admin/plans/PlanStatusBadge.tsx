'use client';

import React from 'react';
import { AdminBadge } from '../ui/AdminBadge';
import type { Plan } from '@/types/admin/plan';

interface PlanStatusBadgeProps {
  plan: Plan;
}

export function PlanStatusBadge({ plan }: PlanStatusBadgeProps) {
  if (plan.isActive) {
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
