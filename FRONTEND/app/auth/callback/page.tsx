'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/config/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const redirect = searchParams.get('redirect') || '/';

        if (code) {
          // Trocar code por sessão (PKCE flow)
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[Auth Callback] Erro ao trocar código:', exchangeError);
            
            // Verificar se já está logado (código pode ter sido usado)
            const { data: sessionData } = await supabase.auth.getSession();
            
            if (sessionData?.session) {
              console.log('[Auth Callback] Usuário já está logado, redirecionando...');
              router.push(redirect);
              return;
            }
            
            setError('Erro ao autenticar. Tente novamente.');
            return;
          }

          // Salvar tokens nos cookies
          if (data?.session) {
            document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
            document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }

          // Aguardar storage atualizar
          await new Promise(resolve => setTimeout(resolve, 1000));

          if (window.opener) {
            window.opener.postMessage({ type: 'auth-success' }, window.location.origin);
            await new Promise(resolve => setTimeout(resolve, 500));
            window.close();
          } else {
            router.push(redirect);
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
        console.error('[Auth Callback] Erro:', err);
        setError('Erro ao processar autenticação.');
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
