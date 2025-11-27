'use client';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  fullWidth?: boolean;
  className?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Buscar', 
  label,
  fullWidth = false,
  className = '' 
}: SearchInputProps) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2 pl-1">
          {label}
        </label>
      )}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-light-secondary dark:text-text-dark-secondary pointer-events-none">
          search
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full h-[60px] px-4 pl-12 rounded-xl bg-background-light dark:bg-background-dark border-2 border-primary/20 dark:border-primary/20 text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary focus:ring-4 focus:ring-primary/20 focus:border-primary shadow-md hover:shadow-lg dark:shadow-dark-md dark:hover:shadow-dark-lg hover:scale-[1.01] transition-all duration-200 text-sm font-medium"
        />
      </div>
    </div>
  );
}
