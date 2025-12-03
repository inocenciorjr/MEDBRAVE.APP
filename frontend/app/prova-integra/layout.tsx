import MainLayout from '@/components/layout/MainLayout';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { ReactNode } from 'react';

interface ProvaIntegraLayoutProps {
  children: ReactNode;
}

export default function ProvaIntegraLayout({ children }: ProvaIntegraLayoutProps) {
  return (
    <PagePlanGuard>
      <MainLayout showGreeting={false}>{children}</MainLayout>
    </PagePlanGuard>
  );
}
