'use client';

import { useState, useCallback } from 'react';

interface YearNode {
  id: string;
  name: string;
  children?: YearNode[];
}

interface YearGridSelectorProps {
  years: YearNode[];
  selectedYears: string[];
  onToggleYear: (yearId: string) => void;
  onToggleMultipleYears?: (yearIds: string[], shouldSelect: boolean) => void;
}

export default function YearGridSelector({
  years,
  selectedYears,
  onToggleYear,
  onToggleMultipleYears,
}: YearGridSelectorProps) {
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  // Função para coletar todos os IDs de um ano e seus descendentes
  const getAllDescendantIds = useCallback((year: YearNode): string[] => {
    const ids = [year.id];
    if (year.children) {
      year.children.forEach(child => {
        ids.push(...getAllDescendantIds(child));
      });
    }
    return ids;
  }, []);

  // Handler para toggle com seleção recursiva
  const handleToggleYear = useCallback((year: YearNode) => {
    const allIds = getAllDescendantIds(year);
    const allSelected = allIds.every(id => selectedYears.includes(id));
    const shouldSelect = !allSelected;
    
    if (onToggleMultipleYears) {
      onToggleMultipleYears(allIds, shouldSelect);
    } else {
      allIds.forEach(id => {
        const isIdSelected = selectedYears.includes(id);
        if (shouldSelect && !isIdSelected) {
          onToggleYear(id);
        } else if (!shouldSelect && isIdSelected) {
          onToggleYear(id);
        }
      });
    }
  }, [selectedYears, onToggleYear, onToggleMultipleYears, getAllDescendantIds]);

  const handleYearClick = (year: YearNode, e: React.MouseEvent) => {
    if (year.children && year.children.length > 0) {
      // Se shift está pressionado, selecionar/desselecionar todos
      if (e.shiftKey) {
        handleToggleYear(year);
      } else {
        // Senão, expandir/colapsar
        setExpandedYear(expandedYear === year.id ? null : year.id);
      }
    } else {
      // Se não tem filhos, selecionar diretamente
      handleToggleYear(year);
    }
  };

  const isYearSelected = (year: YearNode): boolean => {
    const allIds = getAllDescendantIds(year);
    return allIds.every(id => selectedYears.includes(id));
  };

  const isYearPartiallySelected = (year: YearNode): boolean => {
    if (!year.children || year.children.length === 0) return false;
    const allIds = getAllDescendantIds(year);
    const someSelected = allIds.some(id => selectedYears.includes(id));
    const allSelected = allIds.every(id => selectedYears.includes(id));
    return someSelected && !allSelected;
  };

  return (
    <div className="space-y-4">
      {/* Grid de Anos */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
        {years.map((year) => {
          const hasChildren = year.children && year.children.length > 0;
          const isSelected = isYearSelected(year);
          const isPartial = isYearPartiallySelected(year);
          const isExpanded = expandedYear === year.id;

          return (
            <div key={year.id} className="relative group">
              <button
                onClick={(e) => handleYearClick(year, e)}
                onContextMenu={(e) => {
                  if (hasChildren) {
                    e.preventDefault();
                    handleToggleYear(year);
                  }
                }}
                title={hasChildren ? "Clique para expandir, Shift+Clique ou Botão direito para selecionar todos" : "Clique para selecionar"}
                className={`
                  relative w-full px-4 py-3 rounded-xl font-semibold text-sm
                  transition-all duration-200
                  border-2
                  shadow-lg dark:shadow-dark-lg
                  ${isSelected 
                    ? 'bg-primary text-white border-primary shadow-xl shadow-primary/40 dark:shadow-primary/30 scale-105' 
                    : isPartial
                    ? 'bg-primary/20 dark:bg-primary/30 text-primary border-primary/50 shadow-md hover:shadow-lg dark:shadow-dark-md dark:hover:shadow-dark-lg'
                    : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary border-border-light dark:border-border-dark hover:border-primary/50 hover:shadow-xl dark:hover:shadow-dark-xl'
                  }
                  hover:scale-105 hover:-translate-y-0.5
                `}
              >
                {year.name}
                {hasChildren && (
                  <span className={`material-symbols-outlined text-xs absolute top-1 right-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Sub-anos expandidos */}
      {expandedYear && years.find(y => y.id === expandedYear)?.children && (
        <div className="p-6 bg-background-light dark:bg-background-dark rounded-xl border-2 border-primary/30 shadow-2xl dark:shadow-dark-2xl animate-slide-in-from-top">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              {years.find(y => y.id === expandedYear)?.name}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const year = years.find(y => y.id === expandedYear);
                  if (year) handleToggleYear(year);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105"
              >
                <span className="material-symbols-outlined text-base">done_all</span>
                Selecionar todos
              </button>
              <button
                onClick={() => setExpandedYear(null)}
                className="flex items-center justify-center w-9 h-9 text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-all duration-200 hover:bg-primary/10 rounded-lg hover:scale-110"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {years.find(y => y.id === expandedYear)?.children?.map((subYear) => {
              const isSelected = selectedYears.includes(subYear.id);
              
              return (
                <button
                  key={subYear.id}
                  onClick={() => onToggleYear(subYear.id)}
                  className={`
                    px-4 py-3 rounded-lg font-semibold text-sm
                    transition-all duration-200
                    border-2
                    shadow-lg dark:shadow-dark-lg
                    ${isSelected
                      ? 'bg-primary text-white border-primary shadow-xl shadow-primary/40 dark:shadow-primary/30 scale-105'
                      : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary border-border-light dark:border-border-dark hover:border-primary/50 hover:shadow-xl dark:hover:shadow-dark-xl'
                    }
                    hover:scale-105 hover:-translate-y-0.5
                  `}
                >
                  {subYear.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
