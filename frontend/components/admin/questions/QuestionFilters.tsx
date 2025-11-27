'use client';

import React, { useState, useEffect } from 'react';
import { AdminInput, AdminSelect } from '@/components/admin/ui/AdminInput';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { SearchInput } from '@/components/flashcards/SearchInput';

interface QuestionFiltersProps {
  onFilterChange: (filters: QuestionFilterValues) => void;
  onClear: () => void;
}

export interface QuestionFilterValues {
  search: string;
  status: string;
  difficulty: string;
}

const QuestionFilters: React.FC<QuestionFiltersProps> = ({ onFilterChange, onClear }) => {
  const [filters, setFilters] = useState<QuestionFilterValues>({
    search: '',
    status: 'all',
    difficulty: 'all'
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, onFilterChange]);

  const handleChange = (field: keyof QuestionFilterValues, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setFilters({
      search: '',
      status: 'all',
      difficulty: 'all'
    });
    onClear();
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm p-6 border border-border-light dark:border-border-dark">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SearchInput
          label="Buscar"
          placeholder="Enunciado ou tags..."
          value={filters.search}
          onChange={(value) => handleChange('search', value)}
          fullWidth
        />

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">check_circle</span>
            Filtrar por Status
          </label>
          <AdminSelect
            value={filters.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('status', e.target.value)}
            options={[
              { value: 'all', label: 'Todos os status' },
              { value: 'PUBLISHED', label: 'Publicado' },
              { value: 'DRAFT', label: 'Rascunho' },
              { value: 'ARCHIVED', label: 'Arquivado' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            <span className="material-symbols-outlined text-sm align-middle mr-1">speed</span>
            Filtrar por Dificuldade
          </label>
          <AdminSelect
            value={filters.difficulty}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('difficulty', e.target.value)}
            options={[
              { value: 'all', label: 'Todas as dificuldades' },
              { value: 'EASY', label: 'Fácil' },
              { value: 'MEDIUM', label: 'Médio' },
              { value: 'HARD', label: 'Difícil' }
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

export default QuestionFilters;
