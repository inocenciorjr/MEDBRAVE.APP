import MainLayout from '@/components/layout/MainLayout';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { ReactNode } from 'react';

interface PerfilLayoutProps {
  children: ReactNode;
}

export default function PerfilLayout({ children }: PerfilLayoutProps) {
  return (
    <PagePlanGuard>
      <MainLayout showGreeting={false}>{children}</MainLayout>
    </PagePlanGuard>
  );
}
