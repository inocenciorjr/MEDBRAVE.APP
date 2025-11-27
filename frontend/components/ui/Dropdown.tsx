'use client';

import { forwardRef, SelectHTMLAttributes, useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: DropdownOption[] | string[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  onChange?: (value: string) => void;
  fullWidth?: boolean;
}

const Dropdown = forwardRef<HTMLSelectElement, DropdownProps>(
  (
    {
      className = '',
      label,
      options,
      placeholder,
      error,
      helperText,
      onChange,
      value,
      disabled,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string>(value as string || '');
    const containerRef = useRef<HTMLDivElement>(null);

    // Normaliza as opções para o formato padrão
    const normalizedOptions: DropdownOption[] = options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    // Encontra o label da opção selecionada
    const selectedOption = normalizedOptions.find((opt) => opt.value === selectedValue);
    const displayValue = selectedOption?.label || placeholder || 'Selecione...';

    // Fecha o dropdown ao clicar fora
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Atualiza o valor quando a prop value muda
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value as string);
      }
    }, [value]);

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      setIsOpen(false);
      onChange?.(optionValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          setIsOpen(!isOpen);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            // Navegar para a próxima opção
            const currentIndex = normalizedOptions.findIndex((opt) => opt.value === selectedValue);
            const nextIndex = Math.min(currentIndex + 1, normalizedOptions.length - 1);
            const nextOption = normalizedOptions[nextIndex];
            if (nextOption && !nextOption.disabled) {
              handleSelect(nextOption.value);
            }
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            const currentIndex = normalizedOptions.findIndex((opt) => opt.value === selectedValue);
            const prevIndex = Math.max(currentIndex - 1, 0);
            const prevOption = normalizedOptions[prevIndex];
            if (prevOption && !prevOption.disabled) {
              handleSelect(prevOption.value);
            }
          }
          break;
      }
    };

    return (
      <div className={`${fullWidth ? 'w-full' : 'inline-block'}`}>
        {label && (
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2 pl-1">
            {label}
          </label>
        )}

        <div
          ref={containerRef}
          className={`relative ${fullWidth ? 'w-full' : 'min-w-[280px]'}`}
        >
          {/* Select nativo escondido para acessibilidade e formulários */}
          <select
            ref={ref}
            value={selectedValue}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={disabled}
            className="sr-only"
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {normalizedOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Dropdown customizado */}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`
              relative w-full px-4 py-3 text-left rounded-xl
              border-2 transition-[box-shadow] duration-200 ease-out
              flex items-center justify-between gap-3
              shadow-sm hover:shadow-md
              ${
                error
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20 focus:ring-4 focus:ring-red-500/20'
                  : isOpen
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-4 ring-primary/20 shadow-lg shadow-primary/10'
                  : 'border-border-light dark:border-border-dark hover:border-primary/60 hover:shadow-primary/5'
              }
              ${
                disabled
                  ? 'opacity-50 cursor-not-allowed bg-background-light dark:bg-surface-dark'
                  : 'bg-surface-light dark:bg-surface-dark cursor-pointer hover:bg-background-light dark:hover:bg-background-dark'
              }
              focus:outline-none focus:ring-4 focus:ring-primary/20
              group
              ${className}
            `}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Ícone decorativo */}
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                transition-[transform,background-color] duration-200
                ${
                  isOpen
                    ? 'bg-primary/20 text-primary scale-110'
                    : 'bg-background-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary group-hover:bg-primary/10 group-hover:text-primary'
                }
              `}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>

              {/* Texto */}
              <span
                className={`text-sm font-medium truncate ${
                  selectedValue
                    ? 'text-text-light-primary dark:text-text-dark-primary'
                    : 'text-text-light-secondary dark:text-text-dark-secondary'
                }`}
              >
                {displayValue}
              </span>
            </div>

            {/* Ícone de seta com badge */}
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
              transition-[transform,background-color] duration-200
              ${
                isOpen
                  ? 'bg-primary text-white rotate-180 scale-110'
                  : 'bg-background-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary group-hover:bg-primary/10 group-hover:text-primary'
              }
            `}>
              <svg
                className="w-4 h-4 transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {/* Menu de opções */}
          <div
            className={`
              absolute z-50 w-full mt-3
              bg-surface-light dark:bg-surface-dark
              border-2 border-primary/20
              rounded-xl shadow-2xl dark:shadow-dark-xl
              overflow-hidden
              backdrop-blur-sm
              transition-[max-height,opacity,transform] duration-300 ease-in-out origin-top
              ${isOpen ? 'max-h-72 opacity-100 scale-y-100' : 'max-h-0 opacity-0 scale-y-0 border-0'}
            `}
            style={{
              boxShadow: isOpen ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(139, 92, 246, 0.1)' : 'none'
            }}
          >
            <div className="py-2 max-h-72 overflow-auto">
              {normalizedOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={`
                    w-full px-4 py-3 text-left text-sm font-medium
                    transition-[padding-left,background-color] duration-150
                    flex items-center gap-3
                    group/item
                    ${
                      option.value === selectedValue
                        ? 'bg-primary/15 text-primary border-l-4 border-primary'
                        : option.disabled
                        ? 'text-text-light-secondary dark:text-text-dark-secondary opacity-50 cursor-not-allowed'
                        : 'text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-surface-dark hover:pl-6 border-l-4 border-transparent hover:border-primary/30'
                    }
                    ${index === 0 ? 'rounded-t-lg' : 'border-t border-border-light/30 dark:border-border-dark/30'}
                    ${index === normalizedOptions.length - 1 ? 'rounded-b-lg' : ''}
                  `}
                >
                  {/* Indicador de seleção */}
                  {option.value === selectedValue && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-50 duration-200">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                  
                  {/* Label */}
                  <span className="flex-1 truncate">
                    {option.label}
                  </span>

                  {/* Ícone de hover */}
                  {option.value !== selectedValue && !option.disabled && (
                    <svg
                      className="w-4 h-4 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mensagem de erro ou helper text */}
        {(error || helperText) && (
          <p
            className={`mt-1.5 text-xs ${
              error
                ? 'text-red-500'
                : 'text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

export default Dropdown;
