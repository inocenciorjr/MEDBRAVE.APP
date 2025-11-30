'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { PlanUsersTable } from '@/components/admin/plans/PlanUsersTable';
import { AddUsersToPlanModal } from '@/components/admin/plans/AddUsersToPlanModal';
import { getPlanById } from '@/services/admin/planService';
import { getUserPlansByPlanId } from '@/services/admin/userPlanService';
import type { Plan, UserPlan } from '@/types/admin/plan';
import { useToast } from '@/lib/contexts/ToastContext';

export default function PlanDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUsersModal, setShowAddUsersModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [planId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planData, userPlansData] = await Promise.all([
        getPlanById(planId),
        getUserPlansByPlanId(planId),
      ]);
      setPlan(planData);
      setUserPlans(userPlansData);
    } catch (error: any) {
      toast.error('Erro ao carregar dados do plano');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalUsers: userPlans.length,
    activeUsers: userPlans.filter(up => up.status === 'ACTIVE').length,
    expiredUsers: userPlans.filter(up => up.status === 'EXPIRED').length,
    revenue: userPlans.filter(up => up.status === 'ACTIVE').length * (plan?.price || 0),
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-light dark:bg-surface-dark rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Plano não encontrado
          </h2>
          <AdminButton onClick={() => router.push('/admin/plans')} icon="arrow_back">
            Voltar para Planos
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Planos', icon: 'workspace_premium', href: '/admin/plans' },
          { label: plan.name, icon: 'info' },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
                {plan.name}
              </h1>
              {plan.badge && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary">
                  {plan.badge}
                </span>
              )}
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                plan.isActive 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                {plan.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              {plan.description}
            </p>
          </div>
          <div className="flex gap-3">
            <AdminButton
              onClick={() => router.push(`/admin/plans/${planId}/edit`)}
              icon="edit"
              variant="outline"
            >
              Editar Plano
            </AdminButton>
            <AdminButton
              onClick={() => setShowAddUsersModal(true)}
              icon="person_add"
            >
              Adicionar Usuários
            </AdminButton>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AdminStats
            title="Total de Usuários"
            value={stats.totalUsers}
            icon="people"
            color="blue"
          />
          <AdminStats
            title="Usuários Ativos"
            value={stats.activeUsers}
            icon="check_circle"
            color="green"
          />
          <AdminStats
            title="Usuários Expirados"
            value={stats.expiredUsers}
            icon="event_busy"
            color="red"
          />
          <AdminStats
            title="Receita Mensal"
            value={`R$ ${stats.revenue.toFixed(2)}`}
            icon="payments"
            color="purple"
          />
        </div>

        {/* Plan Info */}
        <AdminCard
          header={
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Informações do Plano
            </h3>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Preço
              </p>
              <p className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                R$ {plan.price.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Duração
              </p>
              <p className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {plan.durationDays} dias
              </p>
            </div>
            <div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Intervalo
              </p>
              <p className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {plan.interval === 'monthly' ? 'Mensal' : 'Anual'}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Visibilidade
              </p>
              <p className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                {plan.isPublic ? 'Público' : 'Privado'}
              </p>
            </div>
          </div>
        </AdminCard>

        {/* Users Table */}
        <AdminCard
          header={
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              Usuários com este Plano
            </h3>
          }
        >
          <PlanUsersTable
            planId={planId}
            userPlans={userPlans}
            onRefresh={loadData}
          />
        </AdminCard>
      </div>

      {/* Add Users Modal */}
      <AddUsersToPlanModal
        isOpen={showAddUsersModal}
        onClose={() => setShowAddUsersModal(false)}
        planId={planId}
        planName={plan.name}
        onSuccess={loadData}
      />
    </>
  );
}
