'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminInput } from '@/components/admin/ui/AdminInput';
import { PlansTable } from '@/components/admin/plans/PlansTable';
import { PlanCard } from '@/components/admin/plans/PlanCard';
import type { Plan } from '@/types/admin/plan';
import type { SortDirection } from '@/types/admin/common';
import {
  getAllPlans,
  deletePlan,
  togglePlanStatus,
  duplicatePlan,
} from '@/services/admin/planService';

type ViewMode = 'table' | 'grid';
type SortField = 'name' | 'price' | 'durationDays' | 'createdAt';

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

  // Estados de ordenação
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Estados de visualização
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Estados do modal de confirmação
  const [deleteModal, setDeleteModal] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);

  // Carregar planos
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllPlans();
      setPlans(result.items);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar e ordenar planos
  const filteredAndSortedPlans = useMemo(() => {
    let filtered = plans.filter((plan) => {
      const matchesSearch =
        searchQuery === '' ||
        plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && plan.isActive) ||
        (statusFilter === 'inactive' && !plan.isActive);

      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'public' && plan.isPublic) ||
        (visibilityFilter === 'private' && !plan.isPublic);

      return matchesSearch && matchesStatus && matchesVisibility;
    });

    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [plans, searchQuery, statusFilter, visibilityFilter, sortField, sortDirection]);

  // Estatísticas
  const stats = useMemo(
    () => ({
      total: plans.length,
      active: plans.filter((p) => p.isActive).length,
      inactive: plans.filter((p) => !p.isActive).length,
      public: plans.filter((p) => p.isPublic).length,
    }),
    [plans]
  );

  // Handlers
  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(field as SortField);
    setSortDirection(direction);
  };

  const handleEdit = (plan: Plan) => {
    router.push(`/admin/plans/${plan.id}/edit`);
  };

  const handleDelete = async (plan: Plan) => {
    setDeleteModal(plan);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;

    setDeletingPlan(true);
    try {
      await deletePlan(deleteModal.id);
      setDeleteModal(null);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar plano');
    } finally {
      setDeletingPlan(false);
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    try {
      await togglePlanStatus(plan.id, !plan.isActive);
      loadPlans();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do plano');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
            error
          </span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Erro ao carregar planos
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            {error}
          </p>
          <AdminButton onClick={loadPlans} icon="refresh">
            Tentar novamente
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
          { label: 'Planos', icon: 'workspace_premium' },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
              Gestão de Planos
            </h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
              Gerencie planos de assinatura da plataforma
            </p>
          </div>
          <AdminButton icon="add" onClick={() => router.push('/admin/plans/new')}>
            Novo Plano
          </AdminButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AdminStats
            title="Total de Planos"
            value={stats.total}
            icon="workspace_premium"
            color="blue"
          />
          <AdminStats
            title="Planos Ativos"
            value={stats.active}
            icon="check_circle"
            color="green"
          />
          <AdminStats
            title="Planos Inativos"
            value={stats.inactive}
            icon="cancel"
            color="red"
          />
          <AdminStats
            title="Planos Públicos"
            value={stats.public}
            icon="public"
            color="purple"
          />
        </div>

        {/* Filters */}
        <AdminCard>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <AdminInput
                  placeholder="Buscar planos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon="search"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>

                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as any)}
                  className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
                >
                  <option value="all">Todas Visibilidades</option>
                  <option value="public">Públicos</option>
                  <option value="private">Privados</option>
                </select>

                <div className="flex gap-1 border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-2 transition-colors ${
                      viewMode === 'table'
                        ? 'bg-primary text-white'
                        : 'bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title="Visualização em tabela"
                  >
                    <span className="material-symbols-outlined">table_rows</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary text-white'
                        : 'bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title="Visualização em grade"
                  >
                    <span className="material-symbols-outlined">grid_view</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Mostrando {filteredAndSortedPlans.length} de {plans.length} planos
            </div>
          </div>
        </AdminCard>

        {/* Content */}
        {viewMode === 'table' ? (
          <AdminCard>
            <PlansTable
              plans={filteredAndSortedPlans}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onDuplicate={handleDuplicate}
              onSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
            />
          </AdminCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}

        {filteredAndSortedPlans.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
              workspace_premium
            </span>
            <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              Nenhum plano encontrado
            </h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
              {searchQuery || statusFilter !== 'all' || visibilityFilter !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Comece criando um novo plano'}
            </p>
            {!searchQuery && statusFilter === 'all' && visibilityFilter === 'all' && (
              <AdminButton icon="add" onClick={() => router.push('/admin/plans/new')}>
                Criar Primeiro Plano
              </AdminButton>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <AdminModal
          isOpen={true}
          onClose={() => setDeleteModal(null)}
          title="Confirmar Exclusão"
        >
          <div className="space-y-4">
            <p className="text-text-light-primary dark:text-text-dark-primary">
              Tem certeza que deseja deletar o plano{' '}
              <strong>{deleteModal.name}</strong>?
            </p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Esta ação não pode ser desfeita. Usuários com este plano ativo não serão afetados.
            </p>
            <div className="flex justify-end gap-4">
              <AdminButton
                variant="outline"
                onClick={() => setDeleteModal(null)}
                disabled={deletingPlan}
              >
                Cancelar
              </AdminButton>
              <AdminButton
                variant="danger"
                onClick={confirmDelete}
                loading={deletingPlan}
                icon="delete"
              >
                Deletar Plano
              </AdminButton>
            </div>
          </div>
        </AdminModal>
      )}
    </>
  );
}
