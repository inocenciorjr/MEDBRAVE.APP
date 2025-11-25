import MainLayout from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface RevisoesLayoutProps {
  children: ReactNode;
}

export default function RevisoesLayout({ children }: RevisoesLayoutProps) {
  return <MainLayout showGreeting={false}>{children}</MainLayout>;
}
