'use client';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-1.5 rounded-lg 
                    inline-flex gap-1 shadow-sm dark:shadow-dark-lg 
                    border border-border-light dark:border-border-dark">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
            activeTab === tab.id
              ? 'bg-primary text-white shadow-md'
              : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark'
          }`}
        >
          {tab.icon && (
            <span className="material-symbols-outlined text-lg">
              {tab.icon}
            </span>
          )}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
