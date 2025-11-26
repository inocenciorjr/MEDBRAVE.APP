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
        
        // Tentar pegar redirect de 3 lugares (em ordem de prioridade):
        // 1. Query string (se vier do Supabase)
        // 2. localStorage (salvo antes do OAuth)
        // 3. Padrão /admin
        let redirect = searchParams.get('redirect');
        if (!redirect && typeof window !== 'undefined') {
          redirect = localStorage.getItem('auth_redirect') || '/admin';
          localStorage.removeItem('auth_redirect'); // Limpar após usar
        }
        if (!redirect) {
          redirect = '/admin';
        }

        if (code) {
          // Verificar se a sessão já foi estabelecida automaticamente pelo Supabase
          let { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            // Sessão não existe, tentar trocar código
            const result = await supabase.auth.exchangeCodeForSession(code);
            
            if (result.error) {
              // Aguardar e tentar pegar sessão novamente
              await new Promise(resolve => setTimeout(resolve, 2000));
              const sessionCheck = await supabase.auth.getSession();
              session = sessionCheck.data.session;
            } else {
              session = result.data.session;
            }
          }

          // Se temos sessão (de qualquer forma), processar
          if (session) {
            // Buscar role do backend
            let userRole = 'student';
            try {
              const roleResponse = await fetch('/api/user/me', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              });
              if (roleResponse.ok) {
                const userData = await roleResponse.json();
                userRole = userData.role || 'student';
              }
            } catch (e) {
              // Se falhar, usa student como padrão
            }

            // Salvar token no localStorage para o AuthContext
            if (typeof window !== 'undefined') {
              localStorage.setItem('authToken', session.access_token);
              localStorage.setItem('user', JSON.stringify({
                uid: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.display_name || session.user.email,
                photoURL: session.user.user_metadata?.avatar_url || null,
                emailVerified: !!session.user.email_confirmed_at,
                role: userRole
              }));

              // Salvar nos cookies via API route (para SSR)
              try {
                await fetch('/api/auth/set-cookies', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    accessToken: session.access_token,
                    refreshToken: session.refresh_token
                  })
                });
              } catch (cookieError) {
                console.error('Erro ao salvar cookies:', cookieError);
              }

              // Redirecionar
              if (window.opener) {
                window.opener.postMessage({ type: 'auth-success' }, window.location.origin);
                await new Promise(resolve => setTimeout(resolve, 500));
                window.close();
              } else {
                const redirectUrl = redirect.startsWith('http') ? redirect : `${window.location.origin}${redirect}`;
                window.location.href = redirectUrl;
              }
            }
          } else {
            // Não conseguiu obter sessão
            setError('Erro ao autenticar. Tente fazer login novamente.');
            setTimeout(() => router.push('/login'), 3000);
          }
        } else {
          // Implicit flow - tokens no hash
          if (window.location.hash.includes('access_token')) {
            // Aguardar Supabase processar
            await new Promise(resolve => setTimeout(resolve, 1000));
            router.push(redirect);
          } else {
            // Sem autenticação
            if (window.opener) {
              window.close();
            } else {
              router.push('/login');
            }
          }
        }
      } catch (err) {
        console.error('Erro ao processar autenticação:', err);
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
