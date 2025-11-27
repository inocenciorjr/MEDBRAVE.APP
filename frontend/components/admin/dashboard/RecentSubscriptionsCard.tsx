'use client';

import React from 'react';
import Link from 'next/link';
import { AdminCard } from '../ui/AdminCard';
import { UserPlanStatusBadge } from '../user-plans/UserPlanStatusBadge';
import type { UserPlan } from '@/types/admin/plan';

interface RecentSubscriptionsCardProps {
  userPlans: UserPlan[];
}

export function RecentSubscriptionsCard({ userPlans }: RecentSubscriptionsCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (userPlans.length === 0) {
    return (
      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Assinaturas Recentes
          </h3>
        }
      >
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            people
          </span>
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            Nenhuma assinatura recente
          </p>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard
      header={
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Assinaturas Recentes
          </h3>
          <Link
            href="/admin/user-plans"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Ver todas
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        {userPlans.map((userPlan) => (
          <Link
            key={userPlan.id}
            href={`/admin/user-plans/${userPlan.id}`}
            className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {userPlan.user?.name || 'N/A'}
                  </span>
                  <span className="material-symbols-outlined text-primary text-base">
                    arrow_forward
                  </span>
                  <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {userPlan.plan?.name || userPlan.planId}
                  </span>
                </div>
                <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  {formatDate(userPlan.createdAt)}
                </div>
              </div>
              <UserPlanStatusBadge status={userPlan.status} />
            </div>
          </Link>
        ))}
      </div>
    </AdminCard>
  );
}
