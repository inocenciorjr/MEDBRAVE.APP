'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AdminStats } from '@/components/admin/ui/AdminStats';
import UserFilters, { UserFilterValues } from '@/components/admin/users/UserFilters';
import UserTable from '@/components/admin/users/UserTable';
import UserModal from '@/components/admin/users/UserModal';
import BulkActionsBar from '@/components/admin/users/BulkActionsBar';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { User, UserStatus } from '@/types/admin/user';
import { useToast } from '@/lib/contexts/ToastContext';
import { 
  getUsers, 
  updateUser, 
  deleteUser, 
  bulkUpdateUsers 
} from '@/services/admin/userService';

type SortField = 'displayName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
type SortDirection = 'asc' | 'desc';

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de filtro
  const [filters, setFilters] = useState<UserFilterValues>({
    search: '',
    role: 'ALL',
    status: 'ALL'
  });
  
  // Estados de ordenação
  const [sortField, setSortField] = useState<SortField>('createdAt');
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
        user.displayName.toLowerCase().includes(filters.search.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesRole = filters.role === 'ALL' || user.role === filters.role;
      const matchesStatus = filters.status === 'ALL' || user.status === filters.status;
      
      return matchesSearch && matchesRole && matchesStatus;
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
  }, [users, filters, sortField, sortDirection]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'ACTIVE').length,
    students: users.filter(u => u.role === 'STUDENT').length,
    suspended: users.filter(u => u.status === 'SUSPENDED').length
  }), [users]);

  // Handlers
  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field as SortField);
    setSortDirection(direction);
  };

  const handleFilterChange = (newFilters: UserFilterValues) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      role: 'ALL',
      status: 'ALL'
    });
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
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao deletar usuário');
      throw err;
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      if (action === 'suspend') {
        await updateUser(userId, { status: UserStatus.SUSPENDED });
      } else if (action === 'activate') {
        await updateUser(userId, { status: UserStatus.ACTIVE });
      }
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar ação');
    }
  };

  const handleBulkActivate = async () => {
    if (!confirm(`Ativar ${selectedUsers.size} usuários?`)) return;
    
    try {
      await bulkUpdateUsers(Array.from(selectedUsers), { status: UserStatus.ACTIVE });
      setSelectedUsers(new Set());
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ativar usuários');
    }
  };

  const handleBulkSuspend = async () => {
    if (!confirm(`Suspender ${selectedUsers.size} usuários?`)) return;
    
    try {
      await bulkUpdateUsers(Array.from(selectedUsers), { status: UserStatus.SUSPENDED });
      setSelectedUsers(new Set());
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao suspender usuários');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deletar ${selectedUsers.size} usuários? Esta ação não pode ser desfeita.`)) return;
    
    try {
      await Promise.all(Array.from(selectedUsers).map(id => deleteUser(id)));
      setSelectedUsers(new Set());
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
      />
      </div>
    </>
  );
}
