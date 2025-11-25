import MainLayout from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface StatisticsLayoutProps {
  children: ReactNode;
}

export default function StatisticsLayout({ children }: StatisticsLayoutProps) {
  return <MainLayout showGreeting={false}>{children}</MainLayout>;
}
