'use client';

import Checkbox from '@/components/ui/Checkbox';

interface YearSelectorProps {
  years: number[];
  selectedYears: number[];
  onToggleYear: (year: number) => void;
  onToggleAll: () => void;
}

export default function YearSelector({
  years,
  selectedYears,
  onToggleYear,
  onToggleAll,
}: YearSelectorProps) {
  const allSelected = years.every((year) => selectedYears.includes(year));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {years.map((year) => {
        const isSelected = selectedYears.includes(year);
        return (
          <div
            key={year}
            className={`group flex items-center p-3 rounded-lg transition-all duration-300 bg-background-light dark:bg-background-dark shadow-sm hover:shadow-md hover:-translate-y-px border ${
              isSelected
                ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                : 'border-border-light dark:border-border-dark hover:border-primary/50'
            }`}
          >
            <Checkbox
              checked={isSelected}
              onChange={() => onToggleYear(year)}
              label={year.toString()}
            />
          </div>
        );
      })}

      <div
        className={`group col-span-2 sm:col-span-1 flex items-center p-3 rounded-lg transition-all duration-300 bg-background-light dark:bg-background-dark shadow-sm hover:shadow-md hover:-translate-y-px border ${
          allSelected
            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
            : 'border-border-light dark:border-border-dark hover:border-primary/50'
        }`}
      >
        <Checkbox
          checked={allSelected}
          onChange={onToggleAll}
          label="Todos os anos"
        />
      </div>
    </div>
  );
}
