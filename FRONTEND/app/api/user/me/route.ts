import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    console.log('[API Route /api/user/me] === INÍCIO DA REQUISIÇÃO ===');
    
    // Tentar pegar o token do header Authorization (requisições client-side)
    let authHeader = request.headers.get('authorization');
    console.log('[API Route /api/user/me] Authorization header:', authHeader ? 'presente' : 'ausente');
    
    // Se não tiver no header, tentar pegar dos cookies (requisições SSR)
    if (!authHeader) {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      console.log('[API Route /api/user/me] Todos os cookies:', allCookies.map(c => c.name));
      
      const accessToken = cookieStore.get('sb-access-token')?.value;
      console.log('[API Route /api/user/me] Cookie sb-access-token:', accessToken ? 'encontrado' : 'NÃO ENCONTRADO');
      
      if (accessToken) {
        authHeader = `Bearer ${accessToken}`;
        console.log('[API Route /api/user/me] Token do cookie será usado');
      }
    }
    
    if (!authHeader) {
      console.log('[API Route /api/user/me] ❌ Nenhum token encontrado - retornando 401');
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }
    
    console.log('[API Route /api/user/me] ✅ Token encontrado - fazendo requisição ao backend');

    const response = await fetch(`${BACKEND_URL}/api/user/me`, {
      headers: {
        'Authorization': authHeader,
      },
    });
    
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Route /api/user/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
