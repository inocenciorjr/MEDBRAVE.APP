'use client';

import React from 'react';
import type { SortDirection } from '@/types/admin/common';
import Checkbox from '@/components/ui/Checkbox';

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

export interface AdminTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  onSort?: (field: string, direction: SortDirection) => void;
  sortField?: string;
  sortDirection?: SortDirection;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
}

export function AdminTable<T>({
  data,
  columns,
  loading = false,
  onSort,
  sortField,
  sortDirection,
  onRowClick,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  getRowId = (row: any) => row.id,
  emptyMessage = 'Nenhum dado encontrado',
}: AdminTableProps<T>) {
  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    const newDirection: SortDirection =
      sortField === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedRows.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getRowId)));
    }
  };

  const handleSelectRow = (rowId: string) => {
    if (!onSelectionChange) return;
    
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    onSelectionChange(newSelected);
  };

  if (loading) {
    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-border-light dark:border-border-dark">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
          <tr>
            {selectable && (
              <th className="px-6 py-3 text-left w-12">
                <Checkbox
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  px-6 py-3 text-left text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider
                  ${column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none' : ''}
                  ${column.width ? column.width : ''}
                `}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && sortField === column.key && (
                    <span className="material-symbols-outlined text-primary text-base">
                      {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-6 py-12 text-center"
              >
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-6xl text-gray-400">
                    inbox
                  </span>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    {emptyMessage}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const rowId = getRowId(row);
              const isSelected = selectedRows.has(rowId);
              
              return (
                <tr
                  key={rowId}
                  className={`
                    hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${isSelected ? 'bg-primary/5' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = (row as any)[column.key];
                    return (
                      <td
                        key={column.key}
                        className="px-6 py-4 text-sm text-text-light-primary dark:text-text-dark-primary"
                      >
                        {column.render ? column.render(value, row) : value}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
