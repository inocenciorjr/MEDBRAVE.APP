import MainLayout from '@/components/layout/MainLayout';
import { ReactNode } from 'react';

interface ListaQuestoesLayoutProps {
  children: ReactNode;
}

export default function ListaQuestoesLayout({ children }: ListaQuestoesLayoutProps) {
  return <MainLayout showGreeting={false}>{children}</MainLayout>;
}
