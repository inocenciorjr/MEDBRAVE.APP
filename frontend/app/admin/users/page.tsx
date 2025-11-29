'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import UserFilters from '@/components/admin/users/UserFilters';
import UserTable from '@/components/admin/users/UserTable';
import UserModal from '@/components/admin/users/UserModal';
import BulkActionsBar from '@/components/admin/users/BulkActionsBar';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AddUserPlanModal } from '@/components/admin/user-plans/AddUserPlanModal';
import type { User, UserFilters as UserFiltersType, getUserStatus, matchesStatusFilter } from '@/types/admin/user';
import { getUserStatus as getStatus, matchesStatusFilter as matchesStatus } from '@/types/admin/user';
import { useToast } from '@/lib/contexts/ToastContext';
import { 
  getUsers, 
  updateUser, 
  deleteUser, 
  suspendUser,
  activateUser,
  banUser,
  bulkUpdateUsers,
  getUserStats,
  sendEmailToUser,
} from '@/services/admin/userService';
import { createUserPlan } from '@/services/admin/userPlanService';

type SortField = 'display_name' | 'email' | 'role' | 'created_at' | 'last_login_at';
type SortDirection = 'asc' | 'desc';

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtro
  const [filters, setFilters] = useState<UserFiltersType>({
    search: '',
    role: 'ALL',
    status: 'ALL'
  });
  
  // Estados de modais
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [selectedUserForPlan, setSelectedUserForPlan] = useState<{ id: string; email: string } | null>(null);
  
  // Estados de ordenação
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados de seleção
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Estados do modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Carregar usuários
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar e ordenar usuários
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = 
        filters.search === '' ||
        user.display_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesRole = filters.role === 'ALL' || user.role === filters.role;
      const matchesStatusValue = matchesStatus(user, filters.status);
      
      return matchesSearch && matchesRole && matchesStatusValue;
    });

    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof User];
      let bVal: any = b[sortField as keyof User];
      
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
  }, [users, filters, sortField, sortDirection]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => !u.is_blocked && !u.is_banned).length,
    students: users.filter(u => u.role === 'STUDENT').length,
    suspended: users.filter(u => u.is_blocked && !u.is_banned).length
  }), [users]);

  // Handlers
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field as SortField);
    setSortDirection(direction);
  };

  const handleFilterChange = (newFilters: UserFiltersType) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      role: 'ALL',
      status: 'ALL'
    });
  };

  const handleSuspend = async (userId: string, reason: string, duration?: number) => {
    try {
      await suspendUser(userId, { reason, duration });
      toast.success('Usuário suspenso com sucesso');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao suspender usuário');
    }
  };

  const handleActivate = async (userId: string) => {
    try {
      await activateUser(userId);
      toast.success('Usuário ativado com sucesso');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ativar usuário');
    }
  };

  const handleBan = async (userId: string, reason: string) => {
    try {
      await banUser(userId, { reason });
      toast.success('Usuário banido com sucesso');
      await loadUsers();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao banir usuário');
    }
  };

  const handleSendEmail = async (userId: string, subject: string, message: string) => {
    try {
      await sendEmailToUser(userId, { subject, message });
      toast.success('Email enviado com sucesso');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar email');
    }
  };

  const handleAddPlan = (userId: string, userEmail: string) => {
    setSelectedUserForPlan({ id: userId, email: userEmail });
    setShowAddPlanModal(true);
  };

  const handleConfirmAddPlan = async (data: any) => {
    try {
      await createUserPlan(data);
      toast.success('Plano adicionado com sucesso!');
      setShowAddPlanModal(false);
      setSelectedUserForPlan(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar plano');
      throw err;
    }
  };

  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleSaveUser = async (userId: string, updates: Partial<User>) => {
    try {
      await updateUser(userId, updates);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar usuário');
      throw err;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const reason = prompt('Motivo da exclusão:');
    if (!reason) return;
    
    if (!confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) return;
    
    try {
      await deleteUser(userId, reason);
      toast.success('Usuário deletado com sucesso');
      await loadUsers();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao deletar usuário');
      throw err;
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      if (action === 'activate') {
        await handleActivate(userId);
      }
      // Suspend action now opens modal from UserTable
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar ação');
    }
  };

  const handleBulkActivate = async () => {
    if (!confirm(`Ativar ${selectedUsers.size} usuários?`)) return;
    
    try {
      await bulkUpdateUsers({ userIds: Array.from(selectedUsers), updates: { status: 'ACTIVE' } });
      setSelectedUsers(new Set());
      toast.success('Usuários ativados com sucesso');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ativar usuários');
    }
  };

  const handleBulkSuspend = async () => {
    if (!confirm(`Suspender ${selectedUsers.size} usuários?`)) return;
    
    try {
      await bulkUpdateUsers({ userIds: Array.from(selectedUsers), updates: { status: 'SUSPENDED' } });
      setSelectedUsers(new Set());
      toast.success('Usuários suspensos com sucesso');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao suspender usuários');
    }
  };

  const handleBulkDelete = async () => {
    const reason = prompt('Motivo da exclusão em lote:');
    if (!reason) return;
    
    if (!confirm(`Deletar ${selectedUsers.size} usuários? Esta ação não pode ser desfeita.`)) return;
    
    try {
      await Promise.all(Array.from(selectedUsers).map(id => deleteUser(id, reason)));
      setSelectedUsers(new Set());
      toast.success('Usuários deletados com sucesso');
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao deletar usuários');
    }
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Admin', icon: 'dashboard', href: '/admin' },
          { label: 'Usuários', icon: 'people', href: '/admin/users' }
        ]}
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 font-display">
            Gestão de Usuários
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Gerencie usuários, roles e permissões da plataforma
          </p>
        </div>
        <AdminButton onClick={loadUsers} disabled={loading}>
          <span className="material-symbols-outlined text-sm mr-2">refresh</span>
          Recarregar
        </AdminButton>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStats
          title="Total de Usuários"
          value={stats.total}
          icon="people"
          color="blue"
        />
        <AdminStats
          title="Usuários Ativos"
          value={stats.active}
          icon="check_circle"
          color="green"
        />
        <AdminStats
          title="Estudantes"
          value={stats.students}
          icon="school"
          color="purple"
        />
        <AdminStats
          title="Suspensos"
          value={stats.suspended}
          icon="block"
          color="red"
        />
      </div>

      {/* Filtros */}
      <UserFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedUsers.size}
        onActivate={handleBulkActivate}
        onSuspend={handleBulkSuspend}
        onDelete={handleBulkDelete}
        onCancel={() => setSelectedUsers(new Set())}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
            <span className="text-red-700 dark:text-red-400 font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            Lista de Usuários ({filteredAndSortedUsers.length})
          </h2>
        </div>
        
        <UserTable
          users={filteredAndSortedUsers}
          loading={loading}
          selectedUsers={selectedUsers}
          onSelectionChange={setSelectedUsers}
          onRowClick={handleRowClick}
          onSort={handleSort}
          onUserAction={handleUserAction}
        />
      </div>

      {/* Modal */}
      <UserModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSave={handleSaveUser}
        onDelete={handleDeleteUser}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        onBan={handleBan}
        onSendEmail={handleSendEmail}
        onAddPlan={(userId) => {
          const user = users.find(u => u.id === userId);
          if (user) {
            handleAddPlan(userId, user.email);
          }
        }}
      />

      {/* Add Plan Modal */}
      {selectedUserForPlan && (
        <AddUserPlanModal
          isOpen={showAddPlanModal}
          onClose={() => {
            setShowAddPlanModal(false);
            setSelectedUserForPlan(null);
          }}
          onConfirm={handleConfirmAddPlan}
          preselectedUserId={selectedUserForPlan.id}
          preselectedUserEmail={selectedUserForPlan.email}
        />
      )}
      </div>
    </>
  );
}
