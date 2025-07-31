import React from "react";

interface Filter {
  id: string;
  name: string;
  category: string;
  parentId?: string;
}

interface FilterSelectorProps {
  institutionalFilters: Filter[];
  educationalFilters: Filter[];
  subFilters: Filter[];
  selectedInstitutional: string[];
  selectedEducational: string[];
  selectedSubFilters: string[];
  onSelectInstitutional: (id: string) => void;
  onSelectEducational: (id: string) => void;
  onSelectSubFilter: (id: string) => void;
  onRemoveInstitutional: (id: string) => void;
  onRemoveEducational: (id: string) => void;
  onRemoveSubFilter: (id: string) => void;
  onClearAll: () => void;
  subFilterSearch: string;
  setSubFilterSearch: (v: string) => void;
  loadingSubFilters: boolean;
}

const FilterSelector: React.FC<FilterSelectorProps> = ({
  institutionalFilters,
  educationalFilters,
  subFilters,
  selectedInstitutional,
  selectedEducational,
  selectedSubFilters,
  onSelectInstitutional,
  onSelectEducational,
  onSelectSubFilter,
  onRemoveInstitutional,
  onRemoveEducational,
  onRemoveSubFilter,
  onClearAll,
  subFilterSearch,
  setSubFilterSearch,
  loadingSubFilters,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold mb-2 text-[var(--color-text-main)]">Filtros Institucionais</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          {institutionalFilters.map(f => (
            <button
              key={f.id}
              className={`px-3 py-1 rounded text-sm font-medium 
                ${selectedInstitutional.includes(f.id) 
                  ? 'bg-[var(--color-brand-primary)] text-[var(--color-text-on-primary)]' 
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]'}
              `}
              onClick={() => onSelectInstitutional(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedInstitutional.map(id => {
            const f = institutionalFilters.find(f => f.id === id);
            return f ? (
              <span key={id} className="bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] px-2 py-1 rounded flex items-center">
                {f.name}
                <button className="ml-2 text-xs hover:text-[var(--color-feedback-error)]" onClick={() => onRemoveInstitutional(id)}>x</button>
              </span>
            ) : null;
          })}
        </div>
      </div>
      <div>
        <h2 className="font-bold mb-2 text-[var(--color-text-main)]">Filtros Educacionais</h2>
        <div className="flex flex-wrap gap-2 mb-2">
          {educationalFilters.map(f => (
            <button
              key={f.id}
              className={`px-3 py-1 rounded text-sm font-medium 
                ${selectedEducational.includes(f.id) 
                  ? 'bg-[var(--color-brand-secondary)] text-[var(--color-text-on-primary)]' 
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]'}
              `}
              onClick={() => onSelectEducational(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedEducational.map(id => {
            const f = educationalFilters.find(f => f.id === id);
            return f ? (
              <span key={id} className="bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)] px-2 py-1 rounded flex items-center">
                {f.name}
                <button className="ml-2 text-xs hover:text-[var(--color-feedback-error)]" onClick={() => onRemoveEducational(id)}>x</button>
              </span>
            ) : null;
          })}
        </div>
      </div>
      <div>
        <h2 className="font-bold mb-2 text-[var(--color-text-main)]">Subfiltros</h2>
        <input
          className="border border-[var(--color-border)] px-2 py-1 rounded w-full mb-2 bg-[var(--color-bg-card)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
          placeholder="Buscar subfiltro..."
          value={subFilterSearch}
          onChange={e => setSubFilterSearch(e.target.value)}
        />
        {loadingSubFilters ? (
          <div className="text-[var(--color-text-muted)]">Carregando subfiltros...</div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-2">
            {subFilters
              .filter(f => f.name.toLowerCase().includes(subFilterSearch.toLowerCase()))
              .map(f => (
                <button
                  key={f.id}
                  className={`px-3 py-1 rounded text-sm font-medium 
                    ${selectedSubFilters.includes(f.id) 
                      ? 'bg-[var(--color-brand-primary)]/80 text-[var(--color-text-on-primary)]' 
                      : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-interactive-hover-subtle)]'}
                  `}
                  onClick={() => onSelectSubFilter(f.id)}
                >
                  {f.name}
                </button>
              ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {selectedSubFilters.map(id => {
            const f = subFilters.find(f => f.id === id);
            return f ? (
              <span key={id} className="bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] px-2 py-1 rounded flex items-center">
                {f.name}
                <button className="ml-2 text-xs hover:text-[var(--color-feedback-error)]" onClick={() => onRemoveSubFilter(id)}>x</button>
              </span>
            ) : null;
          })}
        </div>
      </div>
      <div className="mt-4">
        <button className="px-4 py-2 bg-[var(--color-bg-interactive-hover-subtle)] text-[var(--color-text-main)] rounded hover:bg-[var(--color-brand-primary)]/10" onClick={onClearAll}>Limpar seleção</button>
      </div>
    </div>
  );
};

export default FilterSelector;