'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/admin' },
  { id: 'users', label: 'Usuários', icon: 'people', href: '/admin/users' },
  { id: 'mentorships', label: 'Mentorias', icon: 'school', href: '/admin/mentorships' },
  { id: 'questions', label: 'Questões', icon: 'quiz', href: '/admin/questions' },
  { id: 'official-exams', label: 'Provas Oficiais', icon: 'assignment', href: '/official-exams' },
  { id: 'filters', label: 'Filtros', icon: 'filter_alt', href: '/admin/filters' },
  { id: 'notifications', label: 'Notificações', icon: 'notifications', href: '/admin/notifications' },
  { id: 'audit', label: 'Auditoria', icon: 'history', href: '/admin/audit' },
  { id: 'payments', label: 'Pagamentos', icon: 'payments', href: '/admin/payments' },
  { id: 'tasks', label: 'Tarefas', icon: 'task', href: '/admin/tasks' },
  { id: 'flashcards', label: 'Flashcards', icon: 'layers', href: '/admin/flashcards' },
  { id: 'plans', label: 'Planos', icon: 'workspace_premium', href: '/admin/plans' },
  { id: 'coupons', label: 'Cupons', icon: 'local_offer', href: '/admin/coupons' },
  { id: 'finance', label: 'Financeiro', icon: 'account_balance', href: '/admin/finance' },
  { id: 'ai', label: 'MEDBRAVE AI', icon: 'psychology', href: '/admin/ai' },
];

export interface AdminSidebarProps {
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className="w-72 h-screen bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <Image
              src="/medbravelogo.png"
              alt="MEDBRAVE Logo"
              width={48}
              height={48}
              className="dark:hidden object-contain"
              priority
            />
            <Image
              src="/medbravelogo-dark.png"
              alt="MEDBRAVE Logo"
              width={48}
              height={48}
              className="hidden dark:block object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="font-azonix text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
              MEDBRAVE
            </h1>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    font-inter font-medium text-sm
                    transition-all duration-300
                    ${
                      active
                        ? 'bg-primary/10 text-primary border-l-4 border-primary'
                        : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-light-primary dark:hover:text-text-dark-primary'
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-xl">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border-light dark:border-border-dark">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">
            arrow_back
          </span>
          <span className="font-inter font-medium text-sm">
            Voltar ao App
          </span>
        </Link>
      </div>
    </aside>
  );
}
