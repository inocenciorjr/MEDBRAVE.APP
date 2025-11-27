'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminCard } from '@/components/admin/ui/AdminCard';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminInput } from '@/components/admin/ui/AdminInput';
import { CouponsTable } from '@/components/admin/coupons/CouponsTable';
import { CouponCard } from '@/components/admin/coupons/CouponCard';
import type { Coupon } from '@/types/admin/coupon';
import type { SortDirection } from '@/types/admin/common';
import {
  getAllCoupons,
  deleteCoupon,
  toggleCouponStatus,
} from '@/services/admin/couponService';

type ViewMode = 'table' | 'grid';
type SortField = 'code' | 'discountValue' | 'timesUsed' | 'expirationDate' | 'createdAt';

export default function CouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [deleteModal, setDeleteModal] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState(false);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCoupons();
      setCoupons(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCoupons = useMemo(() => {
    const now = new Date();
    let filtered = coupons.filter((coupon) => {
      const matchesSearch =
        searchQuery === '' ||
        coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coupon.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const isExpired = coupon.expirationDate && new Date(coupon.expirationDate) < now;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && coupon.isActive && !isExpired) ||
        (statusFilter === 'inactive' && !coupon.isActive) ||
        (statusFilter === 'expired' && isExpired);
      return matchesSearch && matchesStatus;
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
  }, [coupons, searchQuery, statusFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: coupons.length,
      active: coupons.filter((c) => c.isActive).length,
      used: coupons.reduce((sum, c) => sum + c.timesUsed, 0),
      expired: coupons.filter((c) => c.expirationDate && new Date(c.expirationDate) < now).length,
    };
  }, [coupons]);

  const handleSort = (field: string, direction: SortDirection) => {
    setSortField(field as SortField);
    setSortDirection(direction);
  };

  const handleEdit = (coupon: Coupon) => {
    router.push(`/admin/coupons/${coupon.id}/edit`);
  };

  const handleDelete = async (coupon: Coupon) => {
    setDeleteModal(coupon);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setDeletingCoupon(true);
    try {
      await deleteCoupon(deleteModal.id);
      setDeleteModal(null);
      loadCoupons();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar cupom');
    } finally {
      setDeletingCoupon(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      await toggleCouponStatus(coupon.id, !coupon.isActive);
      loadCoupons();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do cupom');
    }
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
            Erro ao carregar cupons
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">{error}</p>
          <AdminButton onClick={loadCoupons} icon="refresh">Tentar novamente</AdminButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Admin', icon: 'dashboard', href: '/admin' }, { label: 'Cupons', icon: 'local_offer' }]} />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">Gestão de Cupons</h1>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">Gerencie cupons de desconto da plataforma</p>
          </div>
          <AdminButton icon="add" onClick={() => router.push('/admin/coupons/new')}>Novo Cupom</AdminButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <AdminStats title="Total de Cupons" value={stats.total} icon="local_offer" color="blue" />
          <AdminStats title="Cupons Ativos" value={stats.active} icon="check_circle" color="green" />
          <AdminStats title="Total de Usos" value={stats.used} icon="redeem" color="purple" />
          <AdminStats title="Cupons Expirados" value={stats.expired} icon="event_busy" color="red" />
        </div>
        <AdminCard>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <AdminInput placeholder="Buscar cupons..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} icon="search" />
              </div>
              <div className="flex gap-2">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary">
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                  <option value="expired">Expirados</option>
                </select>
                <div className="flex gap-1 border border-border-light dark:border-border-dark rounded-xl overflow-hidden">
                  <button onClick={() => setViewMode('table')} className={`px-3 py-2 transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Visualização em tabela">
                    <span className="material-symbols-outlined">table_rows</span>
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`px-3 py-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-gray-800'}`} title="Visualização em grade">
                    <span className="material-symbols-outlined">grid_view</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Mostrando {filteredAndSortedCoupons.length} de {coupons.length} cupons
            </div>
          </div>
        </AdminCard>
        {viewMode === 'table' ? (
          <AdminCard>
            <CouponsTable coupons={filteredAndSortedCoupons} onEdit={handleEdit} onDelete={handleDelete} onToggleStatus={handleToggleStatus} onSort={handleSort} sortField={sortField} sortDirection={sortDirection} />
          </AdminCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} onEdit={handleEdit} onDelete={handleDelete} onToggleStatus={handleToggleStatus} />
            ))}
          </div>
        )}
        {filteredAndSortedCoupons.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">local_offer</span>
            <h3 className="text-lg font-medium text-text-light-primary dark:text-text-dark-primary mb-2">Nenhum cupom encontrado</h3>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">{searchQuery || statusFilter !== 'all' ? 'Tente ajustar os filtros' : 'Comece criando um novo cupom'}</p>
            {!searchQuery && statusFilter === 'all' && (
              <AdminButton icon="add" onClick={() => router.push('/admin/coupons/new')}>Criar Primeiro Cupom</AdminButton>
            )}
          </div>
        )}
      </div>
      {deleteModal && (
        <AdminModal isOpen={true} onClose={() => setDeleteModal(null)} title="Confirmar Exclusão">
          <div className="space-y-4">
            <p className="text-text-light-primary dark:text-text-dark-primary">
              Tem certeza que deseja deletar o cupom <strong className="font-mono">{deleteModal.code}</strong>?
            </p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              Esta ação não pode ser desfeita. O cupom foi usado {deleteModal.timesUsed} vezes.
            </p>
            <div className="flex justify-end gap-4">
              <AdminButton variant="outline" onClick={() => setDeleteModal(null)} disabled={deletingCoupon}>Cancelar</AdminButton>
              <AdminButton variant="danger" onClick={confirmDelete} loading={deletingCoupon} icon="delete">Deletar Cupom</AdminButton>
            </div>
          </div>
        </AdminModal>
      )}
    </>
  );
}
