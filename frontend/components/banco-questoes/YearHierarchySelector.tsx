'use client';

import { useState, useCallback } from 'react';
import { JSX } from 'react/jsx-runtime';
import Checkbox from '@/components/ui/Checkbox';

interface YearNode {
  id: string;
  name: string;
  children?: YearNode[];
}

interface YearHierarchySelectorProps {
  years: YearNode[];
  selectedYears: string[];
  onToggleYear: (yearId: string) => void;
  onToggleMultipleYears?: (yearIds: string[], shouldSelect: boolean) => void;
}

export default function YearHierarchySelector({
  years,
  selectedYears,
  onToggleYear,
  onToggleMultipleYears,
}: YearHierarchySelectorProps) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((yearId: string) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(yearId)) {
        newSet.delete(yearId);
      } else {
        newSet.add(yearId);
      }
      return newSet;
    });
  }, []);

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

  // Função para verificar se todos os filhos estão selecionados
  const areAllChildrenSelected = useCallback((year: YearNode): boolean => {
    if (!year.children || year.children.length === 0) return false;
    return year.children.every(child => 
      selectedYears.includes(child.id) && 
      (!child.children || areAllChildrenSelected(child))
    );
  }, [selectedYears]);

  // Função para verificar se alguns (mas não todos) filhos estão selecionados
  const areSomeChildrenSelected = useCallback((year: YearNode): boolean => {
    if (!year.children || year.children.length === 0) return false;
    return year.children.some(child => 
      selectedYears.includes(child.id) || areSomeChildrenSelected(child)
    );
  }, [selectedYears]);

  // Handler para toggle com seleção recursiva
  const handleToggleYear = useCallback((year: YearNode, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const allIds = getAllDescendantIds(year);
    
    // Verificar se TODOS os descendentes estão selecionados
    // Se todos estão selecionados, vamos desselecionar
    // Se algum não está selecionado, vamos selecionar todos
    const allSelected = allIds.every(id => selectedYears.includes(id));
    const shouldSelect = !allSelected;
    
    // Se temos a função de toggle múltiplo, usar ela
    if (onToggleMultipleYears) {
      onToggleMultipleYears(allIds, shouldSelect);
    } else {
      // Fallback para o comportamento antigo
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

  const renderYear = (year: YearNode): JSX.Element => {
    const isExpanded = expandedYears.has(year.id);
    const isSelected = selectedYears.includes(year.id);
    const hasChildren = year.children && year.children.length > 0;
    const allChildrenSelected = hasChildren && areAllChildrenSelected(year);
    const someChildrenSelected = hasChildren && !allChildrenSelected && areSomeChildrenSelected(year);
    const isIndeterminate = someChildrenSelected && !isSelected;

    return (
      <details
        key={year.id}
        open={isExpanded}
        onToggle={(e) => {
          if (!hasChildren) return;
          e.stopPropagation();
          toggleExpand(year.id);
        }}
      >
        <summary className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors duration-200 list-none [&::-webkit-details-marker]:hidden bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark">
          <div className="flex items-center">
            {hasChildren && (
              <span className={`material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary transition-transform duration-200 mr-2 ${isExpanded ? 'rotate-90' : ''}`}>
                chevron_right
              </span>
            )}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected || (allChildrenSelected || false)}
                indeterminate={isIndeterminate || false}
                onChange={(e) => handleToggleYear(year, e as any)}
              />
              <span
                className="text-base font-medium text-text-light-primary dark:text-text-dark-primary select-none cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleYear(year, e);
                }}
              >
                {year.name}
              </span>
            </div>
          </div>
        </summary>

        {hasChildren && (
          <div className="pl-10 pr-2 pt-2 space-y-2">
            {year.children!.map((child) => {
              const isChildSelected = selectedYears.includes(child.id);
              const childHasChildren = child.children && child.children.length > 0;

              // Se o child tem filhos, renderizar recursivamente
              if (childHasChildren) {
                return renderYear(child);
              }

              // Caso contrário, renderizar como checkbox simples
              return (
                <div key={child.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isChildSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleYear(child, e as any);
                    }}
                  />
                  <span
                    className="ml-2 text-base font-medium text-text-light-primary dark:text-text-dark-primary cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleYear(child, e);
                    }}
                  >
                    {child.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </details>
    );
  };

  return (
    <div className="space-y-3">
      {years.map((year) => renderYear(year))}
    </div>
  );
}
