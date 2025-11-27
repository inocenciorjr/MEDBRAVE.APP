'use client';

import { ExamFilters as ExamFiltersType } from '@/types/official-exams';
import Dropdown from '@/components/ui/Dropdown';
import { SearchInput } from '@/components/flashcards/SearchInput';

interface ExamFiltersProps {
  filters: ExamFiltersType;
  onFilterChange: (filters: ExamFiltersType) => void;
  regions: string[];
  institutions: string[];
  examTypes: string[];
}

export default function ExamFilters({
  filters,
  onFilterChange,
  regions,
  institutions,
  examTypes,
}: ExamFiltersProps) {
  const handleChange = (key: keyof ExamFiltersType, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-xl shadow-xl dark:shadow-dark-xl hover:shadow-2xl dark:hover:shadow-dark-2xl border border-border-light dark:border-border-dark mb-6 transition-all duration-300">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <SearchInput
          label="Buscar"
          value={filters.search}
          onChange={(value) => handleChange('search', value)}
          placeholder="Buscar provas, instituições..."
          fullWidth
        />

        {/* Type Filter */}
        <Dropdown
          label="Tipo"
          options={examTypes}
          value={filters.type}
          onChange={(value) => handleChange('type', value)}
          fullWidth
        />

        {/* Region Filter */}
        <Dropdown
          label="Estado"
          options={regions}
          value={filters.region}
          onChange={(value) => handleChange('region', value)}
          fullWidth
        />

        {/* Institution Filter */}
        <Dropdown
          label="Instituição"
          options={institutions}
          value={filters.institution}
          onChange={(value) => handleChange('institution', value)}
          fullWidth
        />
      </div>
    </div>
  );
}
