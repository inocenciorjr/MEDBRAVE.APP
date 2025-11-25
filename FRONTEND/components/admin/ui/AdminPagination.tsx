'use client';

import React from 'react';

export interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  itemsPerPageOptions?: number[];
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100],
}: AdminPaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-border-light dark:border-border-dark">
      <div className="flex items-center gap-4">
        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          Mostrando {startItem} até {endItem} de {totalItems} itens
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            Itens por página:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2 py-1 border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-sm"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-border-light dark:border-border-dark rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Primeira página"
        >
          <span className="material-symbols-outlined text-base">first_page</span>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-border-light dark:border-border-dark rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Página anterior"
        >
          <span className="material-symbols-outlined text-base">chevron_left</span>
        </button>
        <span className="px-3 py-1 text-sm">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-border-light dark:border-border-dark rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Próxima página"
        >
          <span className="material-symbols-outlined text-base">chevron_right</span>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-border-light dark:border-border-dark rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Última página"
        >
          <span className="material-symbols-outlined text-base">last_page</span>
        </button>
      </div>
    </div>
  );
}
