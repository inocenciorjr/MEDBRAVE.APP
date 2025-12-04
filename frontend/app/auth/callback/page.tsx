'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function AuthLoadingScreen({ message = 'Validando acesso...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-2">
          <img src="/medbravelogo-dark.png" alt="MedBrave" className="w-10 h-10 object-contain" />
          <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Azonix, sans-serif' }}>
            MEDBRAVE
          </span>
        </div>
      </div>
      <img src="/icons8-lion-48.png" alt="" className="absolute bottom-8 right-8 w-24 h-24 opacity-60" />
      <div className="flex flex-col items-center">
        <h1 className="text-white text-xl md:text-2xl font-semibold mb-4">{message}</h1>
        <div className="w-10 h-10 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin" />
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Validando acesso...');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const timeoutId = setTimeout(() => {
      setError('O processo demorou demais. Tente novamente.');
    }, 15000);

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const redirect = searchParams.get('redirect') || localStorage.getItem('auth_redirect') || '/';
        localStorage.removeItem('auth_redirect');

        if (!code) {
          if (window.location.hash.includes('access_token')) {
            await new Promise(r => setTimeout(r, 1000));
            router.push(redirect);
          } else {
            router.push('/login');
          }
          return;
        }

        setLoadingMessage('Verificando credenciais...');

        // Verificar se já tem sessão
        const { data: existingSession } = await supabase.auth.getSession();
        let session = existingSession.session;

        if (!session) {
          setLoadingMessage('Autenticando...');
          
          // Buscar code_verifier do cookie
          const cookies = document.cookie.split(';');
          const verifierCookie = cookies.find(c => c.trim().startsWith('sb-') && c.includes('code-verifier'));
          let codeVerifier = '';
          
          if (verifierCookie) {
            const eqIndex = verifierCookie.indexOf('=');
            if (eqIndex !== -1) {
              let rawValue = verifierCookie.substring(eqIndex + 1).trim();
              try { rawValue = decodeURIComponent(rawValue); } catch {}
              
              if (rawValue.startsWith('base64-')) {
                try {
                  const decoded = atob(rawValue.substring(7));
                  codeVerifier = JSON.parse(decoded);
                } catch {
                  codeVerifier = rawValue;
                }
              } else {
                codeVerifier = rawValue;
              }
            }
          }
          
          if (!codeVerifier) {
            setError('Sessão expirada. Tente fazer login novamente.');
            return;
          }
          
          // Usar API route server-side para evitar problemas do SDK
          const res = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, codeVerifier }),
          });
          
          if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Erro na autenticação');
            return;
          }
          
          const data = await res.json();
          session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user,
          } as any;
          
          // Salvar sessão no localStorage para o SDK
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
          const storageKey = `sb-${projectRef}-auth-token`;
          
          const sessionData = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
            token_type: 'bearer',
            user: data.user,
          };
          
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
        }

        if (!session) {
          setError('Erro ao autenticar. Tente novamente.');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        setLoadingMessage('Carregando perfil...');

        // Buscar role do usuário
        let userRole = 'student';
        try {
          const res = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            userRole = data.role || 'student';
          }
        } catch {
          // Ignorar erro de role
        }

        // Salvar dados do usuário
        const userData = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.display_name || session.user.email,
          photoURL: session.user.user_metadata?.avatar_url || null,
          emailVerified: !!session.user.email_confirmed_at,
          role: userRole
        };

        localStorage.setItem('authToken', session.access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('user_id', session.user.id);

        // Setar cookies para SSR
        try {
          await fetch('/api/auth/set-cookies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: session.access_token,
              refreshToken: session.refresh_token
            })
          });
        } catch {
          // Ignorar erro de cookies
        }

        // Determinar redirect final
        let finalRedirect = redirect;
        if (userRole === 'MENTOR' && redirect === '/') {
          finalRedirect = '/mentor';
        }

        setLoadingMessage('Redirecionando...');

        // Notificar outros componentes
        window.dispatchEvent(new CustomEvent('auth-token-updated', {
          detail: { token: session.access_token }
        }));

        // Pequeno delay para garantir que tudo foi salvo
        await new Promise(r => setTimeout(r, 500));

        router.push(finalRedirect);

      } catch (err: any) {
        setError(err?.message || 'Erro desconhecido');
      }
    };

    handleCallback().finally(() => clearTimeout(timeoutId));
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-8 left-8">
          <div className="flex items-center gap-2">
            <img src="/medbravelogo-dark.png" alt="MedBrave" className="w-10 h-10 object-contain" />
            <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Azonix, sans-serif' }}>
              MEDBRAVE
            </span>
          </div>
        </div>
        <img src="/icons8-lion-48.png" alt="" className="absolute bottom-8 right-8 w-24 h-24 opacity-60" />
        <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-2xl max-w-md w-full">
          <h2 className="text-white text-xl font-semibold mb-2">Ops! Algo deu errado</h2>
          <p className="text-white/70 mb-4 text-sm">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <AuthLoadingScreen message={loadingMessage} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="Carregando..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
