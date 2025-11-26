'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevenir execução dupla
    if (hasRun.current) {
      console.log('[Auth Callback] Execução já iniciada, ignorando...');
      return;
    }
    hasRun.current = true;

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const redirect = searchParams.get('redirect') || '/';

        console.log('[Auth Callback] ===== INÍCIO DO CALLBACK =====');
        console.log('[Auth Callback] Origin atual:', window.location.origin);
        console.log('[Auth Callback] URL completa:', window.location.href);
        console.log('[Auth Callback] Code presente:', code ? 'SIM' : 'NÃO');
        console.log('[Auth Callback] Redirect solicitado:', redirect);

        if (code) {
          // Verificar se a sessão já foi estabelecida automaticamente pelo Supabase
          console.log('[Auth Callback] Verificando se sessão já existe...');
          let { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            // Sessão não existe, tentar trocar código
            console.log('[Auth Callback] Tentando trocar código por sessão...');
            const result = await supabase.auth.exchangeCodeForSession(code);
            
            if (result.error) {
              console.error('[Auth Callback] Erro ao trocar código:', result.error.message, result.error.status);
              
              // Aguardar e tentar pegar sessão novamente
              await new Promise(resolve => setTimeout(resolve, 2000));
              const sessionCheck = await supabase.auth.getSession();
              session = sessionCheck.data.session;
            } else {
              session = result.data.session;
            }
          } else {
            console.log('[Auth Callback] ✅ Sessão já estabelecida automaticamente!');
          }

          // Se temos sessão (de qualquer forma), processar
          if (session) {
            console.log('[Auth Callback] ✅ Sessão encontrada! Redirecionando para:', redirect);
            console.log('[Auth Callback] Token da sessão:', session.access_token.substring(0, 20) + '...');

            // Salvar token no localStorage para o AuthContext
            if (typeof window !== 'undefined') {
              localStorage.setItem('authToken', session.access_token);
              localStorage.setItem('user', JSON.stringify({
                uid: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.display_name || session.user.email,
                photoURL: session.user.user_metadata?.avatar_url || null,
                emailVerified: !!session.user.email_confirmed_at,
                role: 'student'
              }));
              console.log('[Auth Callback] Token e usuário salvos no localStorage');

              // Salvar nos cookies via API route (para SSR)
              try {
                console.log('[Auth Callback] Salvando cookies via API route...');
                const cookieResponse = await fetch('/api/auth/set-cookies', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken: session.access_token,
                    refreshToken: session.refresh_token
                  })
                });

                if (cookieResponse.ok) {
                  console.log('[Auth Callback] ✅ Cookies salvos com sucesso via API route');
                } else {
                  console.error('[Auth Callback] ❌ Erro ao salvar cookies:', await cookieResponse.text());
                }
              } catch (cookieError) {
                console.error('[Auth Callback] ❌ Erro ao chamar API de cookies:', cookieError);
              }

              // Redirecionar
              if (window.opener) {
                console.log('[Auth Callback] Popup detectado - enviando mensagem e fechando...');
                window.opener.postMessage({ type: 'auth-success' }, window.location.origin);
                await new Promise(resolve => setTimeout(resolve, 500));
                window.close();
              } else {
                console.log('[Auth Callback] Redirecionando com reload completo...');
                const redirectUrl = redirect.startsWith('http') ? redirect : `${window.location.origin}${redirect}`;
                console.log('[Auth Callback] URL final de redirect:', redirectUrl);
                window.location.href = redirectUrl;
              }
            }
          } else {
            // Não conseguiu obter sessão
            console.error('[Auth Callback] ❌ Não foi possível obter sessão');
            setError('Erro ao autenticar. Tente fazer login novamente.');
            setTimeout(() => router.push('/login'), 3000);
          }
        } else {
          // Implicit flow - tokens no hash
          if (window.location.hash.includes('access_token')) {
            console.log('[Auth Callback] Tokens no hash detectados - aguardando processamento...');
            // Aguardar Supabase processar
            await new Promise(resolve => setTimeout(resolve, 1000));
            router.push(redirect);
          } else {
            console.log('[Auth Callback] Sem código ou tokens - redirecionando para login...');
            // Sem autenticação
            if (window.opener) {
              window.close();
            } else {
              router.push('/login');
            }
          }
        }
      } catch (err) {
        console.error('[Auth Callback] Erro não tratado:', err);
        setError('Erro ao processar autenticação.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
