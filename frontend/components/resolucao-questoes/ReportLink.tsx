'use client';

interface ReportLinkProps {
  onReport?: () => void;
}

export function ReportLink({ onReport }: ReportLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onReport) {
      onReport();
    } else {
      // Default behavior - could open a modal
      console.log('Report problem clicked');
    }
  };

  return (
    <div className="mt-6 text-center">
      <a
        href="#"
        onClick={handleClick}
        className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
      >
        <span className="material-symbols-outlined text-base">flag</span>
        <span>Relatar problema na questão</span>
      </a>
    </div>
  );
}
