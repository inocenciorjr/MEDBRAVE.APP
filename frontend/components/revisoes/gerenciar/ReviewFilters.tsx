'use client';

import Dropdown from '@/components/ui/Dropdown';
import { SearchInput } from '@/components/flashcards/SearchInput';

interface ReviewFiltersProps {
  filters: {
    search: string;
    type: string;
    dateRange: string;
    specificDate?: string;
  };
  onFilterChange: (filters: any) => void;
}

export default function ReviewFilters({ filters, onFilterChange }: ReviewFiltersProps) {
  const handleChange = (key: string, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const typeOptions = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Caderno de Erros', value: 'ERROR_NOTEBOOK' },
    { label: 'Flashcards', value: 'FLASHCARD' },
    { label: 'Questões', value: 'QUESTION' },
  ];

  const dateRangeOptions = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Atrasadas', value: 'Atrasadas' },
    { label: 'Hoje', value: 'Hoje' },
    { label: 'Data Específica', value: 'Específica' },
  ];

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 sm:p-5 md:p-6 rounded-xl shadow-xl dark:shadow-dark-xl hover:shadow-2xl dark:hover:shadow-dark-2xl border border-border-light dark:border-border-dark mb-4 sm:mb-5 md:mb-6 transition-[box-shadow] duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <SearchInput
          label="Buscar"
          value={filters.search}
          onChange={(value) => handleChange('search', value)}
          placeholder="Buscar revisões..."
          fullWidth
        />

        <Dropdown
          label="Tipo"
          options={typeOptions}
          value={filters.type}
          onChange={(value) => handleChange('type', value)}
          fullWidth
        />

        <div>
          <Dropdown
            label="Data"
            options={dateRangeOptions}
            value={filters.dateRange}
            onChange={(value) => handleChange('dateRange', value)}
            fullWidth
          />
          
          {filters.dateRange === 'Específica' && (
            <input
              type="date"
              value={filters.specificDate || ''}
              onChange={(e) => handleChange('specificDate', e.target.value)}
              className="mt-2 w-full px-4 py-3 rounded-xl border-2 border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all"
            />
          )}
        </div>
      </div>
    </div>
  );
}
