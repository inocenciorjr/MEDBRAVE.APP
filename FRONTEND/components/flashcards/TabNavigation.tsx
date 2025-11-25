'use client';

import Link from 'next/link';
import { TabType } from '@/types/flashcards';

interface TabNavigationProps {
  activeTab: TabType;
}

export function TabNavigation({ activeTab }: TabNavigationProps) {
  const tabs = [
    { id: 'minhas-colecoes' as TabType, label: 'Minhas Coleções', href: '/flashcards/colecoes' },
    { id: 'comunidade' as TabType, label: 'Comunidade', href: '/flashcards/comunidade' },
  ];

  return (
    <div className="border-b border-border-light dark:border-border-dark">
      <nav className="flex space-x-8" aria-label="Tabs" role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`py-3 text-base font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-text-light-secondary dark:text-text-dark-secondary border-transparent hover:text-text-light-primary dark:hover:text-text-dark-primary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
