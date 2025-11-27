'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export interface AdminHeaderProps {
  userName?: string;
  userAvatar?: string;
  onMenuClick?: () => void;
}

const pageTitles: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'Gestão de Usuários',
  '/admin/questions': 'Gestão de Questões',
  '/admin/filters': 'Gestão de Filtros',
  '/admin/notifications': 'Notificações',
  '/admin/audit': 'Logs de Auditoria',
  '/admin/payments': 'Pagamentos',
  '/admin/tasks': 'Tarefas Administrativas',
  '/admin/flashcards': 'Gestão de Flashcards',
  '/admin/plans': 'Planos de Assinatura',
  '/admin/coupons': 'Cupons de Desconto',
  '/admin/finance': 'Dashboard Financeiro',
  '/admin/ai': 'MEDBRAVE AI',
};

export function AdminHeader({ userName, userAvatar, onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname || '/admin'] || 'Admin';

  return (
    <header className="sticky top-0 z-40 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">
              menu
            </span>
          </button>

          {/* Page title */}
          <div>
            <h1 className="text-xl font-display font-bold text-text-light-primary dark:text-text-dark-primary">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Theme toggle placeholder */}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">
              light_mode
            </span>
          </button>

          {/* User info */}
          {userName && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                  {userName}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  Administrador
                </p>
              </div>
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-10 h-10 rounded-full border-2 border-primary"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
