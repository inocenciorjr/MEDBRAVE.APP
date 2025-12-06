'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import UserPlanCard from '@/components/ui/UserPlanCard';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  onClose?: () => void;
}

const mainMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid_view', href: '/' },
  { id: 'banco-questoes', label: 'Banco de Questões', icon: 'quiz', href: '/banco-questoes' },
  { id: 'lista-questoes', label: 'Lista de Questões', icon: 'list_alt', href: '/lista-questoes' },
  { id: 'prova-integra', label: 'Prova na Íntegra', icon: 'description', href: '/prova-integra' },
  { id: 'flashcards', label: 'Flashcards', icon: 'layers', href: '/flashcards' },
  { id: 'caderno-erros', label: 'Caderno de Erros', icon: 'book', href: '/caderno-erros' },
  { id: 'revisoes', label: 'Revisões', icon: 'history', href: '/revisoes' },
  { id: 'planner', label: 'Planner', icon: 'event_available', href: '/planner' },
  { id: 'playground', label: 'Playground', icon: 'sports_esports', href: '/playground' },
  { id: 'statistics', label: 'Painel de Métricas', icon: 'analytics', href: '/statistics' },
];

const secondaryMenuItems: MenuItem[] = [
  { id: 'configuracoes', label: 'Configurações', icon: 'settings', href: '/configuracoes' },
  { id: 'sair', label: 'Sair', icon: 'logout', href: '/sair' },
];

export default function Sidebar({ isCollapsed: controlledCollapsed, onToggle, isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Mobile sempre expandido, desktop usa o estado controlado
  const isExpanded = isMobile ? true : !controlledCollapsed;

  // Função para verificar se o item está ativo
  const isItemActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  // Handle link click on mobile - close sidebar
  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={`relative bg-sidebar-light dark:bg-sidebar-dark p-4 flex flex-col justify-between h-screen transition-[width] duration-200 ease-in-out shadow-xl dark:shadow-dark-xl ${
        isMobile ? 'w-72 rounded-r-2xl' : isExpanded ? 'w-72 rounded-r-2xl' : 'w-20 rounded-r-2xl'
      }`}
    >
      {/* Top Section */}
      <div>
        {/* Mobile Close Button */}
        {isMobile && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark text-text-light-secondary dark:text-text-dark-secondary transition-colors z-10"
            aria-label="Fechar menu"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        )}

        {/* Logo and Pin Button */}
        <div className="flex flex-col items-center mb-10 relative">
          {/* Logo Image - sempre visível */}
          <div className={`relative transition-all duration-300 ease-out ${isExpanded ? 'w-20 h-20' : 'w-12 h-12'}`}>
            {/* Light mode logo */}
            <Image
              src="/medbravelogo.png"
              alt="MEDBRAVE Logo"
              width={isExpanded ? 80 : 48}
              height={isExpanded ? 80 : 48}
              className="dark:hidden object-contain"
              priority
            />
            {/* Dark mode logo */}
            <Image
              src="/medbravelogo-dark.png"
              alt="MEDBRAVE Logo"
              width={isExpanded ? 80 : 48}
              height={isExpanded ? 80 : 48}
              className="hidden dark:block object-contain"
              priority
            />
          </div>

          {/* Brand Name - fade in/out */}
          <div
            className={`font-azonix mt-3 transition-all duration-300 ease-out overflow-hidden ${isExpanded ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0'
              }`}
          >
            <span className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary tracking-wider whitespace-nowrap">
              MEDBRAVE
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav>
          <ul className="space-y-2">
            {mainMenuItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${isExpanded ? 'gap-3' : 'gap-0 justify-center'
                    } ${isItemActive(item.href)
                      ? 'bg-sidebar-active-light dark:bg-sidebar-active-dark text-primary dark:text-white font-semibold'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark hover:text-primary dark:hover:text-white'
                    }`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <span className="material-symbols-outlined flex-shrink-0 text-xl">{item.icon}</span>
                  <span className={`whitespace-nowrap font-inter overflow-hidden transition-all duration-200 ${isExpanded ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0'
                    }`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom Section */}
      <div>
        {/* Secondary Navigation */}
        <nav>
          <ul className="space-y-2 border-t border-border-light dark:border-border-dark pt-6">
            {secondaryMenuItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${isExpanded ? 'gap-3' : 'gap-0 justify-center'
                    } text-text-light-secondary dark:text-text-dark-secondary hover:bg-sidebar-active-light dark:hover:bg-sidebar-active-dark hover:text-primary dark:hover:text-white`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <span className="material-symbols-outlined flex-shrink-0 text-xl">{item.icon}</span>
                  <span className={`whitespace-nowrap font-inter overflow-hidden transition-all duration-200 ${isExpanded ? 'opacity-100 w-auto ml-3' : 'opacity-0 w-0 ml-0'
                    }`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Premium Banner */}
        {isExpanded && (
          <div className="mt-6">
            <UserPlanCard />
          </div>
        )}
      </div>
    </aside>
  );
}
