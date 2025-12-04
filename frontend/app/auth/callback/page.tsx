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
            
            // Buscar code_verifier - o SDK salva como JSON stringified
            const cookies = document.cookie.split(';');
            const verifierCookie = cookies.find(c => c.trim().startsWith('sb-') && c.includes('code-verifier'));
            let codeVerifier = '';
            if (verifierCookie) {
              const eqIndex = verifierCookie.indexOf('=');
              if (eqIndex !== -1) {
                let rawValue = verifierCookie.substring(eqIndex + 1).trim();
                // Decodificar URL encoding
                try { rawValue = decodeURIComponent(rawValue); } catch {}
                
                addDebug(`Raw: ${rawValue.substring(0, 30)}...`);
                
                // O SDK salva como "base64-<json>" onde json é o verifier stringified
                // Precisamos extrair o valor real
                if (rawValue.startsWith('base64-')) {
                  const base64Part = rawValue.substring(7); // Remove "base64-"
                  try {
                    const decoded = atob(base64Part);
                    // O decoded é um JSON string, ex: "\"abc123...\""
                    codeVerifier = JSON.parse(decoded);
                    addDebug(`Parsed: ${codeVerifier.substring(0, 20)}...`);
                  } catch (e: any) {
                    addDebug(`Parse err: ${e.message}`);
                    codeVerifier = rawValue; // Fallback
                  }
                } else {
                  codeVerifier = rawValue;
                }
              }
            }
            
            addDebug(`Final: ${codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'NAO'}`);
            
            if (!codeVerifier) {
              setError('Code verifier não encontrado. Tente novamente.');
              return;
            }
            
            try {
              const res = await fetch('/api/auth/exchange-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, codeVerifier }),
              });
              
              const data = await res.json();
              addDebug(`API: ${res.status}`);
              
              if (!res.ok) {
                addDebug(`API ERR: ${data.error}`);
                if (data.details) {
                  addDebug(`Details: ${JSON.stringify(data.details).substring(0, 100)}`);
                }
                setError(data.error || 'Erro na autenticação');
                return;
              }
              
              // Edge Mobile: salvar sessão no formato que o SDK espera
              addDebug('API OK!');
              
              // Criar objeto session no formato Supabase
              const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
              session = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user: data.user,
                expires_in: data.expires_in,
                expires_at: expiresAt,
                token_type: 'bearer',
              } as any;
              
              // Salvar no formato que o Supabase SDK espera
              // A chave é: sb-<project_ref>-auth-token
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
              const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
              const storageKey = `sb-${projectRef}-auth-token`;
              
              const sessionData = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                expires_at: expiresAt,
                token_type: 'bearer',
                user: data.user,
              };
              
              // Salvar em todos os storages possíveis
              const sessionJson = JSON.stringify(sessionData);
              try { localStorage.setItem(storageKey, sessionJson); } catch {}
              try { sessionStorage.setItem(storageKey, sessionJson); } catch {}
              // Também em cookie no formato base64
              try {
                const base64Session = btoa(sessionJson);
                document.cookie = `${storageKey}=base64-${base64Session}; max-age=3600; path=/; samesite=lax`;
              } catch {}
              
              addDebug(`Saved: ${storageKey.substring(0, 15)}...`);
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
          // Edge Mobile: usar página intermediária que aguarda a sessão
          const encodedRedirect = encodeURIComponent(finalRedirect);
          window.location.href = `/auth/success?redirect=${encodedRedirect}`;
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
