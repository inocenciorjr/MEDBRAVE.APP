import MainLayout from '@/components/layout/MainLayout';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { ReactNode } from 'react';

interface AquecimentoLayoutProps {
  children: ReactNode;
}

export default function AquecimentoLayout({ children }: AquecimentoLayoutProps) {
  return (
    <PagePlanGuard>
      <MainLayout showGreeting={false}>{children}</MainLayout>
    </PagePlanGuard>
  );
}
