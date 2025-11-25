'use client';

import { useState } from 'react';
import { Institution } from '@/types/banco-questoes';
import Checkbox from '@/components/ui/Checkbox';
import { SearchInput } from '@/components/flashcards/SearchInput';

// Mapeamento de siglas para nomes completos dos estados
const STATE_NAMES: Record<string, string> = {
  'AC': 'Acre',
  'AL': 'Alagoas',
  'AP': 'Amapá',
  'AM': 'Amazonas',
  'BA': 'Bahia',
  'CE': 'Ceará',
  'DF': 'Distrito Federal',
  'ES': 'Espírito Santo',
  'GO': 'Goiás',
  'MA': 'Maranhão',
  'MT': 'Mato Grosso',
  'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais',
  'PA': 'Pará',
  'PB': 'Paraíba',
  'PR': 'Paraná',
  'PE': 'Pernambuco',
  'PI': 'Piauí',
  'RJ': 'Rio de Janeiro',
  'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul',
  'RO': 'Rondônia',
  'RR': 'Roraima',
  'SC': 'Santa Catarina',
  'SP': 'São Paulo',
  'SE': 'Sergipe',
  'TO': 'Tocantins',
};

interface InstitutionSelectorProps {
  institutions: Institution[];
  selectedInstitutions: string[];
  onToggleInstitution: (institutionId: string) => void;
}

export default function InstitutionSelector({
  institutions,
  selectedInstitutions,
  onToggleInstitution,
}: InstitutionSelectorProps) {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleState = (state: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedStates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(state)) {
        newSet.delete(state);
      } else {
        newSet.add(state);
      }
      return newSet;
    });
  };

  // Handler para selecionar/desselecionar todas as instituições de um estado
  const handleToggleState = (state: string, stateInstitutions: Institution[], e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const allSelected = stateInstitutions.every(inst => selectedInstitutions.includes(inst.id));
    
    stateInstitutions.forEach(inst => {
      if (allSelected) {
        // Desselecionar se todas estiverem selecionadas
        if (selectedInstitutions.includes(inst.id)) {
          onToggleInstitution(inst.id);
        }
      } else {
        // Selecionar se nem todas estiverem selecionadas
        if (!selectedInstitutions.includes(inst.id)) {
          onToggleInstitution(inst.id);
        }
      }
    });
  };

  // Filter institutions by search term
  const filteredInstitutions = institutions.filter((institution) =>
    institution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    institution.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group institutions by state
  const institutionsByState = filteredInstitutions.reduce((acc, institution) => {
    if (!acc[institution.state]) {
      acc[institution.state] = [];
    }
    acc[institution.state].push(institution);
    return acc;
  }, {} as Record<string, Institution[]>);

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={index} className="bg-primary/20 rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      <div className="mb-8">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar instituição ou estado"
          fullWidth
        />
      </div>

      <div className="space-y-2">
      {Object.entries(institutionsByState).map(([state, stateInstitutions]) => {
        const isExpanded = expandedStates.has(state);
        const allSelected = stateInstitutions.every(inst => selectedInstitutions.includes(inst.id));
        const someSelected = stateInstitutions.some(inst => selectedInstitutions.includes(inst.id));
        const isIndeterminate = someSelected && !allSelected;

        return (
          <div key={state} className="transition-all duration-200">
            <div 
              className="flex items-center justify-between p-3 rounded-xl cursor-pointer select-none
                        bg-surface-light dark:bg-surface-dark
                        hover:bg-background-light dark:hover:bg-background-dark 
                        border-2 border-border-light dark:border-border-dark hover:border-primary/30
                        transition-all duration-200
                        shadow-sm hover:shadow-lg dark:shadow-dark-sm dark:hover:shadow-dark-lg
                        hover:-translate-y-0.5"
              onClick={(e) => toggleState(state, e)}
            
            >
              <div className="flex items-center flex-1 min-w-0">
                <span className={`material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary 
                                transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
                  chevron_right
                </span>
                <div className="ml-3 flex items-center gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={isIndeterminate}
                    onChange={(e) => handleToggleState(state, stateInstitutions, e as any)}
                  />
                  <span
                    className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary 
                              select-none cursor-pointer hover:text-primary transition-colors duration-200
                              truncate"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleState(state, stateInstitutions, e as any);
                    }}
                  >
                    {STATE_NAMES[state] || state}
                  </span>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="pl-8 pr-2 pt-2 pb-2 space-y-2">
                {stateInstitutions.map((institution) => {
                  const isSelected = selectedInstitutions.includes(institution.id);

                  return (
                    <div 
                      key={institution.id} 
                      className="flex items-center p-3 rounded-lg 
                                bg-background-light dark:bg-background-dark
                                hover:bg-surface-light dark:hover:bg-surface-dark
                                border-2 border-border-light dark:border-border-dark hover:border-primary/30 
                                transition-all duration-200
                                shadow-sm hover:shadow-md dark:shadow-dark-sm dark:hover:shadow-dark-md
                                hover:-translate-y-0.5" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleInstitution(institution.id);
                        }}
                      />
                      <span
                        className="ml-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary 
                                  cursor-pointer hover:text-primary transition-colors duration-200"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onToggleInstitution(institution.id);
                        }}
                      >
                        {highlightText(institution.name, searchTerm)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
