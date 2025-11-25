import { ReactNode } from 'react';

interface EstudoLayoutProps {
  children: ReactNode;
}

export default function EstudoLayout({ children }: EstudoLayoutProps) {
  // Página de estudo sem MainLayout (tela cheia)
  return <>{children}</>;
}
