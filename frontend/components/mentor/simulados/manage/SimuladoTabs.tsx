'use client';

type TabType = 'overview' | 'edit' | 'participants' | 'progress' | 'analytics';

interface SimuladoTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  canEdit: boolean;
}

export function SimuladoTabs({ activeTab, onTabChange, canEdit }: SimuladoTabsProps) {
  const tabs: Array<{ id: TabType; label: string; icon: string; requiresEdit?: boolean; gradient: string }> = [
    { id: 'overview', label: 'Visão Geral', icon: 'dashboard', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'edit', label: 'Editar', icon: 'edit', requiresEdit: true, gradient: 'from-violet-500 to-purple-500' },
    { id: 'participants', label: 'Participantes', icon: 'group', gradient: 'from-emerald-500 to-green-500' },
    { id: 'progress', label: 'Progresso', icon: 'trending_up', gradient: 'from-orange-500 to-amber-500' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics', gradient: 'from-pink-500 to-rose-500' }
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
          const isDisabled = tab.requiresEdit && !canEdit;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={`
                relative flex items-center gap-3 px-6 py-5 text-sm font-semibold 
                transition-all duration-300 whitespace-nowrap group flex-1 min-w-[140px]
                ${isActive 
                  ? 'text-primary' 
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
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
                relative z-10 w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-300 shadow-sm
                ${isActive 
                  ? `bg-gradient-to-br ${tab.gradient} shadow-lg` 
                  : 'bg-background-light dark:bg-background-dark group-hover:bg-border-light dark:group-hover:bg-border-dark'
                }
              `}>
                <span className={`
                  material-symbols-outlined text-xl
                  transition-all duration-300
                  ${isActive 
                    ? 'text-white scale-110' 
                    : 'text-text-light-secondary dark:text-text-dark-secondary group-hover:scale-105'
                  }
                `}>
                  {tab.icon}
                </span>
              </div>
              
              {/* Label */}
              <span className="relative z-10 hidden sm:inline">{tab.label}</span>
              
              {/* Lock icon for disabled tabs */}
              {isDisabled && (
                <span className="material-symbols-outlined text-sm relative z-10 text-red-500 ml-1">
                  lock
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
