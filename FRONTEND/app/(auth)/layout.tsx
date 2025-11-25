import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - MEDBRAVE Admin',
  description: 'Acesse o painel administrativo do MEDBRAVE',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
