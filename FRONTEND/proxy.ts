import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteger rotas /admin/*
  if (pathname.startsWith('/admin')) {
    const { supabase, response: supabaseResponse } = createClient(request);

    const accessToken = request.cookies.get('sb-access-token')?.value;
    
    let authUser = null;
    let authError = null;
    
    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      authUser = data.user;
      authError = error;
    } else {
      const { data, error } = await supabase.auth.getUser();
      authUser = data.user;
      authError = error;
    }

    if (authError || !authUser) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Verificar role no backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/user/me`, {
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

      const user = await response.json();
      const role = user.role?.toUpperCase();
      
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
  return NextResponse.next();
}

// Configurar quais rotas o middleware deve processar
export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
