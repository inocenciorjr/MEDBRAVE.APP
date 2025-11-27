'use client';

import React from 'react';

interface FilterTag {
  id: string;
  name: string;
  type: 'filter' | 'subfilter';
  path?: string[];
}

interface FilterTagsProps {
  filterIds: string[];
  subFilterIds: string[];
  filterNames: Map<string, string>; // Map de ID para nome
  onRemoveFilter?: (filterId: string) => void;
  onRemoveSubFilter?: (subFilterId: string) => void;
  readOnly?: boolean;
}

export const FilterTags: React.FC<FilterTagsProps> = ({
  filterIds,
  subFilterIds,
  filterNames,
  onRemoveFilter,
  onRemoveSubFilter,
  readOnly = false,
}) => {
  if (filterIds.length === 0 && subFilterIds.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        Nenhum filtro aplicado
      </div>
    );
  }

  // Remover duplicatas mantendo a ordem
  const uniqueFilterIds = Array.from(new Set(filterIds));
  const uniqueSubFilterIds = Array.from(new Set(subFilterIds));

  return (
    <div className="flex flex-wrap gap-2">
      {/* Filtros principais */}
      {uniqueFilterIds.map((filterId, index) => (
        <div
          key={`filter-${filterId}-${index}`}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800"
        >
          <span className="flex items-center gap-1">
            🏷️ {filterNames.get(filterId) || filterId}
          </span>
          {!readOnly && onRemoveFilter && (
            <button
              onClick={() => onRemoveFilter(filterId)}
              className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
              title="Remover filtro"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      ))}

      {/* Subfiltros */}
      {uniqueSubFilterIds.map((subFilterId, index) => {
        // Converter ID em caminho legível
        // Ex: "ClinicaMedica_Nefrologia_Hiponatremia" -> "Clínica Médica > Nefrologia > Hiponatremia"
        const pathFromId = subFilterId
          .split('_')
          .map(part => {
            // Tentar pegar o nome do Map, senão usar o ID formatado
            return filterNames.get(part) || part;
          })
          .join(' > ');
        
        const displayName = filterNames.get(subFilterId) || subFilterId;
        
        return (
          <div
            key={`subfilter-${subFilterId}-${index}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium border border-green-200 dark:border-green-800 cursor-help"
            title={`Caminho completo: ${pathFromId}\n\nID: ${subFilterId}`}
          >
            <span className="flex items-center gap-1">
              🔖 {displayName}
            </span>
            {!readOnly && onRemoveSubFilter && (
              <button
                onClick={() => onRemoveSubFilter(subFilterId)}
                className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors"
                title="Remover subfiltro"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
