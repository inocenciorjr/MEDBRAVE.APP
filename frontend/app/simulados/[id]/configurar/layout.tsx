import MainLayout from '@/components/layout/MainLayout';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { ReactNode } from 'react';

interface ConfigurarLayoutProps {
  children: ReactNode;
}

export default function ConfigurarLayout({ children }: ConfigurarLayoutProps) {
  return (
    <PagePlanGuard>
      <MainLayout showGreeting={false}>{children}</MainLayout>
    </PagePlanGuard>
  );
}
