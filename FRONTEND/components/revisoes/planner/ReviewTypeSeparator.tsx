'use client';

interface ReviewTypeSeparatorProps {
  type: 'FLASHCARD' | 'QUESTION' | 'ERROR_NOTEBOOK';
  count: number;
}

export function ReviewTypeSeparator({ type, count }: ReviewTypeSeparatorProps) {
  const getConfig = () => {
    switch (type) {
      case 'FLASHCARD':
        return {
          icon: '🎴',
          label: 'Flashcards',
          color: 'bg-blue-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
        };
      case 'QUESTION':
        return {
          icon: '❓',
          label: 'Questões',
          color: 'bg-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
        };
      case 'ERROR_NOTEBOOK':
        return {
          icon: '📕',
          label: 'Caderno de Erros',
          color: 'bg-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
        };
    }
  };

  const config = getConfig();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.borderColor} mb-2`}>
      <span className="text-lg">{config.icon}</span>
      <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
        {config.label}
      </span>
      <span className={`ml-auto text-xs font-bold text-white px-2 py-0.5 rounded-full ${config.color}`}>
        {count}
      </span>
    </div>
  );
}
