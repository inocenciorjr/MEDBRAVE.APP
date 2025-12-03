'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * Componente de Loading estilizado para o callback de autenticação
 */
function AuthLoadingScreen({ message = 'Validando acesso...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Logo MedBrave no canto superior esquerdo */}
      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-2">
          <img 
            src="/medbravelogo-dark.png" 
            alt="MedBrave" 
            className="w-10 h-10 object-contain"
          />
          <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Azonix, sans-serif' }}>
            MEDBRAVE
          </span>
        </div>
      </div>

      {/* Leão decorativo no canto inferior direito */}
      <img 
        src="/icons8-lion-48.png" 
        alt="" 
        className="absolute bottom-8 right-8 w-24 h-24 opacity-60"
      />

      {/* Conteúdo central */}
      <div className="flex flex-col items-center">
        {/* Texto de loading */}
        <h1 className="text-white text-xl md:text-2xl font-semibold mb-4">
          {message}
        </h1>

        {/* Spinner simples */}
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
  
  // ✅ EDGE MOBILE FIX: Detectar Edge Mobile
  const isEdgeMobile = typeof navigator !== 'undefined' && 
    /Edg|Edge/i.test(navigator.userAgent) && 
    /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  
  // Log para debug
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      console.log('🔍 [Callback] User Agent:', navigator.userAgent);
      console.log('🔍 [Callback] Is Edge Mobile:', isEdgeMobile);
    }
  }, [isEdgeMobile]);

  useEffect(() => {
    // Prevenir execução dupla
    if (hasRun.current) {
      console.log('[Auth Callback] Execução já iniciada, ignorando...');
      return;
    }
    hasRun.current = true;

    // ✅ EDGE MOBILE FIX: Timeout para evitar travamento
    const timeoutId = setTimeout(() => {
      console.error('❌ [Callback] Timeout - processo demorou demais');
      if (isEdgeMobile) {
        setError('O processo de login demorou demais. No Edge Mobile, tente usar Chrome ou Safari para melhor compatibilidade.');
      } else {
        setError('O processo de login demorou demais. Tente novamente.');
      }
    }, isEdgeMobile ? 30000 : 15000); // 30s para Edge Mobile, 15s para outros
    
    const handleCallback = async () => {
      try {
        console.log('🔍 [Callback] Iniciando handleCallback...');
        const code = searchParams.get('code');
        console.log('🔍 [Callback] Code:', code ? 'presente' : 'ausente');
        
        // Tentar pegar redirect de 3 lugares (em ordem de prioridade):
        // 1. Query string (se vier do Supabase)
        // 2. localStorage (salvo antes do OAuth)
        // 3. Padrão /admin
        let redirect = searchParams.get('redirect');
        if (!redirect && typeof window !== 'undefined') {
          redirect = localStorage.getItem('auth_redirect') || '/';
          localStorage.removeItem('auth_redirect'); // Limpar após usar
        }
        if (!redirect) {
          redirect = '/';
        }

        if (code) {
          console.log('🔍 [Callback] Code presente, verificando sessão...');
          setLoadingMessage('Verificando credenciais...');
          
          // Verificar se a sessão já foi estabelecida automaticamente pelo Supabase
          let { data: { session } } = await supabase.auth.getSession();
          console.log('🔍 [Callback] Sessão inicial:', session ? 'existe' : 'não existe');
          
          if (!session) {
            console.log('🔍 [Callback] Tentando exchangeCodeForSession...');
            setLoadingMessage('Autenticando...');
            // Sessão não existe, tentar trocar código
            const result = await supabase.auth.exchangeCodeForSession(code);
            
            if (result.error) {
              console.error('❌ [Callback] Erro no exchangeCodeForSession:', result.error);
              
              // Aguardar e tentar pegar sessão novamente
              await new Promise(resolve => setTimeout(resolve, 2000));
              const sessionCheck = await supabase.auth.getSession();
              session = sessionCheck.data.session;
              console.log('🔍 [Callback] Sessão após retry:', session ? 'existe' : 'não existe');
            } else {
              session = result.data.session;
              console.log('✅ [Callback] Sessão obtida com sucesso');
            }
          }

          // Se temos sessão (de qualquer forma), processar
          if (session) {
            console.log('✅ [Callback] Processando sessão...');
            setLoadingMessage('Carregando seu perfil...');
            
            // Buscar role do backend
            let userRole = 'student';
            try {
              console.log('🔍 [Callback] Buscando role do backend...');
              const roleResponse = await fetch('/api/user/me', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              });
              console.log('🔍 [Callback] Response status:', roleResponse.status);
              if (roleResponse.ok) {
                const userData = await roleResponse.json();
                userRole = userData.role || 'student';
                console.log('✅ [Callback] Role obtida:', userRole);
              } else {
                console.error('❌ [Callback] Erro ao buscar role:', roleResponse.status);
              }
            } catch (e) {
              console.error('❌ [Callback] Exceção ao buscar role:', e);
              // Se falhar, usa student como padrão
            }

            // Salvar token no localStorage para o AuthContext
            if (typeof window !== 'undefined') {
              const userData = {
                uid: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.display_name || session.user.email,
                photoURL: session.user.user_metadata?.avatar_url || null,
                emailVerified: !!session.user.email_confirmed_at,
                role: userRole
              };
              
              // ✅ EDGE MOBILE FIX: Salvar com fallback para sessionStorage
              const saveToStorage = (key: string, value: string) => {
                try {
                  localStorage.setItem(key, value);
                  // Verificar se realmente salvou
                  if (isEdgeMobile && !localStorage.getItem(key)) {
                    throw new Error('localStorage não persistiu');
                  }
                } catch (e) {
                  console.warn(`⚠️ [Callback] localStorage falhou para ${key}, usando sessionStorage:`, e);
                  sessionStorage.setItem(key, value);
                }
              };
              
              saveToStorage('authToken', session.access_token);
              saveToStorage('user', JSON.stringify(userData));
              saveToStorage('user_id', session.user.id);
              
              console.log('✅ [Callback] Dados salvos no storage');

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

              // Se for mentor e redirect padrão, redirecionar para painel de mentor
              let finalRedirect = redirect;
              if (userRole === 'MENTOR' && (redirect === '/' || !redirect)) {
                finalRedirect = '/mentor';
              }

              // ✅ EDGE MOBILE FIX: Aguardar mais tempo para garantir persistência
              setLoadingMessage('Preparando sua experiência...');
              const waitTime = isEdgeMobile ? 2000 : 500;
              console.log(`🔍 [Callback] Aguardando ${waitTime}ms para persistência...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));

              // ✅ EDGE MOBILE FIX: Verificar se dados foram salvos
              if (isEdgeMobile) {
                const tokenCheck = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                console.log('🔍 [Callback] Edge Mobile - Token verificado:', tokenCheck ? 'presente' : 'ausente');
                
                if (!tokenCheck) {
                  console.warn('⚠️ [Callback] Edge Mobile: Token não encontrado, tentando salvar novamente...');
                  try {
                    sessionStorage.setItem('authToken', session.access_token);
                    sessionStorage.setItem('user', JSON.stringify(userData));
                    sessionStorage.setItem('user_id', session.user.id);
                  } catch (e) {
                    console.error('❌ [Callback] Falha crítica ao salvar:', e);
                  }
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }

              // Disparar evento customizado para notificar outros componentes (como PlanContext)
              window.dispatchEvent(new CustomEvent('auth-token-updated', { 
                detail: { token: session.access_token } 
              }));
              
              // ✅ EDGE MOBILE FIX: Aguardar evento ser processado
              if (isEdgeMobile) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }

              // Redirecionar
              setLoadingMessage('Redirecionando...');
              console.log('🔍 [Callback] Redirect final:', finalRedirect);
              
              if (window.opener) {
                window.opener.postMessage({ type: 'auth-success' }, window.location.origin);
                await new Promise(resolve => setTimeout(resolve, 500));
                window.close();
              } else {
                // ✅ EDGE MOBILE FIX: Usar window.location.href para Edge Mobile (mais compatível)
                if (isEdgeMobile) {
                  console.log('🔍 [Callback] Edge Mobile: Usando window.location.href');
                  window.location.href = finalRedirect;
                } else {
                  console.log('🔍 [Callback] Redirecionando via router.push');
                  router.push(finalRedirect);
                }
              }
            }
          } else {
            // Não conseguiu obter sessão
            console.error('❌ [Callback] Sessão não obtida');
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
        console.error('❌ [Callback] Erro ao processar autenticação:', err);
        clearTimeout(timeoutId);
        if (isEdgeMobile) {
          setError('Erro ao processar autenticação no Edge Mobile. Tente usar Chrome ou Safari.');
        } else {
          setError('Erro ao processar autenticação. Tente novamente.');
        }
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback().finally(() => {
      clearTimeout(timeoutId);
    });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Logo MedBrave no canto superior esquerdo */}
        <div className="absolute top-8 left-8">
          <div className="flex items-center gap-2">
            <img 
              src="/medbravelogo-dark.png" 
              alt="MedBrave" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Azonix, sans-serif' }}>
              MEDBRAVE
            </span>
          </div>
        </div>

        {/* Leão decorativo no canto inferior direito */}
        <img 
          src="/icons8-lion-48.png" 
          alt="" 
          className="absolute bottom-8 right-8 w-24 h-24 opacity-60"
        />

        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl max-w-md">
          <h2 className="text-white text-xl font-semibold mb-2">Ops! Algo deu errado</h2>
          <p className="text-white/70 mb-6">{error}</p>
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
