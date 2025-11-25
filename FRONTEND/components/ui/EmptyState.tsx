'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon = 'search_off',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
      <span className="material-symbols-outlined text-6xl text-text-light-secondary dark:text-text-dark-secondary mb-4">
        {icon}
      </span>
      <p className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
        {title}
      </p>
      {description && (
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-lg 
                     hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
