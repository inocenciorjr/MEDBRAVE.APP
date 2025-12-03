'use client';

import { CompactPlanner } from './CompactPlanner';
import { TodayReviewsSection } from './TodayReviewsSection';
import { PendingItemsSection } from './PendingItemsSection';
import { useIsMobile } from '@/hooks/useMediaQuery';

export default function RightSidebar() {
  const isMobile = useIsMobile();

  return (
    <div className={`
      bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl dark:shadow-dark-xl
      ${isMobile ? 'p-4' : 'p-6'}
    `}>
      {/* Compact Planner */}
      <CompactPlanner daysToShow={5} />
      
      {/* Divider */}
      <div className={`border-t border-border-light dark:border-border-dark ${isMobile ? 'my-4' : 'my-6'}`} />
      
      {/* Today's Reviews */}
      <TodayReviewsSection />
      
      {/* Divider */}
      <div className={`border-t border-border-light dark:border-border-dark ${isMobile ? 'my-4' : 'my-6'}`} />
      
      {/* Pending Items (Lists & Simulados) */}
      <PendingItemsSection />
    </div>
  );
}
