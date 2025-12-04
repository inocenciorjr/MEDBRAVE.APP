import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();
    
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Missing tokens' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    // Configurar cookies com as opções corretas
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: 'lax' as const,
      secure: isProduction,
      // Remover domínio explícito para evitar problemas com subdomínios/www no Edge Mobile
      // ...(isProduction && { domain: '.medbrave.com.br' })
    };

    cookieStore.set('sb-access-token', accessToken, cookieOptions);
    cookieStore.set('sb-refresh-token', refreshToken, cookieOptions);

    console.log('[Set Cookies API] Cookies configurados com sucesso');
    console.log('[Set Cookies API] Options:', cookieOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Set Cookies API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
