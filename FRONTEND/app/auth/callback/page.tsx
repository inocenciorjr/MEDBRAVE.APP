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

        console.log('[Auth Callback] Iniciando callback com code:', code ? 'presente' : 'ausente');
        console.log('[Auth Callback] Redirect para:', redirect);

        if (code) {
          // Trocar code por sessão (PKCE flow)
          console.log('[Auth Callback] Tentando trocar código por sessão...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[Auth Callback] Erro ao trocar código:', exchangeError.message, exchangeError.status);

            // Se erro 400, código pode ter sido usado - aguardar e verificar sessão
            if (exchangeError.status === 400) {
              console.log('[Auth Callback] Erro 400 - aguardando sessão ser estabelecida...');

              // Aguardar um pouco para sessão ser estabelecida
              await new Promise(resolve => setTimeout(resolve, 2000));

              // Verificar se já está logado
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              console.log('[Auth Callback] Verificação de sessão:', {
                hasSession: !!sessionData?.session,
                error: sessionError?.message
              });

              if (sessionData?.session) {
                console.log('[Auth Callback] ✅ Sessão encontrada! Redirecionando para:', redirect);
                console.log('[Auth Callback] Token da sessão:', sessionData.session.access_token.substring(0, 20) + '...');

                // Salvar token no localStorage para o AuthContext
                if (typeof window !== 'undefined') {
                  localStorage.setItem('authToken', sessionData.session.access_token);
                  localStorage.setItem('user', JSON.stringify({
                    uid: sessionData.session.user.id,
                    email: sessionData.session.user.email,
                    displayName: sessionData.session.user.user_metadata?.display_name || sessionData.session.user.email,
                    photoURL: sessionData.session.user.user_metadata?.avatar_url || null,
                    emailVerified: !!sessionData.session.user.email_confirmed_at,
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
                        accessToken: sessionData.session.access_token,
                        refreshToken: sessionData.session.refresh_token
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

                  // Usar window.location.href para forçar reload completo
                  console.log('[Auth Callback] Redirecionando com reload completo...');
                  window.location.href = redirect;
                }
                return;
              }

              // Tentar refresh da sessão
              console.log('[Auth Callback] Tentando refresh da sessão...');
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

              if (refreshData?.session) {
                console.log('[Auth Callback] ✅ Sessão recuperada via refresh! Redirecionando...');
                router.push(redirect);
                return;
              }

              console.error('[Auth Callback] ❌ Não foi possível recuperar sessão:', refreshError?.message);
            }

            setError('Erro ao autenticar. Tente fazer login novamente.');
            setTimeout(() => router.push('/login'), 3000);
            return;
          }

          console.log('[Auth Callback] ✅ Código trocado com sucesso!');
          console.log('[Auth Callback] 🔍 data?.session existe?', !!data?.session);
          console.log('[Auth Callback] 🔍 data completo:', data);

          // Salvar tokens e usuário
          if (data?.session) {
            console.log('[Auth Callback] Salvando tokens e usuário...');

            // Salvar no localStorage para o AuthContext
            if (typeof window !== 'undefined') {
              localStorage.setItem('authToken', data.session.access_token);
              localStorage.setItem('user', JSON.stringify({
                uid: data.session.user.id,
                email: data.session.user.email,
                displayName: data.session.user.user_metadata?.display_name || data.session.user.email,
                photoURL: data.session.user.user_metadata?.avatar_url || null,
                emailVerified: !!data.session.user.email_confirmed_at,
                role: 'student'
              }));
              console.log('[Auth Callback] Token e usuário salvos no localStorage');

              // Disparar evento para o AuthContext detectar a mudança
              window.dispatchEvent(new Event('storage'));
            }

            console.log('[Auth Callback] 🔵 CHECKPOINT: Antes de salvar cookies via API');

            // Salvar nos cookies via API route (para SSR)
            try {
              console.log('[Auth Callback] Salvando cookies via API route...');
              const cookieResponse = await fetch('/api/auth/set-cookies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  accessToken: data.session.access_token,
                  refreshToken: data.session.refresh_token
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
          }

          if (window.opener) {
            console.log('[Auth Callback] Popup detectado - enviando mensagem e fechando...');
            window.opener.postMessage({ type: 'auth-success' }, window.location.origin);
            await new Promise(resolve => setTimeout(resolve, 500));
            window.close();
          } else {
            console.log('[Auth Callback] Redirecionando com reload completo...');
            // Garantir que usa o origin correto
            const redirectUrl = redirect.startsWith('http') ? redirect : `${window.location.origin}${redirect}`;
            console.log('[Auth Callback] URL final de redirect:', redirectUrl);
            window.location.href = redirectUrl;
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
