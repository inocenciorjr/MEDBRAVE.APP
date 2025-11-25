'use client';

import React, { useState, useEffect } from 'react';
import { AdminInput, AdminSelect } from '../ui/AdminInput';
import { AdminButton } from '../ui/AdminButton';
import { SearchInput } from '@/components/flashcards/SearchInput';

interface UserFiltersProps {
  onFilterChange: (filters: UserFilterValues) => void;
  onClear: () => void;
}

export interface UserFilterValues {
  search: string;
  role: string;
  status: string;
}

const UserFilters: React.FC<UserFiltersProps> = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState<UserFilterValues>({
    search: '',
    role: 'ALL',
    status: 'ALL'
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleChange = (field: keyof UserFilterValues, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setFilters({
      search: '',
      role: 'ALL',
      status: 'ALL'
    });
    onClear();
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm p-6 border border-border-light dark:border-border-dark">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SearchInput
          label="Buscar"
          placeholder="Nome ou email..."
          value={filters.search}
          onChange={(value) => handleChange('search', value)}
          fullWidth
        />

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">person</span>
            Filtrar por Role
          </label>
          <AdminSelect
            value={filters.role}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('role', e.target.value)}
            options={[
              { value: 'ALL', label: 'Todos os roles' },
              { value: 'ADMIN', label: 'Administrador' },
              { value: 'TEACHER', label: 'Professor' },
              { value: 'MENTOR', label: 'Mentor' },
              { value: 'STUDENT', label: 'Estudante' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">bar_chart</span>
            Filtrar por Status
          </label>
          <AdminSelect
            value={filters.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('status', e.target.value)}
            options={[
              { value: 'ALL', label: 'Todos os status' },
              { value: 'ACTIVE', label: 'Ativo' },
              { value: 'INACTIVE', label: 'Inativo' },
              { value: 'SUSPENDED', label: 'Suspenso' },
              { value: 'PENDING_EMAIL_VERIFICATION', label: 'Aguardando Verificação' }
            ]}
          />
        </div>

        <div className="flex items-end">
          <AdminButton
            variant="outline"
            onClick={handleClear}
            className="w-full"
          >
            <span className="material-symbols-outlined text-sm mr-2">delete</span>
            Limpar Filtros
          </AdminButton>
        </div>
      </div>
    </div>
  );
};

export default UserFilters;
