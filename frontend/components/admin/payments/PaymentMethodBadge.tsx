'use client';

import React from 'react';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import type { PaymentMethod } from '@/types/admin/payment';

interface PaymentMethodBadgeProps {
  method: PaymentMethod;
}

export function PaymentMethodBadge({ method }: PaymentMethodBadgeProps) {
  const methodConfig: Record<PaymentMethod, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; icon: string }> = {
    CREDIT_CARD: { label: 'Cartão', variant: 'info', icon: 'credit_card' },
    PIX: { label: 'PIX', variant: 'success', icon: 'pix' },
    ADMIN: { label: 'Admin', variant: 'warning', icon: 'admin_panel_settings' },
    FREE: { label: 'Gratuito', variant: 'success', icon: 'card_giftcard' },
    BANK_SLIP: { label: 'Boleto', variant: 'neutral', icon: 'receipt' },
    OTHER: { label: 'Outro', variant: 'neutral', icon: 'payments' },
  };

  const config = methodConfig[method];

  return (
    <AdminBadge
      label={config.label}
      variant={config.variant}
      icon={config.icon}
      size="sm"
    />
  );
}
