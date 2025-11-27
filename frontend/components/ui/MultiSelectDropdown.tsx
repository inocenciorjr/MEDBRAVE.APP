'use client';

import { useState, useRef, useEffect } from 'react';
import Checkbox from './Checkbox';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  maxSelections?: number;
  placeholder?: string;
  fullWidth?: boolean;
}

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  maxSelections = 5,
  placeholder = 'Selecione...',
  fullWidth = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      // Remover
      onChange(selectedValues.filter(v => v !== value));
    } else if (selectedValues.length < maxSelections) {
      // Adicionar
      onChange([...selectedValues, value]);
    }
  };

  // Filtrar opções pela busca
  const filteredOptions = options.filter(option =>
    option && option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayText = selectedValues.length === 0
    ? placeholder
    : selectedValues.length === 1
    ? selectedValues[0]
    : `${selectedValues.length} selecionadas`;

  return (
    <div ref={dropdownRef} className={`relative ${fullWidth ? 'w-full' : 'w-auto'}`}>
      {label && (
        <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          {label}
        </label>
      )}
      
      {/* Botão do Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border-2 border-border-light dark:border-border-dark rounded-lg text-left text-sm font-medium text-text-light-primary dark:text-text-dark-primary hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <span className={`material-symbols-outlined text-lg transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-surface-light dark:bg-surface-dark border-2 border-primary/20 rounded-xl shadow-2xl dark:shadow-dark-xl max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border-light dark:border-border-dark">
            {/* Campo de Busca */}
            <div className="relative mb-2">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary text-lg">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            {/* Contador */}
            <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {selectedValues.length}/{maxSelections} selecionadas
            </div>
          </div>

          {/* Opções com Checkbox - Scrollable */}
          <div className="overflow-y-auto max-h-64 p-2">
            {filteredOptions.map((option, index) => {
              const isSelected = selectedValues.includes(option);
              const isDisabled = !isSelected && selectedValues.length >= maxSelections;

              return (
                <div
                  key={`${option}-${index}`}
                  onClick={() => !isDisabled && handleToggle(option)}
                  className={`w-full px-3 py-2.5 rounded-lg transition-all duration-150 flex items-center gap-3 cursor-pointer
                    ${isSelected
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-background-light dark:hover:bg-background-dark border-l-4 border-transparent hover:border-primary/30'
                    }`}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => !isDisabled && handleToggle(option)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={`flex-1 truncate text-sm font-medium ${
                    isSelected
                      ? 'text-primary'
                      : isDisabled
                      ? 'text-text-light-secondary dark:text-text-dark-secondary'
                      : 'text-text-light-primary dark:text-text-dark-primary'
                  }`}>
                    {option}
                  </span>
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Nenhuma opção disponível
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
