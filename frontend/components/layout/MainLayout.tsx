'use client';

import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useFocusMode } from '@/lib/contexts/FocusModeContext';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface MainLayoutProps {
  children: ReactNode;
  showGreeting?: boolean;
}

export default function MainLayout({ children, showGreeting = true }: MainLayoutProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { isFocusMode } = useFocusMode();
  const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const handleMouseEnter = () => {
    if (isMobile) return; // Disable hover on mobile
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      setLeaveTimeout(null);
    }
    setIsSidebarExpanded(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return; // Disable hover on mobile
    const timeout = setTimeout(() => {
      setIsSidebarExpanded(false);
    }, 300);
    setLeaveTimeout(timeout);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && isMobileSidebarOpen && !isFocusMode && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {!isFocusMode && (
        <>
          {isMobile ? (
            // Mobile Sidebar - Slide from left
            <div
              className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <Sidebar 
                isCollapsed={false} 
                isMobile={true}
                onClose={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          ) : (
            // Desktop Sidebar - Hover to expand
            <div
              className="fixed inset-y-0 left-0 z-50 pointer-events-auto"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Sidebar isCollapsed={!isSidebarExpanded} isMobile={false} />
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <main className={`w-full overflow-y-auto h-screen bg-background-light dark:bg-background-dark transition-all duration-300 ${
        isFocusMode ? '' : isMobile ? '' : 'pl-24'
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
                onMenuClick={isMobile ? toggleMobileSidebar : undefined}
                showMenuButton={isMobile}
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
