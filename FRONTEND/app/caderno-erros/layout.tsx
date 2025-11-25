import MainLayout from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface CadernoErrosLayoutProps {
  children: ReactNode;
}

export default function CadernoErrosLayout({ children }: CadernoErrosLayoutProps) {
  return <MainLayout showGreeting={false}>{children}</MainLayout>;
}
