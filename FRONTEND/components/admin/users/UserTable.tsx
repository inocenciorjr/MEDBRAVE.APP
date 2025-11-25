'use client';

import React from 'react';
import { AdminTable, ColumnDef } from '../ui/AdminTable';
import { AdminBadge } from '../ui/AdminBadge';
import { User } from '@/types/admin/user';

interface UserTableProps {
  users: User[];
  loading?: boolean;
  selectedUsers: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onRowClick: (user: User) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onUserAction: (userId: string, action: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  selectedUsers,
  onSelectionChange,
  onRowClick,
  onSort,
  onUserAction
}) => {
  const getRoleBadgeVariant = (role: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'TEACHER': return 'info';
      case 'MENTOR': return 'warning';
      case 'STUDENT': return 'success';
      default: return 'neutral';
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'neutral';
      case 'SUSPENDED': return 'error';
      case 'PENDING_EMAIL_VERIFICATION': return 'warning';
      default: return 'neutral';
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      key: 'user',
      label: 'Usuário',
      sortable: true,
      render: (_, user) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {user.photoURL ? (
              <img 
                className="h-10 w-10 rounded-full object-cover" 
                src={user.photoURL} 
                alt={user.displayName}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-medium text-sm">
                  {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {user.displayName}
            </div>
            <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              ID: {user.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (_, user) => (
        <div>
          <div className="text-sm text-text-light-primary dark:text-text-dark-primary">
            {user.email}
          </div>
          <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            {user.emailVerified ? (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-green-600">check_circle</span>
                Verificado
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-orange-600">warning</span>
                Não verificado
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (_, user) => (
        <AdminBadge 
          label={user.role}
          variant={getRoleBadgeVariant(user.role)} 
          size="sm"
        />
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_, user) => (
        <AdminBadge 
          label={user.status}
          variant={getStatusBadgeVariant(user.status)} 
          size="sm"
        />
      )
    },
    {
      key: 'lastLoginAt',
      label: 'Último Login',
      sortable: true,
      render: (_, user) => (
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR') : 'Nunca'}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, user) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(user);
            }}
            className="text-primary hover:text-primary-hover text-sm font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            Ver
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUserAction(user.id, user.status === 'ACTIVE' ? 'suspend' : 'activate');
            }}
            className={`text-sm font-medium flex items-center gap-1 ${
              user.status === 'ACTIVE' 
                ? 'text-red-600 hover:text-red-700' 
                : 'text-green-600 hover:text-green-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {user.status === 'ACTIVE' ? 'block' : 'check_circle'}
            </span>
            {user.status === 'ACTIVE' ? 'Suspender' : 'Ativar'}
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminTable
      data={users}
      columns={columns}
      loading={loading}
      onSort={onSort}
      onRowClick={onRowClick}
      selectable
      selectedRows={selectedUsers}
      onSelectionChange={onSelectionChange}
    />
  );
};

export default UserTable;
