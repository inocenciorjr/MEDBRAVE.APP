'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useFocusMode } from '@/lib/contexts/FocusModeContext';

interface MainLayoutProps {
  children: ReactNode;
  showGreeting?: boolean;
}

export default function MainLayout({ children, showGreeting = true }: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isFocusMode } = useFocusMode();

  const mockUser = {
    name: 'Anna',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1o3eVma5ckpj1-1Eac5D6fZKEqusRUpzKYUZHAF80Bt0bXVqjxi8fkM66WAWCEsSm8R97008pc9zpMTNvfsRzQp4nSD5ELDwToCX39l7V43LwM9E2ePZN8CDo38trdQ4wYxcsgQ1LGGrCALmlSnYCBIievBMG09aZwcRI1O2ybP4-BWtfe3Z2JFrJ76MMPRufHGSOFiFtwMVXUc2XqsrDqeMibdYQy2X1Ev1gdiBILrH7eDa8O2qIjvAEagtYHaJOS3nif6315EA',
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {!isFocusMode && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: drawer - Hidden in Focus Mode */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out ${
          isFocusMode 
            ? 'w-0 opacity-0 overflow-hidden' 
            : isMobileSidebarOpen 
              ? 'translate-x-0 opacity-100' 
              : '-translate-x-full lg:translate-x-0 lg:opacity-100'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen bg-background-light dark:bg-background-dark">
        <div className={`transition-all duration-500 ease-in-out ${isFocusMode ? 'p-0 h-full' : 'p-4 md:p-8'}`}>
          {/* Mobile Menu Button - Hidden in Focus Mode */}
          {!isFocusMode && (
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden mb-4 p-2 rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:text-primary transition-colors"
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          )}

          {/* Header - Hidden in Focus Mode */}
          <div className={`transition-all duration-500 ease-in-out ${
            isFocusMode ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'
          }`}>
            <Header 
              userName={mockUser.name}
              userAvatar={mockUser.avatar}
              notificationCount={1}
              showGreeting={showGreeting}
            />
          </div>
          
          <div className={`transition-all duration-500 ease-in-out ${isFocusMode ? 'h-full py-8' : ''}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
