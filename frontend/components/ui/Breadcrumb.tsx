'use client';

import { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

function BreadcrumbComponent({ items }: BreadcrumbProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sempre adicionar Dashboard no início
  const allItems = [
    { label: 'Dashboard', href: '/', icon: 'grid_view' },
    ...items
  ];

  // Evitar flash durante hidratação
  if (!mounted) {
    return <div className="h-12 mb-6" />;
  }

  return (
    <div className="flex items-center gap-2 mb-6 animate-in fade-in duration-200 min-h-[3rem]">
      <button
        onClick={() => router.back()}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Voltar"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
      </button>

      <nav className="flex items-center gap-1.5">
        {allItems.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 text-sm">
                chevron_right
              </span>
            )}
            
            {item.href ? (
              <Link
                href={item.href}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
              >
                {item.icon && (
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </Link>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
              >
                {item.icon && (
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-gray-900 dark:text-white font-medium">
                {item.icon && (
                  <span className="material-symbols-outlined text-sm text-primary">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

// Memoizar para evitar re-renders desnecessários
export const Breadcrumb = memo(BreadcrumbComponent);
