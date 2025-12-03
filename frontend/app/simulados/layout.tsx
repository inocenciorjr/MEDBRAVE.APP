import MainLayout from '@/components/layout/MainLayout';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { ReactNode } from 'react';

interface SimuladosLayoutProps {
  children: ReactNode;
}

export default function SimuladosLayout({ children }: SimuladosLayoutProps) {
  return (
    <PagePlanGuard>
      <MainLayout showGreeting={false}>{children}</MainLayout>
    </PagePlanGuard>
  );
}
