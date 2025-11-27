'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminInput } from '@/components/admin/ui/AdminInput';
import { UserPlansTable } from '@/components/admin/user-plans/UserPlansTable';
import { CancelUserPlanModal } from '@/components/admin/user-plans/CancelUserPlanModal';
import { RenewUserPlanModal } from '@/components/admin/user-plans/RenewUserPlanModal';
import type { UserPlan, UserPlanStatus, PaymentMethod } from '@/types/admin/plan';
import type { SortDirection } from '@/types/admin/common';
import {
  getAllUserPlans,
  cancelUserPlan,
  renewUserPlan,
} from '@/services/admin/userPlanService';

type SortField = 'user' | 'plan' | 'status' | 'startDate' | 'endDate' | 'createdAt';

export default function UserPlansPage() {
  const router = useRouter();
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserPlanStatus>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [cancelModal, setCancelModal] = useState<UserPlan | null>(null);
  const [renewModal, setRenewModal] = useState<UserPlan | null>(null);

  useEffect(() => {
    loadUserPlans();
  }, []);

  const loadUserPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllUserPlans();
      setUserPlans(result.items);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar planos de usuários');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedUserPlans = useMemo(() => {
    let filtered = userPlans.filter((userPlan) => {
      const matchesSearch =
        searchQuery === '' ||
        userPlan.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userPlan.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userPlan.plan?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || userPlan.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'user') {
        aVal = a.user?.name || a.userId;
        bVal = b.user?.name || b.userId;
      } else if (sortField === 'plan') {
        aVal = a.plan?.name || a.planId;
        bVal = b.plan?.name || b.planId;
      } else {
        aVal = a[sortField];
        bVal = b[sortField];
      }

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
  }, [userPlans, searchQuery, statusFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: userPlans.length,
      active: userPlans.filter((p) => p.status === 'ACTIVE').length,
      expired: userPlans.filter((p) => p.status === 'EXPIRED').length,
      expiringSoon: userPlans.filter((p) => {
        if (p.status !== 'ACTIVE') return false;
        const end = new Date(p.endDate);
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 && diff <= 7;
      }).length,
    };
  }, [userPlans]);

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(field as SortField);
    setSortDirection(direction);
  };

  const handleView = (userPlan: UserPlan) => {
    router.push(`/admin/user-plans/${userPlan.id}`);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelModal) return;
    await cancelUserPlan(cancelModal.id, { reason });
    setCancelModal(null);
    loadUserPlans();
  };

  const handleRenewConfirm = async (durationDays: number, paymentMethod: PaymentMethod) => {
    if (!renewModal) return;
    await renewUserPlan(renewModal.id, { durationDays, paymentMethod });
    setRenewModal(null);
    loadUserPlans();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-light dark:bg-surface-dark rounded-xl animate-pulse" />
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
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            Erro ao carregar planos de usuários
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">{error}</p>
          <AdminButton onClick={loadUserPlans} icon="refresh">Tentar novamente</AdminButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Admin', icon: 'dashboard', href: '/admin' }, { label: 'Planos de Usuários', icon: 'people' }]} />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">Planos de Usuários</h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Gerencie planos ativos e histórico de assinaturas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AdminStats title="Total de Planos" value={stats.total} icon="workspace_premium" color="blue" />
          <AdminStats title="Planos Ativos" value={stats.active} icon="check_circle" color="green" />
          <AdminStats title="Expirando em 7 dias" value={stats.expiringSoon} icon="warning" color="orange" />
          <AdminStats title="Planos Expirados" value={stats.expired} icon="event_busy" color="red" />
        </div>
        <AdminCard>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <AdminInput placeholder="Buscar por usuário ou plano..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon="search" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary">
                <option value="all">Todos os Status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="PENDING_PAYMENT">Aguardando Pagamento</option>
                <option value="EXPIRED">Expirados</option>
                <option value="CANCELLED">Cancelados</option>
                <option value="SUSPENDED">Suspensos</option>
                <option value="TRIAL">Trial</option>
              </select>
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Mostrando {filteredAndSortedUserPlans.length} de {userPlans.length} planos
            </div>
          </div>
        </AdminCard>
        <AdminCard>
          <UserPlansTable
            userPlans={filteredAndSortedUserPlans}
            onView={handleView}
            onCancel={(userPlan) => setCancelModal(userPlan)}
            onRenew={(userPlan) => setRenewModal(userPlan)}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        </AdminCard>
        {filteredAndSortedUserPlans.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">people</span>
            <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">Nenhum plano encontrado</h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              {searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Nenhum usuário possui plano ativo'}
            </p>
          </div>
        )}
      </div>
      {cancelModal && (
        <CancelUserPlanModal
          userPlan={cancelModal}
          isOpen={true}
          onClose={() => setCancelModal(null)}
          onConfirm={handleCancelConfirm}
        />
      )}
      {renewModal && (
        <RenewUserPlanModal
          userPlan={renewModal}
          isOpen={true}
          onClose={() => setRenewModal(null)}
          onConfirm={handleRenewConfirm}
        />
      )}
    </>
  );
}
