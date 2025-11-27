'use client';

import React from 'react';
import { AdminCard } from '../ui/AdminCard';
import { AdminButton } from '../ui/AdminButton';
import { AdminBadge } from '../ui/AdminBadge';
import { PlanStatusBadge } from './PlanStatusBadge';
import { PlanIntervalBadge } from './PlanIntervalBadge';
import type { Plan } from '@/types/admin/plan';

interface PlanCardProps {
  plan: Plan;
  onEdit?: (plan: Plan) => void;
  onDelete?: (plan: Plan) => void;
  onToggleStatus?: (plan: Plan) => void;
  onDuplicate?: (plan: Plan) => void;
}

export function PlanCard({
  plan,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
}: PlanCardProps) {
  const formatPrice = () => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: plan.currency,
    }).format(plan.price);
  };

  return (
    <AdminCard
      className={`
        relative overflow-hidden
        ${plan.highlight ? 'ring-2 ring-primary' : ''}
      `}
    >
      {/* Badge de destaque */}
      {plan.badge && (
        <div className="absolute top-4 right-4">
          <AdminBadge
            label={plan.badge}
            variant="warning"
            size="sm"
          />
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            {plan.name}
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {plan.description}
          </p>
        </div>

        {/* Preço */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">
            {formatPrice()}
          </span>
          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            /{plan.interval === 'monthly' ? 'mês' : 'ano'}
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <PlanStatusBadge plan={plan} />
          <PlanIntervalBadge interval={plan.interval} />
          {plan.isPublic ? (
            <AdminBadge label="Público" variant="success" icon="public" size="sm" />
          ) : (
            <AdminBadge label="Privado" variant="neutral" icon="lock" size="sm" />
          )}
        </div>

        {/* Duração */}
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <span className="material-symbols-outlined text-base align-middle mr-1">
            schedule
          </span>
          {plan.durationDays} dias
        </div>

        {/* Features */}
        {plan.features.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Recursos:
            </h4>
            <ul className="space-y-1">
              {plan.features.slice(0, 3).map((feature, index) => (
                <li
                  key={index}
                  className="text-sm text-text-light-secondary dark:text-text-dark-secondary flex items-start gap-2"
                >
                  <span className="material-symbols-outlined text-primary text-base mt-0.5">
                    check_circle
                  </span>
                  {feature}
                </li>
              ))}
              {plan.features.length > 3 && (
                <li className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                  +{plan.features.length - 3} recursos
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border-light dark:border-border-dark">
          {onEdit && (
            <AdminButton
              variant="outline"
              size="sm"
              icon="edit"
              onClick={() => onEdit(plan)}
            >
              Editar
            </AdminButton>
          )}
          {onToggleStatus && (
            <AdminButton
              variant="outline"
              size="sm"
              icon={plan.isActive ? 'visibility_off' : 'visibility'}
              onClick={() => onToggleStatus(plan)}
            >
              {plan.isActive ? 'Desativar' : 'Ativar'}
            </AdminButton>
          )}
          {onDuplicate && (
            <AdminButton
              variant="outline"
              size="sm"
              icon="content_copy"
              onClick={() => onDuplicate(plan)}
            >
              Duplicar
            </AdminButton>
          )}
          {onDelete && (
            <AdminButton
              variant="danger"
              size="sm"
              icon="delete"
              onClick={() => onDelete(plan)}
            >
              Deletar
            </AdminButton>
          )}
        </div>
      </div>
    </AdminCard>
  );
}
