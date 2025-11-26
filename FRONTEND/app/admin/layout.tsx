import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';

/**
 * Layout Server-Side para área administrativa
 * Verifica autenticação e permissões ANTES de renderizar a UI
 */
export default async function AdminServerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // Pegar token dos cookies customizados
  const accessToken = cookieStore.get('sb-access-token')?.value;

  console.log('[Admin Layout SSR] Cookies disponíveis:', cookieStore.getAll().map(c => c.name));
  console.log('[Admin Layout SSR] Token encontrado:', accessToken ? 'SIM' : 'NÃO');

  if (!accessToken) {
    console.log('[Admin Layout SSR] Sem token, redirecionando para login');
    redirect('/login?redirect=/admin');
  }

  // Verificar role chamando o backend
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/user/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      redirect('/login?redirect=/admin');
    }

    const user = await response.json();
    const role = user.role?.toUpperCase();
    
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      redirect('/login?redirect=/admin');
    }
  } catch (error) {
    redirect('/login?redirect=/admin');
  }

  // Usuário é admin, renderizar a UI
  return <AdminLayout>{children}</AdminLayout>;
}
