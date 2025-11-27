import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - MedBRAVE',
  description: 'Seja Corajoso, Seja BRAVE!',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
