'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import PremiumBanner from '@/components/ui/PremiumBanner';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
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
  { id: 'aquecimento', label: 'Aquecimento', icon: 'sports_esports', href: '/aquecimento' },
  { id: 'statistics', label: 'Painel de Métricas', icon: 'analytics', href: '/statistics' },
];

const secondaryMenuItems: MenuItem[] = [
  { id: 'configuracoes', label: 'Configurações', icon: 'settings', href: '/configuracoes' },
  { id: 'sair', label: 'Sair', icon: 'logout', href: '/sair' },
];

export default function Sidebar({ isCollapsed: controlledCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  // Start with false to match server render
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Função para verificar se o item está ativo
  const isItemActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  // Load pinned state from localStorage after mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebarPinned');
    if (stored === 'true') {
      setIsPinned(true);
    }
  }, []);

  // Sidebar is expanded if pinned OR hovered
  const isExpanded = isPinned || isHovered;

  // Debounce hover para evitar travamentos
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => setIsHovered(true), 50); // 50ms delay
    setHoverTimeout(timeout);
  }, [hoverTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setIsHovered(false);
  }, [hoverTimeout]);

  const handlePin = useCallback(() => {
    const newState = !isPinned;
    setIsPinned(newState);
    localStorage.setItem('sidebarPinned', String(newState));
  }, [isPinned]);

  return (
    <aside
      className={`relative bg-sidebar-light dark:bg-sidebar-dark p-4 ml-2 mr-4 my-4 rounded-2xl flex flex-col justify-between h-[calc(100vh-2rem)] transition-all duration-300 ease-out shadow-xl dark:shadow-dark-xl will-change-[width] ${isExpanded ? 'w-72' : 'w-20'
        }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Section */}
      <div>
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

          {/* Pin Button - only show when expanded */}
          <button
            onClick={handlePin}
            className={`text-text-light-secondary dark:text-text-dark-secondary hover:text-primary dark:hover:text-primary transition-all duration-300 absolute top-0 right-0 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } ${isPinned ? 'text-primary' : ''}`}
            aria-label={isPinned ? 'Desafixar sidebar' : 'Fixar sidebar'}
            title={isPinned ? 'Desafixar sidebar' : 'Fixar sidebar'}
          >
            <span className="material-symbols-outlined text-lg">
              {isPinned ? 'push_pin' : 'push_pin'}
            </span>
          </button>
        </div>

        {/* Main Navigation */}
        <nav>
          <ul className="space-y-2">
            {mainMenuItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
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
            <PremiumBanner />
          </div>
        )}
      </div>
    </aside>
  );
}
