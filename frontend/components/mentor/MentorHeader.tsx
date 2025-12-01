'use client';

import { useState } from 'react';
import Image from 'next/image';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface MentorHeaderProps {
  mentorProfile: any;
  onMenuClick: () => void;
}

export default function MentorHeader({ mentorProfile, onMenuClick }: MentorHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl border-b border-border-light dark:border-border-dark">
      <div className="px-4 md:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Menu Button (Mobile) + Greeting */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-light-primary dark:text-text-dark-primary">
                menu
              </span>
            </button>

            <div className="hidden md:block">
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Bem-vindo de volta,
              </p>
              <h2 className="text-lg font-display font-semibold text-text-light-primary dark:text-text-dark-primary">
                {mentorProfile?.name || 'Mentor'}
              </h2>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark">
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar mentorado..."
                className="bg-transparent border-none outline-none text-sm text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary w-48"
              />
            </div>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-all duration-200 hover:scale-105"
            >
              <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
                notifications
              </span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Profile */}
            <div className="flex items-center gap-3 pl-3 border-l border-border-light dark:border-border-dark">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-primary/10 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200 cursor-pointer">
                {mentorProfile?.avatar ? (
                  <Image src={mentorProfile.avatar} alt={mentorProfile.name || 'Mentor'} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
