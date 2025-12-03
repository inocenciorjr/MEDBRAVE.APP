import MainLayout from '@/components/layout/MainLayout';
import { PagePlanGuard } from '@/components/guards/PagePlanGuard';
import { ReactNode } from 'react';

interface ResolucaoQuestoesLayoutProps {
  children: ReactNode;
}

export default function ResolucaoQuestoesLayout({ children }: ResolucaoQuestoesLayoutProps) {
  return (
    <PagePlanGuard>
      <MainLayout showGreeting={false}>{children}</MainLayout>
    </PagePlanGuard>
  );
}
