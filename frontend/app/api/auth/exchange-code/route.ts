import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, codeVerifier } = await request.json();

    console.log('[exchange-code] Recebido:', { code: code?.substring(0, 10) + '...', codeVerifier: codeVerifier?.substring(0, 10) + '...' });

    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: 'code e codeVerifier são obrigatórios' },
        { status: 400 }
      );
    }

    // Formato correto para PKCE exchange no Supabase
    // Ref: https://supabase.com/docs/guides/auth/sessions/pkce-flow
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({
          auth_code: code,
          code_verifier: codeVerifier,
        }),
      }
    );

    const data = await response.json();
    console.log('[exchange-code] Supabase response:', response.status, JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      const errorMsg = data.error_description || data.msg || data.error || 'Erro na autenticação';
      console.error('[exchange-code] Erro Supabase:', errorMsg);
      return NextResponse.json(
        { error: errorMsg, details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
      expires_in: data.expires_in,
    });
  } catch (error: any) {
    console.error('[exchange-code] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
