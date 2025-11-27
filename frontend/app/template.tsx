'use client';

import { ReactNode } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';

export default function Template({ children }: { children: ReactNode }) {
  return (
    <FadeIn duration={200}>
      {children}
    </FadeIn>
  );
}
