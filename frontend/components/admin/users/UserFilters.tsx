'use client';

import React from 'react';
import { AdminInput } from '../ui/AdminInput';
import { AdminButton } from '../ui/AdminButton';
import type { UserFilters as UserFiltersType } from '@/types/admin/user';

interface UserFiltersProps {
  filters: UserFiltersType;
  onFilterChange: (filters: UserFiltersType) => void;
  onClear: () => void;
}

export default function UserFilters({ filters, onFilterChange, onClear }: UserFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, role: e.target.value as any });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, status: e.target.value as any });
  };

  const hasActiveFilters = 
    filters.search !== '' || 
    filters.role !== 'ALL' || 
    filters.status !== 'ALL';

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <AdminInput
              placeholder="Buscar por nome ou email..."
              value={filters.search}
              onChange={handleSearchChange}
              icon="search"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={handleRoleChange}
            className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          >
            <option value="ALL">Todas as Roles</option>
            <option value="STUDENT">Estudantes</option>
            <option value="ADMIN">Administradores</option>
            <option value="MODERATOR">Moderadores</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={handleStatusChange}
            className="px-4 py-2 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="SUSPENDED">Suspensos</option>
            <option value="BANNED">Banidos</option>
          </select>

          {/* Clear Button */}
          {hasActiveFilters && (
            <AdminButton
              variant="outline"
              onClick={onClear}
              icon="clear"
            >
              Limpar
            </AdminButton>
          )}
        </div>
      </div>
    </div>
  );
}
