'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PlanForm } from '@/components/admin/plans/PlanForm';
import { getPlanById, updatePlan } from '@/services/admin/planService';
import type { Plan, CreatePlanPayload } from '@/types/admin/plan';

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlanById(planId);
      setPlan(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreatePlanPayload) => {
    await updatePlan(planId, data);
    router.push('/admin/plans');
  };

  const handleCancel = () => {
    router.push('/admin/plans');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-surface-light dark:bg-surface-dark rounded animate-pulse" />
        <div className="h-96 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
            error
          </span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Erro ao carregar plano
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            {error || 'Plano não encontrado'}
          </p>
          <button
            onClick={() => router.push('/admin/plans')}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
          >
            Voltar para Planos
          </button>
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
          { label: plan.name, icon: 'edit' },
        ]}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
            Editar Plano: {plan.name}
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Atualize as informações do plano de assinatura
          </p>
        </div>

        <PlanForm plan={plan} onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </>
  );
}
