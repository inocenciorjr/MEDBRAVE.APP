'use client';

import React from 'react';
import { AdminCard } from '../ui/AdminCard';
import type { TopPlan } from '@/services/admin/statsService';

interface TopPlansCardProps {
  plans: TopPlan[];
}

export function TopPlansCard({ plans }: TopPlansCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  if (plans.length === 0) {
    return (
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Planos Mais Populares
          </h3>
        }
      >
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            workspace_premium
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhum plano ativo ainda
          </p>
        </div>
      </AdminCard>
    );
  }

  const maxSubscribers = Math.max(...plans.map(p => p.subscribers));

  return (
    <AdminCard
      header={
        <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
          Planos Mais Populares
        </h3>
      }
    >
      <div className="space-y-4">
        {plans.map((plan, index) => {
          const percentage = maxSubscribers > 0 ? (plan.subscribers / maxSubscribers) * 100 : 0;
          
          return (
            <div key={plan.planId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                      {plan.planName}
                    </div>
                    <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      {plan.subscribers} assinantes
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    {formatCurrency(plan.revenue)}
                  </div>
                  <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    receita
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </AdminCard>
  );
}
