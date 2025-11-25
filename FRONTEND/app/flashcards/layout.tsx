import MainLayout from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface FlashcardsLayoutProps {
  children: ReactNode;
}

export default function FlashcardsLayout({ children }: FlashcardsLayoutProps) {
  return <MainLayout showGreeting={false}>{children}</MainLayout>;
}
