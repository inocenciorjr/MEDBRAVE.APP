import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('[Recover Session] Tentando recuperar sessão via cookies...');
    const cookieStore = await cookies();
    
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      console.log('[Recover Session] Cookies não encontrados');
      return NextResponse.json(
        { error: 'No session cookies found' },
        { status: 401 }
      );
    }

    console.log('[Recover Session] Cookies encontrados, validando com Supabase...');

    // Validar o token com o Supabase para garantir que ainda é válido
    // Usamos o cliente admin para validar o token sem precisar de uma sessão no servidor
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tentar obter o usuário com o token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log('[Recover Session] Token inválido ou expirado:', error?.message);
      
      // Se o token expirou, poderíamos tentar usar o refresh token aqui
      // Mas por enquanto vamos retornar erro e deixar o client tentar fazer o refresh se quiser
      // Ou melhor: vamos retornar os tokens que temos e deixar o client lidar com a renovação
      // Mas é arriscado retornar tokens inválidos.
      
      // Vamos retornar os tokens mesmo assim, pois o client pode usar o refresh token
      console.log('[Recover Session] Retornando tokens para tentativa de refresh no client');
    } else {
      console.log('[Recover Session] Token válido para usuário:', user.email);
    }

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: user || null // Pode ser null se o token estiver expirado
    });

  } catch (error: any) {
    console.error('[Recover Session] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
