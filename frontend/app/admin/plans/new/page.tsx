'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PlanForm } from '@/components/admin/plans/PlanForm';
import { createPlan } from '@/services/admin/planService';
import type { CreatePlanPayload } from '@/types/admin/plan';

export default function NewPlanPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreatePlanPayload) => {
    await createPlan(data);
    router.push('/admin/plans');
  };

  const handleCancel = () => {
    router.push('/admin/plans');
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Planos', icon: 'workspace_premium', href: '/admin/plans' },
          { label: 'Novo Plano', icon: 'add' },
        ]}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
            Criar Novo Plano
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Preencha as informações abaixo para criar um novo plano de assinatura
          </p>
        </div>

        <PlanForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </>
  );
}
