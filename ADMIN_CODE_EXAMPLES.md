# 💻 Exemplos de Código - Admin de Planos

## 📦 1. Exemplo de Serviço Admin

### `services/admin/planService.ts`

```typescript
import { get, post, put, del, buildQueryString } from './baseService';
import type { Plan, CreatePlanPayload, PlanListOptions } from '@/types/admin/plan';

/**
 * Get all plans with optional filters
 */
export async function getAllPlans(options?: PlanListOptions): Promise<Plan[]> {
  const queryString = options ? buildQueryString(options) : '';
  const response = await get<{ success: boolean; data: Plan[] }>(
    `/api/plans${queryString}`
  );
  return response.data;
}

/**
 * Get plan by ID
 */
export async function getPlanById(id: string): Promise<Plan> {
  const response = await get<{ success: boolean; data: Plan }>(
    `/api/plans/${id}`
  );
  return response.data;
}

/**
 * Create a new plan
 */
export async function createPlan(data: CreatePlanPayload): Promise<Plan> {
  const response = await post<{ success: boolean; data: Plan }>(
    '/api/plans',
    data
  );
  return response.data;
}

/**
 * Update a plan
 */
export async function updatePlan(id: string, data: Partial<Plan>): Promise<Plan> {
  const response = await put<{ success: boolean; data: Plan }>(
    `/api/plans/${id}`,
    data
  );
  return response.data;
}

/**
 * Delete a plan
 */
export async function deletePlan(id: string): Promise<void> {
  await del(`/api/plans/${id}`);
}

/**
 * Toggle plan status (active/inactive)
 */
export async function togglePlanStatus(id: string, isActive: boolean): Promise<Plan> {
  return updatePlan(id, { isActive });
}

/**
 * Duplicate a plan
 */
export async function duplicatePlan(id: string): Promise<Plan> {
  const plan = await getPlanById(id);
  const newPlan: CreatePlanPayload = {
    ...plan,
    name: `${plan.name} (Cópia)`,
    isActive: false,
  };
  return createPlan(newPlan);
}

/**
 * Get public plans (for reference)
 */
export async function getPublicPlans(): Promise<Plan[]> {
  const response = await get<{ success: boolean; data: Plan[] }>(
    '/api/plans/public'
  );
  return response.data;
}
```

---

## 🎨 2. Exemplo de Componente de Tabela

### `components/admin/plans/PlansTable.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { AdminTable } from '../ui/AdminTable';
import { AdminBadge } from '../ui/AdminBadge';
import { AdminButton } from '../ui/AdminButton';
import { PlanStatusBadge } from './PlanStatusBadge';
import type { Plan } from '@/types/admin/plan';

interface PlansTableProps {
  plans: Plan[];
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
  onToggleStatus: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
}

export function PlansTable({
  plans,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
}: PlansTableProps) {
  const columns = [
    {
      key: 'name',
      label: 'Nome',
      render: (plan: Plan) => (
        <div>
          <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {plan.name}
          </div>
          {plan.badge && (
            <AdminBadge color="purple" size="sm">
              {plan.badge}
            </AdminBadge>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Preço',
      render: (plan: Plan) => (
        <div className="font-medium">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: plan.currency,
          }).format(plan.price)}
          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary ml-1">
            /{plan.interval === 'monthly' ? 'mês' : 'ano'}
          </span>
        </div>
      ),
    },
    {
      key: 'duration',
      label: 'Duração',
      render: (plan: Plan) => `${plan.durationDays} dias`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (plan: Plan) => <PlanStatusBadge plan={plan} />,
    },
    {
      key: 'visibility',
      label: 'Visibilidade',
      render: (plan: Plan) => (
        <AdminBadge color={plan.isPublic ? 'green' : 'gray'}>
          {plan.isPublic ? 'Público' : 'Privado'}
        </AdminBadge>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (plan: Plan) => (
        <div className="flex gap-2">
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => onEdit(plan)}
            icon="edit"
          >
            Editar
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => onToggleStatus(plan)}
            icon={plan.isActive ? 'visibility_off' : 'visibility'}
          >
            {plan.isActive ? 'Desativar' : 'Ativar'}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => onDuplicate(plan)}
            icon="content_copy"
          >
            Duplicar
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => onDelete(plan)}
            icon="delete"
            color="red"
          >
            Deletar
          </AdminButton>
        </div>
      ),
    },
  ];

  return <AdminTable columns={columns} data={plans} />;
}
```

---

## 📝 3. Exemplo de Formulário

### `components/admin/plans/PlanForm.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { AdminInput } from '../ui/AdminInput';
import { AdminButton } from '../ui/AdminButton';
import { AdminCard } from '../ui/AdminCard';
import { PlanLimitsForm } from './PlanLimitsForm';
import type { Plan, CreatePlanPayload, PlanLimits } from '@/types/admin/plan';

