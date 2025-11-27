import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Create supabase client and get response object
  const { supabase, response: supabaseResponse } = createClient(request);

  // 2. Refresh session/Get User
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Define Public Paths (Global Auth Guard)
  const isPublicPath = 
    pathname === '/login' || 
    pathname.startsWith('/auth/') || 
    pathname.startsWith('/_next/') || 
    pathname.startsWith('/static/') ||
    pathname.startsWith('/api/') || 
    pathname.includes('.'); 

  // --- Lógica de Proteção Global (Copiada do middleware.ts) ---
  
  // Se não estiver logado e tentar acessar rota protegida
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') {
        url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  // Se estiver logado e tentar acessar login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // --- Lógica de Proteção do Admin (Existente) ---
  if (pathname.startsWith('/admin')) {
    // Note: user is already fetched above
    const accessToken = request.cookies.get('sb-access-token')?.value;
    
    // Verificação redundante de segurança para garantir user atualizado
    if (!user) {
        // Should be caught by global check, but double safety
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // Verificar role no backend
    try {
      const { BACKEND_URL } = await import('./lib/config');
      const response = await fetch(`${BACKEND_URL}/api/user/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }

      const userData = await response.json();
      const role = userData.role?.toUpperCase();
      
      if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }

      return supabaseResponse;
    } catch (fetchError) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Outras rotas, permitir acesso
  return supabaseResponse;
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
