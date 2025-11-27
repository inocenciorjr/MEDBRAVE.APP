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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { isFocusMode } = useFocusMode();
  const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Removido mockUser - agora o Header busca dados reais do usuário

  const handleMouseEnter = () => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      setLeaveTimeout(null);
    }
    setIsSidebarExpanded(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsSidebarExpanded(false);
    }, 300); // 300ms delay antes de fechar
    setLeaveTimeout(timeout);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Sempre visível colapsada, expande ao passar o mouse */}
      {!isFocusMode && (
        <>
          {/* Área de hover invisível que começa na borda esquerda */}
          <div
            className="fixed inset-y-0 left-0 z-50 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Sidebar isCollapsed={!isSidebarExpanded} />
          </div>
        </>
      )}

      {/* Main Content - Sempre com padding-left para não ficar atrás da sidebar colapsada */}
      <main className={`w-full overflow-y-auto h-screen bg-background-light dark:bg-background-dark transition-all duration-300 ${
        isFocusMode ? '' : 'pl-24'
      }`}>
        <div className={`transition-all duration-500 ease-in-out ${isFocusMode ? 'p-0 h-full' : 'p-4 md:p-8'}`}>
          <div className={`${isFocusMode ? '' : 'max-w-[1600px] mx-auto'}`}>
          {/* Header - Hidden in Focus Mode */}
          <div className={`transition-all duration-500 ease-in-out ${
            isFocusMode ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'
          }`}>
            <Header 
              notificationCount={1}
              showGreeting={showGreeting}
            />
          </div>
          
            <div className={`transition-all duration-500 ease-in-out ${isFocusMode ? 'h-full py-8' : ''}`}>
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
