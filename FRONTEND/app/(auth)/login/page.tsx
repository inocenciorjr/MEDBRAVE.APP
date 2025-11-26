'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput } from '@/components/admin/ui/AdminInput';
import { AdminCard } from '@/components/admin/ui/AdminCard';

const supabase = createClient();

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log('[Login] 🚀 Iniciando login...');
    setLoading(true);
    setError(null);

    try {
      console.log('[Login] ⏱️ Chamando Supabase signInWithPassword...');
      console.time('[Login] signInWithPassword');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.timeEnd('[Login] signInWithPassword');
      console.log('[Login] ✅ Supabase respondeu');

      if (signInError) {
        setError('Email ou senha incorretos. Verifique suas credenciais.');
        return;
      }

      if (data.user) {
        console.log('[Login] Login bem-sucedido, redirecionando...');
        console.time('[Login] router.push');
        
        // Redirecionar para a página solicitada
        router.push(redirect);
        
        console.timeEnd('[Login] router.push');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
      console.error('Erro no login:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Abrir em popup
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false, // Permite popup
        },
      });

      if (signInError) {
        setError('Erro ao fazer login com Google. Tente novamente.');
        setLoading(false);
      }
      // Vai redirecionar automaticamente
    } catch (err) {
      setError('Erro ao fazer login com Google. Tente novamente.');
      console.error('Erro no login com Google:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
            <span className="material-symbols-outlined text-white text-4xl">
              admin_panel_settings
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2 font-inter">
            MEDBRAVE Admin
          </h1>
          <p className="text-text-light-secondary dark:text-text-dark-secondary font-inter">
            Acesse o painel administrativo
          </p>
        </div>

        {/* Card de Login */}
        <AdminCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mensagem de Erro */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-xl mt-0.5">
                  error
                </span>
                <p className="text-sm text-red-600 dark:text-red-400 font-inter">
                  {error}
                </p>
              </div>
            )}

            {/* Campo Email */}
            <AdminInput
              label="Email"
              type="email"
              icon="mail"
              placeholder="admin@medbrave.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            {/* Campo Senha */}
            <AdminInput
              label="Senha"
              type="password"
              icon="lock"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            {/* Botão de Login */}
            <AdminButton
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon={loading ? undefined : 'login'}
              className="w-full"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </AdminButton>

            {/* Divisor */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border-light dark:border-border-dark"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-surface-light dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary font-inter">
                  ou
                </span>
              </div>
            </div>

            {/* Botão Google */}
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar com Google
            </AdminButton>
          </form>
        </AdminCard>

        {/* Informação Adicional */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">
              info
            </span>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-inter">
              Apenas administradores podem acessar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
