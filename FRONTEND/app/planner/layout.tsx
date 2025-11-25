import MainLayout from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface PlannerLayoutProps {
  children: ReactNode;
}

export default function PlannerLayout({ children }: PlannerLayoutProps) {
  return <MainLayout showGreeting={false}>{children}</MainLayout>;
}
