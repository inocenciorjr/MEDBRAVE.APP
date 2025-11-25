'use client';

import React from 'react';
import Link from 'next/link';
import { AdminCard } from '../ui/AdminCard';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  { id: 'users', label: 'Gerenciar Usuários', icon: 'people', href: '/admin/users', color: 'blue' },
  { id: 'questions', label: 'Criar Questão', icon: 'add_circle', href: '/admin/questions/create', color: 'green' },
  { id: 'filters', label: 'Gerenciar Filtros', icon: 'filter_alt', href: '/admin/filters', color: 'purple' },
  { id: 'notifications', label: 'Enviar Notificação', icon: 'notifications', href: '/admin/notifications', color: 'orange' },
  { id: 'audit', label: 'Ver Auditoria', icon: 'history', href: '/admin/audit', color: 'red' },
  { id: 'ai', label: 'MEDBRAVE AI', icon: 'psychology', href: '/admin/ai', color: 'blue' },
];

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50',
};

export function QuickActions() {
  return (
    <AdminCard
      header={
        <h2 className="text-lg font-display font-bold text-text-light-primary dark:text-text-dark-primary">
          Ações Rápidas
        </h2>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={`
              flex flex-col items-center gap-3 p-4 rounded-xl
              transition-all duration-300
              ${colorClasses[action.color]}
            `}
          >
            <span className="material-symbols-outlined text-3xl">
              {action.icon}
            </span>
            <span className="text-sm font-medium text-center">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </AdminCard>
  );
}
