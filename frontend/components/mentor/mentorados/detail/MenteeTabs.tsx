'use client';

import { TrendingUp, Award, BookOpen, DollarSign, Calendar, Target } from 'lucide-react';

export type MenteeTabId = 'overview' | 'performance' | 'simulados' | 'financial' | 'charges' | 'actions';

interface MenteeTabsProps {
  activeTab: MenteeTabId;
  onTabChange: (tab: MenteeTabId) => void;
}

export function MenteeTabs({ activeTab, onTabChange }: MenteeTabsProps) {
  const tabs: Array<{ 
    id: MenteeTabId; 
    label: string; 
    icon: React.ComponentType<{ className?: string }>; 
    gradient: string;
  }> = [
    { id: 'overview', label: 'Visão Geral', icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'performance', label: 'Desempenho', icon: Award, gradient: 'from-violet-500 to-purple-500' },
    { id: 'simulados', label: 'Simulados', icon: BookOpen, gradient: 'from-emerald-500 to-green-500' },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, gradient: 'from-orange-500 to-amber-500' },
    { id: 'charges', label: 'Cobranças', icon: Calendar, gradient: 'from-pink-500 to-rose-500' },
    { id: 'actions', label: 'Ações', icon: Target, gradient: 'from-red-500 to-rose-500' },
  ];

  return (
    <div className="relative bg-gradient-to-br from-surface-light via-surface-light to-primary/5 
                    dark:from-surface-dark dark:via-surface-dark dark:to-primary/10 
                    rounded-2xl border-2 border-border-light dark:border-border-dark 
                    shadow-xl dark:shadow-dark-xl overflow-hidden
                    transition-all duration-300">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50" />
      
      <div className="relative flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-3 px-4 md:px-6 py-4 md:py-5 text-sm font-semibold 
                transition-all duration-300 whitespace-nowrap group flex-1 min-w-[100px] md:min-w-[140px]
                ${isActive 
                  ? 'text-primary' 
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }
                ${index > 0 ? 'border-l border-border-light/50 dark:border-border-dark/50' : ''}
              `}
            >
              {/* Active indicator - bottom line */}
              <div className={`
                absolute bottom-0 left-0 right-0 h-1 rounded-t-full
                transition-all duration-300 transform
                ${isActive 
                  ? `bg-gradient-to-r ${tab.gradient} scale-x-100 opacity-100` 
                  : 'scale-x-0 opacity-0'
                }
              `} />
              
              {/* Active indicator - top glow */}
              {isActive && (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r ${tab.gradient} blur-md opacity-60`} />
              )}
              
              {/* Hover background */}
              <div className={`
                absolute inset-0 transition-all duration-300
                ${isActive 
                  ? 'bg-gradient-to-b from-primary/10 via-primary/5 to-transparent' 
                  : 'bg-transparent group-hover:bg-gradient-to-b group-hover:from-border-light/30 dark:group-hover:from-border-dark/30 group-hover:to-transparent'
                }
              `} />
              
              {/* Icon container */}
              <div className={`
                relative z-10 w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center
                transition-all duration-300 shadow-sm
                ${isActive 
                  ? `bg-gradient-to-br ${tab.gradient} shadow-lg` 
                  : 'bg-background-light dark:bg-background-dark group-hover:bg-border-light dark:group-hover:bg-border-dark'
                }
              `}>
                <Icon className={`
                  w-4 h-4 md:w-5 md:h-5
                  transition-all duration-300
                  ${isActive 
                    ? 'text-white scale-110' 
                    : 'text-text-light-secondary dark:text-text-dark-secondary group-hover:scale-105'
                  }
                `} />
              </div>
              
              {/* Label */}
              <span className="relative z-10 hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
