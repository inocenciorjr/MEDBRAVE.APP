'use client';

import { useRef } from 'react';

interface HorizontalCarouselProps {
  children: React.ReactNode;
}

export function HorizontalCarousel({ children }: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      const newScrollLeft =
        direction === 'left'
          ? scrollRef.current.scrollLeft - scrollAmount
          : scrollRef.current.scrollLeft + scrollAmount;

      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative" style={{ overflowY: 'visible' }}>
      <div className="absolute right-0 top-0 flex items-center gap-2 z-10">
        <button
          onClick={() => scroll('left')}
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-2 rounded-full shadow-lg hover:bg-background-light dark:hover:bg-background-dark transition"
          aria-label="Rolar para esquerda"
        >
          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
            chevron_left
          </span>
        </button>
        <button
          onClick={() => scroll('right')}
          className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark p-2 rounded-full shadow-lg hover:bg-background-light dark:hover:bg-background-dark transition"
          aria-label="Rolar para direita"
        >
          <span className="material-symbols-outlined text-text-light-secondary dark:text-text-dark-secondary">
            chevron_right
          </span>
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex overflow-x-auto pt-4 pb-4 -mt-4 -mb-4 space-x-6 scroll-smooth no-scrollbar"
        style={{ overflowY: 'visible' }}
      >
        {children}
      </div>
    </div>
  );
}
