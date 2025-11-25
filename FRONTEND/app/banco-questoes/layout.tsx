import MainLayout from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface BancoQuestoesLayoutProps {
  children: ReactNode;
}

export default function BancoQuestoesLayout({ children }: BancoQuestoesLayoutProps) {
  return <MainLayout showGreeting={false}>{children}</MainLayout>;
}
