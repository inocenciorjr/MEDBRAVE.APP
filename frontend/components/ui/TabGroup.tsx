'use client';

import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabGroupProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function TabGroup({ tabs, activeTab, onChange, className = '' }: TabGroupProps) {
  return (
    <div className={`grid gap-3 ${className}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-6 py-4 rounded-xl font-semibold text-base transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-primary/10 dark:bg-primary/20 text-primary shadow-md'
              : 'bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary border border-border-light dark:border-border-dark'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {tab.icon && <span className="material-symbols-outlined text-xl">{tab.icon}</span>}
            {tab.label}
          </div>
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-b-xl"></div>
          )}
        </button>
      ))}
    </div>
  );
}
