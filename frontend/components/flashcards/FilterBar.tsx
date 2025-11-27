'use client';

import { useState } from 'react';

interface FilterBarProps {
  onFilter: (filters: {
    search: string;
    area: string;
    priority: string;
  }) => void;
}

export function FilterBar({ onFilter }: FilterBarProps) {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState('');

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onFilter({ search: value, area, priority });
  };

  const handleAreaChange = (value: string) => {
    setArea(value);
    onFilter({ search, area: value, priority });
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value);
    onFilter({ search, area, priority: value });
  };

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Search Input */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filtrar por nome"
            className="w-full pl-12 pr-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary text-text-light-primary dark:text-text-dark-primary transition-shadow"
          />
        </div>

        {/* Area Filter */}
        <div className="relative">
          <select
            value={area}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="w-full pl-4 pr-10 py-3 appearance-none bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary transition-shadow cursor-pointer"
          >
            <option value="">Filtrar por grande área</option>
            <option value="Medicina Preventiva">Medicina Preventiva</option>
            <option value="Cirurgia">Cirurgia</option>
            <option value="Clínica Médica">Clínica Médica</option>
            <option value="Pediatria">Pediatria</option>
            <option value="Ginecologia e Obstetrícia">Ginecologia e Obstetrícia</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary pointer-events-none">
            expand_more
          </span>
        </div>

        {/* Priority Filter */}
        <div className="relative">
          <select
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="w-full pl-4 pr-10 py-3 appearance-none bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-text-light-primary dark:text-text-dark-primary transition-shadow cursor-pointer"
          >
            <option value="">Índice de prioridade</option>
            <option value="1">Alta prioridade</option>
            <option value="2">Média prioridade</option>
            <option value="3">Baixa prioridade</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary pointer-events-none">
            expand_more
          </span>
        </div>
      </div>
    </section>
  );
}
