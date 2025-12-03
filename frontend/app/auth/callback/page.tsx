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
      {/* Nuvens decorativas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Nuvem 1 */}
        <div className="absolute top-[10%] left-[5%] opacity-20">
          <div className="relative">
            <div className="absolute w-[80px] h-[80px] bg-white rounded-full" />
            <div className="absolute w-[50px] h-[50px] bg-white rounded-full top-4 -left-8" />
            <div className="absolute w-[60px] h-[60px] bg-white rounded-full top-2 left-[40px]" />
          </div>
        </div>
        
        {/* Nuvem 2 */}
        <div className="absolute top-[20%] right-[10%] opacity-20">
          <div className="relative">
            <div className="absolute w-[100px] h-[100px] bg-white rounded-full" />
            <div className="absolute w-[60px] h-[60px] bg-white rounded-full top-6 -left-10" />
            <div className="absolute w-[70px] h-[70px] bg-white rounded-full top-4 left-[50px]" />
          </div>
        </div>

        {/* Nuvem 3 */}
        <div className="absolute bottom-[30%] left-[15%] opacity-15">
          <div className="relative">
            <div className="absolute w-[70px] h-[70px] bg-white rounded-full" />
            <div className="absolute w-[45px] h-[45px] bg-white rounded-full top-3 -left-7" />
            <div className="absolute w-[55px] h-[55px] bg-white rounded-full top-2 left-[35px]" />
          </div>
        </div>
      </div>

      {/* Logo MedBrave */}
      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🦁</span>
          </div>
          <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Azonix, sans-serif' }}>
            MEDBRAVE
          </span>
        </div>
      </div>

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Leão animado */}
        <div className="relative mb-8">
          {/* Corpo do leão */}
          <div className="w-32 h-40 bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-full relative shadow-2xl animate-bounce" style={{ animationDuration: '2s' }}>
            {/* Juba */}
            <div className="absolute -top-4 -left-4 -right-4 h-20 bg-gradient-to-b from-amber-600 to-amber-500 rounded-t-full" />
            
            {/* Orelhas */}
            <div className="absolute -top-2 left-2 w-6 h-6 bg-amber-500 rounded-full" />
            <div className="absolute -top-2 right-2 w-6 h-6 bg-amber-500 rounded-full" />
            
            {/* Rosto */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-16">
              {/* Olhos */}
              <div className="flex justify-center gap-4 mt-2">
                <div className="w-4 h-4 bg-white rounded-full relative">
                  <div className="absolute top-1 left-1 w-2 h-2 bg-gray-800 rounded-full animate-pulse" />
                </div>
                <div className="w-4 h-4 bg-white rounded-full relative">
                  <div className="absolute top-1 left-1 w-2 h-2 bg-gray-800 rounded-full animate-pulse" />
                </div>
              </div>
              
              {/* Focinho */}
              <div className="mt-2 mx-auto w-8 h-6 bg-amber-300 rounded-full flex items-center justify-center">
                <div className="w-3 h-2 bg-amber-700 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Patas */}
          <div className="flex justify-center gap-4 -mt-2">
            <div className="w-6 h-8 bg-amber-400 rounded-b-lg" />
            <div className="w-6 h-8 bg-amber-400 rounded-b-lg" />
          </div>
        </div>

        {/* Texto de loading */}
        <h1 className="text-white text-2xl md:text-3xl font-semibold mb-4">
          {message}
        </h1>

        {/* Barra de progresso animada */}
        <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-loading-bar" />
        </div>

        {/* Texto secundário */}
        <p className="text-white/60 text-sm mt-4">
          Preparando sua experiência...
        </p>
      </div>

      {/* Estilos de animação */}
      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
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

              // Se for mentor e redirect padrão, redirecionar para painel de mentor
              let finalRedirect = redirect;
              if (userRole === 'MENTOR' && (redirect === '/' || !redirect)) {
                finalRedirect = '/mentor';
              }

              // Aguardar um pouco para garantir que a sessão foi persistida
              setLoadingMessage('Preparando sua experiência...');
              await new Promise(resolve => setTimeout(resolve, 500));

              // Disparar evento customizado para notificar outros componentes (como PlanContext)
              window.dispatchEvent(new CustomEvent('auth-token-updated', { 
                detail: { token: session.access_token } 
              }));

              // Redirecionar
              setLoadingMessage('Redirecionando...');
              console.log('🔍 [Callback] Redirect final:', finalRedirect);
              if (window.opener) {
                window.opener.postMessage({ type: 'auth-success' }, window.location.origin);
                await new Promise(resolve => setTimeout(resolve, 500));
                window.close();
              } else {
                // Usar router.push ao invés de window.location.href para evitar reload completo
                console.log('🔍 [Callback] Redirecionando para:', finalRedirect);
                router.push(finalRedirect);
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
        console.error('Erro ao processar autenticação:', err);
        setError('Erro ao processar autenticação.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="absolute top-8 left-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🦁</span>
            </div>
            <span className="text-white font-bold text-xl tracking-wide" style={{ fontFamily: 'Azonix, sans-serif' }}>
              MEDBRAVE
            </span>
          </div>
        </div>

        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl max-w-md mx-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">😿</span>
          </div>
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
