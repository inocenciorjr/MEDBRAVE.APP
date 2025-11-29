'use client';

import React from 'react';
import type { User, UserSortField } from '@/types/admin/user';
import type { SortDirection } from '@/types/admin/common';
import Checkbox from '@/components/ui/Checkbox';

interface UserTableProps {
  users: User[];
  loading: boolean;
  selectedUsers: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  onRowClick: (user: User) => void;
  onSort: (field: string, direction: SortDirection) => void;
  onUserAction: (userId: string, action: string) => void;
}

export default function UserTable({
  users,
  loading,
  selectedUsers,
  onSelectionChange,
  onRowClick,
  onSort,
  onUserAction,
}: UserTableProps) {
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(users.map(u => u.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (userId: string, checked: boolean) => {
    const newSelection = new Set(selectedUsers);
    if (checked) {
      newSelection.add(userId);
    } else {
      newSelection.delete(userId);
    }
    onSelectionChange(newSelection);
  };

  const getStatusBadge = (user: User) => {
    if (user.is_banned) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Banido</span>;
    }
    if (user.is_blocked) {
      return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">Suspenso</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Ativo</span>;
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      ADMIN: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      MODERATOR: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      STUDENT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    };
    return <span className={`px-2 py-1 text-xs rounded-full ${colors[role as keyof typeof colors] || colors.STUDENT}`}>{role}</span>;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-surface-light dark:bg-surface-dark rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-border-light dark:border-border-dark">
          <tr>
            <th className="px-4 py-3 text-left">
              <Checkbox
                checked={selectedUsers.size === users.length && users.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Usuário
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Role
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Cadastro
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {users.map((user) => (
            <tr
              key={user.id}
              className="hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark/20 cursor-pointer transition-colors"
              onClick={() => onRowClick(user)}
            >
              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedUsers.has(user.id)}
                  onChange={(e) => handleSelectOne(user.id, e.target.checked)}
                />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {user.photo_url ? (
                    <img src={user.photo_url} alt={user.display_name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">{user.display_name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-text-light-primary dark:text-text-dark-primary">{user.display_name}</div>
                    <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">{getRoleBadge(user.role)}</td>
              <td className="px-4 py-4">{getStatusBadge(user)}</td>
              <td className="px-4 py-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  {!user.is_blocked && !user.is_banned && (
                    <button
                      onClick={() => onUserAction(user.id, 'suspend')}
                      className="p-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400 transition-colors"
                      title="Suspender"
                    >
                      <span className="material-symbols-outlined text-lg">block</span>
                    </button>
                  )}
                  {user.is_blocked && !user.is_banned && (
                    <button
                      onClick={() => onUserAction(user.id, 'activate')}
                      className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors"
                      title="Ativar"
                    >
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