interface PlanFormProps {
  plan?: Plan;
  onSubmit: (data: CreatePlanPayload) => Promise<void>;
  onCancel: () => void;
}

export function PlanForm({ plan, onSubmit, onCancel }: PlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreatePlanPayload>({
    name: plan?.name || '',
    description: plan?.description || '',
    price: plan?.price || 0,
    currency: plan?.currency || 'BRL',
    durationDays: plan?.durationDays || 30,
    isActive: plan?.isActive ?? true,
    isPublic: plan?.isPublic ?? true,
    features: plan?.features || [],
    interval: plan?.interval || 'monthly',
    limits: plan?.limits || getDefaultLimits(),
    badge: plan?.badge || '',
    highlight: plan?.highlight || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar plano');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <AdminCard
        header={
          <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
            Informações Básicas
          </h3>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminInput
            label="Nome do Plano"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ex: Plano Premium"
          />

          <AdminInput
            label="Preço"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            required
            placeholder="99.90"
          />

          <AdminInput
            label="Duração (dias)"
            type="number"
            value={formData.durationDays}
            onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
            required
            placeholder="30"
          />

          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              Intervalo
            </label>
            <select
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value as any })}
              className="w-full px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark"
            >
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
        </div>

        <AdminInput
          label="Descrição"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          multiline
          rows={3}
          placeholder="Descrição do plano..."
        />

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Ativo</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Público</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.highlight}
              onChange={(e) => setFormData({ ...formData, highlight: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Destacar</span>
          </label>
        </div>
      </AdminCard>

      <PlanLimitsForm
        limits={formData.limits}
        onChange={(limits) => setFormData({ ...formData, limits })}
      />

      <div className="flex justify-end gap-4">
        <AdminButton
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </AdminButton>
        <AdminButton
          type="submit"
          loading={loading}
          icon="save"
        >
          {plan ? 'Atualizar' : 'Criar'} Plano
        </AdminButton>
      </div>
    </form>
  );
}

function getDefaultLimits(): PlanLimits {
  return {
    maxQuestionsPerDay: null,
    maxQuestionListsPerDay: null,
    maxSimulatedExamsPerMonth: null,
    maxFSRSCards: null,
    maxReviewsPerDay: null,
    maxFlashcardsCreated: null,
    maxFlashcardDecks: null,
    maxPulseAIQueriesPerDay: null,
    maxQuestionExplanationsPerDay: null,
    maxContentGenerationPerMonth: null,
    canExportData: false,
    canCreateCustomLists: false,
    canAccessAdvancedStatistics: false,
    canUseErrorNotebook: false,
    canAccessMentorship: false,
    canUseOfflineMode: false,
    canCustomizeInterface: false,
    supportLevel: 'basic',
    maxSupportTicketsPerMonth: null,
  };
}
```

---

## 📄 4. Exemplo de Página

### `app/admin/plans/page.tsx`

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { PlansTable } from '@/components/admin/plans/PlansTable';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import {
  getAllPlans,
  deletePlan,
  togglePlanStatus,
  duplicatePlan,
} from '@/services/admin/planService';
import type { Plan } from '@/types/admin/plan';

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<Plan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    router.push(`/admin/plans/${plan.id}/edit`);
  };

  const handleDelete = async (plan: Plan) => {
    try {
      await deletePlan(plan.id);
      setDeleteModal(null);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar plano');
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    try {
      await togglePlanStatus(plan.id, !plan.isActive);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status');
    }
  };

  const handleDuplicate = async (plan: Plan) => {
    try {
      await duplicatePlan(plan.id);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Erro ao duplicar plano');
    }
  };

  const activePlans = plans.filter((p) => p.isActive);
  const publicPlans = plans.filter((p) => p.isPublic);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>Erro: {error}</div>;
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Planos', icon: 'workspace_premium' },
        ]}
      />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
              Gestão de Planos
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Gerencie planos de assinatura
            </p>
          </div>
          <AdminButton
            icon="add"
            onClick={() => router.push('/admin/plans/new')}
          >
            Novo Plano
          </AdminButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AdminStats
            title="Total de Planos"
            value={plans.length}
            icon="workspace_premium"
            color="blue"
          />
          <AdminStats
            title="Planos Ativos"
            value={activePlans.length}
            icon="check_circle"
            color="green"
          />
          <AdminStats
            title="Planos Públicos"
            value={publicPlans.length}
            icon="public"
            color="purple"
          />
        </div>

        <AdminCard>
          <PlansTable
            plans={plans}
            onEdit={handleEdit}
            onDelete={(plan) => setDeleteModal(plan)}
            onToggleStatus={handleToggleStatus}
            onDuplicate={handleDuplicate}
          />
        </AdminCard>
      </div>

      {deleteModal && (
        <AdminModal
          isOpen={true}
          onClose={() => setDeleteModal(null)}
          title="Confirmar Exclusão"
        >
          <div className="space-y-4">
            <p>
              Tem certeza que deseja deletar o plano{' '}
              <strong>{deleteModal.name}</strong>?
            </p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-4">
              <AdminButton
                variant="ghost"
                onClick={() => setDeleteModal(null)}
              >
                Cancelar
              </AdminButton>
              <AdminButton
                color="red"
                onClick={() => handleDelete(deleteModal)}
              >
                Deletar
              </AdminButton>
            </div>
          </div>
        </AdminModal>
      )}
    </>
  );
}
```

---

## 🎨 5. Exemplo de Badge

### `components/admin/plans/PlanStatusBadge.tsx`

```typescript
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
      <AdminBadge color="green" icon="check_circle">
        Ativo
      </AdminBadge>
    );
  }

  return (
    <AdminBadge color="gray" icon="cancel">
      Inativo
    </AdminBadge>
  );
}
```

---

## 📊 6. Exemplo de Tipos

### `types/admin/plan.ts`

```typescript
export interface PlanLimits {
  // Questões
  maxQuestionsPerDay: number | null;
  maxQuestionListsPerDay: number | null;
  maxSimulatedExamsPerMonth: number | null;

  // FSRS/SRS
  maxFSRSCards: number | null;
  maxReviewsPerDay: number | null;

  // Flashcards
  maxFlashcardsCreated: number | null;
  maxFlashcardDecks: number | null;

  // IA Features
  maxPulseAIQueriesPerDay: number | null;
  maxQuestionExplanationsPerDay: number | null;
  maxContentGenerationPerMonth: number | null;

  // Funcionalidades Premium
  canExportData: boolean;
  canCreateCustomLists: boolean;
  canAccessAdvancedStatistics: boolean;
  canUseErrorNotebook: boolean;
  canAccessMentorship: boolean;
  canUseOfflineMode: boolean;
  canCustomizeInterface: boolean;

  // Suporte
  supportLevel: 'basic' | 'priority' | 'premium';
  maxSupportTicketsPerMonth: number | null;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
  isPublic: boolean;
  features: string[];
  interval: 'monthly' | 'yearly';
  limits: PlanLimits;
  badge?: string;
  highlight?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanPayload {
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  isActive?: boolean;
  isPublic?: boolean;
  features: string[];
  interval?: 'monthly' | 'yearly';
  limits?: PlanLimits;
  badge?: string;
  highlight?: boolean;
  metadata?: Record<string, any>;
}

export interface PlanListOptions {
  isActive?: boolean;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

Esses exemplos seguem os padrões já estabelecidos no projeto e podem ser adaptados para os outros componentes (cupons, pagamentos, etc).
