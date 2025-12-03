'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

function AuthLoadingScreen({ message = 'Validando acesso...', debugLogs = [] }: { message?: string; debugLogs?: string[] }) {
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
        
        {/* Debug logs visíveis durante loading */}
        {debugLogs.length > 0 && (
          <div className="mt-6 text-left bg-black/30 rounded p-3 max-w-sm max-h-32 overflow-y-auto">
            {debugLogs.map((log, i) => (
              <p key={i} className="text-xs text-white/60 font-mono">{log}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('Validando acesso...');
  const hasRun = useRef(false);

  const isEdgeMobile = typeof navigator !== 'undefined' &&
    /Edg|Edge/i.test(navigator.userAgent) &&
    /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);

  // Função para adicionar log visível na tela
  const addDebug = (msg: string) => {
    console.log(msg);
    setDebugInfo(prev => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  };

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const timeoutId = setTimeout(() => {
      addDebug('TIMEOUT!');
      setError(isEdgeMobile
        ? 'Timeout no Edge Mobile. Use Chrome ou Safari.'
        : 'O processo demorou demais. Tente novamente.');
    }, isEdgeMobile ? 30000 : 15000);

    const handleCallback = async () => {
      try {
        addDebug(`Edge=${isEdgeMobile}`);

        const code = searchParams.get('code');
        addDebug(`Code=${code ? 'SIM' : 'NAO'}`);

        // Debug PKCE
        const pkceInCookies = document.cookie.split(';').filter(c => c.includes('code-verifier')).length;
        const pkceInLocal = Object.keys(localStorage).filter(k => k.includes('code-verifier')).length;
        const pkceInSession = Object.keys(sessionStorage).filter(k => k.includes('code-verifier')).length;

        addDebug(`PKCE: cookie=${pkceInCookies} local=${pkceInLocal} session=${pkceInSession}`);

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
        addDebug('Verificando...');

        let session = null;

        if (!isEdgeMobile) {
          const { data } = await supabase.auth.getSession();
          session = data.session;
          addDebug(`Sessao existente=${session ? 'SIM' : 'NAO'}`);
        }

        if (!session) {
          setLoadingMessage('Autenticando...');
          
          if (isEdgeMobile) {
            // Edge Mobile: usar API route server-side para evitar problemas do SDK
            addDebug('Edge: usando API...');
            
            // Buscar code_verifier do cookie
            const cookies = document.cookie.split(';');
            const verifierCookie = cookies.find(c => c.includes('code-verifier'));
            const codeVerifier = verifierCookie?.split('=')[1]?.trim();
            
            addDebug(`Verifier: ${codeVerifier ? 'SIM' : 'NAO'}`);
            
            if (!codeVerifier) {
              setError('Code verifier não encontrado. Tente novamente.');
              return;
            }
            
            try {
              const res = await fetch('/api/auth/exchange-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, codeVerifier: decodeURIComponent(codeVerifier) }),
              });
              
              const data = await res.json();
              addDebug(`API: ${res.status}`);
              
              if (!res.ok) {
                addDebug(`API ERR: ${data.error}`);
                setError(data.error || 'Erro na autenticação');
                return;
              }
              
              // Criar objeto session manualmente
              session = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user: data.user,
                expires_in: data.expires_in,
              } as any;
              
              addDebug('API OK!');
            } catch (apiErr: any) {
              addDebug(`API CATCH: ${apiErr.message}`);
              setError(apiErr.message);
              return;
            }
          } else {
            // Outros navegadores: usar SDK normalmente
            addDebug('SDK exchange...');
            const result = await supabase.auth.exchangeCodeForSession(code);
            
            if (result.error) {
              addDebug(`ERR: ${result.error.message}`);
              setError(result.error.message);
              return;
            }
            
            session = result.data.session;
            addDebug('OK!');
          }
        }

        if (!session) {
          addDebug('Sem sessao final');
          setError('Erro ao autenticar. Tente novamente.');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        setLoadingMessage('Carregando perfil...');
        addDebug('Buscando role...');

        let userRole = 'student';
        try {
          const res = await fetch('/api/user/me', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const data = await res.json();
            userRole = data.role || 'student';
          }
        } catch (e) {
          addDebug('Erro role');
        }

        const userData = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.display_name || session.user.email,
          photoURL: session.user.user_metadata?.avatar_url || null,
          emailVerified: !!session.user.email_confirmed_at,
          role: userRole
        };

        try { localStorage.setItem('authToken', session.access_token); } catch { sessionStorage.setItem('authToken', session.access_token); }
        try { localStorage.setItem('user', JSON.stringify(userData)); } catch { sessionStorage.setItem('user', JSON.stringify(userData)); }
        try { localStorage.setItem('user_id', session.user.id); } catch { sessionStorage.setItem('user_id', session.user.id); }

        try {
          await fetch('/api/auth/set-cookies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: session.access_token, refreshToken: session.refresh_token })
          });
        } catch { }

        let finalRedirect = redirect;
        if (userRole === 'MENTOR' && redirect === '/') finalRedirect = '/mentor';

        setLoadingMessage('Redirecionando...');
        addDebug('Redirect...');
        await new Promise(r => setTimeout(r, isEdgeMobile ? 1500 : 500));

        window.dispatchEvent(new CustomEvent('auth-token-updated', { detail: { token: session.access_token } }));

        if (isEdgeMobile) {
          window.location.href = finalRedirect;
        } else {
          router.push(finalRedirect);
        }

      } catch (err: any) {
        addDebug(`CATCH: ${err?.message || err}`);
        setError(err?.message || 'Erro desconhecido');
      }
    };

    handleCallback().finally(() => clearTimeout(timeoutId));
  }, [searchParams, router, isEdgeMobile]);


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

          {/* Debug info */}
          <div className="text-left bg-black/40 rounded p-3 mb-4 max-h-48 overflow-y-auto">
            <p className="text-xs text-amber-400 mb-2">Debug Log:</p>
            {debugInfo.map((log, i) => (
              <p key={i} className="text-xs text-white/70 font-mono leading-relaxed">{log}</p>
            ))}
          </div>

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

  return <AuthLoadingScreen message={loadingMessage} debugLogs={debugInfo} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthLoadingScreen message="Carregando..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
