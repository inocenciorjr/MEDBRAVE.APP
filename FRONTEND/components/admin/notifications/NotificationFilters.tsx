'use client';

import React, { useState, useEffect } from 'react';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { SearchInput } from '@/components/flashcards/SearchInput';

interface NotificationFiltersProps {
  onFilterChange: (filters: NotificationFilterValues) => void;
  onClear: () => void;
}

export interface NotificationFilterValues {
  search: string;
  type: string;
  priority: string;
  read: string;
  startDate: string;
  endDate: string;
}

const NotificationFilters: React.FC<NotificationFiltersProps> = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState<NotificationFilterValues>({
    search: '',
    type: 'all',
    priority: 'all',
    read: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleChange = (field: keyof NotificationFilterValues, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setFilters({
      search: '',
      type: 'all',
      priority: 'all',
      read: 'all',
      startDate: '',
      endDate: ''
    });
    onClear();
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm p-6 border border-border-light dark:border-border-dark">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <SearchInput
          label="Buscar"
          placeholder="Título, mensagem..."
          value={filters.search}
          onChange={(value) => handleChange('search', value)}
          fullWidth
        />

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">category</span>
            Tipo
          </label>
          <AdminSelect
            value={filters.type}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('type', e.target.value)}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'GENERAL', label: 'Geral' },
              { value: 'SYSTEM', label: 'Sistema' },
              { value: 'PAYMENT', label: 'Pagamento' },
              { value: 'EXAM', label: 'Exame' },
              { value: 'ALERT', label: 'Alerta' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">priority_high</span>
            Prioridade
          </label>
          <AdminSelect
            value={filters.priority}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('priority', e.target.value)}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'URGENT', label: 'Urgente' },
              { value: 'HIGH', label: 'Alta' },
              { value: 'NORMAL', label: 'Normal' },
              { value: 'LOW', label: 'Baixa' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">mark_email_read</span>
            Status
          </label>
          <AdminSelect
            value={filters.read}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('read', e.target.value)}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'false', label: 'Não lidas' },
              { value: 'true', label: 'Lidas' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">calendar_today</span>
            Data Inicial
          </label>
          <AdminInput
            type="date"
            value={filters.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('startDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">event</span>
            Data Final
          </label>
          <AdminInput
            type="date"
            value={filters.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('endDate', e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <AdminButton variant="outline" onClick={handleClear}>
          <span className="material-symbols-outlined text-sm mr-2">delete</span>
          Limpar Filtros
        </AdminButton>
      </div>
    </div>
  );
};

export default NotificationFilters;
